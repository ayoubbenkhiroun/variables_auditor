const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'bpmn_lint.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rules in DEFAULT_BPMN_LINT_RULES
const targetRule = `{ id: 'call-activity-output-propagation-off', label: 'Call Activity : Désactiver la propagation des variables filles (Output propagation = Off)', category: 'Modélisation', severity: 'error', enabled: true },`;

const newRules = `{ id: 'call-activity-output-propagation-off', label: 'Call Activity : Désactiver la propagation des variables filles (Output propagation = Off)', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'call-activity-contract-input', label: 'Call Activity : Contrat d’entrée (variables requises par le sous-processus injectées)', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-activity-source-undefined', label: 'Call Activity : Source du mapping d’entrée définie dans le processus parent', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-activity-contract-output', label: 'Call Activity : Contrat de sortie (source de sortie produite par le sous-processus)', category: 'Dépendances', severity: 'warning', enabled: true },`;

if (!content.includes('call-activity-contract-input') && content.includes(targetRule)) {
  content = content.replace(targetRule, newRules);
}

// 2. Remediation map
const targetRem = `'call-activity-output-propagation-off': ['Désactiver « Propagate all child process variables » (propagateAllChildVariables="false") sur la Call Activity et déclarer des Output Mappings explicites.', 'Équipe Camunda', 'Vérifier dans le Camunda Modeler que Output propagation est sur Off et que seules les variables attendues retournent au parent.'],`;

const newRem = `'call-activity-output-propagation-off': ['Désactiver « Propagate all child process variables » (propagateAllChildVariables="false") sur la Call Activity et déclarer des Output Mappings explicites.', 'Équipe Camunda', 'Vérifier dans le Camunda Modeler que Output propagation est sur Off et que seules les variables attendues retournent au parent.'],
    'call-activity-contract-input': ['Ajouter les balises <zeebe:input source="= varParente" target="varRequise" /> manquantes pour satisfaire le contrat du sous-processus.', 'Équipe Camunda', 'Vérifier que toutes les variables consommées par le sous-processus sans valeur par défaut sont injectées.'],
    'call-activity-source-undefined': ['Vérifier l’expression source du mapping d’entrée et s’assurer que la variable existe en amont dans le processus parent.', 'Équipe Camunda', 'Tracer l’origine de la variable dans le processus parent ou corriger le nom de la variable.'],
    'call-activity-contract-output': ['Corriger la source du mapping de sortie pour référencer une variable réellement produite par le sous-processus.', 'Équipe Camunda', 'Consulter le diagramme du sous-processus pour identifier le nom exact de la variable de sortie retournée.'],`;

if (!content.includes("'call-activity-contract-input':") && content.includes(targetRem)) {
  content = content.replace(targetRem, newRem);
}

// 3. Knowledge Catalog
const targetKnowledge = `"call-activity-output-propagation-off": {
    "standard": "Bouygues Telecom Standard §4.2 & Zeebe 8.x",
    "badge": "Isolation Variables",
    "explanation": "Sur une Call Activity, la propagation automatique des variables filles vers le parent doit être DÉSACTIVÉE (propagateAllChildVariables=\\"false\\"). Seules les variables de retour explicitement mappées (<zeebe:output source=\\"...\\" target=\\"...\\" />) doivent remonter dans le processus parent.",
    "badDesc": "propagateAllChildVariables omis ou positionné à \\"true\\".",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Propagation enfant globale vers le parent -->\\n<bpmn:callActivity id=\\"Call_Scoring\\" calledElement=\\"sub-scoring\\">\\n  <bpmn:extensionElements>\\n    <zeebe:calledElement processId=\\"sub-scoring\\" propagateAllChildVariables=\\"true\\" />\\n  </bpmn:extensionElements>\\n</bpmn:callActivity>",
    "goodDesc": "propagateAllChildVariables=\\"false\\" avec sorties explicitement déclarées.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Retour de variables contrôlé -->\\n<bpmn:callActivity id=\\"Call_Scoring\\" calledElement=\\"sub-scoring\\">\\n  <bpmn:extensionElements>\\n    <zeebe:calledElement processId=\\"sub-scoring\\" propagateAllParentVariables=\\"false\\" propagateAllChildVariables=\\"false\\" />\\n    <zeebe:ioMapping>\\n      <zeebe:output source=\\"= scoreClient\\" target=\\"scoreClient\\" />\\n      <zeebe:output source=\\"= decisionScoring\\" target=\\"decisionScoring\\" />\\n    </zeebe:ioMapping>\\n  </bpmn:extensionElements>\\n</bpmn:callActivity>",
    "impact": "🚨 Écrasement involontaire de variables du processus parent par des variables temporaires du sous-processus.",
    "autoFixable": true
  },`;

