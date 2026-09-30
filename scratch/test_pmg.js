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
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
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
  'renderPmgStep1Kpis',
  'renderPmgStep2Kpis',
  'renderPmgStep3Kpis',
  'renderPmgStep4Kpis',
  'renderPmgStep5Kpis',
  'renderPmgVisualTree',
  'renderPmgStep2ManualTable',
  'renderPmgStep3ManualTable',
  'renderPmgStep4ManualTable',
  'switchPmgSubView',
  'autoFillPmgMissingDoc',
  'renderPmgGovernanceAudit',
  'renderPmgRaciMatrix',
  'renderPmgIoCrossMatrix',
  'exportPmgMultiSheetExcel',
  'autoFixPmgUserGroups',
  'autoHarmonizePmgModes'
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

if (allFound) {
  console.log('\n🎉 ALL PMG Step Wizard & KPI functions are correctly loaded and exported!');
} else {
  process.exit(1);
}
