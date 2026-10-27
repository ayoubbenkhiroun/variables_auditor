const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../js/bpmn_lint.js');
let content = fs.readFileSync(targetFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Ajouter lintIsMigrationBypassFlow s'il n'existe pas encore
if (!content.includes('function lintIsMigrationBypassFlow(')) {
  const helperAnchor = 'function lintFlowHasCondition(flow) {';
  const helperCode = `function lintIsMigrationBypassFlow(flow) {
  if (!flow) return false;
  const condText = (flow.textContent || '') + ' ' + lintAttribute(flow, ['conditionExpression', 'condition', 'expression']);
  return /migration\\s*=\\s*["']O["']/i.test(condText) || /migrationActivities/i.test(condText);
}

function lintFlowHasCondition(flow) {`;
  content = content.replace(helperAnchor, helperCode);
}

// 2. Mettre à jour l'analyse de reachability et dead-ends
const oldReachabilityBlock = `    const reachable = new Set(starts.map(start => lintAttribute(start, ['id'])).filter(Boolean));
    const queue = Array.from(reachable);
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
      const current = queue[queueIndex];
      (outgoing.get(current) || []).forEach(target => {
        if (target && !reachable.has(target)) { reachable.add(target); queue.push(target); }
      });
    }
    const canReachEnd = new Set(ends.map(end => lintAttribute(end, ['id'])).filter(Boolean));
    const reverseQueue = Array.from(canReachEnd);
    for (let queueIndex = 0; queueIndex < reverseQueue.length; queueIndex++) {
      const current = reverseQueue[queueIndex];
      (incoming.get(current) || []).forEach(source => {
        if (source && !canReachEnd.has(source)) { canReachEnd.add(source); reverseQueue.push(source); }
      });
    }
    scopedNodes.forEach(node => {
      const type = lintLocalName(node);
      const nodeId = lintAttribute(node, ['id']);
      const inCount = incoming.get(nodeId)?.length || 0;
      const outCount = outgoing.get(nodeId)?.length || 0;

      if (starts.length && type !== 'boundaryevent' && type !== 'startevent' && !reachable.has(nodeId)) {
        lintAddIssue(issues, 'unreachable-node', node, \`L’élément \${nodeId || type} n’est atteignable depuis aucun événement de début du processus.\`, file.fileName);
      }
      if (!['startevent', 'endevent', 'boundaryevent'].includes(type) && nodeId && (!inCount || !outCount)) {
        lintAddIssue(issues, 'dead-end-node', node, \`L’élément \${nodeId} n’a pas à la fois un flux entrant et un flux sortant.\`, file.fileName);
      }
      if (ends.length && nodeId && reachable.has(nodeId) && !canReachEnd.has(nodeId) && type !== 'boundaryevent') {
        lintAddIssue(issues, 'no-path-to-end', node, \`Aucun chemin depuis \${nodeId} ne mène à un événement de fin de ce scope.\`, file.fileName);
      }`;

const newReachabilityBlock = `    // Traçabilité des flux de contournement de migration
    const migrationFlows = scopedFlows.filter(f => lintIsMigrationBypassFlow(f));

    // Atteignabilité globale (flux nominaux + flux de migration)
    const reachable = new Set(starts.map(start => lintAttribute(start, ['id'])).filter(Boolean));
    const queue = Array.from(reachable);
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
      const current = queue[queueIndex];
      (outgoing.get(current) || []).forEach(target => {
        if (target && !reachable.has(target)) { reachable.add(target); queue.push(target); }
      });
    }

    // Convergence vers la fin (End Events)
    const canReachEnd = new Set(ends.map(end => lintAttribute(end, ['id'])).filter(Boolean));
    const reverseQueue = Array.from(canReachEnd);
    for (let queueIndex = 0; queueIndex < reverseQueue.length; queueIndex++) {
      const current = reverseQueue[queueIndex];
      (incoming.get(current) || []).forEach(source => {
        if (source && !canReachEnd.has(source)) { canReachEnd.add(source); reverseQueue.push(source); }
      });
    }

    // Validation des branches de contournement de migration :
    // S'assurer qu'elles rejoignent bien une suite de flux valide pouvant mener à la fin
    migrationFlows.forEach(mFlow => {
      const mFlowId = lintAttribute(mFlow, ['id']);
      const targetId = lintAttribute(mFlow, ['targetRef']);
      if (ends.length && targetId && !canReachEnd.has(targetId)) {
        lintAddIssue(issues, 'no-path-to-end', mFlow, \`La branche de reprise sur migration « \${mFlowId} » cible un élément « \${targetId} » qui ne permet pas d’atteindre une issue terminale.\`, file.fileName);
      }
    });

    scopedNodes.forEach(node => {
      const type = lintLocalName(node);
      const nodeId = lintAttribute(node, ['id']);
      const inCount = incoming.get(nodeId)?.length || 0;
      const outCount = outgoing.get(nodeId)?.length || 0;

      // 1. Nœuds inatteignables : ni par flux nominal ni par flux de migration
      if (starts.length && type !== 'boundaryevent' && type !== 'startevent' && !reachable.has(nodeId)) {
        lintAddIssue(issues, 'unreachable-node', node, \`L’élément \${nodeId || type} n’est atteignable depuis aucun événement de début du processus.\`, file.fileName);
      }

      // 2. Impasse (Dead-end) : aucun flux entrant ou aucun flux sortant
      if (!['startevent', 'endevent', 'boundaryevent'].includes(type) && nodeId && (!inCount || !outCount)) {
        lintAddIssue(issues, 'dead-end-node', node, \`L’élément \${nodeId} n’a pas à la fois un flux entrant et un flux sortant.\`, file.fileName);
      }

      // 3. Absence d'issue vers la fin (No Path to End)
      if (ends.length && nodeId && reachable.has(nodeId) && !canReachEnd.has(nodeId) && type !== 'boundaryevent') {
        lintAddIssue(issues, 'no-path-to-end', node, \`Aucun chemin depuis \${nodeId} ne mène à un événement de fin de ce scope.\`, file.fileName);
      }`;

if (!content.includes(oldReachabilityBlock)) {
  console.error('ERROR: oldReachabilityBlock not found');
  process.exit(1);
}
content = content.replace(oldReachabilityBlock, newReachabilityBlock);

// 3. Mettre à jour la règle exclusive-gateway-default pour tenir compte des passerelles de migration
const oldGwBlock = `        // Règle : Définir obligatoirement un Default Flow
        if (!defaultId) {
          lintAddIssue(issues, 'exclusive-gateway-default', node, \`La passerelle exclusive (XOR) « \${nodeName} » ne définit aucun flux par défaut (Default Flow). Un flux par défaut est obligatoire.\`, file.fileName);
        }`;

const newGwBlock = `        const hasMigrationBypass = nodeFlows.some(f => lintIsMigrationBypassFlow(f));
        // Règle : Définir obligatoirement un Default Flow
        // Si la passerelle bifurque entre une reprise de migration (migration = "O") et un flux nominal,
        // et que toutes les branches portent une condition formelle explicite, la passerelle est tolérée
        if (!defaultId) {
          const allHaveConditions = nodeFlows.every(flow => lintFlowHasCondition(flow));
          if (!hasMigrationBypass || !allHaveConditions) {
            lintAddIssue(issues, 'exclusive-gateway-default', node, \`La passerelle exclusive (XOR) « \${nodeName} » ne définit aucun flux par défaut (Default Flow). Un flux par défaut est obligatoire.\`, file.fileName);
          }
        }`;

if (!content.includes(oldGwBlock)) {
  console.error('ERROR: oldGwBlock not found');
  process.exit(1);
}
content = content.replace(oldGwBlock, newGwBlock);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: Step 2 reachability & migration bypass patched in bpmn_lint.js!');
