const fs = require('fs');
const path = require('path');

const pmgCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'pmg.js'), 'utf8');

// Mock browser window and document
const mockElements = {};

function createMockElement(id, initialVal = '') {
  return {
    id: id,
    value: initialVal,
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      classes: new Set(),
      add: function(c) { this.classes.add(c); },
      remove: function(c) { this.classes.delete(c); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        } else if (force) {
          this.classes.add(c);
        } else {
          this.classes.delete(c);
        }
      },
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
  },
  querySelectorAll: function() {
    return [];
  },
  querySelector: function() {
    return null;
  }
};

global.window = global;
global.esc = (s) => s || '';
global.escHtml = (s) => s || '';
global.escAttr = (s) => s || '';

eval(pmgCode);

console.log("Testing PMG Filter Logic...");

window.pmgTempSubprocesses = [
  { id: 'act_1', name: 'Contrôler dossier', type: 'User Task', entity: 'Direction Métier', userGroup: 'Chefs de projet', level: 1, inputs: ['dossierId'], outputs: ['isValid'] },
  { id: 'act_2', name: 'Appel API ANFR', type: 'Service Task', entity: 'Équipe IT', userGroup: '', level: 2, inputs: ['anfrReq'], outputs: ['anfrRes'] },
  { id: 'act_3', name: 'Sous-processus Validation', type: 'Call Activity', entity: 'Direction Métier', userGroup: '', level: 2, inputs: [], outputs: [] }
];

// Test step 3 render
window.renderPmgStep2ManualTable();
console.log("Step 3 Table rendered rows successfully.");

// Test filter by User Task
window.pmgColFilters.step3.type = 'usertask';
window.renderPmgStep2ManualTable();
console.log("Filtered Step 3 count:", document.getElementById('pmgStep3FilterCount').innerHTML);

// Test filter by Text
window.pmgColFilters.step3.type = 'all';
window.pmgColFilters.step3.act = 'anfr';
window.renderPmgStep2ManualTable();
console.log("Filtered Step 3 text search count:", document.getElementById('pmgStep3FilterCount').innerHTML);

console.log("🎉 All filter tests executed successfully!");
