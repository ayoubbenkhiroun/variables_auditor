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

// 1. Valid basic process
const valid = file('valid.bpmn', [node('process', { id: 'P', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('task', { id: 'task', name: 'Traiter' }),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'task' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'task', targetRef: 'end' })
])]);
assert.equal(context.auditBpmnLintFile(valid).issues.filter(issue => ['no-path-to-end', 'start-incoming', 'end-outgoing'].includes(issue.ruleId)).length, 0);

// 2. Broken path and boundary
const broken = file('broken.bpmn', [node('process', { id: 'P', name: 'Process', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('task', { id: 'loop', name: 'Boucler' }),
  node('endEvent', { id: 'end', name: 'End' }),
  node('boundaryEvent', { id: 'boundary', name: 'Erreur', attachedToRef: 'missing' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'loop' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'loop', targetRef: 'loop' })
])]);
const brokenRules = new Set(context.auditBpmnLintFile(broken).issues.map(issue => issue.ruleId));
assert.ok(brokenRules.has('no-path-to-end'));
assert.ok(brokenRules.has('boundary-target'));

// 3. Multiple None Start Events
const multiStart = file('multiStart.bpmn', [node('process', { id: 'P_multi', name: 'Multi', isExecutable: 'true' }, [
  node('startEvent', { id: 'start1', name: 'Start 1' }),
  node('startEvent', { id: 'start2', name: 'Start 2' }),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start1', targetRef: 'end' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'start2', targetRef: 'end' })
])]);
const multiStartIssues = context.auditBpmnLintFile(multiStart).issues.filter(i => i.ruleId === 'multiple-none-start-events');
assert.equal(multiStartIssues.length, 1);

// 4. Parallel gateway with condition (forbidden in BPMN)
const parallelCond = file('parallelCond.bpmn', [node('process', { id: 'P_par', name: 'Parallel', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('parallelGateway', { id: 'fork', name: 'Fork' }),
  node('endEvent', { id: 'end1', name: 'End 1' }),
  node('endEvent', { id: 'end2', name: 'End 2' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'fork' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'fork', targetRef: 'end1' }, [node('conditionExpression', {}, [], '${x > 10}')]),
  node('sequenceFlow', { id: 'f3', sourceRef: 'fork', targetRef: 'end2' })
])]);
const parIssues = context.auditBpmnLintFile(parallelCond).issues.filter(i => i.ruleId === 'parallel-gateway-condition');
assert.equal(parIssues.length, 1);

// 5. Exclusive gateway without default flow
const xorNoDefault = file('xorNoDefault.bpmn', [node('process', { id: 'P_xor', name: 'XOR', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('exclusiveGateway', { id: 'xor', name: 'Est valide ?' }),
  node('endEvent', { id: 'end1', name: 'End 1' }),
  node('endEvent', { id: 'end2', name: 'End 2' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'xor' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'xor', targetRef: 'end1', name: 'Oui' }, [node('conditionExpression', {}, [], '${valid == true}')]),
  node('sequenceFlow', { id: 'f3', sourceRef: 'xor', targetRef: 'end2', name: 'Non' }, [node('conditionExpression', {}, [], '${valid == false}')])
])]);
const xorIssues = context.auditBpmnLintFile(xorNoDefault).issues.filter(i => i.ruleId === 'exclusive-gateway-default');
assert.equal(xorIssues.length, 1);

// 6. Timer without duration/date/cycle
const timerEmpty = file('timerEmpty.bpmn', [node('process', { id: 'P_timer', name: 'Timer', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('intermediateCatchEvent', { id: 'timer', name: 'Attente' }, [node('timerEventDefinition', {})]),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'timer' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'timer', targetRef: 'end' })
])]);
const timerIssues = context.auditBpmnLintFile(timerEmpty).issues.filter(i => i.ruleId === 'timer-definition');
assert.equal(timerIssues.length, 1);

// 7. Event Subprocess without typed start event
const eventSub = file('eventSub.bpmn', [node('process', { id: 'P_sub', name: 'Parent', isExecutable: 'true' }, [
  node('startEvent', { id: 'start', name: 'Start' }),
  node('endEvent', { id: 'end', name: 'End' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 'start', targetRef: 'end' }),
  node('subProcess', { id: 'sub1', name: 'Event Sub', triggeredByEvent: 'true' }, [
    node('startEvent', { id: 'subStart', name: 'None Start' }),
    node('endEvent', { id: 'subEnd', name: 'Sub End' }),
    node('sequenceFlow', { id: 'subF', sourceRef: 'subStart', targetRef: 'subEnd' })
  ])
])]);
const eventSubIssues = context.auditBpmnLintFile(eventSub).issues.filter(i => i.ruleId === 'event-subprocess-structure');
assert.equal(eventSubIssues.length, 1);

