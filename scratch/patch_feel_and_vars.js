const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../js/bpmn_lint.js');
let content = fs.readFileSync(targetFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Mettre à niveau lintExpressionIdentifiers pour utiliser BpmnZeebeParser.extractFeelVariables
const oldExprBlock = `function lintExpressionIdentifiers(expression) {
  const text = String(expression || '');
  if (!/(?:\\$\\{|#\\{|^\\s*=)/.test(text)) return [];
  const clean = text
    .replace(/"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'/g, ' ')
    .replace(/\\.\\s*[A-Za-z_][A-Za-z0-9_]*/g, ' ');
  const reserved = new Set(['true', 'false', 'null', 'empty', 'and', 'or', 'not', 'if', 'then', 'else', 'for', 'in', 'return', 'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'execution', 'task', 'authenticatedUserId', 'getVariable', 'setVariable']);
  return Array.from(new Set((clean.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(name => !reserved.has(name.toLowerCase()))));
}`;

const newExprBlock = `function lintExpressionIdentifiers(expression) {
  if (typeof BpmnZeebeParser !== 'undefined' && typeof BpmnZeebeParser.extractFeelVariables === 'function') {
    return BpmnZeebeParser.extractFeelVariables(expression);
  }
  const text = String(expression || '');
  if (!/(?:\\$\\{|#\\{|^\\s*=)/.test(text)) return [];
  const clean = text
    .replace(/"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'/g, ' ')
    .replace(/\\.\\s*[A-Za-z_][A-Za-z0-9_]*/g, ' ')
    .replace(/[A-Za-z_][A-Za-z0-9_]*\\s*(?=\\()/g, ' ');
  const reserved = new Set(['true', 'false', 'null', 'empty', 'and', 'or', 'not', 'if', 'then', 'else', 'for', 'in', 'return', 'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'execution', 'task', 'authenticatedUserId', 'getVariable', 'setVariable', 'list', 'number', 'string', 'boolean', 'contains']);
  return Array.from(new Set((clean.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(name => !reserved.has(name.toLowerCase()))));
}`;

if (!content.includes(oldExprBlock)) {
  console.error('ERROR: oldExprBlock not found');
  process.exit(1);
}
content = content.replace(oldExprBlock, newExprBlock);

// 2. Mettre à niveau le contrôle variable-naming pour tolérer les variables de migration standard
const oldVarBlock = `    // Vérification du camelCase
    if (lintRule('variable-naming')) {
      if (typeof checkVariable === 'function') {
        const result = checkVariable(name);
        result.issues.forEach(issue => lintAddIssue(issues, 'variable-naming', element, \`Variable « \${name} » : \${issue.msg}\`, file.fileName, issue.sev === 'warn' ? 'warning' : undefined));
      } else if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        lintAddIssue(issues, 'variable-naming', element, \`La variable « \${name} » doit être en camelCase strict sans accents ni caractères spéciaux (ex: \${lintConvertToCamelCase(name)}).\`, file.fileName);
      }
    }`;

const newVarBlock = `    // Tolérance pour les variables techniques de migration reconnues
    const isTechnicalMigrationVar = ['migration', 'old_migration', 'migration_loop', 'migration_max_wait_loop', 'migrationactivities'].includes(name.toLowerCase());

    // Vérification du camelCase (hors variables techniques de migration)
    if (lintRule('variable-naming') && !isTechnicalMigrationVar) {
      if (typeof checkVariable === 'function') {
        const result = checkVariable(name);
        result.issues.forEach(issue => lintAddIssue(issues, 'variable-naming', element, \`Variable « \${name} » : \${issue.msg}\`, file.fileName, issue.sev === 'warn' ? 'warning' : undefined));
      } else if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        lintAddIssue(issues, 'variable-naming', element, \`La variable « \${name} » doit être en camelCase strict sans accents ni caractères spéciaux (ex: \${lintConvertToCamelCase(name)}).\`, file.fileName);
      }
    }`;

if (!content.includes(oldVarBlock)) {
  console.error('ERROR: oldVarBlock not found');
  process.exit(1);
}
content = content.replace(oldVarBlock, newVarBlock);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: FEEL functions & migration variable naming patched in bpmn_lint.js!');
