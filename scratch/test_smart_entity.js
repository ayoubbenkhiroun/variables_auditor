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
    style: {},
    checked: false,
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
  querySelector: function(sel) {
    if (sel.includes('pmgSmartScopeMode')) {
      return { value: 'empty_only' };
    }
    return null;
  }
};

global.window = global;
global.esc = (s) => s || '';
global.escHtml = (s) => s || '';
global.escAttr = (s) => s || '';
global.alert = (msg) => console.log('ALERT:', msg);

eval(pmgCode);

window.pmgTempSubprocesses = [
  { id: 'act_1', name: 'Act 1', entity: 'CDD', userGroup: 'CDD_SUPPORT_CENTRAL', level: 1 },
  { id: 'act_2', name: 'Act 2', entity: '', userGroup: '', level: 2, parentId: 'act_1' },
  { id: 'act_3', name: 'Act 3', entity: 'Non défini', userGroup: 'ADV_TEST', level: 2, parentId: 'act_1' }
];

console.log("Testing Smart Entity Assignment on 'empty_only'...");
document.getElementById('pmgSmartTargetEntityInput').value = 'Direction Réseau';

const { impacted } = window.getPmgImpactedActivities();
console.log(`Impacted count: ${impacted.length}`);

window.applyPmgSmartEntityAssignment();

console.log('act_1 entity (should still be CDD):', window.pmgTempSubprocesses[0].entity);
console.log('act_2 entity (should be Direction Réseau):', window.pmgTempSubprocesses[1].entity);
console.log('act_3 entity (should be Direction Réseau):', window.pmgTempSubprocesses[2].entity);

if (window.pmgTempSubprocesses[0].entity === 'CDD' &&
    window.pmgTempSubprocesses[1].entity === 'Direction Réseau' &&
    window.pmgTempSubprocesses[2].entity === 'Direction Réseau') {
  console.log("🎉 Smart Entity Assignment test PASSED 100%!");
} else {
  console.error("❌ Smart Entity Assignment test FAILED");
  process.exit(1);
}
