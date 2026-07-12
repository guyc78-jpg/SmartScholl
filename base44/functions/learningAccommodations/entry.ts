import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import mammoth from 'npm:mammoth@1.9.0';

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const rateLimitBuckets = new Map<string, number[]>();

function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return true;
}

const ACCOMMODATIONS = [
  { key: 'extra_time_25', label: 'תוספת זמן 25%', aliases: ['תוספת זמן', '25%', 'הארכת זמן'] },
  { key: 'computer_recording', label: 'הקלטת תשובות במחשב', aliases: ['הקלטת תשובות', 'מחשב', 'הקלטה במחשב'] },
  { key: 'adapted_exam', label: 'מבחן מותאם', aliases: ['מותאם', 'מבחן מותאם'] },
  { key: 'questionnaire_audio', label: 'השמעת שאלון', aliases: ['השמעה', 'שאלון מוקרא', 'הקראת שאלון'] },
  { key: 'typing', label: 'הקלדה', aliases: ['הקלדה', 'כתיבה במחשב'] },
  { key: 'ignore_errors', label: 'התעלמות משגיאות', aliases: ['שגיאות כתיב', 'התעלמות משגיאות', 'שגיאות'] },
  { key: 'extended_formula_sheet', label: 'דף נוסחאות מורחב', aliases: ['דף נוסחאות', 'נוסחאות מורחב', 'נוסחאות'] },
  { key: 'digital_english', label: 'מתוקשב באנגלית', aliases: ['אנגלית מתוקשב', 'מתוקשב באנגלית', 'מתוקשב'] },
];

const STAFF_ROLES = ['homeroom_teacher', 'grade_coordinator', 'coordinator', 'division_manager', 'system_admin', 'admin'];