const newKnowledge = targetKnowledge + `
  "call-activity-contract-input": {
    "standard": "Bouygues Telecom Data Contracts & Zeebe 8.x",
    "badge": "Contrat de Données",
    "explanation": "Lorsque la propagation des variables est isolée (propagateAllParentVariables=\\"false\\"), la Call Activity doit explicitement injecter l'ensemble des variables obligatoires consommées par le sous-processus cible.",
    "badDesc": "Call Activity n'injectant pas une variable attendue par le sous-processus.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Sous-processus requiert codePostal mais la Call Activity ne le transmet pas -->\\n<bpmn:callActivity id=\\"Call_1\\" calledElement=\\"sub-eligibilite\\">\\n  <bpmn:extensionElements>\\n    <zeebe:calledElement processId=\\"sub-eligibilite\\" propagateAllParentVariables=\\"false\\" />\\n    <zeebe:ioMapping>\\n      <zeebe:input source=\\"= nomClient\\" target=\\"nomClient\\" />\\n    </zeebe:ioMapping>\\n  </bpmn:extensionElements>\\n</bpmn:callActivity>",
    "goodDesc": "Toutes les variables obligatoires du sous-processus sont mappées.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Mapping complet des entrées requises -->\\n<bpmn:callActivity id=\\"Call_1\\" calledElement=\\"sub-eligibilite\\">\\n  <bpmn:extensionElements>\\n    <zeebe:calledElement processId=\\"sub-eligibilite\\" propagateAllParentVariables=\\"false\\" />\\n    <zeebe:ioMapping>\\n      <zeebe:input source=\\"= nomClient\\" target=\\"nomClient\\" />\\n      <zeebe:input source=\\"= codePostal\\" target=\\"codePostal\\" />\\n    </zeebe:ioMapping>\\n  </bpmn:extensionElements>\\n</bpmn:callActivity>",
    "impact": "🚨 Incident d'exécution critique Zeebe (Variable not found) lors du déroulement du sous-processus.",
    "autoFixable": false
  },
  "call-activity-source-undefined": {
    "standard": "Intégrité des Données Camunda 8",
    "badge": "Résolution Source",
    "explanation": "L'expression source d'un mapping d'entrée (<zeebe:input source=\\"...\\" target=\\"...\\" />) doit référencer des variables existantes et produites en amont dans le processus parent.",
    "badDesc": "Source de mapping d'entrée référençant une variable inexistante dans le processus parent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : variable_inexistante n'est jamais produite -->\\n<zeebe:input source=\\"= variable_inexistante\\" target=\\"monParam\\" />",
    "goodDesc": "La source référence une variable initialisée ou produite par une tâche amont.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : variable existante -->\\n<zeebe:input source=\\"= clientId\\" target=\\"monParam\\" />",
    "impact": "🚨 Évaluation de l'expression FEEL à null ou incident d'exécution à l'instanciation.",
    "autoFixable": false
  },
  "call-activity-contract-output": {
    "standard": "Bouygues Telecom Data Contracts & Zeebe 8.x",
    "badge": "Contrat de Sortie",
    "explanation": "L'expression source d'un mapping de sortie (<zeebe:output source=\\"...\\" target=\\"...\\" />) doit référencer une variable réellement produite dans le sous-processus appelé.",
    "badDesc": "Mapping de sortie attendant une variable qui n'est jamais générée par le sous-processus.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : scoreInconnu n'existe pas dans le sous-processus -->\\n<zeebe:output source=\\"= scoreInconnu\\" target=\\"score\\" />",
    "goodDesc": "La variable retournée est bien produite par le sous-processus.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : variable produite par le sous-processus -->\\n<zeebe:output source=\\"= scoreEligibilite\\" target=\\"score\\" />",
    "impact": "🟡 Valeur de retour nulle dans le processus parent pouvant corrompre la suite du flux.",
    "autoFixable": false
  },`;

// Normalize \r\n vs \n for knowledge lookup
const crlfTargetKnowledge = targetKnowledge.replace(/\r?\n/g, '\r\n');
const lfTargetKnowledge = targetKnowledge.replace(/\r?\n/g, '\n');

if (!content.includes('"call-activity-contract-input":')) {
  if (content.includes(crlfTargetKnowledge)) {
    content = content.replace(crlfTargetKnowledge, newKnowledge.replace(/\r?\n/g, '\r\n'));
  } else if (content.includes(lfTargetKnowledge)) {
    content = content.replace(lfTargetKnowledge, newKnowledge.replace(/\r?\n/g, '\n'));
  }
}

// 4. Audit Block in auditBpmnLintFile
// Find the callactivity loop
const oldCallActivityLoopRegex = /const idToProcess = new Map\(processes\.map\(process => \[lintAttribute\(process, \['id'\]\), process\]\)\);[\s\S]*?all\.filter\(element => lintLocalName\(element\) === 'callactivity'\)\.forEach\(activity => \{[\s\S]*?\}\);\s*(?=all\.filter\(element => lintLocalName\(element\) === 'lane'\))/;

