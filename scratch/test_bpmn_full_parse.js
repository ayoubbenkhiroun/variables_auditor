const parser = require('../js/bpmn_parser.js');

// Simple XML Node implementation for testing BpmnZeebeParser under Node.js
class MockNode {
  constructor(localName, namespaceURI = '', attributes = {}, textContent = '') {
    this.localName = localName;
    this.tagName = localName;
    this.namespaceURI = namespaceURI;
    this.attributes = Object.entries(attributes).map(([name, value]) => ({ name, value, localName: name }));
    this._attrs = attributes;
    this.textContent = textContent;
    this.children = [];
    this.nodeType = 1;
    this.parentElement = null;
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

  getElementsByTagName(tagName) {
    const res = [];
    const walk = (node) => {
      for (const ch of node.children) {
        if (tagName === '*' || ch.localName.toLowerCase() === tagName.toLowerCase()) {
          res.push(ch);
        }
        walk(ch);
      }
    };
    walk(this);
    return res;
  }
}

// Build a mock DOM tree representing the user's Camunda 8 XML
const root = new MockNode('definitions', parser.NS.BPMN, { id: 'Definitions_1', targetNamespace: 'http://bpmn.io/schema/bpmn' });
const doc = { documentElement: root };

const process = new MockNode('process', parser.NS.BPMN, {
  id: 'VDR_Obtenir_Lautorisation_Administrative',
  name: "VDR Obtenir l'autorisation administrative",
  isExecutable: 'true'
});
root.appendChild(process);

// 1. Script task with zeebe:script expression="=migration_loop + 1" resultVariable="migration_loop"
const scriptTask1 = new MockNode('scriptTask', parser.NS.BPMN, { id: 'VDR_incLoop', name: 'inc loop' });
const ext1 = new MockNode('extensionElements', parser.NS.BPMN);
const zScript1 = new MockNode('script', parser.NS.ZEEBE, {
  expression: '=migration_loop + 1',
  resultVariable: 'migration_loop'
});
ext1.appendChild(zScript1);
scriptTask1.appendChild(ext1);
process.appendChild(scriptTask1);

// 2. Script task with zeebe:script expression="=migration" resultVariable="old_migration"
const scriptTask2 = new MockNode('scriptTask', parser.NS.BPMN, { id: 'VDR_saveMigrationVariableValue', name: 'save migration' });
const ext2 = new MockNode('extensionElements', parser.NS.BPMN);
const zScript2 = new MockNode('script', parser.NS.ZEEBE, {
  expression: '=migration',
  resultVariable: 'old_migration'
});
ext2.appendChild(zScript2);
scriptTask2.appendChild(ext2);
process.appendChild(scriptTask2);

// 3. Call Activity with calledElement and ioMapping
const callAct = new MockNode('callActivity', parser.NS.BPMN, { id: 'VDR_deposerLeIaEtAa', name: 'Déposer le IA & AA' });
const ext3 = new MockNode('extensionElements', parser.NS.BPMN);
const zCalled = new MockNode('calledElement', parser.NS.ZEEBE, {
  processId: 'itres-reso-tache-atteint',
  propagateAllChildVariables: 'false',
  propagateAllParentVariables: 'false'
});
const zIo = new MockNode('ioMapping', parser.NS.ZEEBE);
zIo.appendChild(new MockNode('input', parser.NS.ZEEBE, { source: '="Déposer les IA : "+ livrable', target: 'nomDeTache' }));
zIo.appendChild(new MockNode('input', parser.NS.ZEEBE, { source: '=idProjet', target: 'idProjet' }));
zIo.appendChild(new MockNode('output', parser.NS.ZEEBE, { source: '=resultStatus', target: 'statusDepot' }));
ext3.appendChild(zCalled);
ext3.appendChild(zIo);
callAct.appendChild(ext3);
process.appendChild(callAct);

// 4. Sequence flow with bypass condition
const flowBypass = new MockNode('sequenceFlow', parser.NS.BPMN, {
  id: 'Flow_migration_bypass',
  sourceRef: 'Gateway_1',
  targetRef: 'VDR_deposerLeIaEtAa'
});
const condEl = new MockNode('conditionExpression', parser.NS.BPMN, {}, '= migration = "O" and list contains(migrationActivities, "ETAPE_1")');
flowBypass.appendChild(condEl);
process.appendChild(flowBypass);

// Run parseDocument
console.log('--- Testing parseDocument on Mock DOM ---');
const parsed = parser.parseDocument(doc, 'test_user_process.bpmn');

console.log('Process ID:', parsed.processId);
console.log('Process Name:', parsed.processName);
console.log('Activities count:', parsed.activities.length);
parsed.activities.forEach(a => {
  console.log(` - [${a.type}] ${a.id} (${a.name})`);
  if (a.extensions.script) {
    console.log(`   script: expr="${a.extensions.script.expression}" -> resultVar="${a.extensions.script.resultVariable}"`);
  }
  if (a.extensions.calledElement) {
    console.log(`   calledElement: target="${a.extensions.calledElement.processId}" parentProp=${a.extensions.calledElement.propagateAllParentVariables}`);
  }
});

console.log('\nCall Activities count:', parsed.callActivities.length);
parsed.callActivities.forEach(ca => {
  console.log(` - ${ca.activityId} calls "${ca.calledElement}", inMappings: ${ca.inMappings.length}, outMappings: ${ca.outMappings.length}`);
});

console.log('\nFlows count:', parsed.flows.length);
parsed.flows.forEach(f => {
  console.log(` - ${f.id}: isMigrationBypass=${f.isMigrationBypass}, cond="${f.conditionExpression}"`);
});

console.log('\nVariables extracted count:', parsed.variables.length);
parsed.variables.forEach(v => {
  console.log(` - [${v.role.padEnd(10)}] "${v.name}" (${v.callingProcess})`);
});
