const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let content = fs.readFileSync(indexPath, 'utf8');

content = content.replace(/\?v=2026_test_v2\.4\.0/g, '?v=2026_c8_v3.0.0');
content = content.replace('🧪 Version de Recette Client • v2.4.0', '🧪 Version de Recette Client • v3.0.0');

fs.writeFileSync(indexPath, content, 'utf8');
console.log('SUCCESS: index.html cache bust updated to v3.0.0');