const newCallActivityAudit = `const idToProcess = new Map(processes.map(process => [lintAttribute(process, ['id']), process]));
  all.filter(element => lintLocalName(element) === 'callactivity').forEach(activity => {
    const actId = lintAttribute(activity, ['id']);
    const actName = lintAttribute(activity, ['name']) || actId;
    const target = lintAttribute(activity, ['calledElement', 'zeebe:calledElement']) || lintAttribute(lintDescendants(activity, ['calledElement'])[0], ['processId']);
    const isTargetInBatch = (typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles) && bpmnLintFiles.some(f => {
      if (!f || !f.xmlDoc) return false;
      const fProcs = Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process');
      return fProcs.some(p => (p.getAttribute('id') || '').trim() === target);
    })) || (typeof bpmnBatch !== 'undefined' && Array.isArray(bpmnBatch) && bpmnBatch.some(b => b.processId === target));

    if (target && !idToProcess.has(target) && !isTargetInBatch) {
      lintAddIssue(issues, 'call-target-provided', activity, \`Le processus appelé « \${target} » n’est fourni ni dans ce fichier ni dans le lot chargé.\`, file.fileName);
    }

    // Extraction des mappings d'E/S de la Call Activity
    const inputMappings = [];
    const outputMappings = [];

    // Zeebe calledElement
    const zeebeCalled = lintDescendants(activity, ['calledElement']).find(el => {
      const p = (el.prefix || '').toLowerCase();
      const tn = (el.tagName || '').toLowerCase();
      return p === 'zeebe' || tn.includes('zeebe:calledelement') || lintLocalName(el) === 'calledelement';
    });

    const parentProp = zeebeCalled ? lintAttribute(zeebeCalled, ['propagateAllParentVariables']) : '';
    const childProp = zeebeCalled ? lintAttribute(zeebeCalled, ['propagateAllChildVariables']) : '';
    const isInputPropOff = parentProp === 'false';
    const isOutputPropOff = childProp === 'false';

    if (zeebeCalled) {
      if (parentProp !== 'false') {
        lintAddIssue(issues, 'call-activity-input-propagation-off', activity, \`La Call Activity « \${actName} » a « Input propagation » activé (propagateAllParentVariables="\${parentProp || 'true (par défaut)'}"). Vous devez désactiver « Propagate all parent process variables » (Off) pour isoler les variables d’entrée.\`, file.fileName);
      }
      if (childProp !== 'false') {
        lintAddIssue(issues, 'call-activity-output-propagation-off', activity, \`La Call Activity « \${actName} » a « Output propagation » activé (propagateAllChildVariables="\${childProp || 'true (par défaut)'}"). Vous devez désactiver « Propagate all child process variables » (Off) pour éviter l’écrasement des variables du processus parent.\`, file.fileName);
      }
    }

    // Camunda 7 legacy check
    const inVarsAll = lintDescendants(activity, ['in']).some(el => lintAttribute(el, ['variables']) === 'all');
    if (inVarsAll) {
      lintAddIssue(issues, 'call-activity-input-propagation-off', activity, \`La Call Activity « \${actName} » propage toutes les variables parentes (<camunda:in variables="all">). Supprimez cette directive et déclarez des mappings de variables explicites.\`, file.fileName);
    }
    const outVarsAll = lintDescendants(activity, ['out']).some(el => lintAttribute(el, ['variables']) === 'all');
    if (outVarsAll) {
      lintAddIssue(issues, 'call-activity-output-propagation-off', activity, \`La Call Activity « \${actName} » propage toutes les variables filles (<camunda:out variables="all">). Supprimez cette directive et déclarez des mappings de variables explicites.\`, file.fileName);
    }

    // Extraction des balises ioMapping Zeebe
    const ioMappingEl = lintDescendants(activity, ['iomapping']).find(el => {
      const p = (el.prefix || '').toLowerCase();
      const tn = (el.tagName || '').toLowerCase();
      return p === 'zeebe' || tn.includes('zeebe:iomapping') || lintLocalName(el) === 'iomapping';
    });

    if (ioMappingEl) {
      lintDescendants(ioMappingEl, ['input']).forEach(inp => {
        const src = lintAttribute(inp, ['source']);
        const tgt = lintAttribute(inp, ['target']);
        if (src || tgt) inputMappings.push({ source: src, target: tgt, element: inp });
      });
      lintDescendants(ioMappingEl, ['output']).forEach(out => {
        const src = lintAttribute(out, ['source']);
        const tgt = lintAttribute(out, ['target']);
        if (src || tgt) outputMappings.push({ source: src, target: tgt, element: out });
      });
    }

    // Extraction des mappings Camunda 7
    lintDescendants(activity, ['in']).forEach(el => {
      const src = lintAttribute(el, ['source', 'sourceExpression']);
      const tgt = lintAttribute(el, ['target']);
      if (src || tgt) inputMappings.push({ source: src, target: tgt, element: el });
    });
    lintDescendants(activity, ['out']).forEach(el => {
      const src = lintAttribute(el, ['source', 'sourceExpression']);
      const tgt = lintAttribute(el, ['target']);
      if (src || tgt) outputMappings.push({ source: src, target: tgt, element: el });
    });

    // Résolution du contrat de données du sous-processus cible
    let targetProcEl = idToProcess.get(target) || null;
    if (!targetProcEl && typeof bpmnLintFiles !== 'undefined' && Array.isArray(bpmnLintFiles)) {
      for (const f of bpmnLintFiles) {
        if (!f || !f.xmlDoc) continue;
        const fProcs = Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process');
        const found = fProcs.find(p => (p.getAttribute('id') || '').trim() === target);
        if (found) {
          targetProcEl = found;
          break;
        }
      }
    }

    let targetBatchProc = null;
    if (typeof bpmnBatch !== 'undefined' && Array.isArray(bpmnBatch)) {
      targetBatchProc = bpmnBatch.find(b => b.processId === target) || null;
    }

    const parserHelper = (typeof BpmnZeebeParser !== 'undefined')
      ? BpmnZeebeParser
      : (typeof bpmnGetProcessContract !== 'undefined' ? { getProcessContract: bpmnGetProcessContract, extractFeelVariables: bpmnExtractFeelVariables } : null);

    let targetContract = null;
    if (parserHelper && typeof parserHelper.getProcessContract === 'function') {
      if (targetProcEl) targetContract = parserHelper.getProcessContract(targetProcEl);
      else if (targetBatchProc) targetContract = parserHelper.getProcessContract(targetBatchProc);
    }

    const parentProcEl = lintFlowScope(activity);
    let parentContract = null;
    if (parentProcEl && parserHelper && typeof parserHelper.getProcessContract === 'function') {
      parentContract = parserHelper.getProcessContract(parentProcEl);
    }

    // 1. Validation du contrat d'entrée (call-activity-contract-input)
    if (isInputPropOff) {
      const mappedInputTargets = new Set(inputMappings.map(m => m.target).filter(Boolean));

      if (targetContract && targetContract.requiredInputs && targetContract.requiredInputs.length > 0) {
        const missingInputs = targetContract.requiredInputs.filter(reqVar => !mappedInputTargets.has(reqVar));
        if (missingInputs.length > 0) {
          lintAddIssue(
            issues,
            'call-activity-contract-input',
            activity,
            \`Violation du contrat d’entrée : Le sous-processus « \${target} » requiert la/les variable(s) [\${missingInputs.join(', ')}], mais la Call Activity « \${actName} » ne les injecte pas (propagateAllParentVariables="false").\`,
            file.fileName
          );
        }
      } else if (inputMappings.length === 0) {
        if (!targetProcEl && !targetBatchProc) {
          lintAddIssue(
            issues,
            'call-activity-contract-input',
            activity,
            \`La Call Activity « \${actName} » a la propagation désactivée (propagateAllParentVariables="false") mais ne déclare aucun mapping d’entrée (<zeebe:input>). Le sous-processus « \${target} » recevra un contexte vide.\`,
            file.fileName
          );
        }
      }
    }

    // 2. Validation des sources du mapping d'entrée dans le parent (call-activity-source-undefined)
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
    }

    // 3. Validation du contrat de sortie (call-activity-contract-output)
    if (isOutputPropOff && targetContract && targetContract.producedVariables && parserHelper && typeof parserHelper.extractFeelVariables === 'function') {
      const targetProducedSet = new Set([
        ...targetContract.producedVariables,
        'migration_loop', 'old_migration', 'migration'
      ]);

      outputMappings.forEach(m => {
        if (!m.source) return;
        const feelVars = parserHelper.extractFeelVariables(m.source);
        feelVars.forEach(v => {
          if (!targetProducedSet.has(v)) {
            lintAddIssue(
              issues,
              'call-activity-contract-output',
              m.element || activity,
              \`Le mapping de sortie target="\${m.target}" de la Call Activity « \${actName} » attend la variable source « \${m.source} », mais celle-ci n’est produite par aucune activité dans le sous-processus « \${target} ».\`,
              file.fileName
            );
          }
        });
      });
    }
  });

  `;

content = content.replace(oldCallActivityLoopRegex, newCallActivityAudit);

fs.writeFileSync(filePath, content, 'utf8');
console.log('bpmn_lint.js patched successfully');
