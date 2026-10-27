const parser = require('../js/bpmn_parser.js');

const expr1 = '= migration="O" and migration_loop < number(migration_max_wait_loop)';
const expr2 = '= migration = "O" and list contains(migrationActivities, "ETAPE_1")';
const expr3 = 'migration_loop < number(migration_max_wait_loop)';
const expr4 = 'list contains(migrationActivities, "ETAPE_1")';

console.log('Parser on expr1:', parser.extractFeelVariables(expr1));
console.log('Parser on expr2:', parser.extractFeelVariables(expr2));
console.log('Parser on expr3:', parser.extractFeelVariables(expr3));
console.log('Parser on expr4:', parser.extractFeelVariables(expr4));
