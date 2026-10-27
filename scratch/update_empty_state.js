const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `<button class="btn-primary" onclick="switchTab('bpmn-lint-import')">📥 Importer des BPMN</button>`;
const replacementStr = `<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                  <button class="btn-primary" onclick="triggerBpmnLandscapeImport()">📥 Sélectionner des fichiers BPMN</button>
                  <button class="btn-secondary" onclick="switchTab('bpmn-lint-import')">📋 Aller à l'atelier d'audit</button>
                </div>`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replacementStr);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('index.html updated successfully');
} else {
  console.log('Target string not found in index.html');
}
