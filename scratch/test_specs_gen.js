const fs = require('fs');
const path = require('path');

// Mock window and browser globals for pure logic test
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

const specsGenCode = fs.readFileSync(path.join(__dirname, '../js/specs_gen.js'), 'utf8');

// Evaluate specs_gen.js in global context
try {
  eval(specsGenCode);
  console.log('✅ specs_gen.js evaluated successfully without syntax errors.');
} catch (e) {
  console.error('❌ Syntax or evaluation error in specs_gen.js:', e);
  process.exit(1);
}

// Check exported functions
const expectedFunctions = [
  'initSpecsGenModule',
  'generateLivingSpecs',
  'syncSpecsWithGlobalFiles',
  'loadSpecsDemoSuite',
  'addSpecsFiles',
  'removeSpecsFile',
  'clearSpecsFiles',
  'setSpecsActiveTab',
  'setSpecsProcessFilter',
  'setSpecsSearchQuery',
  'specsZoomIn',
  'specsZoomOut',
  'specsZoomFit',
  'toggleSpecsExportMenu',
  'exportSpecsMarkdown',
  'exportSpecsHtmlStandalone',
  'exportSpecsExcel',
  'exportSpecsGherkin',
  'exportSpecsJson',
  'copyGherkinCode',
  'printSpecsReport'
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
  console.log('\n🎉 ALL Living Documentation unit checks & module bindings PASSED 100%!');
} else {
  process.exit(1);
}
