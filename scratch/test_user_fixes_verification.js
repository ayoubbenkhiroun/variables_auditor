global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };

const parser = require('../js/bpmn_parser.js');
global.BpmnZeebeParser = parser;
global.bpmnExtractFeelVariables = parser.extractFeelVariables;
global.bpmnGetProcessContract = parser.getProcessContract;

const linter = require('../js/bpmn_lint.js');

class MockElement {
  constructor(localName, namespaceURI = parser.NS.BPMN, attrs = {}, textContent = '') {
    this.localName = localName;
    this.tagName = (namespaceURI === parser.NS.ZEEBE ? 'zeebe:' : 'bpmn:') + localName;
    this.prefix = namespaceURI === parser.NS.ZEEBE ? 'zeebe' : 'bpmn';
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

function createMockXmlDoc(definitionsEl) {
  return {
    documentElement: definitionsEl,
    getElementsByTagName: (name) => definitionsEl.getElementsByTagName(name)
  };
}

console.log('=== TEST 1: FEEL Functions in Expressions (number & list contains) ===');
// Definitions -> Process -> Gateway -> Flows (one with number(...), one with list contains(...))
const def1 = new MockElement('definitions');
const proc1 = new MockElement('process', parser.NS.BPMN, { id: 'parent-process', isExecutable: 'true' });
def1.appendChild(proc1);

const start1 = new MockElement('startEvent', parser.NS.BPMN, { id: 'start_1', name: 'Dossier reçu' });
const flow1 = new MockElement('sequenceFlow', parser.NS.BPMN, { id: 'f_1', sourceRef: 'start_1', targetRef: 'gw_1' });
const gw1 = new MockElement('exclusiveGateway', parser.NS.BPMN, { id: 'gw_1', name: 'Continuer ?', default: 'f_def' });

const flowNumber = new MockElement('sequenceFlow', parser.NS.BPMN, { id: 'Flow_1o2vk1h', sourceRef: 'gw_1', targetRef: 'end_1' });
const condNumber = new MockElement('conditionExpression', parser.NS.BPMN, {}, '= migration="0" and migration_loop < number(migration_max_wait_loop)');
flowNumber.appendChild(condNumber);

const flowList = new MockElement('sequenceFlow', parser.NS.BPMN, { id: 'Flow_1a84391', sourceRef: 'gw_1', targetRef: 'end_1' });
const condList = new MockElement('conditionExpression', parser.NS.BPMN, {}, '= migration="0" and list contains(migrationActivities, "ETAPE_1")');
flowList.appendChild(condList);

const flowDef = new MockElement('sequenceFlow', parser.NS.BPMN, { id: 'f_def', sourceRef: 'gw_1', targetRef: 'end_1' });
const end1 = new MockElement('endEvent', parser.NS.BPMN, { id: 'end_1', name: 'Dossier traité' });

[start1, flow1, gw1, flowNumber, flowList, flowDef, end1].forEach(el => proc1.appendChild(el));

const doc1 = createMockXmlDoc(def1);
const res1 = linter.auditBpmnLintFile({ fileName: 'test_feel.bpmn', xmlDoc: doc1, source: '' });
const reservedIssues1 = res1.issues.filter(i => i.ruleId === 'variable-reserved');

console.log('variable-reserved count:', reservedIssues1.length);
reservedIssues1.forEach(i => console.log(' - ' + i.message + ' (' + i.elementId + ')'));

if (reservedIssues1.length === 0) {
  console.log('✅ TEST 1 PASSED: number and list are not flagged as variable-reserved in expressions.');
} else {
  console.error('❌ TEST 1 FAILED: Unexpected variable-reserved errors!');
  process.exit(1);
}

console.log('\n=== TEST 2: True Positive on Explicit Variable Declaration with Reserved Word ===');
const def2 = new MockElement('definitions');
const proc2 = new MockElement('process', parser.NS.BPMN, { id: 'parent-process-2', isExecutable: 'true' });
def2.appendChild(proc2);

const start2 = new MockElement('startEvent', parser.NS.BPMN, { id: 'start_2', name: 'Dossier reçu' });
const taskBad = new MockElement('serviceTask', parser.NS.BPMN, { id: 'task_bad', name: 'Calculer montant' });
const ioMap = new MockElement('ioMapping', parser.NS.ZEEBE);
const outputBad = new MockElement('output', parser.NS.ZEEBE, { source: '= 100', target: 'number' });
ioMap.appendChild(outputBad);
taskBad.appendChild(ioMap);

const end2 = new MockElement('endEvent', parser.NS.BPMN, { id: 'end_2', name: 'Dossier traité' });
[start2, taskBad, end2].forEach(el => proc2.appendChild(el));

const doc2 = createMockXmlDoc(def2);
const res2 = linter.auditBpmnLintFile({ fileName: 'test_reserved.bpmn', xmlDoc: doc2, source: '' });
const reservedIssues2 = res2.issues.filter(i => i.ruleId === 'variable-reserved');

console.log('variable-reserved count on explicit target="number":', reservedIssues2.length);
if (reservedIssues2.length === 1 && reservedIssues2[0].message.includes('number')) {
  console.log('✅ TEST 2 PASSED: explicit target="number" is correctly flagged as variable-reserved.');
} else {
  console.error('❌ TEST 2 FAILED: Expected target="number" to be flagged!');
  process.exit(1);
}

console.log('\n=== TEST 3: activity-only-callactivity applied ONLY to parent, NOT to subprocesses ===');
const def3 = new MockElement('definitions');

// 1. Processus Orchestrateur Parent
const parentProc = new MockElement('process', parser.NS.BPMN, { id: 'orchestrateur-metier', isExecutable: 'true' });
def3.appendChild(parentProc);

const startP = new MockElement('startEvent', parser.NS.BPMN, { id: 'st_p', name: 'Demande reçue' });
const callAct = new MockElement('callActivity', parser.NS.BPMN, { id: 'call_sub', name: 'Valider jalon', calledElement: 'sous-processus-remed' });
const parentLocalTask = new MockElement('serviceTask', parser.NS.BPMN, { id: 'local_task_in_parent', name: 'Traiter localement' });

// Sous-processus embarqué
const embeddedSub = new MockElement('subProcess', parser.NS.BPMN, { id: 'sub_embedded', name: 'Partie de blocage' });
const scriptInc = new MockElement('scriptTask', parser.NS.BPMN, { id: 'script_inc', name: 'inc loop' });
const scriptZeebe = new MockElement('script', parser.NS.ZEEBE, { expression: '= migration_loop + 1', resultVariable: 'migration_loop' });
scriptInc.appendChild(scriptZeebe);
const serviceInEmbedded = new MockElement('serviceTask', parser.NS.BPMN, { id: 'service_in_embedded', name: 'Exécuter action' });
embeddedSub.appendChild(scriptInc);
embeddedSub.appendChild(serviceInEmbedded);

const endP = new MockElement('endEvent', parser.NS.BPMN, { id: 'end_p', name: 'Demande terminée' });
[startP, callAct, parentLocalTask, embeddedSub, endP].forEach(el => parentProc.appendChild(el));

// 2. Processus Cible Appelé (Sous-processus)
const childProc = new MockElement('process', parser.NS.BPMN, { id: 'sous-processus-remed', isExecutable: 'true' });
def3.appendChild(childProc);

const startSub = new MockElement('startEvent', parser.NS.BPMN, { id: 'sub_st', name: 'Activation reçue' });
const userTaskSub = new MockElement('userTask', parser.NS.BPMN, { id: 'user_task_in_sub', name: 'Traiter dossier agent' });
const serviceTaskSub = new MockElement('serviceTask', parser.NS.BPMN, { id: 'service_in_sub', name: 'Archiver document' });
const endSub = new MockElement('endEvent', parser.NS.BPMN, { id: 'sub_end', name: 'Validation effectuée' });
[startSub, userTaskSub, serviceTaskSub, endSub].forEach(el => childProc.appendChild(el));

const doc3 = createMockXmlDoc(def3);
linter.setBpmnLintFiles([{ fileName: 'test_sub.bpmn', xmlDoc: doc3, source: '' }]);

const res3 = linter.auditBpmnLintFile({ fileName: 'test_sub.bpmn', xmlDoc: doc3, source: '' });
const callActIssues = res3.issues.filter(i => i.ruleId === 'activity-only-callactivity');

console.log('activity-only-callactivity count:', callActIssues.length);
callActIssues.forEach(i => console.log(' - ' + i.message + ' (id: ' + i.elementId + ', name: ' + i.elementName + ')'));

const flaggedIds = callActIssues.map(i => i.elementId);
console.log('Flagged element IDs:', flaggedIds);

const onlyParentLocalFlagged = flaggedIds.includes('local_task_in_parent') &&
  !flaggedIds.includes('user_task_in_sub') &&
  !flaggedIds.includes('service_in_sub') &&
  !flaggedIds.includes('script_inc') &&
  !flaggedIds.includes('service_in_embedded');

if (onlyParentLocalFlagged) {
  console.log('✅ TEST 3 PASSED: activity-only-callactivity flagged ONLY local_task_in_parent in the root process, and exempt all tasks in sub-processes!');
} else {
  console.error('❌ TEST 3 FAILED: activity-only-callactivity misbehaved on sub-processes!');
  process.exit(1);
}

console.log('\n🎉 ALL 3 TESTS PASSED 100% SUCCESSFULLY!');
