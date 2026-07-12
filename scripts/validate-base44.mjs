import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const entityDir = path.join(root, 'base44', 'entities');
const functionDir = path.join(root, 'base44', 'functions');
const expectedGrades = new Set(['ז', 'ח', 'ט', 'י', 'יא', 'יב']);
const scopedRoles = new Set(['division_manager', 'grade_coordinator', 'coordinator']);
const serverMutationEntities = new Set([
  'Announcement', 'AnnouncementRead', 'AttendanceRecord', 'Communication',
  'CommunityServiceReport', 'DisciplineEvent', 'Exam', 'ExamCompletion',
  'ExamGradeReport', 'FamilySensitiveInfo', 'ParentContact', 'PerformanceReview',
  'ScheduleSlot', 'ScheduledConversation', 'SmartAlert', 'Student', 'Task',
  'TeacherNote', 'TreatmentCase', 'UrgentFlag',
]);
const anchoredClassEntities = new Set(['Announcement', 'Exam', 'ScheduleSlot']);
const requiredEntityAutomations = new Map([
  ['checkAttendanceAlerts', ['AttendanceRecord']],
  ['queueSmartPushNotifications', [
    'AttendanceRecord', 'CommunityServiceReport', 'Communication', 'DisciplineEvent',
    'ExamGradeReport', 'Task', 'UrgentFlag', 'TreatmentCase',
  ]],
]);
const requiredScheduledAutomations = new Set([
  'scheduleConversationReminders',
  'sendQueuedSmartPushNotifications',
]);
const errors = [];

const listFiles = (directory, predicate) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath, predicate) : predicate(fullPath) ? [fullPath] : [];
  });

const parseJsonc = (filePath) => {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = ts.parseConfigFileTextToJson(filePath, text);
  if (parsed.error) {
    errors.push(`${path.relative(root, filePath)}: invalid JSONC (${parsed.error.messageText})`);
    return null;
  }
  return { data: parsed.config, text };
};

const hasKeyDeep = (value, key) => {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value).some(child => hasKeyDeep(child, key));
};

const rolesIn = (value, found = new Set()) => {
  if (!value || typeof value !== 'object') return found;
  if (typeof value.user_condition?.role === 'string') found.add(value.user_condition.role);
  for (const child of Object.values(value)) rolesIn(child, found);
  return found;
};

const validateGradeValues = (value, fileLabel) => {
  if (!value || typeof value !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(value, 'data.grade')) {
    const condition = value['data.grade'];
    const grades = Array.isArray(condition?.$in) ? condition.$in : [];
    for (const grade of grades) {
      if (!expectedGrades.has(grade)) errors.push(`${fileLabel}: invalid RLS grade value ${JSON.stringify(grade)}`);
    }
  }
  for (const child of Object.values(value)) validateGradeValues(child, fileLabel);
};

const entityFiles = listFiles(entityDir, filePath => filePath.endsWith('.jsonc'));
for (const filePath of entityFiles) {
  const fileLabel = path.relative(root, filePath);
  const parsed = parseJsonc(filePath);
  if (!parsed) continue;
  const { data, text } = parsed;

  const nonAscii = [...text].find(character => character.codePointAt(0) > 127);
  if (nonAscii) errors.push(`${fileLabel}: contains non-ASCII text; use \\uXXXX escapes to prevent encoding corruption`);
  if (!data?.name || data?.type !== 'object' || !data?.properties) errors.push(`${fileLabel}: incomplete entity schema`);

  for (const field of data?.required || []) {
    if (!Object.prototype.hasOwnProperty.call(data.properties || {}, field)) errors.push(`${fileLabel}: missing required property ${field}`);
  }
  if (anchoredClassEntities.has(data?.name) && !(data.required || []).includes('class_id')) {
    errors.push(`${fileLabel}: class_id must remain required as the canonical scope anchor`);
  }

  validateGradeValues(data?.rls, fileLabel);
  if (serverMutationEntities.has(data?.name)) {
    for (const operation of ['create', 'update', 'delete']) {
      const operationRoles = rolesIn(data?.rls?.[operation]);
      const expected = operationRoles.size === 2
        && operationRoles.has('admin')
        && operationRoles.has('system_admin');
      if (!expected) errors.push(`${fileLabel}: ${operation} must be server-only (admin/system_admin)`);
    }
  }
  for (const [operation, rule] of Object.entries(data?.rls || {})) {
    for (const branch of rule?.$or || []) {
      const branchRoles = rolesIn(branch);
      for (const role of branchRoles) {
        if (scopedRoles.has(role) && !hasKeyDeep(branch, 'data.grade')) {
          errors.push(`${fileLabel}: ${operation} has unscoped ${role} branch`);
        }
        if (role === 'homeroom_teacher' && !hasKeyDeep(branch, 'data.class_id')) {
          errors.push(`${fileLabel}: ${operation} has unscoped homeroom_teacher branch`);
        }
      }
    }
  }
}

