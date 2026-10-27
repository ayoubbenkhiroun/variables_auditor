global.window = global;
const parser = require('../js/bpmn_parser.js');
const linter = require('../js/bpmn_lint.js');

const expr = '= migration="O" and migration_loop < number(migration_max_wait_loop)';
console.log('Result of extractFeelVariables:', parser.extractFeelVariables(expr));

const text = String(expr || '');
const clean = text
  .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ')
  .replace(/\.\s*[A-Za-z_][A-Za-z0-9_]*/g, ' ')
  .replace(/[A-Za-z_][A-Za-z0-9_]*\s*(?=\()/g, ' ');
const reserved = new Set(['true', 'false', 'null', 'empty', 'and', 'or', 'not', 'if', 'then', 'else', 'for', 'in', 'return', 'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'execution', 'task', 'authenticatedUserId', 'getVariable', 'setVariable', 'list', 'number', 'string', 'boolean', 'contains']);
console.log('clean:', clean);
console.log('fallback:', Array.from(new Set((clean.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(name => !reserved.has(name.toLowerCase())))));
