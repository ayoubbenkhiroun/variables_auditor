global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const parser = require('../js/bpmn_parser.js');
const linter = require('../js/bpmn_lint.js');

// Test direct inspection
const subDoc = {
  localName: 'definitions',
  namespaceURI: parser.NS.BPMN,
  children: [],
  getElementsByTagName: () => []
};

// Check if lintRule('call-activity-contract-input') is true
linter.loadBpmnLintRules();
const r = linter.loadBpmnLintRules().find(x => x.id === 'call-activity-contract-input');
console.log('Rule in loaded rules:', r);