function normalize(value = '') {
  return String(value || '').replace(/[׳״'"\s]/g, '').trim();
}

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value = '') {
  return String(value ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function isBlockedHost(hostname = '') {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpv6 = host.includes(':');
  return host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host === '0.0.0.0'
    || /^127\./.test(host)
    || host === '::1'
    || host === '::'
    || (isIpv6 && /^f[cd][0-9a-f]{2}(?::|$)/.test(host))
    || (isIpv6 && /^fe[89ab][0-9a-f](?::|$)/.test(host))
    || (isIpv6 && host.startsWith('::ffff:'))
    || (isIpv6 && host.startsWith('ff'))
    || host.startsWith('10.')
    || host.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    || /^169\.254\./.test(host)
    || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)
    || /^198\.(1[89])\./.test(host)
    || /^(22[4-9]|23\d|24\d|25[0-5])\./.test(host);
}

function validateFileUrl(fileUrl = '') {
  const url = new URL(fileUrl);
  if (url.protocol !== 'https:') throw new Error('Only HTTPS file URLs are allowed');
  if (url.username || url.password) throw new Error('Credentials in file URLs are not allowed');
  if (url.port && url.port !== '443') throw new Error('Non-standard file URL ports are not allowed');
  if (isBlockedHost(url.hostname)) throw new Error('File URL host is not allowed');
  return url.toString();
}

async function fetchValidatedFile(fileUrl: string) {
  let currentUrl = validateFileUrl(fileUrl);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const hostname = new URL(currentUrl).hostname.replace(/^\[|\]$/g, '');
    const resolutions = await Promise.allSettled([
      Deno.resolveDns(hostname, 'A'),
      Deno.resolveDns(hostname, 'AAAA'),
    ]);
    for (const resolution of resolutions) {
      if (resolution.status === 'fulfilled' && resolution.value.some(isBlockedHost)) {
        throw new Error('File URL resolved to a private host');
      }
    }
    const response = await fetch(currentUrl, { redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get('location');
    if (!location || redirectCount === 3) throw new Error('File URL redirected too many times');
    currentUrl = validateFileUrl(new URL(location, currentUrl).toString());
  }
  throw new Error('Unable to fetch file');
}

async function readWithinLimit(response: Response, maxBytes: number) {
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maxBytes) throw new RangeError('File is too large');
  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel('File is too large');
      throw new RangeError('File is too large');
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

function defaultAccommodations() {
  return ACCOMMODATIONS.map(item => ({ key: item.key, label: item.label, enabled: false, detail: '' }));
}

function normalizeList(list = []) {
  const byKey = new Map((list || []).map(item => [item.key, item]));
  return ACCOMMODATIONS.map(type => {
    const existing = byKey.get(type.key) || {};
    return { key: type.key, label: type.label, enabled: !!existing.enabled, detail: String(existing.detail || '').slice(0, 180) };
  });
}

function allowedDivisionGrades(claims) {
  const division = claims?.scope?.divisionType || claims?.profile_division;
  if (division === 'upper') return ['י', 'יא', 'יב'];
  if (division === 'middle') return ['ז', 'ח', 'ט'];
  return [];
}

async function getClaims(base44, user) {
  const email = normalizeEmail(user.email);
  const approved = await base44.asServiceRole.entities.ApprovedUser.filter({ email });
  const record = approved.find(item => item.isActive !== false);
  if (record) {
    const scope = record.role === 'grade_coordinator'
      ? { ...(record.scope || {}), homeroomClassId: record.homeroomClassId || record.scope?.homeroomClassId || '' }
      : (record.scope || {});
    return {
      authorized: true,
      role: record.role,
      email,
      fullName: record.fullName,
      scope,
      profile_class_id: record.role === 'homeroom_teacher' ? scope.classId || '' : '',
      profile_grade_managed: record.role === 'grade_coordinator' ? normalize(scope.gradeId || '') : '',
      profile_division: record.role === 'division_manager' ? scope.divisionType || '' : '',
    };
  }

  const byUserEmail = await base44.asServiceRole.entities.Student.filter({ user_email: email });
  const byEmail = byUserEmail.length ? byUserEmail : await base44.asServiceRole.entities.Student.filter({ email });
  const student = byEmail.find(item => item.status !== 'סיים');
  if (student) {
    return { authorized: true, role: 'student', email, fullName: student.full_name || user.full_name || email, student_id: student.id };
  }

  if (user.role === 'admin' || user.role === 'system_admin') {
    return { authorized: true, role: 'system_admin', email, fullName: user.full_name || email, scope: {} };
  }

  return { authorized: false, role: '', email };
}

function canViewStudent(claims, student) {
  if (!claims?.authorized || !student) return false;
  const role = claims.role;
  if (role === 'system_admin' || role === 'admin') return true;
  if (role === 'student') return student.id === claims.student_id || normalizeEmail(student.email) === claims.email || normalizeEmail(student.user_email) === claims.email;
  if (role === 'homeroom_teacher') return student.class_id === claims.scope?.classId || student.class_id === claims.profile_class_id;
  if (role === 'grade_coordinator' || role === 'coordinator') return normalize(student.grade) === normalize(claims.scope?.gradeId || claims.profile_grade_managed);
  if (role === 'division_manager') return allowedDivisionGrades(claims).includes(normalize(student.grade));
  return false;
}

function canEditStudent(claims, student) {
  if (!canViewStudent(claims, student)) return false;
  return STAFF_ROLES.includes(claims.role) && claims.role !== 'student';
}

function canViewHistory(claims) {
  return ['homeroom_teacher', 'grade_coordinator', 'coordinator', 'system_admin', 'admin'].includes(claims.role);
}

async function loadStudent(base44, studentId) {
  const rows = await base44.asServiceRole.entities.Student.filter({ id: studentId });
  return rows[0] || null;
}

async function getRecord(base44, student) {
  const rows = await base44.asServiceRole.entities.StudentAccommodation.filter({ student_id: student.id });
  const existing = rows[0];
  if (existing) return existing;
  return {
    student_id: student.id,
    student_name: student.full_name || '',
    class_id: student.class_id || '',
    class_name: student.class_name || '',
    grade: student.grade || '',
    accommodations: defaultAccommodations(),
    history: [],
  };
}

function summarizeChanges(before = [], after = []) {
  const beforeMap = new Map(normalizeList(before).map(item => [item.key, item]));
  return normalizeList(after).filter(item => {
    const old = beforeMap.get(item.key) || {};
    return old.enabled !== item.enabled || String(old.detail || '') !== String(item.detail || '');
  }).map(item => `${item.label}: ${item.enabled ? 'פעיל' : 'כבוי'}${item.detail ? ` (${item.detail})` : ''}`).join('; ');
}

function findAccommodationByHeader(header = '') {
  const clean = cleanText(header);
  return ACCOMMODATIONS.find(item => [item.label, ...item.aliases].some(alias => clean.includes(alias)));
}

function isHeaderRow(cells) {
  const joined = cells.map(cleanText).join(' ');
  const hasName = /שם|תלמיד/.test(joined);
  const hasAccommodation = cells.some(cell => !!findAccommodationByHeader(cell));
  return hasName && hasAccommodation;
}

function buildHeader(cells) {
  const header = { name: -1, className: -1, accommodations: {} };
  cells.forEach((cell, index) => {
    const text = cleanText(cell);
    if (header.name === -1 && /שם.*תלמיד|תלמיד|שם מלא|שם/.test(text)) header.name = index;
    if (header.className === -1 && /כיתה/.test(text)) header.className = index;
    const accommodation = findAccommodationByHeader(text);
    if (accommodation) header.accommodations[accommodation.key] = index;
  });
  return header;
}

function looksLikeClass(value = '') {
  const text = normalize(value);
  return /^[זחטייאיב]{1,2}\d{0,2}$/.test(text) || /^כיתה/.test(cleanText(value));
}

function parseRows(rows) {
  let header = null;
  let currentClass = '';
  const parsed = [];

  for (const rawRow of rows || []) {
    const cells = (rawRow || []).map(cleanText);
    if (cells.every(cell => !cell)) continue;
    if (isHeaderRow(cells)) {
      header = buildHeader(cells);
      continue;
    }
    if (!header) continue;

    const classValue = header.className >= 0 ? cells[header.className] : '';
    if (classValue) currentClass = classValue;

    const name = header.name >= 0 ? cells[header.name] : '';
    if (!name) {
      const classOnly = cells.find(cell => looksLikeClass(cell));
      if (classOnly) currentClass = classOnly;
      continue;
    }
    if (/שם|תלמיד|כיתה/.test(name)) continue;

    const accommodations = defaultAccommodations().map(item => {
      const index = header.accommodations[item.key];
      const cell = index === undefined ? '' : cells[index];
      const enabled = cell === '+' || (cell && !/^[-–—]$/.test(cell));
      return { ...item, enabled: !!enabled, detail: cell === '+' ? '' : cell };
    });

    if (accommodations.some(item => item.enabled)) {
      parsed.push({ student_name: name, class_name: classValue || currentClass, accommodations });
    }
  }

  return parsed;
}

function rowsFromHtmlTables(html = '') {
  const rows = [];
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const rowHtml of rowMatches) {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    for (const cellHtml of cellMatches) cells.push(cleanText(cellHtml));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

async function parseImport(fileUrl, fileName = '') {
  const response = await fetchValidatedFile(fileUrl);
  if (!response.ok) throw new Error('לא ניתן לקרוא את הקובץ');
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await readWithinLimit(response, MAX_IMPORT_FILE_BYTES);
  } catch (error) {
    if (error instanceof RangeError) throw new Error('הקובץ גדול מדי');
    throw error;
  }
  const name = fileName.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const rows = [];
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      rows.push(...XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }));
    }
    return parseRows(rows);
  }

  const result = await mammoth.convertToHtml({ arrayBuffer });
  return parseRows(rowsFromHtmlTables(result.value || ''));
}