const jsoncFiles = [
  path.join(root, 'base44', 'config.jsonc'),
  ...listFiles(path.join(root, 'base44', 'agents'), filePath => filePath.endsWith('.jsonc')),
];
for (const filePath of jsoncFiles) parseJsonc(filePath);

const functionFiles = listFiles(functionDir, filePath => filePath.endsWith('entry.ts'));
let functionManifestCount = 0;
let automationCount = 0;
for (const filePath of functionFiles) {
  const functionDirectory = path.dirname(filePath);
  const functionName = path.basename(functionDirectory);
  const manifestPath = path.join(functionDirectory, 'function.jsonc');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${path.relative(root, functionDirectory)}: missing required function.jsonc`);
  } else {
    const manifest = parseJsonc(manifestPath);
    if (manifest) {
      functionManifestCount += 1;
      const config = manifest.data || {};
      const automations = Array.isArray(config.automations) ? config.automations : [];
      automationCount += automations.length;
      if (config.name !== functionName) {
        errors.push(`${path.relative(root, manifestPath)}: name must match directory ${functionName}`);
      }
      if (config.entry !== path.basename(filePath)) {
        errors.push(`${path.relative(root, manifestPath)}: entry must reference ${path.basename(filePath)}`);
      }
      for (const entityName of requiredEntityAutomations.get(functionName) || []) {
        const hook = automations.find(item => item?.type === 'entity' && item.entity_name === entityName);
        const events = new Set(hook?.event_types || []);
        if (!hook || hook.is_active === false || !events.has('create') || !events.has('update')) {
          errors.push(`${path.relative(root, manifestPath)}: missing active create/update hook for ${entityName}`);
        }
      }
      if (requiredScheduledAutomations.has(functionName)) {
        const schedule = automations.find(item => item?.type === 'scheduled'
          && item.schedule_mode === 'recurring'
          && item.schedule_type === 'cron');
        if (!schedule || schedule.is_active === false || schedule.cron_expression !== '*/5 * * * *') {
          errors.push(`${path.relative(root, manifestPath)}: missing active five-minute recurring schedule`);
        }
      }
    }
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: filePath,
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(`${path.relative(root, filePath)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
  }
}

const mutationFunction = path.join(functionDir, 'mutateScopedEntity', 'entry.ts');
if (!fs.existsSync(mutationFunction)) errors.push('base44/functions/mutateScopedEntity/entry.ts: missing server mutation proxy');
const mutationFunctionSource = fs.existsSync(mutationFunction) ? fs.readFileSync(mutationFunction, 'utf8') : '';
const accessGuardSource = fs.readFileSync(path.join(root, 'src', 'lib', 'accessGuard.js'), 'utf8');
if (!accessGuardSource.includes("functions.invoke('mutateScopedEntity'")) {
  errors.push('src/lib/accessGuard.js: scoped writes are not routed through mutateScopedEntity');
}
if (!accessGuardSource.includes('response?.data?.result')) {
  errors.push('src/lib/accessGuard.js: mutateScopedEntity response shape is not unwrapped');
}
for (const entityName of serverMutationEntities) {
  if (!mutationFunctionSource.includes(`'${entityName}'`)) {
    errors.push(`base44/functions/mutateScopedEntity/entry.ts: missing ${entityName} allowlist entry`);
  }
  if (!accessGuardSource.includes(`'${entityName}'`)) {
    errors.push(`src/lib/accessGuard.js: missing ${entityName} guarded mutation entry`);
  }
}

if (errors.length) {
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Validated ${entityFiles.length} entities, ${functionFiles.length} backend functions, `
    + `${functionManifestCount} function manifests and ${automationCount} automations.\n`,
  );
}
