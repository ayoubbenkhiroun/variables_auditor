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
  getAttribute(name) { return this._attrs[name] !== undefined ? this._attrs[name] : null; }
  hasAttribute(name) { return this._attrs[name] !== undefined; }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  getElementsByTagName(name) {
    const res = [];
    const walk = (node) => {
      for (const ch of node.children) {
        if (name === '*' || ch.localName.toLowerCase() === name.toLowerCase()) res.push(ch);
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

const testBatch = [
  { fileName: 'parent1.bpmn', xmlDoc: { documentElement: parentDoc1, getElementsByTagName: (tag) => parentDoc1.getElementsByTagName(tag) } },
  { fileName: 'sub.bpmn', xmlDoc: { documentElement: subDoc, getElementsByTagName: (tag) => subDoc.getElementsByTagName(tag) } }
];

linter.setBpmnLintFiles(testBatch);
linter.loadBpmnLintRules();

// Now let's trace step by step what bpmn_lint does:
const activity = callAct1;
console.log('activity:', activity.localName, activity.getAttribute('id'));

// Check zeebeCalled
const descendants = activity.getElementsByTagName('*');
console.log('descendants count:', descendants.length);
console.log('descendant tags:', descendants.map(d => d.localName));

const zeebeCalled = descendants.find(el => el.localName.toLowerCase() === 'calledelement');
console.log('zeebeCalled found:', !!zeebeCalled);
if (zeebeCalled) {
  console.log('zeebeCalled propagateAllParentVariables attr:', zeebeCalled.getAttribute('propagateAllParentVariables'));
}

// Check ioMapping
const ioEl = descendants.find(el => el.localName.toLowerCase() === 'iomapping');
console.log('ioEl found:', !!ioEl);
if (ioEl) {
  const ioChildren = ioEl.getElementsByTagName('*');
  console.log('ioChildren:', ioChildren.map(c => ({ name: c.localName, source: c.getAttribute('source'), target: c.getAttribute('target') })));
}

// Check targetProcEl
const batch = linter.getBpmnLintFiles();
console.log('batch count:', batch.length);
let targetProcEl = null;
for (const f of batch) {
  const procs = f.xmlDoc.getElementsByTagName('*').filter(el => el.localName === 'process');
  console.log('file procs in', f.fileName, ':', procs.map(p => p.getAttribute('id')));
  const found = procs.find(p => p.getAttribute('id') === 'proc_sub_scoring');
  if (found) targetProcEl = found;
}
console.log('targetProcEl found:', !!targetProcEl);
if (targetProcEl) {
  const c = parser.getProcessContract(targetProcEl);
  console.log('targetContract:', c);
}

console.log('all in parentDoc1:', parentDoc1.getElementsByTagName('*').map(e => ({ name: e.localName, id: e.getAttribute('id') })));

const res = linter.auditBpmnLintFile(testBatch[0]);
console.log('Result issues on testBatch[0]:', res.issues.map(i => i.ruleId));