// 8. XML error handling
const malformed = context.auditBpmnLintFile({ fileName: 'invalid.bpmn', parseError: 'XML invalide', xmlDoc: null });
assert.equal(malformed.score, 0);
assert.equal(malformed.status, 'Bloquant');

// 9. Batch Call Activity resolution
const parent = file('parent.bpmn', [node('process', { id: 'Parent', name: 'Parent', isExecutable: 'true' }, [
  node('startEvent', { id: 'parentStart', name: 'Start' }),
  node('callActivity', { id: 'call', name: 'Appeler', calledElement: 'Child' }),
  node('endEvent', { id: 'parentEnd', name: 'End' }),
  node('sequenceFlow', { id: 'parentF1', sourceRef: 'parentStart', targetRef: 'call' }),
  node('sequenceFlow', { id: 'parentF2', sourceRef: 'call', targetRef: 'parentEnd' })
])]);
const child = file('child.bpmn', [node('process', { id: 'Child', name: 'Child', isExecutable: 'true' }, [
  node('startEvent', { id: 'childStart', name: 'Start' }),
  node('endEvent', { id: 'childEnd', name: 'End' }),
  node('sequenceFlow', { id: 'childF', sourceRef: 'childStart', targetRef: 'childEnd' })
])]);
context.bpmnLintFiles = [parent, child];
vm.runInContext('bpmnLintFiles = globalThis.bpmnLintFiles', context);
const batch = context.lintBuildReport();
assert.equal(batch.flatMap(result => result.issues).filter(issue => issue.ruleId === 'call-target-provided').length, 0);
assert.equal(context.window.bpmnLintGraph.missingTargetCount, 0);
assert.equal(context.window.bpmnLintGraph.callCount, 1);

// 10. Test Cyclomatic Complexity & Typology
const complexProcess = file('complex.bpmn', [node('process', { id: 'P_complex', name: 'Complex', isExecutable: 'true' }, [
  node('startEvent', { id: 's', name: 'Start' }),
  node('exclusiveGateway', { id: 'gw1', name: 'Choix' }),
  node('serviceTask', { id: 't1', name: 'T1' }),
  node('userTask', { id: 't2', name: 'T2' }),
  node('parallelGateway', { id: 'gw2', name: 'Fork' }),
  node('endEvent', { id: 'e1', name: 'End 1' }),
  node('endEvent', { id: 'e2', name: 'End 2' }),
  node('sequenceFlow', { id: 'f1', sourceRef: 's', targetRef: 'gw1' }),
  node('sequenceFlow', { id: 'f2', sourceRef: 'gw1', targetRef: 't1' }),
  node('sequenceFlow', { id: 'f3', sourceRef: 'gw1', targetRef: 't2' }),
  node('sequenceFlow', { id: 'f4', sourceRef: 't1', targetRef: 'gw2' }),
  node('sequenceFlow', { id: 'f5', sourceRef: 't2', targetRef: 'gw2' }),
  node('sequenceFlow', { id: 'f6', sourceRef: 'gw2', targetRef: 'e1' }),
  node('sequenceFlow', { id: 'f7', sourceRef: 'gw2', targetRef: 'e2' })
])]);
const auditedComplex = context.auditBpmnLintFile(complexProcess);
assert.ok(auditedComplex.metrics.cyclomatic >= 1, `Cyclomatic should be >= 1, got ${auditedComplex.metrics.cyclomatic}`);
assert.equal(auditedComplex.metrics.serviceTasks, 1);
assert.equal(auditedComplex.metrics.userTasks, 1);

// 11. Test 2D Report Data Generation
context.bpmnLintFiles = [valid, complexProcess];
vm.runInContext('bpmnLintFiles = globalThis.bpmnLintFiles', context);
context.lintBuildReport();
const reportData = context.bpmnLintReportData();
assert.ok(reportData.title.includes('Audit Santé BPMN'));
assert.ok(Array.isArray(reportData.matrix2D));
assert.equal(reportData.matrix2D.length, 2);

console.log('Audit Santé BPMN: toutes les règles de structure, modélisation, déploiement et matrices 2D ont été validées avec succès.');