async function applyImport(base44, claims, rows, actor) {
  let success = 0;
  const failures = [];
  for (const row of rows || []) {
    const name = cleanText(row.student_name);
    const className = cleanText(row.class_name);
    if (!name) continue;
    const candidates = (await base44.asServiceRole.entities.Student.filter({ full_name: name }))
      .filter(item => item.status !== 'סיים');
    const exactMatches = className
      ? candidates.filter(item => normalize(item.class_name) === normalize(className))
      : candidates;
    const student = exactMatches.length === 1 ? exactMatches[0] : null;
    if (!student) {
      failures.push(`${name}: תלמיד לא נמצא`);
      continue;
    }
    if (!canEditStudent(claims, student)) {
      failures.push(`${name}: אין הרשאה`);
      continue;
    }
    const current = await getRecord(base44, student);
    const nextAccommodations = normalizeList(row.accommodations);
    const summary = summarizeChanges(current.accommodations, nextAccommodations) || 'ייבוא התאמות ללא שינוי מהותי';
    const historyItem = { at: new Date().toISOString(), by_name: actor.fullName, by_email: actor.email, action: 'import', summary };
    const data = {
      student_id: student.id,
      student_name: student.full_name || name,
      class_id: student.class_id || '',
      class_name: student.class_name || className,
      grade: student.grade || '',
      accommodations: nextAccommodations,
      history: [...(current.history || []), historyItem].slice(-80),
      last_updated_by_name: actor.fullName,
      last_updated_by_email: actor.email,
      last_updated_at: historyItem.at,
    };
    if (current.id) await base44.asServiceRole.entities.StudentAccommodation.update(current.id, data);
    else await base44.asServiceRole.entities.StudentAccommodation.create(data);
    success++;
  }
  return { success, failures };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'getForStudent';
    if (!rateLimit(`${user.email || user.id || 'anonymous'}:${action}`)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }
    const claims = await getClaims(base44, user);
    if (!claims.authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const actor = { fullName: claims.fullName || user.full_name || user.email, email: claims.email || user.email };

    if (action === 'getForStudent') {
      const student = await loadStudent(base44, body.student_id);
      if (!canViewStudent(claims, student)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const record = await getRecord(base44, student);
      return Response.json({
        record: { ...record, accommodations: normalizeList(record.accommodations), history: canViewHistory(claims) ? (record.history || []) : [] },
        can_edit: canEditStudent(claims, student),
        can_view_history: canViewHistory(claims),
      });
    }

    if (action === 'saveForStudent') {
      const student = await loadStudent(base44, body.student_id);
      if (!canEditStudent(claims, student)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const current = await getRecord(base44, student);
      const nextAccommodations = normalizeList(body.accommodations || []);
      const summary = summarizeChanges(current.accommodations, nextAccommodations) || 'שמירה ללא שינוי מהותי';
      const historyItem = { at: new Date().toISOString(), by_name: actor.fullName, by_email: actor.email, action: 'manual_update', summary };
      const data = {
        student_id: student.id,
        student_name: student.full_name || '',
        class_id: student.class_id || '',
        class_name: student.class_name || '',
        grade: student.grade || '',
        accommodations: nextAccommodations,
        history: [...(current.history || []), historyItem].slice(-80),
        last_updated_by_name: actor.fullName,
        last_updated_by_email: actor.email,
        last_updated_at: historyItem.at,
      };
      const saved = current.id
        ? await base44.asServiceRole.entities.StudentAccommodation.update(current.id, data)
        : await base44.asServiceRole.entities.StudentAccommodation.create(data);
      return Response.json({ record: saved, can_edit: true, can_view_history: canViewHistory(claims) });
    }

    if (action === 'listForStudents') {
      const ids = new Set((body.student_ids || []).map(String));
      const all = await base44.asServiceRole.entities.StudentAccommodation.list('-updated_date', 1000);
      const scopedStudents = await base44.asServiceRole.entities.Student.list('-updated_date', 1000);
      const studentsById = new Map((scopedStudents || []).map(student => [student.id, student]));
      const records = [];
      for (const record of all || []) {
        if (!ids.has(record.student_id)) continue;
        const student = studentsById.get(record.student_id);
        if (canViewStudent(claims, student)) records.push({ ...record, accommodations: normalizeList(record.accommodations), history: [] });
      }
      return Response.json({ records });
    }

    if (action === 'parseImport') {
      if (!STAFF_ROLES.includes(claims.role) || claims.role === 'student') return Response.json({ error: 'Forbidden' }, { status: 403 });
      try {
        const rows = await parseImport(body.file_url, body.file_name || '');
        return Response.json({ rows });
      } catch (error) {
        const message = String(error?.message || 'לא ניתן לקרוא את הקובץ');
        return Response.json({ error: message }, { status: message.includes('גדול מדי') ? 413 : 400 });
      }
    }

    if (action === 'applyImport') {
      if (!STAFF_ROLES.includes(claims.role) || claims.role === 'student') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!Array.isArray(body.rows) || body.rows.length > 1000) {
        return Response.json({ error: 'Invalid import rows' }, { status: 400 });
      }
      const result = await applyImport(base44, claims, body.rows, actor);
      return Response.json(result);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
