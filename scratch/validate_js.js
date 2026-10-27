const fs = require('fs');
const path = require('path');

// Test de syntaxe sur tous les fichiers JS
const jsDir = path.join(__dirname, '../js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

console.log(`🔍 Vérification syntaxique de ${files.length} fichiers JS...`);

let hasError = false;
files.forEach(f => {
  const filePath = path.join(jsDir, f);
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    // Vérifier la compilation syntaxique
    new Function(code);
    console.log(`  ✓ ${f} : OK`);
  } catch (err) {
    console.error(`  ✗ ${f} : ERREUR DE SYNTAXE -> ${err.message}`);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log('🎉 Tous les scripts JavaScript sont syntaxiquement impeccables !');
}
