const fs = require('fs');
const path = require('path');

const pmgCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'pmg.js'), 'utf8');

global.window = global;
eval(pmgCode);

const testCases = [
  { input: '=["CDD_SUPPORT_CENTRAL"]', expected: 'CDD_SUPPORT_CENTRAL' },
  { input: '=["CDD_SUPPORT_CENTRAL"]', expected: 'CDD_SUPPORT_CENTRAL' },
  { input: '=[groupeResponsable]', expected: 'groupeResponsable' },
  { input: '=["CDD_1", "CDD_2"]', expected: 'CDD_1, CDD_2' },
  { input: '="CDD_SUPPORT_CENTRAL"', expected: 'CDD_SUPPORT_CENTRAL' },
  { input: 'CDD_SUPPORT_CENTRAL', expected: 'CDD_SUPPORT_CENTRAL' },
  { input: '["CDD_SUPPORT_CENTRAL"]', expected: 'CDD_SUPPORT_CENTRAL' }
];

console.log("Testing cleanPmgUserGroupName...");
let allPassed = true;
testCases.forEach((tc, idx) => {
  const result = window.cleanPmgUserGroupName(tc.input);
  const pass = result === tc.expected;
  console.log(`Test ${idx + 1}: input='${tc.input}' -> output='${result}' [${pass ? '✅ OK' : '❌ FAIL'}]`);
  if (!pass) allPassed = false;
});

if (allPassed) {
  console.log("🎉 All cleanPmgUserGroupName test cases passed 100%!");
} else {
  process.exit(1);
}
