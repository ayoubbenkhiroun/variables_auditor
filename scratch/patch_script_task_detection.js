const fs = require('fs');
const path = require('path');

const pmgPath = path.join(__dirname, '..', 'js', 'pmg.js');
let code = fs.readFileSync(pmgPath, 'utf8');

const helperFn = `
// Détecteur intelligent de type d'activité BPMN (Camunda 7, Camunda 8 Zeebe, BPMN 2.0 standard)
window.detectBpmnElementType = function(el, fallbackName) {
  if (!el) return fallbackName || 'task';
  const rawLn = (fallbackName || el.localName || '').toLowerCase();

  // 1. Déjà explicitement balisé
  if (rawLn === 'scripttask') return 'scripttask';
  if (rawLn === 'usertask') return 'usertask';
  if (rawLn === 'businessruletask') return 'businessruletask';
  if (rawLn === 'manualtask') return 'manualtask';
  if (rawLn === 'callactivity') return 'callactivity';
  if (rawLn === 'subprocess' || rawLn === 'sub-process') return 'subprocess';
  if (rawLn === 'sendtask') return 'sendtask';
  if (rawLn === 'receivetask') return 'receivetask';

  // 2. Inspection des balises enfants et extensions Camunda 7 / Zeebe 8
  // A. Script Task (FEEL, Zeebe Script, Groovy, JS)
  const hasScriptTag = !!el.querySelector('script, zeebe\\\\:script, camunda\\\\:script');
  const hasScriptFormat = el.hasAttribute('scriptFormat') || el.hasAttribute('camunda:scriptFormat');
  const taskDef = el.querySelector('taskDefinition, zeebe\\\\:taskDefinition');
  const taskDefType = taskDef ? (taskDef.getAttribute('type') || '').toLowerCase() : '';

  if (hasScriptTag || hasScriptFormat || taskDefType.includes('script') || taskDefType.includes('feel')) {
    return 'scripttask';
  }

  // B. User Task (Zeebe UserTask, FormDefinition, CandidateGroups, Assignee)
  const hasUserTaskTag = !!el.querySelector('userTask, zeebe\\\\:userTask, formDefinition, zeebe\\\\:formDefinition, assignmentDefinition, zeebe\\\\:assignmentDefinition');
  const hasUserAttrs = el.hasAttribute('camunda:candidateGroups') || el.hasAttribute('candidateGroups') || el.hasAttribute('camunda:assignee') || el.hasAttribute('assignee') || el.hasAttribute('camunda:formKey');
  if (hasUserTaskTag || hasUserAttrs) {
    return 'usertask';
  }

  // C. Business Rule / DMN
  const hasDmn = !!el.querySelector('calledDecision, zeebe\\\\:calledDecision') || el.hasAttribute('camunda:decisionRef') || el.hasAttribute('decisionRef') || taskDefType.includes('dmn') || taskDefType.includes('decision');
  if (hasDmn) {
    return 'businessruletask';
  }

  // D. Call Activity
  const hasCall = !!el.querySelector('calledElement, zeebe\\\\:calledElement') || el.hasAttribute('calledElement');
  if (hasCall) {
    return 'callactivity';
  }

  // E. Service Task
  if (rawLn === 'servicetask' || taskDef || el.hasAttribute('camunda:delegateExpression') || el.hasAttribute('camunda:topic') || el.hasAttribute('camunda:class') || el.getAttribute('camunda:type') === 'external') {
    return 'servicetask';
  }

  // F. Send / Receive
  if (el.querySelector('messageEventDefinition, bpmn\\\\:messageEventDefinition')) {
    return 'sendtask';
  }

  return rawLn;
};
`;

// Insert detectBpmnElementType before parseBpmnBatchForPmg
if (!code.includes('window.detectBpmnElementType =')) {
  code = code.replace('window.parseBpmnBatchForPmg = function(fileEntries) {', helperFn + '\nwindow.parseBpmnBatchForPmg = function(fileEntries) {');
}

// Update localName resolution in parseBpmnBatchForPmg
code = code.replace(
  `const localName = (el.localName || '').toLowerCase();

          if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity', 'subprocess'].includes(localName)) {`,
  `const rawLocalName = (el.localName || '').toLowerCase();

          if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity', 'subprocess'].includes(rawLocalName)) {
            const localName = window.detectBpmnElementType(el, rawLocalName);`
);

// Update localName resolution in extractPmgActivities
code = code.replace(
  `const localName = el.localName ? el.localName.toLowerCase() : '';
    
    if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity'].includes(localName)) {`,
  `const rawLocalName = el.localName ? el.localName.toLowerCase() : '';
    
    if (['usertask', 'servicetask', 'manualtask', 'scripttask', 'sendtask', 'receivetask', 'businessruletask', 'task', 'callactivity'].includes(rawLocalName)) {
      const localName = window.detectBpmnElementType(el, rawLocalName);`
);

fs.writeFileSync(pmgPath, code, 'utf8');
console.log('Successfully added intelligent BPMN element type detector to pmg.js!');
