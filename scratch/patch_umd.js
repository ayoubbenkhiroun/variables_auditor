const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'bpmn_parser.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex = /\(function\s*\(root,\s*factory\)\s*\{[\s\S]*?\}\)\(typeof self !== 'undefined' \? self : this, function \(\) \{/;

const replacement = `(function (root, factory) {
  const parser = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = parser;
  }
  const g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : root);
  if (g) {
    g.BpmnZeebeParser = parser;
    g.bpmnGetLocalName = parser.getLocalName;
    g.bpmnGetAttr = parser.getAttr;
    g.bpmnGetZeebeExtension = parser.getZeebeExtension;
    g.bpmnExtractFeelVariables = parser.extractFeelVariables;
    g.bpmnGetProcessContract = parser.getProcessContract;
  }
})(typeof self !== 'undefined' ? self : this, function () {`;

code = code.replace(regex, replacement);
fs.writeFileSync(filePath, code, 'utf8');
console.log('bpmn_parser.js UMD wrapper updated successfully');
