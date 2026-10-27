const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../js/bpmn_lint.js');
let content = fs.readFileSync(targetFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Namespace Check Patch
const oldNsBlock = `  if (root.namespaceURI !== 'http://www.omg.org/spec/BPMN/20100524/MODEL') {
    lintAddIssue(issues, 'definitions-namespace', root, 'Le document doit utiliser le namespace BPMN 2.0 du modèle OMG.', file.fileName);
  }`;

const newNsBlock = `  const hasValidBpmnNs = root.namespaceURI === 'http://www.omg.org/spec/BPMN/20100524/MODEL' ||
    lintAttribute(root, ['xmlns:bpmn', 'xmlns', 'targetNamespace']) === 'http://www.omg.org/spec/BPMN/20100524/MODEL' ||
    (root.getAttribute('xmlns:bpmn') || '').includes('BPMN/20100524/MODEL');
  if (!hasValidBpmnNs) {
    lintAddIssue(issues, 'definitions-namespace', root, 'Le document doit utiliser le namespace BPMN 2.0 du modèle OMG (http://www.omg.org/spec/BPMN/20100524/MODEL).', file.fileName);
  }`;

if (!content.includes(oldNsBlock)) {
  console.error('ERROR: oldNsBlock not found');
  process.exit(1);
}
content = content.replace(oldNsBlock, newNsBlock);

// 2. Call target provided in batch patch
const oldCallBlock = `    if (target && idToProcess.size && !idToProcess.has(target)) {
      lintAddIssue(issues, 'call-target-provided', activity, \`Le processus appelé « \${target} » n’est pas inclus dans ce fichier.\`, file.fileName);
    }`;

const newCallBlock = `    const isTargetInBatch = (typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles) && bpmnLintFiles.some(f => {
      if (!f || !f.xmlDoc) return false;
      const fProcs = Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process');
      return fProcs.some(p => (p.getAttribute('id') || '').trim() === target);
    })) || (typeof bpmnBatch !== 'undefined' && Array.isArray(bpmnBatch) && bpmnBatch.some(b => b.processId === target));

    if (target && !idToProcess.has(target) && !isTargetInBatch) {
      lintAddIssue(issues, 'call-target-provided', activity, \`Le processus appelé « \${target} » n’est fourni ni dans ce fichier ni dans le lot chargé.\`, file.fileName);
    }`;

if (!content.includes(oldCallBlock)) {
  console.error('ERROR: oldCallBlock not found');
  process.exit(1);
}
content = content.replace(oldCallBlock, newCallBlock);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: bpmn_lint.js patched successfully for namespace and call activity batch resolution!');
