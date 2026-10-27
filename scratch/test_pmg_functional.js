const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Setup mock browser environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="pmgTreeSearchInput"></div><div id="pmgVisualTreeBox"></div><div id="pmgVisualTreeContainer"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.Blob = dom.window.Blob;

// Load pmg.js
require('../js/pmg.js');

console.log('🧪 Test Fonctionnel Module PMG (Multi-Parents, Sous-processus Partagés, Ordonnancement)...');

// Trigger Demo Suite
window.loadPmgDemoBpmnSuite();

const batch = window.pmgBatchResult;
console.log(`\n1. Détection Multi-Parents :`);
console.log(`   - Fichiers analysés : ${batch.parsedFilesCount}`);
console.log(`   - Processus parents racines détectés : ${batch.rootProcesses.length}`);
batch.rootProcesses.forEach((p, idx) => {
  console.log(`     ✓ P${idx + 1} : [${p.id}] ${p.name}`);
});

if (batch.rootProcesses.length !== 2) {
  throw new Error(`Attendu 2 processus parents, obtenu ${batch.rootProcesses.length}`);
}

console.log(`\n2. Détection Sous-processus Partagés (Multi-Parents) :`);
console.log(`   - Total sous-processus partagés trouvés : ${batch.sharedSubprocesses.length}`);
batch.sharedSubprocesses.forEach(sp => {
  console.log(`     🔗 [${sp.processId}] ${sp.processName} -> Appelé par : ${sp.sharedParentNames.join(' ET ')} (${sp.callerCount} appels)`);
});

if (batch.sharedSubprocesses.length !== 2) {
  throw new Error(`Attendu 2 sous-processus partagés, obtenu ${batch.sharedSubprocesses.length}`);
}

console.log(`\n3. Activités Hiérarchiques Structurées :`);
console.log(`   - Total activités : ${window.pmgActivities.length}`);

// Test the 4 Ordering Modes
console.log(`\n4. Test des 4 Modes d'Ordonnancement :`);

// Mode 1: Flow
const flowSorted = window.sortPmgActivities(window.pmgActivities, 'flow');
console.log(`   🌊 Mode 'flow' : Premier = "${flowSorted[0].name}" (#${flowSorted[0].orderIndex}), Dernier = "${flowSorted[flowSorted.length - 1].name}" (#${flowSorted[flowSorted.length - 1].orderIndex})`);

// Mode 2: Diagram (BPMNDI)
const diagSorted = window.sortPmgActivities(window.pmgActivities, 'diagram');
console.log(`   📐 Mode 'diagram' : Premier = "${diagSorted[0].name}" (X=${diagSorted[0].diagramX}), Dernier = "${diagSorted[diagSorted.length - 1].name}" (X=${diagSorted[diagSorted.length - 1].diagramX})`);

// Mode 3: Level
const lvlSorted = window.sortPmgActivities(window.pmgActivities, 'level');
console.log(`   📊 Mode 'level' : Premier = "${lvlSorted[0].name}" (Niv ${lvlSorted[0].level}), Dernier = "${lvlSorted[lvlSorted.length - 1].name}" (Niv ${lvlSorted[lvlSorted.length - 1].level})`);

// Mode 4: XML
const xmlSorted = window.sortPmgActivities(window.pmgActivities, 'xml');
console.log(`   📄 Mode 'xml' : Premier = "${xmlSorted[0].name}" (XML Pos ${xmlSorted[0].xmlOrder}), Dernier = "${xmlSorted[xmlSorted.length - 1].name}" (XML Pos ${xmlSorted[xmlSorted.length - 1].xmlOrder})`);

console.log('\n🎉 TOUS LES TESTS FONCTIONNELS PMG ONT RÉUSSI AVEC SUCCÈS !');
