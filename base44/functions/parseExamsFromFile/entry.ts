import { createClientFromRequest } from 'npm:@base44/sdk@0.8.34';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const rateLimitBuckets = new Map<string, number[]>();

function israelDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return true;
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!rateLimit(user.email || user.id || 'anonymous')) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { file_url } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    const safeFileUrl = validateFileUrl(file_url);
    const fileResponse = await fetchValidatedFile(safeFileUrl);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }
    const arrayBuffer = await readWithinLimit(fileResponse, MAX_FILE_BYTES);
    const uint8Array = new Uint8Array(arrayBuffer);

    // Detect file type by extension or try to parse
    let text = '';

    // Try to extract text from different formats
    try {
      // Try as plain text first
      text = new TextDecoder().decode(uint8Array);
    } catch {
      return Response.json({ error: 'Unable to read file' }, { status: 400 });
    }

    // Parse events from text
    const events = parseExamsFromText(text);

    return Response.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Function error:', error);
    if (error instanceof RangeError) {
      return Response.json({ error: 'File is too large' }, { status: 413 });
    }
    if (error instanceof TypeError || /file url|https|redirect/i.test(String(error?.message || ''))) {
      return Response.json({ error: 'Invalid file URL' }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

function parseExamsFromText(text) {
  const events = [];
  const hebrewMonths = {
    'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6,
    'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12
  };

  const hebrewDays = {
    'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
  };

  // Split lines and process
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentDate = null;
  let currentDay = null;

  for (const line of lines) {
    // Try to detect date patterns
    const dateMatch = line.match(/(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})/);
    if (dateMatch) {
      currentDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }

    // Try to detect Hebrew date pattern (day month year)
    const hebrewDateMatch = line.match(/(\d{1,2})\s*(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)\s*(\d{4})?/i);
    if (hebrewDateMatch) {
      const day = hebrewDateMatch[1].padStart(2, '0');
      const month = hebrewMonths[hebrewDateMatch[2]] || 1;
      const year = hebrewDateMatch[3] || new Date().getFullYear();
      currentDate = `${year}-${String(month).padStart(2, '0')}-${day}`;
    }

    // Detect day of week
    for (const [hebDay, dayNum] of Object.entries(hebrewDays)) {
      if (line.includes(hebDay)) {
        currentDay = hebDay;
        break;
      }
    }

    // Parse time pattern (HH:MM)
    const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
    let time = null;
    if (timeMatch) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }

    // Split multiple events in one cell by common separators
    const eventSeparators = [',', '|', '•', '·', '‒', '–', '—'];
    const eventLines = [];
    let currentEvent = line;

    for (const sep of eventSeparators) {
      if (currentEvent.includes(sep)) {
        const parts = currentEvent.split(sep).map(p => p.trim());
        eventLines.push(...parts.filter(p => p.length > 0 && !p.match(/^[\d\-/.]+$/) && !Object.keys(hebrewDays).some(d => p === d)));
        currentEvent = '';
        break;
      }
    }

    const linesToProcess = currentEvent ? [currentEvent] : eventLines;

    for (let eventText of linesToProcess) {
      // Skip if it's just a date or day
      if (eventText.match(/^[\d\-/.]+$/) || Object.values(hebrewDays).includes(eventText)) {
        continue;
      }

      // Try to extract grade/class
      const gradeMatch = eventText.match(/כ?י[א-ת]|י׳\d|י״\d/i);
      let grade = gradeMatch ? gradeMatch[0] : '';

      // Try to detect exam type
      let examType = 'מבחן';
      if (eventText.match(/בחינה|בגרות/i)) examType = 'בגרות';
      else if (eventText.match(/עבודה|מטלה|פרויקט/i)) examType = 'עבודה';
      else if (eventText.match(/משימה/i)) examType = 'משימה';

      // Extract clean exam name (remove time, grade, type indicators)
      let examName = eventText
        .replace(timeMatch ? `${timeMatch[0]}` : '', '')
        .replace(gradeMatch ? gradeMatch[0] : '', '')
        .replace(/מבחן|בגרות|עבודה|בחינה|מטלה|פרויקט|משימה/i, '')
        .trim();

      if (examName.length > 2) {
        const event = {
          id: `temp_${Date.now()}_${Math.random()}`,
          date: currentDate || israelDateString(),
          day: currentDay || '',
          time: time || '',
          title: examName,
          type: examType,
          class_or_grade: grade,
          notes: ''
        };
        events.push(event);
      }
    }
  }

  return events;
}
