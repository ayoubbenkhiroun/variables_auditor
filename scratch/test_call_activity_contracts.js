global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const parser = require('../js/bpmn_parser.js');
const linter = require('../js/bpmn_lint.js');

// Lightweight Mock DOM for testing
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

console.log('=== Test 1 : Validation de getProcessContract() ===');
// Create a sub-process inside a definitions element that consumes 'codePostal' and 'clientVip', and produces 'scoreClient'
const subDoc = new MockElement('definitions', parser.NS.BPMN, { id: 'def_sub' });
const subProc = new MockElement('process', parser.NS.BPMN, { id: 'proc_sub_scoring', name: 'Scoring Client', isExecutable: 'true' });
subDoc.appendChild(subProc);

const subStart = new MockElement('startEvent', parser.NS.BPMN, { id: 'sub_start' });
subProc.appendChild(subStart);

const subTask = new MockElement('serviceTask', parser.NS.BPMN, { id: 'sub_task_score', name: 'Calculer Score' });
const subTaskExt = createExtensionElements(subTask);
const subTaskIo = new MockElement('ioMapping', parser.NS.ZEEBE);
subTaskExt.appendChild(subTaskIo);

// Consumes codePostal and clientVip
const in1 = new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'cp' });
const in2 = new MockElement('input', parser.NS.ZEEBE, { source: '= clientVip', target: 'isVip' });
subTaskIo.appendChild(in1);
subTaskIo.appendChild(in2);

// Produces scoreClient
const out1 = new MockElement('output', parser.NS.ZEEBE, { source: '= calculatedScore', target: 'scoreClient' });
subTaskIo.appendChild(out1);

subProc.appendChild(subTask);

const subEnd = new MockElement('endEvent', parser.NS.BPMN, { id: 'sub_end' });
subProc.appendChild(subEnd);

const contract = parser.getProcessContract(subProc);
console.log('Contract subProc requiredInputs:', contract.requiredInputs);
console.log('Contract subProc producedVariables:', contract.producedVariables);

if (!contract.requiredInputs.includes('codePostal') || !contract.requiredInputs.includes('clientVip')) {
  console.error('FAIL: requiredInputs should include codePostal and clientVip');
  process.exit(1);
}
if (!contract.producedVariables.includes('scoreClient')) {
  console.error('FAIL: producedVariables should include scoreClient');
  process.exit(1);
}
console.log('PASS: getProcessContract identifies requiredInputs and producedVariables correctly.');

console.log('\n=== Test 2 : Call Activity avec Contrat Valide ===');
const parentDoc1 = new MockElement('definitions', parser.NS.BPMN, { id: 'def_p1' });
const parentProc1 = new MockElement('process', parser.NS.BPMN, { id: 'proc_parent_1', name: 'Processus Parent', isExecutable: 'true' });
parentDoc1.appendChild(parentProc1);

// Parent produces initial variables via task
const initTask = new MockElement('serviceTask', parser.NS.BPMN, { id: 'task_init', name: 'Init Dossier' });
const initExt = createExtensionElements(initTask);
const initIo = new MockElement('ioMapping', parser.NS.ZEEBE);
initExt.appendChild(initIo);
initIo.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= "75001"', target: 'codePostal' }));
initIo.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= true', target: 'clientVip' }));
parentProc1.appendChild(initTask);

// Call Activity calling subProc with complete inputs and outputs
const callAct1 = new MockElement('callActivity', parser.NS.BPMN, { id: 'call_sub_1', name: 'Appel Scoring', calledElement: 'proc_sub_scoring' });
const callExt1 = createExtensionElements(callAct1);
const calledZeebe1 = new MockElement('calledElement', parser.NS.ZEEBE, {
  processId: 'proc_sub_scoring',
  propagateAllParentVariables: 'false',
  propagateAllChildVariables: 'false'
});
callExt1.appendChild(calledZeebe1);

const callIo1 = new MockElement('ioMapping', parser.NS.ZEEBE);
callExt1.appendChild(callIo1);
callIo1.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'codePostal' }));
callIo1.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= clientVip', target: 'clientVip' }));
callIo1.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= scoreClient', target: 'scoreFinal' }));
parentProc1.appendChild(callAct1);

