const fs = require('fs');

const jsPath = 'c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/bpmn_lint.js';
let content = fs.readFileSync(jsPath, 'utf8');

const target = `window.runBpmnLint = function() {
  if (!bpmnLintFiles.length) return;
  lintBuildReport();
  const resultTab = document.getElementById('bpmnLintResultsTab');
  if (resultTab) resultTab.style.display = '';
  switchTab('bpmn-lint-results');
};`;

const replacement = `window.runBpmnLint = function() {
  if (!bpmnLintFiles.length) return;
  lintBuildReport();
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  const finopsTab = document.getElementById('bpmnLintFinopsTab');
  if (resultTab) resultTab.style.display = '';
  if (landscapeTab) landscapeTab.style.display = '';
  if (finopsTab) finopsTab.style.display = '';
  switchTab('bpmn-lint-results');
};`;

if (content.includes("window.runBpmnLint = function() {")) {
  content = content.replace(target, replacement);
  fs.writeFileSync(jsPath, content, 'utf8');
  console.log("Successfully updated runBpmnLint!");
} else {
  console.error("Target not found!");
}
