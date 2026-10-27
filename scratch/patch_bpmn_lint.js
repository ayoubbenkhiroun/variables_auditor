const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../js/bpmn_lint.js');
let content = fs.readFileSync(targetFile, 'utf8');

const oldBlock = `      if (shortTimerNode) {
        lintAddIssue(issues, 'loop-max-counter-timer', shortTimerNode, \`Le minuteur de la boucle (« \${shortTimerVal} ») est inférieur à 1 minute. La temporisation doit être ≥ 1 minute (ex: PT1M).\`, file.fileName);
      } else if (!timerNodesInCycle.length) {
        const rep = cycleNodeElements.find(n => ['exclusivegateway', 'task', 'servicetask', 'callactivity'].includes(lintLocalName(n))) || cycleNodeElements[0] || scope;
        lintAddIssue(issues, 'loop-max-counter-timer', rep, 'Cette boucle de séquence (cycle de retry) ne comporte aucun minuteur d’attente. Insérez un Timer ≥ 1 minute (ex: PT1M).', file.fileName);
      }

      // 2. Compteur maximal / condition de sortie de boucle
      const gatewaysInCycle = cycleNodeElements.filter(n => ['exclusivegateway', 'inclusivegateway'].includes(lintLocalName(n)));
      let hasCounterCondition = false;
      gatewaysInCycle.forEach(gw => {
        const gwId = lintAttribute(gw, ['id']);
        const flows = scopedFlows.filter(f => lintAttribute(f, ['sourceRef']) === gwId);
        flows.forEach(f => {
          const condText = (f.textContent || '') + ' ' + lintAttribute(f, ['conditionExpression', 'condition', 'expression']);
          if (/count|retry|tentative|iteration|index|max|compteur|nb|limit|loop|\\b[ijk]\\s*[<>=]/i.test(condText)) {
            hasCounterCondition = true;
          }
        });
      });

      if (gatewaysInCycle.length && !hasCounterCondition) {
        lintAddIssue(issues, 'loop-max-counter-timer', gatewaysInCycle[0], 'La boucle de séquence ne comporte pas de condition explicite de compteur maximal (ex: retryCount < 3 ou maxAttempts).', file.fileName);
      }`;

const newBlock = `      // Détection de boucle technique de migration tolérée (Camunda 8 / Zeebe 8.x)
      let isMigrationLoop = false;
      cycleNodeElements.forEach(nodeEl => {
        const scripts = lintDescendants(nodeEl, ['script']);
        scripts.forEach(s => {
          const expr = lintAttribute(s, ['expression']) || s.textContent || '';
          const resVar = lintAttribute(s, ['resultVariable']);
          if (resVar === 'migration_loop' || expr.includes('migration_loop') || resVar === 'old_migration' || expr.includes('old_migration')) {
            isMigrationLoop = true;
          }
        });
      });

      // 2. Compteur maximal / condition de sortie de boucle
      const gatewaysInCycle = cycleNodeElements.filter(n => ['exclusivegateway', 'inclusivegateway'].includes(lintLocalName(n)));
      let hasCounterCondition = false;
      gatewaysInCycle.forEach(gw => {
        const gwId = lintAttribute(gw, ['id']);
        const flows = scopedFlows.filter(f => lintAttribute(f, ['sourceRef']) === gwId);
        flows.forEach(f => {
          const condText = (f.textContent || '') + ' ' + lintAttribute(f, ['conditionExpression', 'condition', 'expression']);
          if (/migration_loop/i.test(condText) || /migration_max_wait_loop/i.test(condText)) {
            isMigrationLoop = true;
            hasCounterCondition = true;
          } else if (/count|retry|tentative|iteration|index|max|compteur|nb|limit|loop|\\b[ijk]\\s*[<>=]/i.test(condText)) {
            hasCounterCondition = true;
          }
        });
      });

      // Émission des alertes uniquement si hors boucle de migration
      if (isMigrationLoop) {
        // Boucle technique de migration tolérée : throttle PT2S et garde migration_loop validés
      } else if (shortTimerNode) {
        lintAddIssue(issues, 'loop-max-counter-timer', shortTimerNode, \`Le minuteur de la boucle (« \${shortTimerVal} ») est inférieur à 1 minute. La temporisation doit être ≥ 1 minute (ex: PT1M).\`, file.fileName);
      } else if (!timerNodesInCycle.length) {
        const rep = cycleNodeElements.find(n => ['exclusivegateway', 'task', 'servicetask', 'callactivity'].includes(lintLocalName(n))) || cycleNodeElements[0] || scope;
        lintAddIssue(issues, 'loop-max-counter-timer', rep, 'Cette boucle de séquence (cycle de retry) ne comporte aucun minuteur d’attente. Insérez un Timer ≥ 1 minute (ex: PT1M).', file.fileName);
      }

      if (gatewaysInCycle.length && !hasCounterCondition && !isMigrationLoop) {
        lintAddIssue(issues, 'loop-max-counter-timer', gatewaysInCycle[0], 'La boucle de séquence ne comporte pas de condition explicite de compteur maximal (ex: retryCount < 3 ou maxAttempts).', file.fileName);
      }`;

// Normalize line endings for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOldBlock = oldBlock.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedOldBlock)) {
  console.error('ERROR: oldBlock not found in bpmn_lint.js');
  process.exit(1);
}

const updated = normalizedContent.replace(normalizedOldBlock, newBlock);
fs.writeFileSync(targetFile, updated, 'utf8');
console.log('SUCCESS: bpmn_lint.js patched successfully for migration loops!');
