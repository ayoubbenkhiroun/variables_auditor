// Script to test replacing rules section in bpmn_lint.js
const fs = require('fs');
const knowledge = require('./generate_knowledge.js');

console.log("Knowledge items loaded successfully:", Object.keys(knowledge).length);
