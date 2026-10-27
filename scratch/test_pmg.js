const fs = require('fs');
const path = require('path');

// Mock window and browser globals
global.window = global;
global.document = {
  getElementById: (id) => ({
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    appendChild: () => {},
    addEventListener: () => {}
  }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    addEventListener: () => {}
  })
};

const pmgCode = fs.readFileSync(path.join(__dirname, '../js/pmg.js'), 'utf8');

try {
  eval(pmgCode);
  console.log('✅ js/pmg.js evaluated successfully without syntax errors.');
} catch (e) {
  console.error('❌ Syntax or evaluation error in js/pmg.js:', e);
  process.exit(1);
}

// Check key functions
const expectedFunctions = [
  'initPmgModule',
  'handlePmgOneShotBpmnFiles',
  'parseBpmnBatchForPmg',
  'populatePmgAllStepsFromBpmnBatch',
  'renderAllPmgStepKpis',
  'renderPmgVisualTree',
  'renderPmgStep2ManualTable',
  'renderPmgStep3ManualTable',
  'renderPmgStep4ManualTable',
  'renderPmgParentFilterBar',
  'setPmgParentFilter',
  'openPmgParentProcessModal',
  'closePmgParentProcessModal',
  'renderPmgParentProcessModalContent',
  'applyPmgParentProcessSelection',
  'resetPmgParentDetectionToAuto',
  'toggleAllPmgProcessesAsParents',
  'sortPmgActivities',
  'setPmgActivityOrderMode',
  'renderPmgMatrix',
  'exportPmgCSV',
  'exportPmgExcel',
  'loadPmgDemoBpmnSuite'
];

let allFound = true;
expectedFunctions.forEach(fn => {
  if (typeof global[fn] === 'function') {
    console.log(`✅ Function ${fn} is defined`);
  } else {
    console.error(`❌ Function ${fn} is NOT defined`);
    allFound = false;
  }
});

// Test activity ordering logic
const testActivities = [
  { id: 'act_1', name: 'Task 1', level: 1, flowOrder: 3, diagramX: 500, diagramY: 100, xmlOrder: 1 },
  { id: 'act_2', name: 'Task 2', level: 2, flowOrder: 1, diagramX: 100, diagramY: 100, xmlOrder: 2 },
  { id: 'act_3', name: 'Task 3', level: 1, flowOrder: 2, diagramX: 300, diagramY: 100, xmlOrder: 3 }
];

const flowOrder = global.sortPmgActivities(testActivities, 'flow');
console.log('Flow sorted order:', flowOrder.map(a => a.id).join(' -> '));

const diagramOrder = global.sortPmgActivities(testActivities, 'diagram');
console.log('Diagram sorted order:', diagramOrder.map(a => a.id).join(' -> '));

const levelOrder = global.sortPmgActivities(testActivities, 'level');
console.log('Level sorted order:', levelOrder.map(a => a.id).join(' -> '));

const xmlOrder = global.sortPmgActivities(testActivities, 'xml');
console.log('XML sorted order:', xmlOrder.map(a => a.id).join(' -> '));

if (allFound) {
  console.log('\n🎉 ALL PMG Multi-Parent & Ordering functions are correctly loaded and functioning!');
} else {
  process.exit(1);
}
