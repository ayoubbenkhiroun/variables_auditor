const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'bpmn_lint.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldSourceBlock = `    // 2. Validation des sources du mapping d'entrée dans le parent (call-activity-source-undefined)
    if (parentContract && parserHelper && typeof parserHelper.extractFeelVariables === 'function') {
      const parentKnownVars = new Set([
        ...(parentContract.producedVariables || []),
        ...(parentContract.requiredInputs || []),
        'migration_loop', 'old_migration', 'migration', 'loopCounter', 'now', 'today'
      ]);

      inputMappings.forEach(m => {
        if (!m.source) return;
        const feelVars = parserHelper.extractFeelVariables(m.source);
        feelVars.forEach(v => {
          if (!parentKnownVars.has(v)) {
            lintAddIssue(
              issues,
              'call-activity-source-undefined',
              m.element || activity,
              \`Le mapping d’entrée target="\${m.target}" de la Call Activity « \${actName} » référence « \${m.source} », mais la variable « \${v} » n’est produite par aucun élément en amont dans le processus parent.\`,
              file.fileName
            );
          }
        });
      });
    }`;

const newSourceBlock = `    // 2. Validation des sources du mapping d'entrée dans le parent (call-activity-source-undefined)
    if (parentProcEl && parserHelper && typeof parserHelper.extractFeelVariables === 'function') {
      const parentAvailableVars = new Set([
        ...(parentContract ? parentContract.producedVariables : []),
        'migration_loop', 'old_migration', 'migration', 'loopCounter', 'now', 'today'
      ]);

      // Si le processus parent est lui-même appelé par un parent dans le lot, récupérer ses entrées
      const activeBatch = getBpmnLintFiles();
      const parentProcId = lintAttribute(parentProcEl, ['id']);
      if (Array.isArray(activeBatch)) {
        activeBatch.forEach(f => {
          if (!f || !f.xmlDoc) return;
          lintElements(f.xmlDoc).filter(el => lintLocalName(el) === 'callactivity').forEach(ca => {
            const caTarget = lintAttribute(ca, ['calledElement', 'zeebe:calledElement']);
            if (caTarget === parentProcId) {
              lintDescendants(ca, ['input', 'in']).forEach(inp => {
                const t = lintAttribute(inp, ['target']);
                if (t) parentAvailableVars.add(t);
              });
            }
          });
        });
      }

      // Détection des variables issues des Start Events
      lintDescendants(parentProcEl, ['startevent']).forEach(se => {
        const msgRef = lintAttribute(se, ['messageRef']);
        if (msgRef) parentAvailableVars.add(msgRef);
        lintDescendants(se, ['formfield', 'property']).forEach(prop => {
          const pName = lintAttribute(prop, ['id', 'name', 'key']);
          if (pName) parentAvailableVars.add(pName);
        });
      });

      inputMappings.forEach(m => {
        if (!m.source) return;
        const feelVars = parserHelper.extractFeelVariables(m.source);
        feelVars.forEach(v => {
          if (!parentAvailableVars.has(v)) {
            lintAddIssue(
              issues,
              'call-activity-source-undefined',
              m.element || activity,
              \`Le mapping d’entrée target="\${m.target}" de la Call Activity « \${actName} » référence « \${m.source} », mais la variable « \${v} » n’est produite par aucun élément en amont dans le processus parent.\`,
              file.fileName
            );
          }
        });
      });
    }`;

content = content.replace(oldSourceBlock, newSourceBlock);
fs.writeFileSync(filePath, content, 'utf8');
console.log('bpmn_lint.js parentAvailableVars patched successfully');
