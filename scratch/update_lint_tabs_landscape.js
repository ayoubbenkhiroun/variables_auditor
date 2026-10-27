const fs = require('fs');

const jsPath = 'c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/bpmn_lint.js';
let content = fs.readFileSync(jsPath, 'utf8');

// Replace runBpmnLint
content = content.replace(
  /window\.runBpmnLint\s*=\s*function\(\)\s*\{[\s\S]*?switchTab\('bpmn-lint-results'\);\s*\};/,
  `window.runBpmnLint = function() {
  if (!bpmnLintFiles.length) return;
  lintBuildReport();
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = '';
  if (landscapeTab) landscapeTab.style.display = '';
  switchTab('bpmn-lint-results');
};`
);

// Replace addBpmnLintFiles
content = content.replace(
  /const resultTab = document\.getElementById\('bpmnLintResultsTab'\);\s*if \(resultTab\) resultTab\.style\.display = 'none';\s*renderBpmnLintFiles\(\);/,
  `const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = 'none';
  if (landscapeTab) landscapeTab.style.display = bpmnLintFiles.length ? '' : 'none';
  renderBpmnLintFiles();`
);

// Replace clearBpmnLintFiles
content = content.replace(
  /window\.clearBpmnLintFiles\s*=\s*function\(\)\s*\{[\s\S]*?renderBpmnLintResults\(\);\s*\};/,
  `window.clearBpmnLintFiles = function() {
  bpmnLintFiles = [];
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = 'none';
  if (landscapeTab) landscapeTab.style.display = 'none';
  renderBpmnLintFiles();
  renderBpmnLintResults();
};`
);

fs.writeFileSync(jsPath, content, 'utf8');
console.log("Updated bpmn_lint.js tabs successfully!");
