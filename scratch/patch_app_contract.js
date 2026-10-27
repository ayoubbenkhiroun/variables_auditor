const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Patch correlateMultiBpmnBatch Call Activities analysis
const oldCaBlockRegex = /\/\/ Analyser si les variables sont passées en Call Activity[\s\S]*?callRelations\.forEach\(rel => \{[\s\S]*?\}\);\s*(?=\/\/ Assigner les statuts de cycle de vie précis)/;

const newCaBlock = `// Analyser si les variables sont passées en Call Activity et auditer les contrats de données
  callRelations.forEach(rel => {
    rel.contractViolations = [];
    rel.contractWarnings = [];

    const targetProc = procMap[rel.calledElement];
    let targetContract = null;
    if (targetProc && typeof BpmnZeebeParser !== 'undefined' && typeof BpmnZeebeParser.getProcessContract === 'function') {
      targetContract = BpmnZeebeParser.getProcessContract(targetProc);
    }

    // Extraction robuste des variables FEEL pour chaque mapping
    (rel.inMappings || []).forEach(m => {
      const srcVars = (typeof BpmnZeebeParser !== 'undefined' && typeof BpmnZeebeParser.extractFeelVariables === 'function')
        ? BpmnZeebeParser.extractFeelVariables(m.source)
        : (m.source ? [m.source] : []);

      srcVars.forEach(s => {
        if (s && varGlobalStats.has(s)) {
          varGlobalStats.get(s).inouts++;
          varGlobalStats.get(s).reads++;
        }
      });
      if (m.target && varGlobalStats.has(m.target)) {
        varGlobalStats.get(m.target).inouts++;
      }
    });

    (rel.outMappings || []).forEach(m => {
      const srcVars = (typeof BpmnZeebeParser !== 'undefined' && typeof BpmnZeebeParser.extractFeelVariables === 'function')
        ? BpmnZeebeParser.extractFeelVariables(m.source)
        : (m.source ? [m.source] : []);

      srcVars.forEach(s => {
        if (s && varGlobalStats.has(s)) {
          varGlobalStats.get(s).inouts++;
        }
      });
      if (m.target && varGlobalStats.has(m.target)) {
        varGlobalStats.get(m.target).inouts++;
        varGlobalStats.get(m.target).writes++;
      }
    });

    // Évaluation du Contrat de Données
    if (targetContract) {
      rel.targetRequiredInputs = targetContract.requiredInputs || [];
      rel.targetProducedOutputs = targetContract.producedVariables || [];

      // 1. Entrées obligatoires non fournies
      const mappedTargets = new Set((rel.inMappings || []).map(m => m.target).filter(Boolean));
      const missing = rel.targetRequiredInputs.filter(reqVar => !mappedTargets.has(reqVar));
      if (missing.length > 0) {
        rel.contractViolations.push(\`Entrée(s) requise(s) manquante(s) : \${missing.join(', ')}\`);
      }

      // 2. Sorties dont la source n'est pas produite par le sous-processus
      const targetProducedSet = new Set(rel.targetProducedOutputs);
      (rel.outMappings || []).forEach(m => {
        if (!m.source) return;
        const feelVars = (typeof BpmnZeebeParser !== 'undefined') ? BpmnZeebeParser.extractFeelVariables(m.source) : [];
        feelVars.forEach(v => {
          if (!targetProducedSet.has(v) && !['migration_loop', 'old_migration', 'migration'].includes(v)) {
            rel.contractWarnings.push(\`Sortie "\${m.target}" : la source "\${m.source}" n'est pas produite par le sous-processus\`);
          }
        });
      });
    }

    if (!rel.isResolved) {
      rel.contractStatus = 'unresolved';
    } else if (rel.contractViolations.length > 0) {
      rel.contractStatus = 'violation';
    } else if (rel.contractWarnings.length > 0) {
      rel.contractStatus = 'warning';
    } else {
      rel.contractStatus = 'valid';
    }
  });

  `;

content = content.replace(oldCaBlockRegex, newCaBlock);

// 2. Patch renderProcRelationsTable status badge
const oldBadgeRegex = /const statusBadge = r\.isResolved\s*\?\s*'<span class="badge ok">✓ Fichier Lié<\/span>'\s*:\s*'<span class="badge warn">⚠️ Non Fourni<\/span>';/;

const newBadgeCode = `let statusBadge = '';
    if (!r.isResolved) {
      statusBadge = '<span class="badge warn" title="Fichier sous-processus absent du lot">⚠️ Non Fourni</span>';
    } else if (r.contractStatus === 'violation') {
      const tip = esc(r.contractViolations.join(' | '));
      statusBadge = \`<span class="badge error" style="background:#fee2e2; color:#991b1b; border:1px solid #f87171;" title="\${tip}">❌ Contrat Violé (\${r.contractViolations.length})</span>\`;
    } else if (r.contractStatus === 'warning') {
      const tip = esc(r.contractWarnings.join(' | '));
      statusBadge = \`<span class="badge warn" style="background:#fef3c7; color:#92400e; border:1px solid #f59e0b;" title="\${tip}">⚠️ Sortie Non Produite</span>\`;
    } else {
      statusBadge = '<span class="badge ok" style="background:#d1fae5; color:#065f46; border:1px solid #34d399;">✓ Contrat E/S Valide</span>';
    }`;

content = content.replace(oldBadgeRegex, newBadgeCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('app.js patched successfully');
