global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const parser = require('../js/bpmn_parser.js');
const linter = require('../js/bpmn_lint.js');

class MockElement {
  constructor(localName, namespaceURI = parser.NS.BPMN, attrs = {}, textContent = '') {
    this.localName = localName;
    this.tagName = 'bpmn:' + localName;
    this.prefix = 'bpmn';
    this.namespaceURI = namespaceURI;
    this._attrs = attrs;
    this.attributes = Object.entries(attrs).map(([name, value]) => ({
      name,
      value,
      localName: name.split(':').pop()
    }));
    this.textContent = textContent;
    this.children = [];
    this.parentElement = null;
    this.nodeType = 1;
  }

  getAttribute(name) {
    return this._attrs[name] !== undefined ? this._attrs[name] : null;
  }

  hasAttribute(name) {
    return this._attrs[name] !== undefined;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  getElementsByTagName(name) {
    const res = [];
    const walk = (node) => {
      for (const ch of node.children) {
        if (name === '*' || ch.localName.toLowerCase() === name.toLowerCase()) {
          res.push(ch);
        }
        walk(ch);
      }
    };
    walk(this);
    return res;
  }
}

function createExtensionElements(parent) {
  const ext = new MockElement('extensionElements', parser.NS.BPMN);
  parent.appendChild(ext);
  return ext;
}

const subDoc = new MockElement('definitions', parser.NS.BPMN, { id: 'def_sub' });
const subProc = new MockElement('process', parser.NS.BPMN, { id: 'proc_sub_scoring', name: 'Scoring Client', isExecutable: 'true' });
subDoc.appendChild(subProc);

const subTask = new MockElement('serviceTask', parser.NS.BPMN, { id: 'sub_task_score', name: 'Calculer Score' });
const subTaskExt = createExtensionElements(subTask);
const subTaskIo = new MockElement('ioMapping', parser.NS.ZEEBE);
subTaskExt.appendChild(subTaskIo);
subTaskIo.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'cp' }));
subTaskIo.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= clientVip', target: 'isVip' }));
subTaskIo.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= calculatedScore', target: 'scoreClient' }));
subProc.appendChild(subTask);

const parentDoc1 = new MockElement('definitions', parser.NS.BPMN, { id: 'def_p1' });
const parentProc1 = new MockElement('process', parser.NS.BPMN, { id: 'proc_parent_1', name: 'Processus Parent', isExecutable: 'true' });
parentDoc1.appendChild(parentProc1);

const initTask = new MockElement('serviceTask', parser.NS.BPMN, { id: 'task_init', name: 'Init Dossier' });
const initExt = createExtensionElements(initTask);
const initIo = new MockElement('ioMapping', parser.NS.ZEEBE);
initExt.appendChild(initIo);
initIo.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= "75001"', target: 'codePostal' }));
initIo.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= true', target: 'clientVip' }));
parentProc1.appendChild(initTask);

const callAct1 = new MockElement('callActivity', parser.NS.BPMN, { id: 'call_sub_1', name: 'Appel Scoring', calledElement: 'proc_sub_scoring' });
const callExt1 = createExtensionElements(callAct1);
const calledZeebe1 = new MockElement('calledElement', parser.NS.ZEEBE, {
  processId: 'proc_sub_scoring',
  propagateAllParentVariables: 'false',
  propagateAllChildVariables: 'false'
});
callExt1.appendChild(calledZeebe1);

const callIoBroken = new MockElement('ioMapping', parser.NS.ZEEBE);
callIoBroken.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'codePostal' }));
callIoBroken.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= scoreClient', target: 'scoreFinal' }));
callExt1.appendChild(callIoBroken);
parentProc1.appendChild(callAct1);

global.bpmnLintFiles = [
  { fileName: 'parent1.bpmn', xmlDoc: { documentElement: parentDoc1, getElementsByTagName: (tag) => parentDoc1.getElementsByTagName(tag) } },
  { fileName: 'sub.bpmn', xmlDoc: { documentElement: subDoc, getElementsByTagName: (tag) => subDoc.getElementsByTagName(tag) } }
];

linter.loadBpmnLintRules();

// Debugging what auditBpmnLintFile sees:
console.log('bpmnLintRules has call-activity-contract-input:', linter.DEFAULT_BPMN_LINT_RULES.some(r => r.id === 'call-activity-contract-input'));
const ruleObj = linter.loadBpmnLintRules().find(r => r.id === 'call-activity-contract-input');
console.log('ruleObj call-activity-contract-input:', ruleObj);

linter.setBpmnLintFiles(global.bpmnLintFiles);
const res = linter.auditBpmnLintFile(global.bpmnLintFiles[0]);
console.log('Total issues:', res.issues.length);
res.issues.forEach(i => console.log('Issue:', i.ruleId, '|', i.message));
