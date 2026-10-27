const fs = require('fs');
const path = require('path');

const FEEL_RESERVED = new Set([
  'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds',
  'string', 'number', 'boolean', 'context', 'list', 'null', 'true', 'false', 'function',
  'for', 'return', 'if', 'then', 'else', 'some', 'every', 'satisfies', 'instance', 'of',
  'and', 'or', 'not', 'execution', 'task', 'between', 'count', 'sum', 'min', 'max', 'avg',
  'contains', 'abs', 'floor', 'ceiling', 'round', 'sort', 'reverse', 'flatten', 'distinct',
  'values', 'get', 'value', 'put', 'empty', 'all', 'any', 'now', 'today'
]);

function simulateExtractFeel(text) {
  let clean = String(text || '')
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ')
    .replace(/\.\s*[\p{L}_][\p{L}\p{N}_]*/gu, ' ')
    .replace(/[\p{L}_][\p{L}\p{N}_]*\s*(?=\()/gu, ' ')
    .replace(/\b(list\s+contains|string\s+length|string\s+join|starts\s+with|ends\s+with|substring\s+before|substring\s+after|date\s+and\s+time|years\s+and\s+months\s+duration|days\s+and\s+time\s+duration|get\s+value|get\s+entries|distinct\s+values|insert\s+before|instance\s+of)\b/gi, ' ');
  return Array.from(new Set((clean.match(/[\p{L}_][\p{L}\p{N}_]*/gu) || []).filter(name => !FEEL_RESERVED.has(name.toLowerCase()) && isNaN(Number(name)))));
}

console.log('Sim test 1 (number):', simulateExtractFeel('= migration="0" and migration_loop < number(migration_max_wait_loop)'));
console.log('Sim test 2 (list contains):', simulateExtractFeel('= migration="0" and list contains(migrationActivities, "ETAPE_1")'));
console.log('Sim test 3 (string concat):', simulateExtractFeel('="Déposer les IA : " + livrable'));
