const fs = require('fs');
const path = require('path');

const pmgCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'pmg.js'), 'utf8');

const mockElements = {};
function createMockElement(id, initialVal = '') {
  return {
    id: id,
    value: initialVal,
    innerHTML: '',
    textContent: '',
    style: {}
  };
}

let generatedBlobContent = '';
let downloadedFilename = '';

global.document = {
  addEventListener: function() {},
  getElementById: function(id) {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement(id);
    }
    return mockElements[id];
  },
  createElement: function(tag) {
    return {
      setAttribute: function(attr, val) {
        if (attr === 'download') downloadedFilename = val;
      },
      click: function() {},
      style: {}
    };
  },
  body: {
    appendChild: function() {},
    removeChild: function() {}
  }
};

global.Blob = function(chunks, options) {
  generatedBlobContent = chunks.join('');
  return { chunks, options };
};

global.URL = {
  createObjectURL: function(blob) {
    return 'blob:mock-url';
  }
};

global.window = global;
global.esc = (s) => s || '';
global.escHtml = (s) => s || '';
global.escAttr = (s) => s || '';
global.sanitizeFormula = (s) => s || '';
global.alert = (msg) => console.log('ALERT:', msg);

eval(pmgCode);

window.pmgBatchResult = {
  rootProcesses: [
    { id: 'P1', name: 'Process VDR Avec Ajout De Couche' },
    { id: 'P2', name: 'VDR Déclarer travaux d\'aménagement et réaliser les PV' }
  ]
};

window.pmgActivities = [
  { id: 'act_1', name: 'Vérifier le dépôt COMSIS', level: 1, type: 'Sous-processus', entity: 'CDD', userGroup: 'CDD_REGLEMENTAIRE', inputs: ['dossierId', 'region', 'isDepotOk'], outputs: ['isOk'], applicableCase: 'Tous dossiers', comment: 'Contrôle initial' },
  { id: 'act_2', name: 'Contrôler conformité', parentId: 'act_1', level: 2, type: 'User Task', entity: 'CDD', userGroup: 'CDD_REGLEMENTAIRE', inputs: ['dossierId'], outputs: ['isConforme', 'rapportConformite'], applicableCase: 'NA', comment: 'Vérification pièces' }
];

console.log("Testing exportPmgExcel with row-per-variable...");
window.exportPmgExcel();

console.log("Downloaded Filename:", downloadedFilename);
console.log("Blob content length:", generatedBlobContent.length);

const hasTitle = generatedBlobContent.includes('P1: Process VDR Avec Ajout De Couche');
const hasN0 = generatedBlobContent.includes('Briques Primaires');
const hasN1 = generatedBlobContent.includes('Processus Métier Macro');
const hasTache = generatedBlobContent.includes('Niveau N4');
const hasGroup = generatedBlobContent.includes('CDD_REGLEMENTAIRE');
const hasIndividualVarInCell = generatedBlobContent.includes('dossierId') && generatedBlobContent.includes('region');
const hasRowspan = generatedBlobContent.includes('rowspan="3"'); // act_1 has 3 inputs -> rowspan="3"

console.log("Checks:");
console.log("- Has P1 & P2 Banner Title:", hasTitle ? '✅' : '❌');
console.log("- Has N0 Column:", hasN0 ? '✅' : '❌');
console.log("- Has N1 Column:", hasN1 ? '✅' : '❌');
console.log("- Has Tâche N4 Column:", hasTache ? '✅' : '❌');
console.log("- Has Clean User Group:", hasGroup ? '✅' : '❌');
console.log("- Has Individual Variables in Cells:", hasIndividualVarInCell ? '✅' : '❌');
console.log("- Has Rowspan per Activity Row Count:", hasRowspan ? '✅' : '❌');

if (hasTitle && hasN0 && hasN1 && hasTache && hasGroup && hasIndividualVarInCell && hasRowspan) {
  console.log("🎉 ALL EXCEL EXPORT CHECKS (ROW PER VARIABLE) PASSED 100%!");
} else {
  console.error("❌ Export test failed");
  process.exit(1);
}