// Both files in batch
const testBatch = [
  { fileName: 'parent1.bpmn', xmlDoc: { documentElement: parentDoc1, getElementsByTagName: (tag) => parentDoc1.getElementsByTagName(tag) } },
  { fileName: 'sub.bpmn', xmlDoc: { documentElement: subDoc, getElementsByTagName: (tag) => subDoc.getElementsByTagName(tag) } }
];
linter.setBpmnLintFiles(testBatch);
linter.loadBpmnLintRules();

const res1 = linter.auditBpmnLintFile(testBatch[0]);
const contractIssues1 = res1.issues.filter(i => i.ruleId.startsWith('call-activity-contract') || i.ruleId === 'call-activity-source-undefined');
console.log('Contract issues for valid case (expected 0):', contractIssues1.length);
if (contractIssues1.length > 0) {
  console.error('FAIL: Unexpected contract issues on valid case:', contractIssues1);
  process.exit(1);
}
console.log('PASS: Valid contract passes with 0 issues.');

console.log('\n=== Test 3 : Call Activity avec Contrat Violé (Entrée Manquante) ===');
// Replace I/O mapping without clientVip
const callIoBroken = new MockElement('ioMapping', parser.NS.ZEEBE);
callIoBroken.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'codePostal' }));
callIoBroken.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= scoreClient', target: 'scoreFinal' }));
callExt1.children = [calledZeebe1];
callExt1.appendChild(callIoBroken);

const res2 = linter.auditBpmnLintFile(testBatch[0]);
const missingInputIssue = res2.issues.find(i => i.ruleId === 'call-activity-contract-input');
console.log('Found call-activity-contract-input issue:', !!missingInputIssue);
if (missingInputIssue) {
  console.log('Message:', missingInputIssue.message);
} else {
  console.error('FAIL: Expected call-activity-contract-input issue but none found.');
  process.exit(1);
}
console.log('PASS: Missing input detected correctly.');

console.log('\n=== Test 4 : Call Activity avec Source Parent Inexistante ===');
// Use undeclared parent variable
const callIoBadSource = new MockElement('ioMapping', parser.NS.ZEEBE);
callIoBadSource.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= varInconnueDuParent', target: 'codePostal' }));
callIoBadSource.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= clientVip', target: 'clientVip' }));
callIoBadSource.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= scoreClient', target: 'scoreFinal' }));
callExt1.children = [calledZeebe1];
callExt1.appendChild(callIoBadSource);

const res3 = linter.auditBpmnLintFile(testBatch[0]);
const badSourceIssue = res3.issues.find(i => i.ruleId === 'call-activity-source-undefined');
console.log('Found call-activity-source-undefined issue:', !!badSourceIssue);
if (badSourceIssue) {
  console.log('Message:', badSourceIssue.message);
} else {
  console.error('FAIL: Expected call-activity-source-undefined issue but none found.');
  process.exit(1);
}
console.log('PASS: Undefined parent source variable detected correctly.');

console.log('\n=== Test 5 : Call Activity avec Output Source Inexistante dans le Sous-Processus ===');
// Use non-existent output source
const callIoBadOutput = new MockElement('ioMapping', parser.NS.ZEEBE);
callIoBadOutput.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= codePostal', target: 'codePostal' }));
callIoBadOutput.appendChild(new MockElement('input', parser.NS.ZEEBE, { source: '= clientVip', target: 'clientVip' }));
callIoBadOutput.appendChild(new MockElement('output', parser.NS.ZEEBE, { source: '= variableSortieInexistante', target: 'scoreFinal' }));
callExt1.children = [calledZeebe1];
callExt1.appendChild(callIoBadOutput);

const res4 = linter.auditBpmnLintFile(testBatch[0]);
const badOutputIssue = res4.issues.find(i => i.ruleId === 'call-activity-contract-output');
console.log('Found call-activity-contract-output issue:', !!badOutputIssue);
if (badOutputIssue) {
  console.log('Message:', badOutputIssue.message);
} else {
  console.error('FAIL: Expected call-activity-contract-output issue but none found.');
  process.exit(1);
}
console.log('PASS: Unresolved child output source detected correctly.');

console.log('\n=== TOUS LES TESTS DE CONTRAT DE DONNÉES SONT VALIDÉS AVEC SUCCÈS (5/5) ===');
