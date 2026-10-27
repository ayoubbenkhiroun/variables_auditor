const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'bpmn_lint.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Synchronize bpmnLintFiles setter and getter
const oldDef = `let bpmnLintFiles = [];
window.bpmnLintFiles = bpmnLintFiles;
window.getBpmnLintFiles = function() { return bpmnLintFiles; };`;

const newDef = `let bpmnLintFiles = [];
window.bpmnLintFiles = bpmnLintFiles;
function getBpmnLintFiles() {
  if (typeof window !== 'undefined' && Array.isArray(window.bpmnLintFiles) && window.bpmnLintFiles.length > 0) {
    return window.bpmnLintFiles;
  }
  return bpmnLintFiles;
}
function setBpmnLintFiles(files) {
  bpmnLintFiles = Array.isArray(files) ? files : [];
  if (typeof window !== 'undefined') window.bpmnLintFiles = bpmnLintFiles;
  return bpmnLintFiles;
}
window.getBpmnLintFiles = getBpmnLintFiles;
window.setBpmnLintFiles = setBpmnLintFiles;`;

content = content.replace(oldDef, newDef);

// 2. In auditBpmnLintFile, use getBpmnLintFiles()
content = content.replace(
  `const isTargetInBatch = (typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles) && bpmnLintFiles.some(f => {`,
  `const batchList = getBpmnLintFiles();
    const isTargetInBatch = (Array.isArray(batchList) && batchList.some(f => {`
);

content = content.replace(
  `if (!targetProcEl && typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles)) {
      for (const f of bpmnLintFiles) {`,
  `if (!targetProcEl) {
      const activeBatch = getBpmnLintFiles();
      for (const f of (activeBatch || [])) {`
);

// 3. Export setBpmnLintFiles and getBpmnLintFiles
content = content.replace(
  `module.exports = { auditBpmnLintFile, loadBpmnLintRules, DEFAULT_BPMN_LINT_RULES };`,
  `module.exports = { auditBpmnLintFile, loadBpmnLintRules, DEFAULT_BPMN_LINT_RULES, setBpmnLintFiles, getBpmnLintFiles };`
);

content = content.replace(
  `window.auditBpmnLintFile = auditBpmnLintFile;
  window.loadBpmnLintRules = loadBpmnLintRules;
  window.DEFAULT_BPMN_LINT_RULES = DEFAULT_BPMN_LINT_RULES;`,
  `window.auditBpmnLintFile = auditBpmnLintFile;
  window.loadBpmnLintRules = loadBpmnLintRules;
  window.DEFAULT_BPMN_LINT_RULES = DEFAULT_BPMN_LINT_RULES;
  window.setBpmnLintFiles = setBpmnLintFiles;
  window.getBpmnLintFiles = getBpmnLintFiles;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('bpmn_lint.js synchronized bpmnLintFiles successfully');
