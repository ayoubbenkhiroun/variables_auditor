const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'bpmn_lint.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldTargetSearch = `    let targetProcEl = idToProcess.get(target) || null;
    if (!targetProcEl && typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles)) {
      for (const f of bpmnLintFiles) {
        if (!f || !f.xmlDoc) continue;
        const fProcs = Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process');
        const found = fProcs.find(p => (p.getAttribute('id') || '').trim() === target);
        if (found) {
          targetProcEl = found;
          break;
        }
      }
    }`;

const newTargetSearch = `    let targetProcEl = idToProcess.get(target) || null;
    if (!targetProcEl && typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles)) {
      for (const f of bpmnLintFiles) {
        if (!f || !f.xmlDoc) continue;
        const docRoot = f.xmlDoc.documentElement || f.xmlDoc;
        const fProcs = [];
        if (docRoot && (docRoot.localName || '').toLowerCase() === 'process') {
          fProcs.push(docRoot);
        }
        if (typeof f.xmlDoc.getElementsByTagName === 'function') {
          fProcs.push(...Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process'));
        }
        const found = fProcs.find(p => (p.getAttribute('id') || '').trim() === target);
        if (found) {
          targetProcEl = found;
          break;
        }
      }
    }`;

content = content.replace(oldTargetSearch, newTargetSearch);
fs.writeFileSync(filePath, content, 'utf8');
console.log('bpmn_lint.js updated targetProcEl resolution');
