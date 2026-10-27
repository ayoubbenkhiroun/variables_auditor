const fs = require('fs');
const path = require('path');

class MockElement {
  constructor(localName, attrs = {}, textContent = '') {
    this.localName = localName;
    this.tagName = 'bpmn:' + localName;
    this.prefix = 'bpmn';
    this.namespaceURI = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
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

// Setup BpmnZeebeParser & bpmn_lint in global context
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
require('../js/bpmn_parser.js');
require('../js/bpmn_lint.js');
if (typeof global.loadBpmnLintRules === 'function') {
  global.loadBpmnLintRules();
}

// -------------------------------------------------------------
// Test 1 : Pattern de Migration Valide
// -------------------------------------------------------------
const root1 = new MockElement('definitions', {
  id: 'Definitions_1',
  'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  'xmlns:zeebe': 'http://camunda.org/schema/zeebe/1.0'
});
const doc1 = { 
  documentElement: root1,
  getElementsByTagName: (name) => root1.getElementsByTagName(name)
};

const proc1 = new MockElement('process', {
  id: 'process-migration-health',
  name: 'Process Migration Health Test',
  isExecutable: 'true'
});
root1.appendChild(proc1);

proc1.appendChild(new MockElement('startEvent', { id: 'Start_1', name: 'Dossier reçu' }));
proc1.appendChild(new MockElement('exclusiveGateway', { id: 'GW_Split', name: 'Mode migration ?', default: 'Flow_nominal' }));
proc1.appendChild(new MockElement('sequenceFlow', { id: 'Flow_1', sourceRef: 'Start_1', targetRef: 'GW_Split' }));

const flowNominal = new MockElement('sequenceFlow', { id: 'Flow_nominal', name: 'Flux nominal', sourceRef: 'GW_Split', targetRef: 'Task_Nominal' });
proc1.appendChild(flowNominal);

const taskNominal = new MockElement('callActivity', { id: 'Task_Nominal', name: 'Traiter dossier nominal', calledElement: 'sub-traitement' });
proc1.appendChild(taskNominal);

const flowBypass = new MockElement('sequenceFlow', {
  id: 'Flow_bypass',
  name: 'Reprise migration',
  sourceRef: 'GW_Split',
  targetRef: 'Task_Loop'
});
flowBypass.appendChild(new MockElement('conditionExpression', {}, '= migration = "O" and list contains(migrationActivities, "ETAPE_1")'));
proc1.appendChild(flowBypass);

proc1.appendChild(new MockElement('sequenceFlow', { id: 'Flow_from_nominal', sourceRef: 'Task_Nominal', targetRef: 'Task_Loop' }));

const taskLoop = new MockElement('callActivity', { id: 'Task_Loop', name: 'Incrémenter boucle migration', calledElement: 'sub-inc-loop' });
const extLoop = new MockElement('extensionElements');
const zScript = new MockElement('script', { expression: '=migration_loop + 1', resultVariable: 'migration_loop' });
zScript.prefix = 'zeebe';
zScript.namespaceURI = 'http://camunda.org/schema/zeebe/1.0';
extLoop.appendChild(zScript);
taskLoop.appendChild(extLoop);
proc1.appendChild(taskLoop);

const timerEvent = new MockElement('intermediateCatchEvent', { id: 'Timer_PT2S', name: 'Attente 2 secondes' });
const tDef = new MockElement('timerEventDefinition');
tDef.appendChild(new MockElement('timeDuration', {}, 'PT2S'));
timerEvent.appendChild(tDef);
proc1.appendChild(timerEvent);

proc1.appendChild(new MockElement('sequenceFlow', { id: 'Flow_to_timer', sourceRef: 'Task_Loop', targetRef: 'Timer_PT2S' }));

const gwLoop = new MockElement('exclusiveGateway', { id: 'GW_LoopGuard', name: 'Limite atteinte ?', default: 'Flow_to_end' });
proc1.appendChild(gwLoop);
proc1.appendChild(new MockElement('sequenceFlow', { id: 'Flow_to_gw_loop', sourceRef: 'Timer_PT2S', targetRef: 'GW_LoopGuard' }));

const flowCycle = new MockElement('sequenceFlow', {
  id: 'Flow_cycle',
  name: 'Recommencer',
  sourceRef: 'GW_LoopGuard',
  targetRef: 'Task_Loop'
});
flowCycle.appendChild(new MockElement('conditionExpression', {}, '= migration_loop < number(migration_max_wait_loop)'));
proc1.appendChild(flowCycle);

proc1.appendChild(new MockElement('endEvent', { id: 'End_1', name: 'Dossier finalisé' }));
proc1.appendChild(new MockElement('sequenceFlow', { id: 'Flow_to_end', name: 'Sortie', sourceRef: 'GW_LoopGuard', targetRef: 'End_1' }));

console.log('🧪 TEST 1 : Graphe de migration avec bypass et temporisation PT2S');
const report1 = global.auditBpmnLintFile({
  fileName: 'test_migration.bpmn',
  xmlDoc: doc1,
  source: 'mock'
});
console.log(`   Score : ${report1.score}/100, Anomalies : ${report1.issues.length}`);

// Vérification de l'absence de faux positifs
const falsePositives = report1.issues.filter(i => 
  ['loop-max-counter-timer', 'dead-end-node', 'unreachable-node', 'no-path-to-end', 'exclusive-gateway-default', 'variable-reserved'].includes(i.ruleId)
);

if (falsePositives.length > 0) {
  console.error('   ❌ Faux positifs détectés :', falsePositives);
  throw new Error('Faux positifs subsistants !');
} else {
  console.log('   ✅ 0 faux positif sur boucle, timer PT2S, bypass et variables FEEL !');
}

// -------------------------------------------------------------
// Test 2 : Vraies anomalies (doivent être interceptées !)
// -------------------------------------------------------------
console.log('\n🧪 TEST 2 : Détection des vraies erreurs (Dead-end et Nœud Inatteignable)');
const root2 = new MockElement('definitions', {
  id: 'Definitions_2',
  'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL'
});
const doc2 = { 
  documentElement: root2,
  getElementsByTagName: (name) => root2.getElementsByTagName(name)
};
const proc2 = new MockElement('process', { id: 'proc-flawed', name: 'Process Flawed', isExecutable: 'true' });
root2.appendChild(proc2);

proc2.appendChild(new MockElement('startEvent', { id: 'Start_2', name: 'Départ' }));
// Tâche orpheline (aucun flux entrant ni sortant)
proc2.appendChild(new MockElement('userTask', { id: 'Task_Orphan', name: 'Tâche orpheline' }));
// Tâche en impasse (a un flux entrant mais AUCUN flux sortant)
const deadTask = new MockElement('serviceTask', { id: 'Task_DeadEnd', name: 'Tâche sans suite' });
proc2.appendChild(deadTask);
proc2.appendChild(new MockElement('sequenceFlow', { id: 'Flow_to_dead', sourceRef: 'Start_2', targetRef: 'Task_DeadEnd' }));

const report2 = global.auditBpmnLintFile({
  fileName: 'test_flawed.bpmn',
  xmlDoc: doc2,
  source: 'mock'
});

console.log(`   Score : ${report2.score}/100, Anomalies détectées : ${report2.issues.length}`);
report2.issues.forEach(i => console.log(`   - [${i.severity}] ${i.ruleId} (${i.elementId}): ${i.message}`));

const detectedDeadEnd = report2.issues.some(i => i.ruleId === 'dead-end-node' && i.elementId === 'Task_DeadEnd');
const detectedUnreachable = report2.issues.some(i => i.ruleId === 'unreachable-node' && i.elementId === 'Task_Orphan');

console.log(`\n   - Dead-end sur Task_DeadEnd bien détecté ? ${detectedDeadEnd ? '✅ OUI' : '❌ NON'}`);
console.log(`   - Inatteignabilité sur Task_Orphan bien détectée ? ${detectedUnreachable ? '✅ OUI' : '❌ NON'}`);

if (!detectedDeadEnd || !detectedUnreachable) {
  throw new Error('Les vraies erreurs structurelles doivent impérativement être interceptées !');
}
console.log('\n🌟 VALIDATION COMPLÈTE ÉTAPE 2 RÉUSSIE AVEC SUCCÈS !');
