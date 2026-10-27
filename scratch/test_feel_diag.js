const parser = require('../js/bpmn_parser.js');
console.log('Parser test 1:', parser.extractFeelVariables('= migration="0" and migration_loop < number(migration_max_wait_loop)'));
console.log('Parser test 2:', parser.extractFeelVariables('= migration="0" and list contains(migrationActivities, "ETAPE_1")'));
console.log('Parser test 3 (no equals):', parser.extractFeelVariables('migration="0" and migration_loop < number(migration_max_wait_loop)'));
console.log('Parser test 4 (list contains without equals):', parser.extractFeelVariables('migration="0" and list contains(migrationActivities, "ETAPE_1")'));
