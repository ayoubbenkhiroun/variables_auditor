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
    style: { display: 'none' },
    classList: {
      classes: new Set(),
      add: function(c) { this.classes.add(c); },
      remove: function(c) { this.classes.delete(c); },
      contains: function(c) { return this.classes.has(c); }
    }
  };
}

global.document = {
  addEventListener: function() {},
  getElementById: function(id) {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement(id);
    }
    return mockElements[id];
  }
};

global.window = global;
global.esc = (s) => s || '';
global.escHtml = (s) => s || '';
global.escAttr = (s) => s || '';
global.sanitizeFormula = (s) => s || '';

eval(pmgCode);

window.pmgActivities = [
  { id: 'act_1', name: 'Vérifier COMSIS', type: 'User Task', entity: 'CDD', inputs: ['dossierId'], outputs: ['isOk'], parentProcessName: 'Process Principal' },
  { id: 'act_2', name: 'Notifier ANFR', type: 'Service Task', entity: 'REGLEMENTAIRE', inputs: ['isOk'], outputs: ['ack'], parentProcessName: 'Process Principal' }
];

console.log("Testing switchPmgSubView('grid')...");
window.switchPmgSubView('grid');
const gridSection = document.getElementById('pmgSubViewGrid');
console.log("Grid section display:", gridSection.style.display);
const gridContainer = document.getElementById('pmgMatrixGlobalGridContainer');
console.log("Grid container HTML populated length:", gridContainer.innerHTML.length);

const gridOk = gridSection.style.display === 'block' && gridContainer.innerHTML.length > 50;

console.log("Testing switchPmgSubView('iocross')...");
window.switchPmgSubView('iocross');
const ioSection = document.getElementById('pmgSubViewIoCross');
console.log("IoCross section display:", ioSection.style.display);
const ioContainer = document.getElementById('pmgIoCrossContainer');
console.log("IoCross container HTML populated length:", ioContainer.innerHTML.length);

const ioOk = ioSection.style.display === 'block' && ioContainer.innerHTML.length > 50;

if (gridOk && ioOk) {
  console.log("🎉 ALL SUBVIEW TESTS (GRID & IOCROSS) PASSED 100%!");
} else {
  console.error("❌ Subview test failed");
  process.exit(1);
}
