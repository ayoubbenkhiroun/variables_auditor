const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ns = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
function node(localName, attributes = {}, children = [], textContent = '') {
  const element = {
    localName, tagName: localName, namespaceURI: ns, parentElement: null, children, textContent,
    attributes: Object.entries(attributes).map(([name, value]) => ({ name, localName: name.split(':').pop(), value })),
    getAttribute(name) { return attributes[name] ?? null; },
    hasAttribute(name) { return attributes[name] !== undefined; },
    getElementsByTagName() { return this.children.flatMap(child => [child, ...child.getElementsByTagName('*')]); }
  };
  children.forEach(child => { child.parentElement = element; });
  return element;
}
function file(name, children) {
  const root = node('definitions', {}, children);
  return { fileName: name, xmlDoc: { documentElement: root, getElementsByTagName: () => [root, ...root.getElementsByTagName('*')] } };
}
const context = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: () => null }, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/bpmn_lint.js', 'utf8'), context);
context.loadBpmnLintRules();

// Test 1: Exclusive Gateway without Default Flow and branch condition check
const xorNoDefault = file('xor_no_default.bpmn', [node('process', { id: 'proc-xor', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('exclusiveGateway', { id: 'gw1', name: 'Decision ?' }),
  node('endEvent', { id: 'end1', name: 'End 1' }),
  node('endEvent', { id: 'end2', name: 'End 2' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'gw1' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'gw1', targetRef: 'end1' }, [node('conditionExpression', {}, [], '${valid == true}')]),
  node('sequenceFlow', { id: 'f3', sourceRef: 'gw1', targetRef: 'end2' }) // No condition and not default
])]);

const xorIssues = context.auditBpmnLintFile(xorNoDefault).issues;
const xorRules = xorIssues.map(i => i.ruleId);
console.log('XOR Rules triggered:', xorRules);
assert.ok(xorRules.includes('exclusive-gateway-default'), 'Should trigger exclusive-gateway-default');
assert.ok(xorRules.includes('exclusive-gateway-conditions'), 'Should trigger exclusive-gateway-conditions');

// Test 2: User Task with Job Worker implementation
const userJobWorker = file('user_job_worker.bpmn', [node('process', { id: 'proc-user', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('userTask', { id: 'ut1', name: 'Valider le dossier', 'camunda:candidateGroups': 'gestionnaires' }, [
    node('extensionElements', {}, [
      node('taskDefinition', { type: 'human-worker' })
    ])
  ]),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'ut1' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'ut1', targetRef: 'end' })
])]);

const userIssues = context.auditBpmnLintFile(userJobWorker).issues;
const userRules = userIssues.map(i => i.ruleId);
console.log('User Task Rules triggered:', userRules);
assert.ok(userRules.includes('user-task-camunda-implementation'), 'Should trigger user-task-camunda-implementation');

// Test 3: Loop with Timer < 1 minute (PT15S)
const loopShortTimer = file('loop_short.bpmn', [node('process', { id: 'proc-loop', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('exclusiveGateway', { id: 'gw1', name: 'Recommencer ?', default: 'f_out' }),
  node('intermediateCatchEvent', { id: 'timer1', name: 'Attente' }, [
    node('timerEventDefinition', {}, [
      node('timeDuration', {}, [], 'PT15S')
    ])
  ]),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'gw1' }),
  node('sequenceFlow', { id: 'f_retry', sourceRef: 'gw1', targetRef: 'timer1' }, [node('conditionExpression', {}, [], '${retryCount < 3}')]),
  node('sequenceFlow', { id: 'f_loop', sourceRef: 'timer1', targetRef: 'gw1' }),
  node('sequenceFlow', { id: 'f_out', sourceRef: 'gw1', targetRef: 'end' })
])]);

const loopIssues = context.auditBpmnLintFile(loopShortTimer).issues;
const loopRules = loopIssues.map(i => i.ruleId);
console.log('Loop Rules triggered:', loopRules);
// Test 4: Call Activity with default / active propagation (Zeebe & Camunda 7)
const callActivityPropActive = file('call_activity_prop_on.bpmn', [node('process', { id: 'proc-call', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('callActivity', { id: 'call1', name: 'Vérifier et paramétrer instance' }, [
    node('extensionElements', {}, [
      node('zeebe:calledElement', { processId: 'VDR_Verifier_Parametrer_Instance', propagateAllParentVariables: 'true', propagateAllChildVariables: 'true' })
    ])
  ]),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'call1' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'call1', targetRef: 'end' })
])]);

const callIssues = context.auditBpmnLintFile(callActivityPropActive).issues;
const callRules = callIssues.map(i => i.ruleId);
console.log('Call Activity Rules triggered (active):', callRules);
assert.ok(callRules.includes('call-activity-input-propagation-off'), 'Should trigger call-activity-input-propagation-off');
assert.ok(callRules.includes('call-activity-output-propagation-off'), 'Should trigger call-activity-output-propagation-off');

// Test 5: Call Activity with propagation OFF (Clean case)
const callActivityPropOff = file('call_activity_prop_off.bpmn', [node('process', { id: 'proc-call-clean', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('callActivity', { id: 'call2', name: 'Vérifier et paramétrer instance' }, [
    node('extensionElements', {}, [
      node('zeebe:calledElement', { processId: 'VDR_Verifier_Parametrer_Instance', propagateAllParentVariables: 'false', propagateAllChildVariables: 'false' })
    ])
  ]),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'call2' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'call2', targetRef: 'end' })
])]);

const callCleanIssues = context.auditBpmnLintFile(callActivityPropOff).issues;
const callCleanRules = callCleanIssues.map(i => i.ruleId);
console.log('Call Activity Clean Rules:', callCleanRules);
assert.ok(!callCleanRules.includes('call-activity-input-propagation-off'), 'Should NOT trigger input propagation rule');
assert.ok(!callCleanRules.includes('call-activity-output-propagation-off'), 'Should NOT trigger output propagation rule');

console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
