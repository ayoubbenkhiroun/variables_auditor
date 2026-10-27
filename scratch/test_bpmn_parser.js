const parser = require('../js/bpmn_parser.js');

console.log('--- Test 1 : FEEL Extraction ---');
console.log('Test 1 (migration_loop + 1):', parser.extractFeelVariables('= migration_loop + 1'));
console.log('Test 2 (migration = "O" and list contains):', parser.extractFeelVariables('= migration = "O" and list contains(migrationActivities, "ETAPE_1")'));
console.log('Test 3 (string concat):', parser.extractFeelVariables('="Déposer les IA : "+ livrable'));
console.log('Test 4 (nested properties):', parser.extractFeelVariables('= customer.address.zipCode > 1000 and status == "ACTIVE"'));
console.log('Test 5 (comparison loop):', parser.extractFeelVariables('= migration_loop < number(migration_max_wait_loop)'));

console.log('\n--- Test 2 : Helpers & Namespaces ---');
console.log('Namespaces BPMN:', parser.NS.BPMN);
console.log('Namespaces ZEEBE:', parser.NS.ZEEBE);
console.log('FEEL Reserved Words count:', parser.FEEL_RESERVED_WORDS.size);
