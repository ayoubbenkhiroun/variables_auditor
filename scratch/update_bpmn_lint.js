const fs = require('fs');
const path = require('path');

const bpmnLintPath = path.join(__dirname, '../js/bpmn_lint.js');
let content = fs.readFileSync(bpmnLintPath, 'utf8');

// 1. Ajouter les fonctions de Sandboxing XML, Cache AST et Validation FEEL
const helperFunctions = `
// 🛡️ Sandboxing XML Sécurisé (Anti-XXE & DoS / Billion Laughs)
function lintSanitizeXml(rawXml) {
  if (typeof rawXml !== 'string') return '';
  if (/<!DOCTYPE/i.test(rawXml) || /<!ENTITY/i.test(rawXml)) {
    rawXml = rawXml.replace(/<!DOCTYPE[^>]*(\\[[^\\]]*\\])?>/gi, '');
    rawXml = rawXml.replace(/<!ENTITY[^>]*>/gi, '');
  }
  if (/(?:&[a-zA-Z0-9_]+;){100,}/.test(rawXml)) {
    throw new Error("Alerte de Sécurité : Entités XML suspectes ou récursives détectées (Anti-DoS).");
  }
  return rawXml;
}

// ⚡ Cache AST / XML Pré-indexé pour analyse O(1) ultra-rapide
const BPMN_AST_CACHE = new WeakMap();

function buildBpmnAstIndex(xmlDoc) {
  if (!xmlDoc) return null;
  if (BPMN_AST_CACHE.has(xmlDoc)) {
    return BPMN_AST_CACHE.get(xmlDoc);
  }

  const all = Array.from(xmlDoc.getElementsByTagName('*'));
  const elementsById = new Map();
  const elementsByType = new Map();
  const flowNodes = [];
  const sequenceFlows = [];
  const messageFlows = [];
  const processes = [];
  const callActivities = [];
  const incomingMap = new Map();
  const outgoingMap = new Map();

  const flowNodeNames = new Set(['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent', 'exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway']);

  all.forEach(el => {
    const type = lintLocalName(el);
    if (!elementsByType.has(type)) elementsByType.set(type, []);
    elementsByType.get(type).push(el);

    const id = lintAttribute(el, ['id']);
    if (id) {
      if (!elementsById.has(id)) elementsById.set(id, []);
      elementsById.get(id).push(el);
    }

    if (flowNodeNames.has(type)) flowNodes.push(el);
    if (type === 'sequenceflow') sequenceFlows.push(el);
    if (type === 'messageflow') messageFlows.push(el);
    if (type === 'process') processes.push(el);
    if (type === 'callactivity') callActivities.push(el);
  });

  sequenceFlows.forEach(flow => {
    const s = lintAttribute(flow, ['sourceRef']);
    const t = lintAttribute(flow, ['targetRef']);
    if (s) {
      if (!outgoingMap.has(s)) outgoingMap.set(s, []);
      outgoingMap.get(s).push({ target: t, flow });
    }
    if (t) {
      if (!incomingMap.has(t)) incomingMap.set(t, []);
      incomingMap.get(t).push({ source: s, flow });
    }
  });

  const astIndex = {
    all,
    elementsById,
    elementsByType,
    flowNodes,
    sequenceFlows,
    messageFlows,
    processes,
    callActivities,
    incomingMap,
    outgoingMap
  };

  BPMN_AST_CACHE.set(xmlDoc, astIndex);
  return astIndex;
}

// 🔍 Validation approfondie des Expressions FEEL (Zeebe / Camunda 8)
function lintValidateFeelExpression(exprText) {
  if (!exprText) return [];
  const text = String(exprText).trim();
  const issues = [];

  if (!text.startsWith('=') && !text.startsWith('\${') && !text.startsWith('#{')) {
    if (/\\b(==|!=|&&|\\|\\||<|>|<=|>=)\\b/.test(text) || /\\b(and|or|not)\\b/i.test(text) || /\\b[a-zA-Z_][a-zA-Z0-9_]*\\s*(==|=)/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`L'expression « \${text} » doit débuter par '=' pour être évaluée par Zeebe (ex: '= \${text}'). Sans '=', elle est traitée comme une chaîne littérale.\`
      });
    }
  }

  if (text.startsWith('=')) {
    if (/&&/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Opérateur '&&' invalide en FEEL dans « \${text} ». Utilisez le mot-clé 'and'.\`
      });
    }
    if (/\\|\\|/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Opérateur '||' invalide en FEEL dans « \${text} ». Utilisez le mot-clé 'or'.\`
      });
    }
    if (/(^|[^\\w])!(?!=)/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Opérateur de négation '!' invalide en FEEL dans « \${text} ». Utilisez la fonction 'not(...)'.\`
      });
    }

    const doubleQuotes = (text.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Guillemets doubles (") non fermés dans l'expression FEEL « \${text} ».\`
      });
    }
    const openParen = (text.match(/\\(/g) || []).length;
    const closeParen = (text.match(/\\)/g) || []).length;
    if (openParen !== closeParen) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Parenthèses déséquilibrées dans l'expression FEEL « \${text} » (\${openParen} '(' vs \${closeParen} ')').\`
      });
    }
    const openBracket = (text.match(/\\[/g) || []).length;
    const closeBracket = (text.match(/\\]/g) || []).length;
    if (openBracket !== closeBracket) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: \`Crochets déséquilibrés dans le filtre FEEL « \${text} » (\${openBracket} '[' vs \${closeBracket} ']').\`
      });
    }
  }

  return issues;
}
`;

if (!content.includes('lintSanitizeXml')) {
  content = content.replace('function lintEscape(value) {', helperFunctions + '\nfunction lintEscape(value) {');
}

// 2. Mettre à jour l'ingestion de fichiers avec Sandboxing XML (Anti-XXE)
const oldParseBlock = `    const source = await file.text();
    try {
      const xmlDoc = new DOMParser().parseFromString(source, 'application/xml');`;

const newParseBlock = `    let source = await file.text();
    try {
      source = lintSanitizeXml(source);
      const xmlDoc = new DOMParser().parseFromString(source, 'application/xml');`;

if (content.includes(oldParseBlock)) {
  content = content.replace(oldParseBlock, newParseBlock);
}

// 3. Ajouter l'audit Multi-Instance Zeebe et FEEL dans auditBpmnLintFile
const auditLoopSearch = `    // Contrôle boucles multi-instances et standard loops (compteur maximal obligatoire)
    const multiInstance = lintDescendants(node, ['multiinstanceloopcharacteristics', 'multiInstanceLoopCharacteristics'])[0];
    const standardLoop = lintDescendants(node, ['standardloopcharacteristics', 'standardLoopCharacteristics'])[0];
    if (multiInstance || standardLoop) {
      const loopEl = multiInstance || standardLoop;
      const loopCardinality = lintDescendants(loopEl, ['loopcardinality', 'loopCardinality']).some(c => (c.textContent || '').trim());
      const completionCond = lintDescendants(loopEl, ['completioncondition', 'completionCondition']).some(c => (c.textContent || '').trim());
      const loopMax = lintAttribute(loopEl, ['loopMaximum', 'camunda:collection', 'zeebe:inputCollection']);

      if (!loopCardinality && !completionCond && !loopMax) {
        lintAddIssue(issues, 'loop-max-counter-timer', node, \`L’activité en boucle « \${name || id || type} » doit définir un compteur maximal (loopCardinality ou completionCondition).\`, file.fileName);
      }
    }`;

const auditLoopEnhanced = `    // Contrôle boucles multi-instances et standard loops (Zeebe C8 & Camunda 7)
    const multiInstance = lintDescendants(node, ['multiinstanceloopcharacteristics', 'multiInstanceLoopCharacteristics'])[0];
    const standardLoop = lintDescendants(node, ['standardloopcharacteristics', 'standardLoopCharacteristics'])[0];
    if (multiInstance || standardLoop) {
      const loopEl = multiInstance || standardLoop;
      const loopCardinality = lintDescendants(loopEl, ['loopcardinality', 'loopCardinality']).some(c => (c.textContent || '').trim());
      const completionCond = lintDescendants(loopEl, ['completioncondition', 'completionCondition']).some(c => (c.textContent || '').trim());
      const isSequential = lintAttribute(loopEl, ['isSequential']).toLowerCase() === 'true';

      // 1. Règle Compteur / Définition Maximale
      const loopMax = lintAttribute(loopEl, ['loopMaximum', 'camunda:collection', 'zeebe:inputCollection']);
      if (!loopCardinality && !completionCond && !loopMax && !multiInstance) {
        lintAddIssue(issues, 'loop-max-counter-timer', node, \`L’activité en boucle « \${name || id || type} » doit définir un compteur maximal (loopCardinality ou completionCondition).\`, file.fileName);
      }

      // 2. Règle Dérive Multi-Instance Zeebe C8 (zeebe-multi-instance-loop)
      if (multiInstance) {
        const zeebeLoopChars = lintDescendants(multiInstance, ['loopCharacteristics', 'zeebe:loopCharacteristics'])[0];
        const inputCollection = (zeebeLoopChars ? lintAttribute(zeebeLoopChars, ['inputCollection']) : '') || lintAttribute(multiInstance, ['zeebe:inputCollection', 'camunda:collection']);
        const inputElement = (zeebeLoopChars ? lintAttribute(zeebeLoopChars, ['inputElement']) : '') || lintAttribute(multiInstance, ['zeebe:inputElement', 'camunda:elementVariable']);
        const loopDataInput = lintDescendants(multiInstance, ['loopDataInputRef', 'zeebe:loopDataInput']).some(c => (c.textContent || '').trim());

        if (!inputCollection && !loopDataInput && !loopCardinality) {
          lintAddIssue(issues, 'zeebe-multi-instance-loop', node, \`L’activité multi-instance « \${name || id || type} » n’a pas de collection d’entrée définie (inputCollection ou zeebe:loopCharacteristics manquant).\`, file.fileName);
        } else if (inputCollection && !inputElement && !loopCardinality) {
          lintAddIssue(issues, 'zeebe-multi-instance-loop', node, \`L’activité multi-instance « \${name || id || type} » itère sur « \${inputCollection} » mais ne définit pas de variable d’élément d’entrée (inputElement).\`, file.fileName);
        }

        // 3. Règle Condition de Complétion sur Boucle Parallèle
        if (!isSequential && !completionCond && !loopCardinality) {
          lintAddIssue(issues, 'zeebe-multi-instance-completion-condition', node, \`L’activité multi-instance parallèle « \${name || id || type} » ne comporte pas de condition de terminaison anticipée (completionCondition). Risque d'attente bloquante.\`, file.fileName);
        }
      }
    }`;

if (content.includes(auditLoopSearch)) {
  content = content.replace(auditLoopSearch, auditLoopEnhanced);
}

// 4. Ajouter l'audit des expressions FEEL sur les flux et nœuds
const feelFlowCheckSearch = `    if (source && ['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(lintLocalName(source))) {
      const defaultFlow = lintAttribute(source, ['default']) === lintAttribute(flow, ['id']);
      if (!lintAttribute(flow, ['name']) && !defaultFlow && !hasCondition) {
        lintAddIssue(issues, 'gateway-flow-label', flow, 'Cette branche de décision n’a ni libellé, ni condition, ni indication de flux par défaut.', file.fileName);
      }
    }`;

const feelFlowCheckEnhanced = `    if (source && ['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(lintLocalName(source))) {
      const defaultFlow = lintAttribute(source, ['default']) === lintAttribute(flow, ['id']);
      if (!lintAttribute(flow, ['name']) && !defaultFlow && !hasCondition) {
        lintAddIssue(issues, 'gateway-flow-label', flow, 'Cette branche de décision n’a ni libellé, ni condition, ni indication de flux par défaut.', file.fileName);
      }
    }

    // Validation des expressions FEEL sur le flux conditionnel
    if (hasCondition) {
      const condText = (flow.textContent || lintAttribute(flow, ['conditionExpression', 'condition']) || '').trim();
      const feelErrors = lintValidateFeelExpression(condText);
      feelErrors.forEach(fe => {
        lintAddIssue(issues, fe.ruleId, flow, fe.msg, file.fileName);
      });
    }`;

if (content.includes(feelFlowCheckSearch)) {
  content = content.replace(feelFlowCheckSearch, feelFlowCheckEnhanced);
}

// 5. Ajouter les connaissances dans BPMN_LINT_RULE_KNOWLEDGE
const knowledgeAppend = `  "zeebe-multi-instance-loop": {
    "standard": "Camunda 8 (Zeebe) Multi-Instance Engine Spec",
    "badge": "Multi-Instance Zeebe",
    "explanation": "Une tâche multi-instance (bpmn:multiInstanceLoopCharacteristics) doit obligatoirement définir sa collection d'entrée (inputCollection) et la variable d'élément itéré (inputElement) dans son bloc d'extension <zeebe:loopCharacteristics>.",
    "badDesc": "Multi-instance sans inputCollection ou sans inputElement.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Multi-instance incomplète -->\\n<bpmn:serviceTask id=\\"Task_multi\\" name=\\"Envoyer notifications\\">\\n  <bpmn:multiInstanceLoopCharacteristics />\\n</bpmn:serviceTask>",
    "goodDesc": "Configuration complète avec collection d'entrée et variable d'élément.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Multi-instance Zeebe complète -->\\n<bpmn:serviceTask id=\\"Task_multi\\" name=\\"Envoyer notifications\\">\\n  <bpmn:multiInstanceLoopCharacteristics>\\n    <bpmn:extensionElements>\\n      <zeebe:loopCharacteristics inputCollection=\\"= destinatairesList\\" inputElement=\\"destinataire\\" />\\n    </bpmn:extensionElements>\\n  </bpmn:multiInstanceLoopCharacteristics>\\n</bpmn:serviceTask>",
    "impact": "🚨 Échec immédiat d'instanciation de la tâche dans le moteur Zeebe.",
    "autoFixable": false
  },
  "zeebe-multi-instance-completion-condition": {
    "standard": "Camunda Best Practice & Performance",
    "badge": "Résilience Parallèle",
    "explanation": "Sur les multi-instances exécutées en parallèle, il est fortement recommandé de définir une condition de complétion (completionCondition, ex: = nrOfCompletedInstances = nrOfInstances ou un quorum) pour éviter les attentes infinies en cas d'incident sur un sous-jeton.",
    "badDesc": "Multi-instance parallèle sans completionCondition explicite.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Pas de condition de sortie -->\\n<bpmn:multiInstanceLoopCharacteristics isSequential=\\"false\\" />",
    "goodDesc": "Condition de complétion bornée.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Condition de complétion -->\\n<bpmn:multiInstanceLoopCharacteristics isSequential=\\"false\\">\\n  <bpmn:completionCondition>= nrOfCompletedInstances >= 5</bpmn:completionCondition>\\n</bpmn:multiInstanceLoopCharacteristics>",
    "impact": "🟠 Risque de blocage prolongé du processus parent.",
    "autoFixable": false
  },
  "feel-expression-syntax": {
    "standard": "Camunda FEEL 1.4+ ISO 19510",
    "badge": "Conformité FEEL",
    "explanation": "Toute expression dynamique Camunda 8 (conditions de flux, mappings d'E/S) doit obligatoirement débuter par le signe '=' et respecter la syntaxe FEEL (opérateurs and/or au lieu de &&/||, fonction not(), guillemets équilibrés). Sans '=', Zeebe traite l'expression comme une simple chaîne littérale.",
    "badDesc": "Condition sans '=' au début ou utilisant des opérateurs non-FEEL (&&, ||, !).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Expression sans '=' et avec '&&' -->\\n<bpmn:conditionExpression xsi:type=\\"bpmn:tFormalExpression\\">statut == \\"VALIDE\\" && montant > 100</bpmn:conditionExpression>",
    "goodDesc": "Expression FEEL préfixée par '=' avec syntaxe conforme.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Syntaxe FEEL valide -->\\n<bpmn:conditionExpression xsi:type=\\"bpmn:tFormalExpression\\">= statut = \\"VALIDE\\" and montant > 100</bpmn:conditionExpression>",
    "impact": "🚨 Mauvais routage conditionnel ou crash d'évaluation FEEL au runtime.",
    "autoFixable": true
  },`;

if (!content.includes('zeebe-multi-instance-loop') && content.includes('const BPMN_LINT_RULE_KNOWLEDGE = {')) {
  content = content.replace('const BPMN_LINT_RULE_KNOWLEDGE = {', 'const BPMN_LINT_RULE_KNOWLEDGE = {\n' + knowledgeAppend);
}

// 6. Ajouter les recommandations d'action
const guidanceAppend = `    'zeebe-multi-instance-loop': ['Définir inputCollection et inputElement dans l’extension zeebe:loopCharacteristics de la tâche multi-instance.', 'Équipe Camunda', 'Vérifier dans le Modeler que la collection est liée à une variable de type liste et tester l’itération.'],
    'zeebe-multi-instance-completion-condition': ['Ajouter une expression completionCondition (ex: = nrOfCompletedInstances = nrOfInstances) sur l’activité multi-instance.', 'Équipe Camunda', 'Tester la terminaison de la boucle avec différentes tailles de collections.'],
    'feel-expression-syntax': ['Ajouter le préfixe "=" au début de l’expression FEEL et remplacer les opérateurs && / || par and / or.', 'Équipe Camunda', 'Tester l’évaluation de la condition avec les jeux de données de recette.'],`;

if (!content.includes("'zeebe-multi-instance-loop':") && content.includes('const checks = {')) {
  content = content.replace('const checks = {', 'const checks = {\n' + guidanceAppend);
}

// 7. Ajouter le support de l'Overlay Heatmap de Santé dans le visualiseur BPMN
const heatmapFunctionCode = `
window.bpmnLintToggleHeatmap = function() {
  bpmnLintHeatmapActive = !bpmnLintHeatmapActive;
  window.bpmnLintHeatmapActive = bpmnLintHeatmapActive;
  const btn = document.getElementById('btnToggleBpmnLintHeatmap');
  if (btn) {
    btn.classList.toggle('active', bpmnLintHeatmapActive);
    btn.style.background = bpmnLintHeatmapActive ? 'linear-gradient(135deg, #ea580c, #dc2626)' : '';
    btn.style.color = bpmnLintHeatmapActive ? '#fff' : '';
    btn.textContent = bpmnLintHeatmapActive ? '🔥 Heatmap Active' : '🔥 Heatmap';
  }
  if (bpmnLintViewerActiveFileName) {
    bpmnLintApplyHeatmapOverlay();
  }
};

window.bpmnLintApplyHeatmapOverlay = function() {
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  const elementRegistry = bpmnLintViewerInstance.get('elementRegistry');
  const overlays = bpmnLintViewerInstance.get('overlays');

  // Nettoyer les badges heatmap existants
  try { overlays.remove({ type: 'heatmap-badge' }); } catch (e) {}

  const fileIssues = bpmnLintViewerActiveIssues || [];
  const issuesByElement = new Map();
  fileIssues.forEach(issue => {
    if (!issue.elementId || issue.isProcessLevel) return;
    if (!issuesByElement.has(issue.elementId)) issuesByElement.set(issue.elementId, []);
    issuesByElement.get(issue.elementId).push(issue);
  });

  const flowNodeTypes = new Set(['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent', 'exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway']);

  elementRegistry.forEach(shape => {
    if (!shape || !shape.id) return;
    const type = String(shape.type || '').split(':').pop().toLowerCase();
    if (!flowNodeTypes.has(type)) return;

    // Retirer les anciennes classes heatmap
    canvas.removeMarker(shape.id, 'bpmn-heatmap-ok');
    canvas.removeMarker(shape.id, 'bpmn-heatmap-warn');
    canvas.removeMarker(shape.id, 'bpmn-heatmap-blocker');

    if (!bpmnLintHeatmapActive) return;

    const elIssues = issuesByElement.get(shape.id) || [];
    if (!elIssues.length) {
      canvas.addMarker(shape.id, 'bpmn-heatmap-ok');
    } else {
      const hasBlocker = elIssues.some(i => ['blocker', 'error'].includes(i.severity));
      if (hasBlocker) {
        canvas.addMarker(shape.id, 'bpmn-heatmap-blocker');
      } else {
        canvas.addMarker(shape.id, 'bpmn-heatmap-warn');
      }

      try {
        overlays.add(shape.id, 'heatmap-badge', {
          position: { top: -8, right: -8 },
          html: \`<div title="\${elIssues.length} anomalie(s) : \${lintEscape(elIssues.map(i => i.rule).join(' | '))}" style="background:\${hasBlocker ? '#dc2626' : '#ea580c'}; color:#fff; border-radius:10px; padding:1px 6px; font-size:10px; font-weight:800; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.35);">\${elIssues.length}</div>\`
        });
      } catch (e) {}
    }
  });
};
`;

if (!content.includes('bpmnLintToggleHeatmap')) {
  content += '\n' + heatmapFunctionCode;
}

// 8. Dans openBpmnLintViewer, déclencher bpmnLintApplyHeatmapOverlay
if (!content.includes('bpmnLintApplyHeatmapOverlay();')) {
  content = content.replace("canvas.zoom('fit-viewport');", "canvas.zoom('fit-viewport');\n      if (bpmnLintHeatmapActive) bpmnLintApplyHeatmapOverlay();");
}

fs.writeFileSync(bpmnLintPath, content, 'utf8');
console.log('✅ js/bpmn_lint.js mis à jour avec succès !');
