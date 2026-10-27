const BPMN_LINT_RULES_KEY = 'auditflow_bpmn_lint_rules_v6';

const DEFAULT_BPMN_LINT_RULES = [
  // Structure & Intégrité BPMN 2.0 (OMG)
  { id: 'definitions-root', label: 'Racine BPMN definitions (bpmn:definitions)', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'definitions-namespace', label: 'Namespace BPMN 2.0 valide (OMG)', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'process-id', label: 'ID technique de processus présent', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'duplicate-id', label: 'Identifiants BPMN uniques dans le fichier', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'flow-references', label: 'Références des flux (sourceRef / targetRef) résolues', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'sequence-flow-cross-pool', label: 'Flux de séquence intra-pool (interdiction inter-pools)', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'message-flow-valid', label: 'Flux de messages inter-pools uniquement', category: 'Structure', severity: 'error', enabled: true },
  { id: 'start-event', label: 'Événement de début présent dans chaque processus', category: 'Structure', severity: 'error', enabled: true },
  { id: 'multiple-none-start-events', label: 'Événement de début None unique par processus', category: 'Structure', severity: 'error', enabled: true },
  { id: 'end-event', label: 'Événement de fin présent dans chaque processus', category: 'Structure', severity: 'error', enabled: true },
  { id: 'start-incoming', label: 'Événement de début sans flux de séquence entrant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'end-outgoing', label: 'Événement de fin sans flux de séquence sortant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'intermediate-flows', label: 'Événements intermédiaires avec flux entrant et sortant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'boundary-reference', label: 'Événements de bordure rattachés (attachedToRef)', category: 'Structure', severity: 'error', enabled: true },
  { id: 'boundary-target', label: 'Cible de bordure valide (activité du même scope)', category: 'Structure', severity: 'error', enabled: true },
  { id: 'boundary-incoming', label: 'Événements de bordure sans flux entrant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'boundary-outgoing', label: 'Événements de bordure avec flux sortant de dérivation', category: 'Structure', severity: 'warning', enabled: true },
  { id: 'event-subprocess-structure', label: 'Sous-processus événementiel conforme (non traversé, début typé)', category: 'Structure', severity: 'error', enabled: true },
  { id: 'unreachable-node', label: 'Éléments atteignables depuis un début', category: 'Structure', severity: 'warning', enabled: true },
  { id: 'default-flow-reference', label: 'Branche par défaut résolue et issue du nœud', category: 'Structure', severity: 'error', enabled: true },
  { id: 'flow-node-id', label: 'ID technique des éléments de flux présent', category: 'Structure', severity: 'error', enabled: true },
  { id: 'lane-reference', label: 'Références de lanes résolues (flowNodeRef)', category: 'Structure', severity: 'error', enabled: true },

  // Dépendances & Inter-processus
  { id: 'duplicate-process-id-batch', label: 'IDs de processus uniques dans le lot de fichiers', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-target', label: 'Cible de Call Activity renseignée', category: 'Structure', severity: 'error', enabled: true },
  { id: 'call-target-provided', label: 'Processus appelé fourni dans le lot', category: 'Dépendances', severity: 'warning', enabled: true },
  { id: 'call-cycle', label: 'Absence de cycle entre processus appelés', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-activity-input-propagation-off', label: 'Call Activity : Désactiver la propagation des variables parentes (Input propagation = Off)', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'call-activity-output-propagation-off', label: 'Call Activity : Désactiver la propagation des variables filles (Output propagation = Off)', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'call-activity-contract-input', label: 'Call Activity : Contrat d’entrée (variables requises par le sous-processus injectées)', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-activity-source-undefined', label: 'Call Activity : Source du mapping d’entrée définie dans le processus parent', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'call-activity-contract-output', label: 'Call Activity : Contrat de sortie (source de sortie produite par le sous-processus)', category: 'Dépendances', severity: 'warning', enabled: true },

  // Modélisation & Bonnes Pratiques BPMN 2.0
  { id: 'activity-only-callactivity', label: 'Architecture modulaire : Préférer les Call Activities aux activités locales (UserTask, ScriptTask...)', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'dead-end-node', label: 'Éléments reliés à un chemin de sortie (pas d’impasse)', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'no-path-to-end', label: 'Chemin possible vers un événement de fin', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'gateway-branches', label: 'Passerelles avec branches suffisantes (Split >= 2 ou Join >= 2)', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'parallel-gateway-condition', label: 'Passerelle parallèle (AND) sans condition', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'parallel-gateway-default', label: 'Passerelle parallèle (AND) sans branche par défaut', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'exclusive-gateway-default', label: 'Passerelle exclusive (XOR) : Branche par défaut (Default Flow) obligatoire', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'exclusive-gateway-conditions', label: 'Passerelle exclusive (XOR) : Expression de condition sur chaque branche non par défaut', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'loop-max-counter-timer', label: 'Boucles & Cycles : Compteur maximal (max) et temporisation (Timer ≥ 1 minute)', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'zeebe-multi-instance-loop', label: 'Multi-Instance Zeebe / C8 : Paramétrage complet de boucle (Collection & Élément)', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'zeebe-multi-instance-completion-condition', label: 'Multi-Instance : Condition de complétion (completionCondition) sur boucle parallèle', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'event-based-gateway-targets', label: 'Passerelle événementielle ciblant uniquement des événements ou Receive Tasks', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'gateway-mixed', label: 'Séparation convergence et divergence (Join / Split)', category: 'Modélisation', severity: 'info', enabled: false },
  { id: 'conditional-flow-source', label: 'Flux conditionnel issu d’une passerelle de décision (pas d’une tâche)', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'gateway-flow-label', label: 'Branches de décision explicites (nommées ou conditionnées)', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'multiple-end-events-labeled', label: 'Événements de fin multiples tous documentés et nommés', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'process-complexity', label: 'Complexité et taille du processus maîtrisées (< 35 nœuds par scope)', category: 'Modélisation', severity: 'info', enabled: true },

  // Conventions de Nommage BPMN 2.0 & Sémantique
  { id: 'process-id-kebab', label: 'Process ID : kebab-case (ex: process-metier)', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'process-name-capital', label: 'Nom de processus : Majuscule initiale', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'empty-name', label: 'Libellés des éléments renseignés', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'task-imperative', label: 'Tâches : Verbe infinitif + Complément (ex: Traiter la commande)', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'subprocess-noun-phrase', label: 'Sous-processus : Phrase nominale (ex: Gestion des réclamations)', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'gateway-question', label: 'Passerelles de décision : Formulées en question (?)', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'gateway-parallel-no-question', label: 'Passerelles AND : Sans point d’interrogation', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'event-start-past-participle', label: 'Événement Début : Objet + Participe passé (ex: Dossier reçu)', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'event-end-state', label: 'Événement Fin : État métier final (ex: Contrat signé)', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'event-catch-waiting', label: 'Événement Attente : Description de l’événement attendu', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'event-boundary-exception', label: 'Événement Bordure : Description d’alerte ou incident', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'message-pascal-suffix', label: 'Messages : PascalCase + Suffixe "Message"', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'signal-pascal-suffix', label: 'Signaux : PascalCase + Suffixe "Signal"', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'variable-naming', label: 'Variables : camelCase strict (ex: montantTtc)', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'variable-reserved', label: 'Variables : Absence de mots réservés FEEL/Zeebe', category: 'Nommage', severity: 'error', enabled: true },
  { id: 'variable-collection-plural', label: 'Variables Collection : Suffixe pluriel ou List/Items', category: 'Nommage', severity: 'warning', enabled: false },

  // Déploiement Camunda / Zeebe & Exécution
  { id: 'process-name', label: 'Nom de processus documenté', category: 'Documentation', severity: 'warning', enabled: true },
  { id: 'process-executable', label: 'Processus marqué exécutable (isExecutable="true")', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'feel-expression-syntax', label: 'Expressions FEEL : Préfixe "=" obligatoire et syntaxe conforme (Zeebe/C8)', category: 'Déploiement', severity: 'error', enabled: true },
  { id: 'service-implementation', label: 'Implémentation des tâches de service (ServiceTask/SendTask) définie', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'business-rule-implementation', label: 'Implémentation des tâches de règle métier (DMN / Worker) définie', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'user-assignment', label: 'Affectation des tâches utilisateur définie (assignee / groupes)', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'user-task-candidate-groups-only', label: 'User Task : Candidate Groups obligatoire et interdiction d’assignation nominative directe', category: 'Gouvernance', severity: 'error', enabled: true },
  { id: 'user-task-camunda-implementation', label: 'User Task : Type d’implémentation « Camunda User Task » obligatoire (Job Worker interdit)', category: 'Déploiement', severity: 'error', enabled: true },
  { id: 'timer-definition', label: 'Définition temporelle des minuteurs (Timer)', category: 'Déploiement', severity: 'error', enabled: true },
  { id: 'error-definition', label: 'Définition d’erreur sur événements Error (errorCode / errorRef)', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'escalation-definition', label: 'Définition d’escalade sur événements Escalation (escalationCode / escalationRef)', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'message-definition', label: 'Définition de message sur événements Message / ReceiveTask', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'signal-definition', label: 'Définition de signal sur événements Signal (signalRef)', category: 'Déploiement', severity: 'warning', enabled: true },

  // Gouvernance & Documentation
  { id: 'lane-assignment', label: 'Activités affectées à une lane', category: 'Gouvernance', severity: 'info', enabled: false },
  { id: 'diagram-layout', label: 'Diagramme avec informations de mise en page (BPMNDiagram / DI)', category: 'Documentation', severity: 'info', enabled: false }
];

let bpmnLintFiles = [];
if (typeof window !== 'undefined') {
  window.bpmnLintFiles = bpmnLintFiles;
}
function getBpmnLintFiles() {
  if (typeof window !== 'undefined' && Array.isArray(window.bpmnLintFiles) && window.bpmnLintFiles.length > 0) {
    return window.bpmnLintFiles;
  }
  return bpmnLintFiles;
}
function setBpmnLintFiles(files) {
  bpmnLintFiles = Array.isArray(files) ? files : [];
  if (typeof window !== 'undefined') window.bpmnLintFiles = bpmnLintFiles;
  return bpmnLintFiles;
}
if (typeof window !== 'undefined') {
  window.getBpmnLintFiles = getBpmnLintFiles;
  window.setBpmnLintFiles = setBpmnLintFiles;
}
let bpmnLintResults = [];
let bpmnLintRules = [];
let bpmnLintListenersReady = false;
let bpmnLintFilters = {
  severity: 'all',
  category: 'all',
  file: 'all',
  type: 'all',
  owner: 'all',
  search: ''
};
let bpmnLintSort = { column: 'severity', asc: false };
let bpmnLintSummarySort = { column: 'score', asc: true };
let bpmnLintFilter = 'all';
let bpmnLintSearch = '';
let bpmnLintVisibleLimit = 200;
if (typeof window !== 'undefined') {
  window.bpmnLintResults = bpmnLintResults;
  window.bpmnLintGraph = { processCount: 0, callCount: 0, missingTargetCount: 0, cycleCount: 0, roots: [], maxDepth: 0 };
}


// 🛡️ Sandboxing XML Sécurisé (Anti-XXE & DoS / Billion Laughs)
function lintSanitizeXml(rawXml) {
  if (typeof rawXml !== 'string') return '';
  if (/<!DOCTYPE/i.test(rawXml) || /<!ENTITY/i.test(rawXml)) {
    rawXml = rawXml.replace(/<!DOCTYPE[^>]*(\[[^\]]*\])?>/gi, '');
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

  if (!text.startsWith('=') && !text.startsWith('${') && !text.startsWith('#{')) {
    if (/\b(==|!=|&&|\|\||<|>|<=|>=)\b/.test(text) || /\b(and|or|not)\b/i.test(text) || /\b[a-zA-Z_][a-zA-Z0-9_]*\s*(==|=)/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `L'expression « ${text} » doit débuter par '=' pour être évaluée par Zeebe (ex: '= ${text}'). Sans '=', elle est traitée comme une chaîne littérale.`
      });
    }
  }

  if (text.startsWith('=')) {
    if (/&&/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Opérateur '&&' invalide en FEEL dans « ${text} ». Utilisez le mot-clé 'and'.`
      });
    }
    if (/\|\|/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Opérateur '||' invalide en FEEL dans « ${text} ». Utilisez le mot-clé 'or'.`
      });
    }
    if (/(^|[^\w])!(?!=)/.test(text)) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Opérateur de négation '!' invalide en FEEL dans « ${text} ». Utilisez la fonction 'not(...)'.`
      });
    }

    const doubleQuotes = (text.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Guillemets doubles (") non fermés dans l'expression FEEL « ${text} ».`
      });
    }
    const openParen = (text.match(/\(/g) || []).length;
    const closeParen = (text.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Parenthèses déséquilibrées dans l'expression FEEL « ${text} » (${openParen} '(' vs ${closeParen} ')').`
      });
    }
    const openBracket = (text.match(/\[/g) || []).length;
    const closeBracket = (text.match(/\]/g) || []).length;
    if (openBracket !== closeBracket) {
      issues.push({
        ruleId: 'feel-expression-syntax',
        msg: `Crochets déséquilibrés dans le filtre FEEL « ${text} » (${openBracket} '[' vs ${closeBracket} ']').`
      });
    }
  }

  return issues;
}

function lintEscape(value) {
  return typeof window.esc === 'function' ? window.esc(value) : String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function lintElements(root) {
  return root ? Array.from(root.getElementsByTagName('*')) : [];
}

function lintLocalName(element) {
  return (element && (element.localName || element.tagName || '')).split(':').pop().toLowerCase();
}

function lintAttribute(element, names) {
  if (!element || typeof element.getAttribute !== 'function') return '';
  for (const name of names) {
    const exact = element.getAttribute(name);
    if (exact) return exact.trim();
    const attr = Array.from(element.attributes || []).find(item => item.localName === name.split(':').pop());
    if (attr && attr.value.trim()) return attr.value.trim();
  }
  return '';
}

function lintDescendants(element, localNames) {
  const names = new Set(localNames.map(name => name.toLowerCase()));
  return lintElements(element).filter(child => names.has(lintLocalName(child)));
}

function lintDirectChildren(element, localName) {
  return Array.from(element.children || []).filter(child => lintLocalName(child) === localName);
}

const BPMN_EVENT_DEF_NAMES = [
  'timereventdefinition', 'messageeventdefinition', 'signaleventdefinition',
  'erroreventdefinition', 'escalationeventdefinition', 'conditionaleventdefinition',
  'compensateeventdefinition', 'linkeventdefinition', 'terminateeventdefinition', 'canceleventdefinition'
];

function lintEventDefinitions(element) {
  return lintDescendants(element, BPMN_EVENT_DEF_NAMES);
}

// Heuristiques linguistiques pour l'audit sémantique BPMN
const LINT_FRENCH_INFINITIVE_ENDINGS = ['er', 'ir', 're', 'oir'];
const LINT_FRENCH_EXCEPTIONS_INFINITIVE = new Set([
  'sur', 'par', 'pour', 'soir', 'noir', 'hier', 'mer', 'fer', 'ver', 'air', 'clair', 'danger', 
  'cancer', 'hiver', 'leger', 'premier', 'dernier', 'car', 'bar', 'char', 'dur', 'mur', 'pur', 
  'sûr', 'empire', 'frère', 'père', 'mère', 'arrière', 'derrière', 'manière', 'matière', 
  'histoire', 'victoire', 'maire', 'paire', 'contraire', 'inventaire', 'commentaire', 
  'partenaire', 'secrétaire', 'itinéraire'
]);

function lintStartsWithInfinitiveVerb(str) {
  if (typeof window.startsWithInfinitiveVerb === 'function') return window.startsWithInfinitiveVerb(str);
  if (!str) return false;
  const words = str.trim().split(/[\s'\-]+/);
  if (words.length === 0) return false;
  const firstWord = words[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchesEnding = LINT_FRENCH_INFINITIVE_ENDINGS.some(ending => firstWord.endsWith(ending));
  if (!matchesEnding) return false;
  return !LINT_FRENCH_EXCEPTIONS_INFINITIVE.has(firstWord);
}

function lintCheckPastParticipleEnding(word) {
  if (typeof window.checkFrenchPastParticipleEnding === 'function') return window.checkFrenchPastParticipleEnding(word);
  if (!word) return false;
  const w = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /(e|i|u|t|s)e?$/.test(w);
}

function lintExpressionIdentifiers(expression) {
  if (typeof BpmnZeebeParser !== 'undefined' && typeof BpmnZeebeParser.extractFeelVariables === 'function') {
    return BpmnZeebeParser.extractFeelVariables(expression);
  }
  if (typeof bpmnExtractFeelVariables === 'function') {
    return bpmnExtractFeelVariables(expression);
  }
  if (typeof window !== 'undefined' && window.BpmnZeebeParser && typeof window.BpmnZeebeParser.extractFeelVariables === 'function') {
    return window.BpmnZeebeParser.extractFeelVariables(expression);
  }
  const text = String(expression || '');
  if (!/(?:\$\{|#\{|^\s*=)/.test(text)) return [];
  let clean = text
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ')
    .replace(/\.\s*[\p{L}_][\p{L}\p{N}_]*/gu, ' ')
    .replace(/[\p{L}_][\p{L}\p{N}_]*\s*(?=\()/gu, ' ')
    .replace(/\b(list\s+contains|string\s+length|string\s+join|starts\s+with|ends\s+with|substring\s+before|substring\s+after|date\s+and\s+time|years\s+and\s+months\s+duration|days\s+and\s+time\s+duration|get\s+value|get\s+entries|distinct\s+values|insert\s+before|instance\s+of)\b/gi, ' ');
  const reserved = new Set([
    'true', 'false', 'null', 'empty', 'and', 'or', 'not', 'if', 'then', 'else', 'for', 'in', 'return',
    'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 'date', 'time',
    'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'execution', 'task',
    'authenticateduserid', 'getvariable', 'setvariable', 'list', 'number', 'string', 'boolean', 'contains',
    'abs', 'floor', 'ceiling', 'round', 'sort', 'reverse', 'flatten', 'distinct', 'values', 'context',
    'get', 'value', 'put', 'between', 'all', 'any', 'now', 'today'
  ]);
  return Array.from(new Set((clean.match(/[\p{L}_][\p{L}\p{N}_]*/gu) || []).filter(name => !reserved.has(name.toLowerCase()) && isNaN(Number(name)))));
}

function lintIsMigrationBypassFlow(flow) {
  if (!flow) return false;
  const condText = (flow.textContent || '') + ' ' + lintAttribute(flow, ['conditionExpression', 'condition', 'expression']);
  return /migration\s*=\s*["']O["']/i.test(condText) || /migrationActivities/i.test(condText);
}

function lintFlowHasCondition(flow) {
  if (!flow) return false;
  const directAttr = lintAttribute(flow, ['conditionExpression', 'condition', 'expression']);
  if (directAttr && directAttr.trim()) return true;
  const descHas = lintDescendants(flow, ['conditionExpression', 'condition']).some(el => (el.textContent || '').trim());
  if (descHas) return true;
  const text = (flow.textContent || '').trim();
  return /(?:\$\{|#\{|^\s*=)/.test(text);
}

function lintCheckDurationAtLeastOneMinute(durationStr) {
  if (!durationStr) return false;
  const str = String(durationStr).trim().toUpperCase();
  const matchSecondsOnly = str.match(/^PT(\d+(?:\.\d+)?)S$/i);
  if (matchSecondsOnly) {
    return parseFloat(matchSecondsOnly[1]) >= 60;
  }
  if (/PT0+S/i.test(str) || /PT0+M0+S/i.test(str)) return false;
  if (/PT(?:(\d+)M)?(?:(\d+)S)?/i.test(str)) {
    const mMatch = str.match(/PT(?:(\d+)M)/i);
    const sMatch = str.match(/(?:(\d+)S)$/i);
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
    const secs = sMatch ? parseInt(sMatch[1], 10) : 0;
    if (mins > 0 || secs >= 60) return true;
    if (mins === 0 && secs < 60 && (mMatch || sMatch)) return false;
  }
  if (/P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?T?(?:(\d+)H)?/i.test(str) && /[YMWDH]/i.test(str)) {
    return true;
  }
  if (/(?:\$\{|#\{|^\s*=)/.test(str)) {
    const innerSec = str.match(/PT(\d+)S/i);
    if (innerSec && parseInt(innerSec[1], 10) < 60) return false;
    return true;
  }
  return true;
}

function lintFlowScope(element) {
  let current = element && element.parentElement;
  while (current) {
    if (['process', 'subprocess'].includes(lintLocalName(current))) return current;
    current = current.parentElement;
  }
  return null;
}

function lintIsProcessCalledAsSubprocess(procId, currentFile) {
  if (!procId) return false;
  // 1. Vérifier si explicitement marqué comme sous-processus dans le fichier ou le batch
  if (currentFile && (currentFile.isRoot === false || currentFile.isSubProcess === true)) return true;
  
  if (typeof bpmnBatch !== 'undefined' && Array.isArray(bpmnBatch)) {
    const bItem = bpmnBatch.find(b => b.processId === procId);
    if (bItem && bItem.isRoot === false) return true;
    if (bpmnBatch.some(b => b.callActivities && b.callActivities.some(ca => ca.targetProcessId === procId))) return true;
  }

  // 2. Vérifier les Call Activities dans tous les fichiers du lot
  const files = (typeof getBpmnLintFiles === 'function') ? getBpmnLintFiles() : (typeof bpmnLintFiles !== 'undefined' ? bpmnLintFiles : []);
  const allFiles = files.length > 0 ? files : (currentFile ? [currentFile] : []);
  
  for (const f of allFiles) {
    if (!f || !f.xmlDoc) continue;
    const cas = lintDescendants(f.xmlDoc.documentElement, ['callactivity']);
    for (const ca of cas) {
      const target = lintAttribute(ca, ['calledElement', 'zeebe:calledElement']);
      if (target && target.trim() === procId) return true;
      const zCalled = lintDescendants(ca, ['calledElement', 'calledelement'])[0];
      if (zCalled && (lintAttribute(zCalled, ['processId']) || '').trim() === procId) return true;
    }
  }
  return false;
}

function loadBpmnLintRules() {
  try {
    const saved = (typeof localStorage !== 'undefined') ? JSON.parse(localStorage.getItem(BPMN_LINT_RULES_KEY) || 'null') : null;
    const byId = new Map((Array.isArray(saved) ? saved : []).filter(rule => rule && rule.id).map(rule => [rule.id, rule]));
    bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(rule => ({ ...rule, ...(byId.get(rule.id) || {}) }));
    (Array.isArray(saved) ? saved : []).filter(rule => rule && rule.custom && rule.id && !bpmnLintRules.some(base => base.id === rule.id)).forEach(rule => bpmnLintRules.push(rule));
  } catch (error) {
    bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(rule => ({ ...rule }));
  }
  return bpmnLintRules;
}

function saveBpmnLintRules() {
  localStorage.setItem(BPMN_LINT_RULES_KEY, JSON.stringify(bpmnLintRules));
}

function invalidateBpmnLintReport() {
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  if (resultTab) resultTab.style.display = 'none';
  renderBpmnLintResults();
  if (document.getElementById('panel-bpmn-lint-results')?.classList.contains('active')) {
    switchTab('bpmn-lint-import');
  }
}

function lintRule(id) {
  return bpmnLintRules.find(rule => rule.id === id && rule.enabled);
}

function lintFindClosestGraphicalElement(element) {
  if (!element) return null;
  const flowNodeTypes = new Set(['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent', 'exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway', 'sequenceflow', 'messageflow']);
  let cur = element;
  while (cur && cur.nodeType === 1) {
    const lName = lintLocalName(cur);
    if (flowNodeTypes.has(lName) && lintAttribute(cur, ['id'])) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

function lintAddIssue(issues, ruleId, element, message, fileName, severityOverride) {
  const rule = lintRule(ruleId);
  if (!rule) return;
  const guidance = lintIssueGuidance(ruleId, element, message);

  let targetEl = element;
  let elementId = element ? lintAttribute(element, ['id']) : '';
  const rawType = element ? lintLocalName(element) : 'document';
  const isProcessLevel = ['process', 'definitions', 'collaboration'].includes(rawType) || ['process-id', 'process-id-kebab', 'process-name', 'process-name-capital', 'process-executable', 'definitions-root', 'definitions-namespace'].includes(ruleId);

  // Si c'est un sous-élément (ex: conditionExpression, inputParameter, property, script) sans ID graphique, trouver son conteneur graphique direct
  if (element && !isProcessLevel && (!elementId || ['conditionexpression', 'property', 'script', 'inputparameter', 'outputparameter', 'in', 'out', 'input', 'output'].includes(rawType))) {
    const parentFlow = lintFindClosestGraphicalElement(element);
    if (parentFlow) {
      targetEl = parentFlow;
      elementId = lintAttribute(parentFlow, ['id']);
    }
  }

  const elementName = element ? lintAttribute(element, ['name']) || (targetEl && targetEl !== element ? lintAttribute(targetEl, ['name']) : '') : '';

  issues.push({
    fileName,
    ruleId,
    rule: rule.label,
    category: rule.category,
    severity: severityOverride || rule.severity,
    elementType: rawType,
    elementId: elementId || '',
    elementName: elementName || '',
    isProcessLevel,
    message,
    recommendation: guidance.recommendation,
    suggestedOwner: guidance.owner,
    businessTest: guidance.businessTest
  });
}

function lintIssueGuidance(ruleId, element, message) {
  const id = element ? lintAttribute(element, ['id']) : '';
  const checks = {
    'zeebe-multi-instance-loop': ['Définir inputCollection et inputElement dans l’extension zeebe:loopCharacteristics de la tâche multi-instance.', 'Équipe Camunda', 'Vérifier dans le Modeler que la collection est liée à une variable de type liste et tester l’itération.'],
    'zeebe-multi-instance-completion-condition': ['Ajouter une expression completionCondition (ex: = nrOfCompletedInstances = nrOfInstances) sur l’activité multi-instance.', 'Équipe Camunda', 'Tester la terminaison de la boucle avec différentes tailles de collections.'],
    'feel-expression-syntax': ['Ajouter le préfixe "=" au début de l’expression FEEL et remplacer les opérateurs && / || par and / or.', 'Équipe Camunda', 'Tester l’évaluation de la condition avec les jeux de données de recette.'],
    'definitions-root': ['Réexporter le diagramme depuis un modeleur BPMN conforme au standard 2.0.', 'Équipe modélisation', 'Importer le fichier dans le modeleur cible et vérifier que le diagramme s’ouvre sans erreur.'],
    'definitions-namespace': ['Vérifier le namespace BPMN 2.0 et régénérer le XML depuis le modeleur.', 'Équipe modélisation', 'Ouvrir puis réexporter le modèle avec la version de modeleur supportée.'],
    'process-id': ['Attribuer un ID technique unique au processus.', 'Équipe modélisation', 'Déployer le modèle et vérifier que le processus attendu apparaît dans le moteur.'],
    'duplicate-process-id-batch': ['Renommer les processus pour obtenir des IDs uniques dans le lot déployé.', 'Équipe architecture', 'Déployer le lot complet et vérifier qu’aucune définition n’écrase une autre.'],
    'duplicate-id': ['Générer un nouvel ID unique pour chaque élément concerné, puis vérifier toutes ses références.', 'Équipe modélisation', 'Valider que les flux, lanes et références pointent vers le bon élément après renommage.'],
    'flow-references': ['Corriger la référence sourceRef/targetRef vers un élément du même scope de flux.', 'Équipe modélisation', 'Rejouer le chemin concerné et confirmer que le jeton passe par le nœud attendu.'],
    'sequence-flow-cross-pool': ['Remplacer le flux de séquence par un flux de message (Message Flow) ou regrouper les activités dans le même participant / pool.', 'Équipe modélisation', 'Vérifier la validité de la chorégraphie inter-pools et l’absence de séquence franchissant les limites de processus.'],
    'message-flow-valid': ['Remplacer le flux de message par un flux de séquence normal au sein du même participant / pool.', 'Équipe modélisation', 'Vérifier la bonne transmission des données et jetons au sein du processus.'],
    'call-target': ['Renseigner calledElement ou la définition Zeebe du processus appelé.', 'Équipe Camunda', 'Démarrer le processus parent et vérifier que le sous-processus est invoqué.'],
    'call-target-provided': ['Ajouter le BPMN cible au package, ou documenter et valider son déploiement externe.', 'Équipe architecture', 'Déployer parent et cible dans l’environnement d’intégration puis tester l’appel réel.'],
    'call-cycle': ['Vérifier les appels récursifs et définir une condition de terminaison ou supprimer le cycle.', 'Équipe architecture', 'Exécuter un scénario borné et vérifier qu’aucune récursion non maîtrisée ne persiste.'],
    'call-activity-input-propagation-off': ['Désactiver « Propagate all parent process variables » (propagateAllParentVariables="false") sur la Call Activity et déclarer des Input Mappings explicites.', 'Équipe Camunda', 'Vérifier dans le Camunda Modeler que Input propagation est sur Off et que seules les variables nécessaires sont injectées.'],
    'call-activity-output-propagation-off': ['Désactiver « Propagate all child process variables » (propagateAllChildVariables="false") sur la Call Activity et déclarer des Output Mappings explicites.', 'Équipe Camunda', 'Vérifier dans le Camunda Modeler que Output propagation est sur Off et que seules les variables attendues retournent au parent.'],
    'call-activity-contract-input': ['Ajouter les balises <zeebe:input source="= varParente" target="varRequise" /> manquantes pour satisfaire le contrat du sous-processus.', 'Équipe Camunda', 'Vérifier que toutes les variables consommées par le sous-processus sans valeur par défaut sont injectées.'],
    'call-activity-source-undefined': ['Vérifier l’expression source du mapping d’entrée et s’assurer que la variable existe en amont dans le processus parent.', 'Équipe Camunda', 'Tracer l’origine de la variable dans le processus parent ou corriger le nom de la variable.'],
    'call-activity-contract-output': ['Corriger la source du mapping de sortie pour référencer une variable réellement produite par le sous-processus.', 'Équipe Camunda', 'Consulter le diagramme du sous-processus pour identifier le nom exact de la variable de sortie retournée.'],
    'process-name': ['Ajouter un nom métier compréhensible au processus.', 'Product Owner', 'Faire confirmer le nom et le périmètre du processus par le métier.'],
    'process-executable': ['Vérifier la cible de déploiement, puis définir isExecutable à true si le processus doit être exécuté.', 'Équipe Camunda', 'Déployer sur le moteur cible et démarrer une instance de test.'],
    'start-event': ['Définir les événements de déclenchement du processus et leurs conditions.', 'Product Owner + Camunda', 'Tester chaque déclencheur métier prévu, y compris les événements alternatifs.'],
    'multiple-none-start-events': ['Ne conserver qu’un seul événement de début sans type (None) par processus ou sous-processus.', 'Équipe modélisation', 'Démarrer une instance et vérifier qu’il n’y a aucune ambiguïté de déclenchement.'],
    'end-event': ['Ajouter une issue explicite à chaque chemin normal et d’exception.', 'Product Owner', 'Parcourir les scénarios nominaux et d’erreur et vérifier leur état final métier.'],
    'event-subprocess-structure': ['Supprimer les flux connectés à la bordure du sous-processus événementiel et s’assurer qu’il débute par un événement typé (Message, Timer, Erreur...).', 'Équipe modélisation', 'Déclencher l’événement et vérifier l’activation du sous-processus événementiel.'],
    'unreachable-node': ['Relier l’élément à un chemin depuis un événement de départ, ou confirmer qu’il s’agit d’un sous-processus événementiel.', 'Équipe modélisation', 'Tester qu’un scénario métier réel peut atteindre l’élément.'],
    'dead-end-node': ['Ajouter la suite du flux ou une issue terminale explicite.', 'Product Owner + Camunda', 'Vérifier qu’aucun jeton ne reste bloqué sur ce chemin.'],
    'no-path-to-end': ['Relier ce chemin à une fin ou à une sortie explicite du scope.', 'Équipe modélisation', 'Exécuter le scénario correspondant et vérifier la terminaison du jeton.'],
    'start-incoming': ['Supprimer le flux entrant de l’événement de début et revoir le point de déclenchement.', 'Équipe modélisation', 'Démarrer une instance depuis cet événement.'],
    'end-outgoing': ['Supprimer le flux sortant de l’événement de fin ou remplacer cet événement.', 'Équipe modélisation', 'Vérifier la terminaison de l’instance sur ce chemin.'],
    'intermediate-flows': ['Connecter l’événement intermédiaire avec au moins un flux entrant et un flux sortant.', 'Équipe modélisation', 'Vérifier que le jeton traverse et active correctement cet événement intermédiaire.'],
    'boundary-incoming': ['Supprimer le flux entrant dirigé vers l’événement de bordure (les événements de bordure ne reçoivent pas de flux de séquence).', 'Équipe modélisation', 'Vérifier la séquence d’exécution de l’activité supportée.'],
    'boundary-outgoing': ['Connecter la sortie de l’événement de bordure vers une activité ou une fin pour traiter l’interruption ou l’exception.', 'Équipe Camunda', 'Simuler l’événement de bordure et vérifier l’exécution de la branche d’exception.'],
    'gateway-branches': ['Prévoir au moins deux branches sortantes pour cette décision ou supprimer la passerelle inutile.', 'Product Owner + Camunda', 'Tester chaque issue de la décision.'],
    'parallel-gateway-condition': ['Supprimer la condition sur le flux sortant de la passerelle parallèle (AND) ou utiliser une passerelle exclusive (XOR) / inclusive (OR).', 'Équipe Camunda', 'Vérifier que toutes les branches de la passerelle parallèle s’exécutent simultanément sans condition.'],
    'parallel-gateway-default': ['Supprimer l’attribut default sur la passerelle parallèle (AND) : toutes les branches parallèles s’exécutent obligatoirement sans notion de défaut.', 'Équipe Camunda', 'Vérifier l’activation conjointe de toutes les branches sortantes.'],
    'exclusive-gateway-default': ['Définir un flux par défaut (attribut default) sur la passerelle exclusive pour garantir une issue en cas d’absence de condition satisfaite.', 'Équipe Camunda + métier', 'Tester un scénario hors-cadre et confirmer la prise du chemin par défaut.'],
    'exclusive-gateway-conditions': ['Renseigner une expression de condition (conditionExpression) sur chaque branche sortante non par défaut de la passerelle exclusive.', 'Équipe Camunda', 'Vérifier le routage conditionnel sur chaque branche lors des tests unitaires.'],
    'loop-max-counter-timer': ['Définir une condition de sortie avec compteur maximal (ex: retryCount < 3) et insérer un Timer d’attente ≥ 1 minute (ex: PT1M).', 'Équipe modélisation + Camunda', 'Simuler l’itération de boucle jusqu’au seuil maximal et vérifier la durée de temporisation.'],
    'event-based-gateway-targets': ['Connecter les sorties de la passerelle événementielle uniquement vers des événements intermédiaires de capture (Message, Timer, Signal) ou des Receive Tasks.', 'Équipe modélisation', 'Vérifier que la première occurrence d’événement déclenche la bonne branche.'],
    'gateway-mixed': ['Séparer la passerelle en une passerelle de fusion (Join) suivie d’une passerelle de décision (Split).', 'Équipe modélisation', 'Vérifier la bonne synchronisation des jetons en amont et leur distribution en aval.'],
    'conditional-flow-source': ['Insérer une passerelle exclusive (XOR) ou inclusive (OR) après l’activité au lieu d’utiliser des flux conditionnels directs.', 'Équipe modélisation', 'Vérifier la lisibilité du diagramme et le routage des jetons selon la condition.'],
    'gateway-flow-label': ['Documenter la condition de chaque branche ou désigner le flux par défaut.', 'Équipe Camunda + métier', 'Tester les valeurs aux frontières et vérifier une seule branche prise par scénario.'],
    'multiple-end-events-labeled': ['Attribuer un libellé clair et descriptif à chaque événement de fin pour distinguer les états nominaux et d’exception.', 'Product Owner', 'Revoir l’ensemble des états de terminaison avec les parties prenantes métier.'],
    'process-complexity': ['Découper le processus en sous-processus ou Call Activities pour maintenir une lisibilité et une maintenabilité optimales (< 35 nœuds).', 'Équipe architecture', 'Vérifier la clarté et la modularité de la cartographie globale.'],
    'default-flow-reference': ['Pointer le flux par défaut vers une branche sortante existante du même scope.', 'Équipe Camunda', 'Tester le cas où aucune condition explicite ne correspond.'],
    'flow-node-id': ['Attribuer un ID technique stable et unique à l’élément.', 'Équipe modélisation', 'Réexporter puis redéployer le BPMN et vérifier ses références entrantes/sortantes.'],
    'empty-name': ['Ajouter un libellé métier court et actionnable.', 'Product Owner', 'Faire relire le libellé par un représentant métier.'],
    'task-imperative': ['Nommer l’activité avec un verbe d’action à l’infinitif et un complément.', 'Product Owner', 'Vérifier que le libellé décrit une action observable par l’utilisateur métier.'],
    'subprocess-noun-phrase': ['Nommer le sous-processus par une phrase nominale (ex: « Gestion des réclamations »).', 'Product Owner', 'Faire valider l’intitulé du sous-processus par les représentants métier.'],
    'event-start-past-participle': ['Formuler l’événement de début au format « Objet + Participe passé » (ex: « Demande reçue »).', 'Product Owner', 'Vérifier la clarté du déclencheur métier.'],
    'event-end-state': ['Nommer l’événement de fin en décrivant l’état métier final atteint (ex: « Commande expédiée »).', 'Product Owner', 'Confirmer la désignation de l’état final avec le métier.'],
    'gateway-question': ['Formuler la passerelle comme une question de décision.', 'Product Owner', 'Faire confirmer que les sorties couvrent toutes les réponses possibles.'],
    'service-implementation': ['Configurer le type de tâche, le worker, la classe ou l’expression attendue.', 'Équipe Camunda', 'Vérifier l’activation du worker et traiter au moins un job de bout en bout.'],
    'business-rule-implementation': ['Définir la référence de table DMN (decisionRef/calledDecision) ou le worker/topic de décision.', 'Équipe Camunda', 'Exécuter la règle métier et vérifier le résultat retourné au processus.'],
    'activity-only-callactivity': ['Remplacer cette activité par une Call Activity pointant vers un sous-processus dédié ou réutilisable.', 'Équipe architecture', 'Vérifier la configuration du sous-processus appelé par la Call Activity.'],
    'user-assignment': ['Définir assignee, candidate users/groups ou assignmentDefinition.', 'Équipe workflow', 'Créer une tâche utilisateur et vérifier sa visibilité par le bon rôle.'],
    'user-task-candidate-groups-only': ['Renseigner exclusivement le champ candidateGroups (ex: #{groupeGestionnaire}) et supprimer tout assignee ou candidateUsers.', 'Équipe Camunda + Métier', 'Vérifier que la tâche est distribuée à la file d’attente du groupe cible et non nominativement.'],
    'user-task-camunda-implementation': ['Sélectionner le type d’implémentation « Camunda User task » et supprimer toute définition de Job Worker.', 'Équipe Camunda', 'Vérifier la gestion native de la User Task par le moteur Camunda.'],
    'timer-definition': ['Renseigner une durée (timeDuration), une date (timeDate) ou un cycle (timeCycle) ISO 8601 ou FEEL sur l’événement minuteur.', 'Équipe Camunda', 'Vérifier l’armement et le déclenchement du timer dans le moteur Camunda.'],
    'error-definition': ['Associer une référence d’erreur (errorRef) ou un code d’erreur métier (errorCode) à l’événement d’erreur.', 'Équipe Camunda', 'Déclencher l’erreur métier et valider la capture par le gestionnaire associé.'],
    'escalation-definition': ['Associer une référence d’escalade (escalationRef) ou un code d’escalade métier (escalationCode) à l’événement d’escalade.', 'Équipe Camunda', 'Déclencher l’escalade et valider le comportement du sous-processus parent.'],
    'message-definition': ['Associer une référence de message (messageRef) ou un nom de message Zeebe à l’événement ou à la Receive Task.', 'Équipe Camunda', 'Publier le message et vérifier la corrélation d’instance.'],
    'signal-definition': ['Associer une référence de signal (signalRef) à l’événement de signal.', 'Équipe Camunda', 'Tester la diffusion broadcast et la capture par les processus récepteurs.'],
    'boundary-reference': ['Renseigner attachedToRef vers l’activité protégée.', 'Équipe modélisation', 'Déclencher l’erreur ou le timeout et confirmer l’interruption/la reprise attendue.'],
    'boundary-target': ['Rattacher cet événement à une activité existante du même scope.', 'Équipe modélisation', 'Déclencher cet événement et vérifier le chemin d’exception.'],
    'lane-reference': ['Corriger la référence flowNodeRef vers l’ID existant.', 'Équipe modélisation', 'Vérifier que l’activité apparaît dans le bon rôle ou la bonne lane.'],
    'lane-assignment': ['Affecter l’activité à une lane ou documenter son rôle transverse.', 'Product Owner', 'Confirmer le propriétaire et le responsable de traitement du cas.'],
    'process-id-kebab': ['Renommer l’ID technique du processus en kebab-case (minuscules, chiffres et tirets, ex: mon-processus-metier).', 'Équipe modélisation', 'Vérifier la compatibilité avec les scripts CI/CD et redéployer le processus.'],
    'process-name-capital': ['Faire débuter le nom d’affichage du processus par une majuscule.', 'Product Owner', 'Confirmer la lisibilité du titre du processus dans Cockpit / Tasklist.'],
    'gateway-parallel-no-question': ['Supprimer le point d’interrogation sur la passerelle parallèle (AND) car elle ne pose pas de question.', 'Équipe modélisation', 'Vérifier que toutes les branches sortantes restent actives en parallèle.'],
    'event-catch-waiting': ['Décrire précisément l’événement métier intercepté pour poursuivre le flux (ex: « Paiement validé »).', 'Product Owner', 'Valider la réception de l’événement intermédiaire en recette.'],
    'event-boundary-exception': ['Qualifier l’incident, l’alerte ou l’exception interceptée par l’événement de bordure.', 'Équipe Camunda', 'Simuler l’incident et vérifier la redirection du jeton.'],
    'message-pascal-suffix': ['Nommer le message en PascalCase en terminant par le mot "Message" (ex: OrderReceivedMessage).', 'Équipe Camunda', 'Tester la publication et la corrélation du message.'],
    'signal-pascal-suffix': ['Nommer le signal en PascalCase en terminant par le mot "Signal" (ex: GlobalAlertSignal).', 'Équipe Camunda', 'Tester l’émission et la réception broadcast du signal.'],
    'variable-reserved': ['Renommer la variable pour éviter tout mot-clé réservé par FEEL ou le moteur Zeebe/Camunda.', 'Équipe Camunda', 'Vérifier les expressions FEEL et les mappings de données.'],
    'variable-collection-plural': ['Renommer la collection au pluriel ou ajouter le suffixe List/Items (ex: orderItems).', 'Équipe Camunda', 'Vérifier les itérations multi-instances utilisant cette collection.']
  };
  const selected = checks[ruleId] || [
    'Examiner le constat et appliquer la convention d’équipe correspondante.',
    'Responsable du processus',
    'Ajouter un scénario métier couvrant le comportement concerné et valider le résultat attendu.'
  ];
  return { recommendation: selected[0], owner: selected[1], businessTest: selected[2], evidence: id || message };
}

// Convertisseurs de casse & suggestions de correction BPMN
function lintConvertToKebabCase(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lintConvertToPascalCase(s) {
  s = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function lintConvertToCamelCase(s) {
  s = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.map((w, idx) => {
    if (idx === 0) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join('');
}

function lintSuggestNameCorrection(ruleId, currentLabel) {
  if (!currentLabel) return '';
  const label = currentLabel.trim();
  switch(ruleId) {
    case 'process-id-kebab':
      return lintConvertToKebabCase(label);
    case 'process-name-capital':
      return label.charAt(0).toUpperCase() + label.slice(1);
    case 'variable-naming':
      return lintConvertToCamelCase(label);
    case 'variable-reserved':
      return lintConvertToCamelCase(label) + 'Val';
    case 'variable-collection-plural':
      if (label.endsWith('List') || label.endsWith('Items') || label.endsWith('s')) return label;
      return label + 'Items';
    case 'task-imperative':
      if (!lintStartsWithInfinitiveVerb(label)) {
        const words = label.split(/\s+/);
        const first = words[0].toLowerCase();
        if (first === 'gestion') return 'Gérer ' + words.slice(1).join(' ');
        if (first === 'creation' || first === 'création') return 'Créer ' + words.slice(1).join(' ');
        if (first === 'validation') return 'Valider ' + words.slice(1).join(' ');
        if (first === 'envoi') return 'Envoyer ' + words.slice(1).join(' ');
        if (first === 'calcul') return 'Calculer ' + words.slice(1).join(' ');
        return 'Traiter ' + label.charAt(0).toLowerCase() + label.slice(1);
      }
      return label;
    case 'subprocess-noun-phrase':
      if (lintStartsWithInfinitiveVerb(label)) {
        const words = label.split(/\s+/);
        const first = words[0].toLowerCase();
        if (first.startsWith('gerer') || first.startsWith('gérer')) return 'Gestion ' + words.slice(1).join(' ');
        if (first.startsWith('creer') || first.startsWith('créer')) return 'Création ' + words.slice(1).join(' ');
        if (first.startsWith('valider')) return 'Validation ' + words.slice(1).join(' ');
        if (first.startsWith('envoyer')) return 'Envoi ' + words.slice(1).join(' ');
        if (first.startsWith('calculer')) return 'Calcul ' + words.slice(1).join(' ');
      }
      return label.charAt(0).toUpperCase() + label.slice(1);
    case 'gateway-question':
      return label.endsWith('?') ? label : label + ' ?';
    case 'gateway-parallel-no-question':
      return label.replace(/\?/g, '').trim();
    case 'event-start-past-participle':
      return label.split(/\s+/).length < 2 ? label + ' reçu' : label;
    case 'event-end-state':
      return label.split(/\s+/).length < 2 ? label + ' validé' : label;
    case 'message-pascal-suffix': {
      const p = lintConvertToPascalCase(label);
      return p.endsWith('Message') ? p : p + 'Message';
    }
    case 'signal-pascal-suffix': {
      const p = lintConvertToPascalCase(label);
      return (p.endsWith('Signal') || p.endsWith('Signak')) ? p : p + 'Signal';
    }
    default:
      return label;
  }
}

function lintSeverityRank(severity) {
  return ({ blocker: 0, error: 1, warning: 2, info: 3 })[severity] ?? 4;
}

function lintMatchesTarget(element, target) {
  const type = lintLocalName(element);
  if (target === 'task') return ['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask'].includes(type);
  return type === target.toLowerCase();
}

function lintScore(issues, elementCount) {
  const penalty = issues.reduce((sum, issue) => sum + ({ blocker: 18, error: 10, warning: 3, info: 1 }[issue.severity] || 0), 0);
  const capacity = Math.max(30, elementCount * 8);
  return Math.max(0, Math.round(100 - (penalty / capacity) * 100));
}

function lintPriorities(issues) {
  const groups = new Map();
  issues.forEach(issue => {
    const key = `${issue.ruleId}\u0000${issue.fileName}`;
    if (!groups.has(key)) groups.set(key, { ruleId: issue.ruleId, rule: issue.rule, fileName: issue.fileName, category: issue.category, severity: issue.severity, count: 0, recommendation: issue.recommendation || 'Examiner le constat dans le rapport.', owner: issue.suggestedOwner || 'Responsable du processus', examples: [] });
    const group = groups.get(key);
    group.count++;
    if (lintSeverityRank(issue.severity) < lintSeverityRank(group.severity)) group.severity = issue.severity;
    if (group.examples.length < 3 && issue.elementId) group.examples.push(issue.elementId);
  });
  return Array.from(groups.values()).sort((a, b) => lintSeverityRank(a.severity) - lintSeverityRank(b.severity) || b.count - a.count || a.fileName.localeCompare(b.fileName, 'fr')).slice(0, 8);
}

function auditBpmnLintFile(file) {
  if (!bpmnLintRules || !bpmnLintRules.length) loadBpmnLintRules();
  const issues = [];
  if (file.parseError || !file.xmlDoc) {
    issues.push({ fileName: file.fileName, ruleId: 'xml-parse', rule: 'XML BPMN analysable', category: 'Structure', severity: 'blocker', elementType: 'document', elementId: '', elementName: '', message: file.parseError || 'Document XML vide.' });
    return { ...file, issues, score: 0, elementCount: 0, status: 'Bloquant', processCount: 0 };
  }

  const root = file.xmlDoc.documentElement;
  const all = lintElements(file.xmlDoc);
  const processes = all.filter(element => lintLocalName(element) === 'process');
  const participants = all.filter(element => lintLocalName(element) === 'participant');
  const messageFlows = all.filter(element => lintLocalName(element) === 'messageflow');
  const flowNodeNames = new Set(['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess', 'startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent', 'exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway']);
  const flowNodes = all.filter(element => flowNodeNames.has(lintLocalName(element)));
  const sequenceFlows = all.filter(element => lintLocalName(element) === 'sequenceflow');
  const nodesByScope = new Map();
  const flowsByScope = new Map();
  flowNodes.forEach(node => {
    const scope = lintFlowScope(node);
    if (!nodesByScope.has(scope)) nodesByScope.set(scope, []);
    nodesByScope.get(scope).push(node);
  });
  sequenceFlows.forEach(flow => {
    const scope = lintFlowScope(flow);
    if (!flowsByScope.has(scope)) flowsByScope.set(scope, []);
    flowsByScope.get(scope).push(flow);
  });
  const idOwners = new Map();
  const idElements = all.filter(element => lintAttribute(element, ['id']));
  idElements.forEach(element => {
    const id = lintAttribute(element, ['id']);
    if (!idOwners.has(id)) idOwners.set(id, []);
    idOwners.get(id).push(element);
  });

  if (lintLocalName(root) !== 'definitions') {
    lintAddIssue(issues, 'definitions-root', root, 'La racine XML doit être bpmn:definitions.', file.fileName);
  }
  const hasValidBpmnNs = root.namespaceURI === 'http://www.omg.org/spec/BPMN/20100524/MODEL' ||
    lintAttribute(root, ['xmlns:bpmn', 'xmlns', 'targetNamespace']) === 'http://www.omg.org/spec/BPMN/20100524/MODEL' ||
    (root.getAttribute('xmlns:bpmn') || '').includes('BPMN/20100524/MODEL');
  if (!hasValidBpmnNs) {
    lintAddIssue(issues, 'definitions-namespace', root, 'Le document doit utiliser le namespace BPMN 2.0 du modèle OMG (http://www.omg.org/spec/BPMN/20100524/MODEL).', file.fileName);
  }
  if (!processes.length) {
    lintAddIssue(issues, 'process-id', root, 'Aucun élément process n’a été trouvé.', file.fileName);
  }

  idOwners.forEach((owners, id) => {
    if (owners.length > 1) owners.slice(1).forEach(element => lintAddIssue(issues, 'duplicate-id', element, `L’identifiant « ${id} » est utilisé ${owners.length} fois dans ce fichier.`, file.fileName));
  });

  // Contrôle des flux de messages inter-pools (Message Flows)
  messageFlows.forEach(mFlow => {
    const sRef = lintAttribute(mFlow, ['sourceRef']);
    const tRef = lintAttribute(mFlow, ['targetRef']);
    const sEl = idOwners.get(sRef)?.[0];
    const tEl = idOwners.get(tRef)?.[0];
    if (!sEl || !tEl) {
      lintAddIssue(issues, 'flow-references', mFlow, `Le flux de message « ${lintAttribute(mFlow, ['id']) || 'mFlow'} » référence des nœuds source/cible inexistants.`, file.fileName);
    } else {
      const sProc = lintFlowScope(sEl);
      const tProc = lintFlowScope(tEl);
      if (sProc && tProc && sProc === tProc && lintLocalName(sProc) === 'process') {
        lintAddIssue(issues, 'message-flow-valid', mFlow, `Le flux de message « ${lintAttribute(mFlow, ['id']) || 'mFlow'} » relie deux éléments du même processus/pool. Utilisez un flux de séquence standard.`, file.fileName);
      }
    }
  });

  processes.forEach(process => {
    const processId = lintAttribute(process, ['id']);
    const processName = lintAttribute(process, ['name']);
    if (!processId) {
      lintAddIssue(issues, 'process-id', process, 'Le processus ne possède pas d’ID technique.', file.fileName);
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(processId)) {
      lintAddIssue(issues, 'process-id-kebab', process, `L’ID technique « ${processId} » doit être en kebab-case (ex: ${lintConvertToKebabCase(processId)}).`, file.fileName);
    }

    if (!processName) {
      lintAddIssue(issues, 'process-name', process, 'Le processus n’a pas de nom métier.', file.fileName);
    } else if (/^[a-zà-öø-ÿ]/.test(processName.trim())) {
      lintAddIssue(issues, 'process-name-capital', process, `Le nom du processus « ${processName} » doit débuter par une majuscule.`, file.fileName);
    }

    if (lintAttribute(process, ['isExecutable']).toLowerCase() !== 'true') lintAddIssue(issues, 'process-executable', process, 'isExecutable n’est pas à true ; vérifier le profil de déploiement visé.', file.fileName);

    const processFlowNodes = nodesByScope.get(process) || [];
    const starts = processFlowNodes.filter(node => lintLocalName(node) === 'startevent');
    const ends = processFlowNodes.filter(node => lintLocalName(node) === 'endevent');
    if (!starts.length) lintAddIssue(issues, 'start-event', process, 'Aucun événement de début n’a été trouvé dans ce processus.', file.fileName);
    if (!ends.length) lintAddIssue(issues, 'end-event', process, 'Aucun événement de fin n’a été trouvé dans ce processus.', file.fileName);

    // Contrôle None Start Event unique au niveau processus
    const noneStarts = starts.filter(start => lintEventDefinitions(start).length === 0);
    if (noneStarts.length > 1) {
      noneStarts.slice(1).forEach(start => lintAddIssue(issues, 'multiple-none-start-events', start, 'Plusieurs événements de début sans type (None Start Event) ont été détectés dans ce processus.', file.fileName));
    }

    // Contrôle multi-fins documentées
    if (ends.length > 1) {
      ends.forEach(end => {
        const eName = lintAttribute(end, ['name']);
        if (!eName) {
          lintAddIssue(issues, 'multiple-end-events-labeled', end, 'Plusieurs événements de fin coexistent dans ce processus ; chaque événement de fin doit avoir un libellé clair désignant l’issue métier.', file.fileName);
        }
      });
    }

    // Contrôle taille / complexité du processus
    if (processFlowNodes.length > 35) {
      lintAddIssue(issues, 'process-complexity', process, `Ce processus comporte ${processFlowNodes.length} éléments de flux dans un même niveau. Il est recommandé de le subdiviser via des sous-processus ou Call Activities.`, file.fileName);
    }
  });

  const scopes = all.filter(element => ['process', 'subprocess'].includes(lintLocalName(element)));
  scopes.forEach(scope => {
    const isEventSubprocess = lintLocalName(scope) === 'subprocess' && lintAttribute(scope, ['triggeredByEvent']).toLowerCase() === 'true';
    const scopeId = lintAttribute(scope, ['id']);
    const scopedNodes = nodesByScope.get(scope) || [];
    const scopedFlows = flowsByScope.get(scope) || [];
    const starts = scopedNodes.filter(node => lintLocalName(node) === 'startevent');
    const ends = scopedNodes.filter(node => lintLocalName(node) === 'endevent');
    const outgoing = new Map(scopedNodes.map(node => [lintAttribute(node, ['id']), []]));
    const incoming = new Map(scopedNodes.map(node => [lintAttribute(node, ['id']), []]));
    scopedFlows.forEach(flow => {
      const source = lintAttribute(flow, ['sourceRef']);
      const target = lintAttribute(flow, ['targetRef']);
      if (outgoing.has(source)) outgoing.get(source).push(target);
      if (incoming.has(target)) incoming.get(target).push(source);
    });

    // Contrôles spécifiques au sous-processus événementiel
    if (isEventSubprocess) {
      const parentScope = lintFlowScope(scope);
      const parentFlows = parentScope ? (flowsByScope.get(parentScope) || []) : [];
      const hasCrossingFlows = parentFlows.some(f => lintAttribute(f, ['sourceRef']) === scopeId || lintAttribute(f, ['targetRef']) === scopeId);
      if (hasCrossingFlows) {
        lintAddIssue(issues, 'event-subprocess-structure', scope, 'Un sous-processus événementiel ne doit pas avoir de flux de séquence connecté à sa frontière.', file.fileName);
      }
      if (!starts.length) {
        lintAddIssue(issues, 'event-subprocess-structure', scope, 'Le sous-processus événementiel doit comporter un événement de début.', file.fileName);
      }
      starts.forEach(start => {
        if (lintEventDefinitions(start).length === 0) {
          lintAddIssue(issues, 'event-subprocess-structure', start, 'L’événement de début d’un sous-processus événementiel doit être typé (Message, Timer, Erreur, Signal...) et non None.', file.fileName);
        }
      });
    } else if (lintLocalName(scope) === 'subprocess') {
      const noneStarts = starts.filter(start => lintEventDefinitions(start).length === 0);
      if (noneStarts.length > 1) {
        noneStarts.slice(1).forEach(start => lintAddIssue(issues, 'multiple-none-start-events', start, 'Plusieurs événements de début sans type (None Start Event) ont été détectés dans ce sous-processus.', file.fileName));
      }
      if (ends.length > 1) {
        ends.forEach(end => {
          if (!lintAttribute(end, ['name'])) {
            lintAddIssue(issues, 'multiple-end-events-labeled', end, 'Plusieurs événements de fin coexistent dans ce sous-processus ; chaque événement de fin doit avoir un libellé clair.', file.fileName);
          }
        });
      }
    }

    // Traçabilité des flux de contournement de migration
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
        lintAddIssue(issues, 'no-path-to-end', mFlow, `La branche de reprise sur migration « ${mFlowId} » cible un élément « ${targetId} » qui ne permet pas d’atteindre une issue terminale.`, file.fileName);
      }
    });

    scopedNodes.forEach(node => {
      const type = lintLocalName(node);
      const nodeId = lintAttribute(node, ['id']);
      const inCount = incoming.get(nodeId)?.length || 0;
      const outCount = outgoing.get(nodeId)?.length || 0;

      // 1. Nœuds inatteignables : ni par flux nominal ni par flux de migration
      if (starts.length && type !== 'boundaryevent' && type !== 'startevent' && !reachable.has(nodeId)) {
        lintAddIssue(issues, 'unreachable-node', node, `L’élément ${nodeId || type} n’est atteignable depuis aucun événement de début du processus.`, file.fileName);
      }

      // 2. Impasse (Dead-end) : aucun flux entrant ou aucun flux sortant
      if (!['startevent', 'endevent', 'boundaryevent'].includes(type) && nodeId && (!inCount || !outCount)) {
        lintAddIssue(issues, 'dead-end-node', node, `L’élément ${nodeId} n’a pas à la fois un flux entrant et un flux sortant.`, file.fileName);
      }

      // 3. Absence d'issue vers la fin (No Path to End)
      if (ends.length && nodeId && reachable.has(nodeId) && !canReachEnd.has(nodeId) && type !== 'boundaryevent') {
        lintAddIssue(issues, 'no-path-to-end', node, `Aucun chemin depuis ${nodeId} ne mène à un événement de fin de ce scope.`, file.fileName);
      }
      if (type === 'startevent' && inCount) lintAddIssue(issues, 'start-incoming', node, 'Un événement de début possède un flux entrant.', file.fileName);
      if (type === 'endevent' && outCount) lintAddIssue(issues, 'end-outgoing', node, 'Un événement de fin possède un flux sortant.', file.fileName);
      
      // Événements intermédiaires (Catch / Throw hors boundary)
      if (['intermediatecatchevent', 'intermediatethrowevent'].includes(type)) {
        if (inCount === 0 || outCount === 0) {
          lintAddIssue(issues, 'intermediate-flows', node, `L’événement intermédiaire « ${nodeId} » doit avoir au moins un flux entrant et un flux sortant.`, file.fileName);
        }
      }

      // Événements de bordure (Boundary Events)
      if (type === 'boundaryevent') {
        if (inCount > 0) {
          lintAddIssue(issues, 'boundary-incoming', node, 'Un événement de bordure ne peut pas recevoir de flux de séquence direct.', file.fileName);
        }
        if (outCount === 0) {
          lintAddIssue(issues, 'boundary-outgoing', node, 'L’événement de bordure ne possède aucun flux sortant pour gérer la dérivation ou l’exception.', file.fileName);
        }
      }

      if (['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway'].includes(type) && outCount === 1 && inCount <= 1) {
        lintAddIssue(issues, 'gateway-branches', node, 'Cette passerelle ne possède qu’une seule branche sortante.', file.fileName);
      }

      // Contrôle passerelle mixte (Join + Split simultané)
      if (['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway'].includes(type) && inCount > 1 && outCount > 1) {
        lintAddIssue(issues, 'gateway-mixed', node, 'Passerelle mixte (convergence et divergence simultanées) : il est conseillé de séparer la passerelle de fusion de la passerelle de décision.', file.fileName);
      }

      // Contrôle passerelle parallèle AND : pas de default
      if (type === 'parallelgateway') {
        if (lintAttribute(node, ['default'])) {
          lintAddIssue(issues, 'parallel-gateway-default', node, 'Une passerelle parallèle (AND) ne doit pas comporter de branche par défaut (attribut default).', file.fileName);
        }
      }

      // Contrôle passerelle exclusive XOR divergente (Split >= 2)
      if (type === 'exclusivegateway' && outCount >= 2) {
        const defaultId = lintAttribute(node, ['default']);
        const nodeFlows = scopedFlows.filter(flow => lintAttribute(flow, ['sourceRef']) === nodeId);
        const nodeName = lintAttribute(node, ['name']) || nodeId;

        const hasMigrationBypass = nodeFlows.some(f => lintIsMigrationBypassFlow(f));
        // Règle : Définir obligatoirement un Default Flow
        // Si la passerelle bifurque entre une reprise de migration (migration = "O") et un flux nominal,
        // et que toutes les branches portent une condition formelle explicite, la passerelle est tolérée
        if (!defaultId) {
          const allHaveConditions = nodeFlows.every(flow => lintFlowHasCondition(flow));
          if (!hasMigrationBypass || !allHaveConditions) {
            lintAddIssue(issues, 'exclusive-gateway-default', node, `La passerelle exclusive (XOR) « ${nodeName} » ne définit aucun flux par défaut (Default Flow). Un flux par défaut est obligatoire.`, file.fileName);
          }
        }

        // Règle : Définir une condition par branche (sauf Default Flow)
        nodeFlows.forEach(flow => {
          const flowId = lintAttribute(flow, ['id']);
          const flowName = lintAttribute(flow, ['name']);
          const hasCond = lintFlowHasCondition(flow);

          if (flowId !== defaultId) {
            if (!hasCond) {
              lintAddIssue(issues, 'exclusive-gateway-conditions', flow, `La branche sortante « ${flowName || flowId} » de la passerelle exclusive « ${nodeName} » n’est pas le Default Flow et doit comporter une expression de condition (conditionExpression).`, file.fileName);
            }
          } else {
            if (hasCond) {
              lintAddIssue(issues, 'exclusive-gateway-conditions', flow, `La branche sortante « ${flowName || flowId} » est désignée comme Default Flow et ne doit pas comporter de condition.`, file.fileName);
            }
          }
        });
      }

      // Contrôle passerelle événementielle (Event-Based Gateway)
      if (type === 'eventbasedgateway') {
        const nodeFlows = scopedFlows.filter(flow => lintAttribute(flow, ['sourceRef']) === nodeId);
        nodeFlows.forEach(flow => {
          const tId = lintAttribute(flow, ['targetRef']);
          const tEl = idOwners.get(tId)?.[0];
          if (tEl) {
            const tType = lintLocalName(tEl);
            if (!['intermediatecatchevent', 'receivetask'].includes(tType)) {
              lintAddIssue(issues, 'event-based-gateway-targets', flow, `Les branches d’une passerelle événementielle doivent obligatoirement cibler un événement intermédiaire de capture ou une Receive Task (cible actuelle : ${tType}).`, file.fileName);
            }
          }
        });
      }

      const defaultId = lintAttribute(node, ['default']);
      if (defaultId && !scopedFlows.some(flow => lintAttribute(flow, ['id']) === defaultId && lintAttribute(flow, ['sourceRef']) === nodeId)) {
        lintAddIssue(issues, 'default-flow-reference', node, `Le flux par défaut « ${defaultId} » n’est pas une branche sortante de cette passerelle.`, file.fileName);
      }
    });

    // Contrôle des boucles de séquence (cycles de flux / retry)
    const adjacency = new Map(scopedNodes.map(node => [lintAttribute(node, ['id']), []]));
    scopedFlows.forEach(flow => {
      const source = lintAttribute(flow, ['sourceRef']);
      const target = lintAttribute(flow, ['targetRef']);
      if (adjacency.has(source) && adjacency.has(target)) {
        adjacency.get(source).push({ target, flow });
      }
    });

    const cycleNodesMap = new Map();
    const visitedCycle = new Map();
    const cyclePath = [];
    let cycleCounter = 0;

    function detectScopeCycles(nId) {
      visitedCycle.set(nId, 1);
      cyclePath.push(nId);
      const neighbors = adjacency.get(nId) || [];
      for (const edge of neighbors) {
        const t = edge.target;
        const state = visitedCycle.get(t) || 0;
        if (state === 1) {
          const startIdx = cyclePath.indexOf(t);
          if (startIdx !== -1) {
            const nodesInCycle = cyclePath.slice(startIdx);
            cycleCounter++;
            cycleNodesMap.set(`cycle-${cycleCounter}`, nodesInCycle);
          }
        } else if (state === 0) {
          detectScopeCycles(t);
        }
      }
      cyclePath.pop();
      visitedCycle.set(nId, 2);
    }

    scopedNodes.forEach(node => {
      const nId = lintAttribute(node, ['id']);
      if ((visitedCycle.get(nId) || 0) === 0) {
        detectScopeCycles(nId);
      }
    });

    cycleNodesMap.forEach((nodeIds) => {
      const cycleNodeElements = nodeIds.map(id => scopedNodes.find(n => lintAttribute(n, ['id']) === id)).filter(Boolean);
      
      // 1. Minuteur / Timer ≥ 1 min dans la boucle
      let hasValidTimer = false;
      let shortTimerNode = null;
      let shortTimerVal = '';
      const timerNodesInCycle = [];

      cycleNodeElements.forEach(nodeEl => {
        const timerDefs = lintDescendants(nodeEl, ['timereventdefinition', 'timerEventDefinition']);
        if (timerDefs.length > 0) {
          timerNodesInCycle.push(nodeEl);
          timerDefs.forEach(tDef => {
            const durationEl = lintDescendants(tDef, ['timeduration', 'timeDuration'])[0];
            const dateEl = lintDescendants(tDef, ['timedate', 'timeDate'])[0];
            const cycleEl = lintDescendants(tDef, ['timecycle', 'timeCycle'])[0];
            const durText = (durationEl?.textContent || dateEl?.textContent || cycleEl?.textContent || '').trim();
            if (durText) {
              if (lintCheckDurationAtLeastOneMinute(durText)) {
                hasValidTimer = true;
              } else {
                shortTimerNode = nodeEl;
                shortTimerVal = durText;
              }
            } else {
              hasValidTimer = true;
            }
          });
        }
      });

      // Détection de boucle technique de migration tolérée (Camunda 8 / Zeebe 8.x)
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
          } else if (/count|retry|tentative|iteration|index|max|compteur|nb|limit|loop|\b[ijk]\s*[<>=]/i.test(condText)) {
            hasCounterCondition = true;
          }
        });
      });

      // Émission des alertes uniquement si hors boucle de migration
      if (isMigrationLoop) {
        // Boucle technique de migration tolérée : throttle PT2S et garde migration_loop validés
      } else if (shortTimerNode) {
        lintAddIssue(issues, 'loop-max-counter-timer', shortTimerNode, `Le minuteur de la boucle (« ${shortTimerVal} ») est inférieur à 1 minute. La temporisation doit être ≥ 1 minute (ex: PT1M).`, file.fileName);
      } else if (!timerNodesInCycle.length) {
        const rep = cycleNodeElements.find(n => ['exclusivegateway', 'task', 'servicetask', 'callactivity'].includes(lintLocalName(n))) || cycleNodeElements[0] || scope;
        lintAddIssue(issues, 'loop-max-counter-timer', rep, 'Cette boucle de séquence (cycle de retry) ne comporte aucun minuteur d’attente. Insérez un Timer ≥ 1 minute (ex: PT1M).', file.fileName);
      }

      if (gatewaysInCycle.length && !hasCounterCondition && !isMigrationLoop) {
        lintAddIssue(issues, 'loop-max-counter-timer', gatewaysInCycle[0], 'La boucle de séquence ne comporte pas de condition explicite de compteur maximal (ex: retryCount < 3 ou maxAttempts).', file.fileName);
      }
    });
  });

  flowNodes.forEach(node => {
    const type = lintLocalName(node);
    const id = lintAttribute(node, ['id']);
    const name = lintAttribute(node, ['name']);
    const nodeScope = lintFlowScope(node);
    const scopedFlows = flowsByScope.get(nodeScope) || [];
    const nodeOutCount = scopedFlows.filter(flow => lintAttribute(flow, ['sourceRef']) === id).length;
    const isGateway = ['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway'].includes(type);
    const isJoinGateway = isGateway && nodeOutCount <= 1;

    if (!id) lintAddIssue(issues, 'flow-node-id', node, `L’élément ${type} n’a pas d’ID technique.`, file.fileName);
    
    // Les passerelles de fusion (Join / outCount <= 1) et parallèles (AND) n'ont pas besoin de libellé selon les standards BPMN 2.0
    if (!name) {
      if (!isJoinGateway && type !== 'parallelgateway') {
        lintAddIssue(issues, 'empty-name', node, `L’élément ${id || type} n’a pas de libellé.`, file.fileName);
      }
    }

    if (['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask'].includes(type) && name) {
      if (!lintStartsWithInfinitiveVerb(name)) {
        lintAddIssue(issues, 'task-imperative', node, `Le libellé « ${name} » ne commence pas par un verbe à l’infinitif.`, file.fileName);
      }
    }

    if (type === 'subprocess' && name) {
      if (lintStartsWithInfinitiveVerb(name)) {
        lintAddIssue(issues, 'subprocess-noun-phrase', node, `Le sous-processus « ${name} » devrait être formulé en phrase nominale (sans verbe à l’infinitif au début).`, file.fileName);
      }
    }

    if (type === 'startevent' && name) {
      const words = name.trim().split(/\s+/);
      if (words.length < 2 || !lintCheckPastParticipleEnding(words[words.length - 1])) {
        lintAddIssue(issues, 'event-start-past-participle', node, `L’événement de début « ${name} » devrait idéalement suivre le format « Objet + Participe passé » (ex: « Dossier reçu »).`, file.fileName);
      }
    }

    if (type === 'endevent' && name) {
      if (lintStartsWithInfinitiveVerb(name)) {
        lintAddIssue(issues, 'event-end-state', node, `L’événement de fin « ${name} » ne devrait pas commencer par un verbe à l’infinitif mais qualifier l’état final.`, file.fileName);
      }
    }

    // Seules les passerelles de décision divergentes (Split, outCount >= 2) doivent être formulées en question (?)
    if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(type) && nodeOutCount >= 2 && name && !name.trim().endsWith('?')) {
      lintAddIssue(issues, 'gateway-question', node, `La passerelle de décision « ${name} » devrait exprimer une question (se terminant par un point d’interrogation).`, file.fileName);
    }
    if (type === 'parallelgateway' && name && name.includes('?')) {
      lintAddIssue(issues, 'gateway-parallel-no-question', node, `La passerelle parallèle (AND) « ${name} » ne doit pas comporter de point d’interrogation.`, file.fileName);
    }
    if (type === 'intermediatecatchevent' && !name) {
      lintAddIssue(issues, 'event-catch-waiting', node, `L’événement intermédiaire d’attente ${id || type} devrait porter un libellé qualifiant ce qui est attendu.`, file.fileName);
    }
    if (type === 'boundaryevent' && !name) {
      lintAddIssue(issues, 'event-boundary-exception', node, `L’événement de bordure ${id || type} devrait expliciter l’alerte ou l’exception interceptée.`, file.fileName);
    }
    // Contrôle d'architecture modulaire : Privilégier les Call Activities aux activités locales (UserTask, ScriptTask...)
    // Doit être appliqué UNIQUEMENT sur le processus parent/orchestrateur (jamais sur les sous-processus embarqués ou appelés)
    const localActivityTypes = ['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'subprocess'];
    if (localActivityTypes.includes(type)) {
      const scope = lintFlowScope(node);
      const isInsideEmbeddedSubprocess = lintLocalName(scope) === 'subprocess';
      
      let enclosingProc = node;
      while (enclosingProc && lintLocalName(enclosingProc) !== 'process') {
        enclosingProc = enclosingProc.parentElement;
      }
      const enclosingProcId = enclosingProc ? lintAttribute(enclosingProc, ['id']) : '';
      const isCalledSubprocess = lintIsProcessCalledAsSubprocess(enclosingProcId, file);

      // Détection d'activité technique de migration (ex: inc loop, reset migration)
      const isTechMigrationActivity = (name && /migration|loop/i.test(name)) ||
        (id && /migration|loop/i.test(id)) ||
        lintDescendants(node, ['script']).some(s => (s.textContent || '').includes('migration_loop') || lintAttribute(s, ['expression', 'resultVariable']).includes('migration_loop'));

      const isSubprocessScope = isInsideEmbeddedSubprocess || isCalledSubprocess || file.isRoot === false || file.isSubProcess === true;

      if (!isSubprocessScope && !isTechMigrationActivity) {
        lintAddIssue(issues, 'activity-only-callactivity', node, `L’activité « ${name || id || type} » est de type <${type}>. Les règles d’architecture imposent d’utiliser des Call Activities au niveau du processus parent pour modulariser les traitements.`, file.fileName);
      }
    }

    if (type === 'callactivity' && !lintAttribute(node, ['calledElement', 'zeebe:calledElement'])) {
      const childTarget = lintDescendants(node, ['calledElement'])[0];
      if (!childTarget || !lintAttribute(childTarget, ['processId'])) lintAddIssue(issues, 'call-target', node, 'La Call Activity ne précise pas de processus appelé.', file.fileName);
    }
    if (type === 'servicetask' || type === 'sendtask') {
      const implementation = ['camunda:class', 'camunda:delegateExpression', 'camunda:expression', 'camunda:type', 'camunda:topic', 'zeebe:taskDefinition'].some(name => lintAttribute(node, [name]));
      const taskDefinition = lintDescendants(node, ['taskDefinition', 'taskdefinition']).some(child => lintAttribute(child, ['type']));
      if (!implementation && !taskDefinition) lintAddIssue(issues, 'service-implementation', node, 'Aucune classe, expression, topic ou définition de tâche Zeebe n’est configurée.', file.fileName);
    }
    if (type === 'businessruletask') {
      const dmnImpl = ['camunda:decisionRef', 'camunda:calledDecision', 'decisionRef', 'calledDecision', 'camunda:class', 'camunda:delegateExpression', 'camunda:expression', 'camunda:topic', 'zeebe:calledDecision', 'zeebe:taskDefinition'].some(name => lintAttribute(node, [name]));
      const calledDecisionDef = lintDescendants(node, ['calledDecision', 'calleddecision', 'taskDefinition', 'taskdefinition']).some(c => lintAttribute(c, ['decisionId', 'type']));
      if (!dmnImpl && !calledDecisionDef) lintAddIssue(issues, 'business-rule-implementation', node, 'Aucune décision DMN (decisionRef/calledDecision) ou implémentation de worker n’est configurée.', file.fileName);
    }
    if (type === 'usertask') {
      const assignment = ['camunda:assignee', 'camunda:candidateUsers', 'camunda:candidateGroups', 'zeebe:assignee', 'zeebe:candidateGroups'].some(name => lintAttribute(node, [name]));
      const assignmentDefinition = lintDescendants(node, ['assignmentDefinition', 'assignmentdefinition']).some(child => lintAttribute(child, ['assignee', 'candidateGroups', 'candidateUsers']));
      const formDef = ['camunda:formKey', 'camunda:formRef', 'zeebe:formKey', 'zeebe:formId'].some(name => lintAttribute(node, [name]));
      if (!assignment && !assignmentDefinition && !formDef) lintAddIssue(issues, 'user-assignment', node, 'Aucun assignee, candidat, groupe candidat ou formulaire n’est défini.', file.fileName);

      // Contrôle strict : candidateGroups obligatoire et interdiction absolue d’assignation nominative directe (assignee / candidateUsers)
      const directAssignee = lintAttribute(node, ['camunda:assignee', 'zeebe:assignee', 'assignee']);
      const directCandidateUsers = lintAttribute(node, ['camunda:candidateUsers', 'zeebe:candidateUsers', 'candidateUsers']);
      const assignmentDefs = lintDescendants(node, ['assignmentDefinition', 'assignmentdefinition']);
      const elemAssignee = assignmentDefs.map(def => lintAttribute(def, ['assignee'])).find(Boolean);
      const elemCandidateUsers = assignmentDefs.map(def => lintAttribute(def, ['candidateUsers'])).find(Boolean);
      const directUser = directAssignee || directCandidateUsers || elemAssignee || elemCandidateUsers;

      const candidateGroupsAttr = lintAttribute(node, ['camunda:candidateGroups', 'zeebe:candidateGroups', 'candidateGroups']);
      const elemCandidateGroups = assignmentDefs.map(def => lintAttribute(def, ['candidateGroups'])).find(Boolean);
      const hasCandidateGroups = Boolean(candidateGroupsAttr || elemCandidateGroups);

      if (directUser) {
        lintAddIssue(issues, 'user-task-candidate-groups-only', node, `La tâche utilisateur « ${name || id || 'userTask'} » contient une affectation nominative directe (« ${directUser} »). Seuls les groupes de candidats (candidateGroups) sont autorisés.`, file.fileName);
      } else if (!hasCandidateGroups) {
        lintAddIssue(issues, 'user-task-candidate-groups-only', node, `La tâche utilisateur « ${name || id || 'userTask'} » doit obligatoirement définir un groupe candidat (candidateGroups).`, file.fileName);
      }

      // Contrôle Implementation Type = "Camunda User task" (Job Worker interdit)
      const taskDef = lintDescendants(node, ['taskDefinition', 'taskdefinition'])[0];
      const hasJobWorker = Boolean(taskDef && lintAttribute(taskDef, ['type'])) || ['external'].includes(lintAttribute(node, ['camunda:type']).toLowerCase());

      if (hasJobWorker) {
        const workerType = taskDef ? lintAttribute(taskDef, ['type']) : lintAttribute(node, ['camunda:type']);
        lintAddIssue(issues, 'user-task-camunda-implementation', node, `La tâche utilisateur « ${name || id || 'userTask'} » est configurée avec une implémentation Job Worker (« ${workerType} »). Le type d’implémentation doit obligatoirement être « Camunda User task ».`, file.fileName);
      }
    }

    // Contrôle boucles multi-instances et standard loops (compteur maximal obligatoire)
    const multiInstance = lintDescendants(node, ['multiinstanceloopcharacteristics', 'multiInstanceLoopCharacteristics'])[0];
    const standardLoop = lintDescendants(node, ['standardloopcharacteristics', 'standardLoopCharacteristics'])[0];
    if (multiInstance || standardLoop) {
      const loopEl = multiInstance || standardLoop;
      const loopCardinality = lintDescendants(loopEl, ['loopcardinality', 'loopCardinality']).some(c => (c.textContent || '').trim());
      const completionCond = lintDescendants(loopEl, ['completioncondition', 'completionCondition']).some(c => (c.textContent || '').trim());
      const loopMax = lintAttribute(loopEl, ['loopMaximum', 'camunda:collection', 'zeebe:inputCollection']);

      if (!loopCardinality && !completionCond && !loopMax) {
        lintAddIssue(issues, 'loop-max-counter-timer', node, `L’activité en boucle « ${name || id || type} » doit définir un compteur maximal (loopCardinality ou completionCondition).`, file.fileName);
      }
    }
    
    // Définitions temporelles des minuteurs (Timer)
    const timerDefs = lintDescendants(node, ['timereventdefinition']);
    if (timerDefs.length) {
      timerDefs.forEach(tDef => {
        const hasDuration = lintDescendants(tDef, ['timeduration']).some(c => (c.textContent || '').trim());
        const hasDate = lintDescendants(tDef, ['timedate']).some(c => (c.textContent || '').trim());
        const hasCycle = lintDescendants(tDef, ['timecycle']).some(c => (c.textContent || '').trim());
        if (!hasDuration && !hasDate && !hasCycle) {
          lintAddIssue(issues, 'timer-definition', node, 'L’événement minuteur ne possède pas de définition temporelle (timeDuration, timeDate ou timeCycle).', file.fileName);
        }
      });
    }

    // Définitions d'erreur
    const errorDefs = lintDescendants(node, ['erroreventdefinition']);
    if (errorDefs.length) {
      errorDefs.forEach(eDef => {
        const errorRef = lintAttribute(eDef, ['errorRef', 'camunda:errorCode', 'errorCode']);
        if (!errorRef && !lintAttribute(node, ['camunda:errorCode', 'errorCode'])) {
          lintAddIssue(issues, 'error-definition', node, 'L’événement d’erreur ne référence aucun code ou objet d’erreur (errorRef).', file.fileName);
        }
      });
    }

    // Définitions d'escalade
    const escalationDefs = lintDescendants(node, ['escalationeventdefinition']);
    if (escalationDefs.length) {
      escalationDefs.forEach(escDef => {
        const escRef = lintAttribute(escDef, ['escalationRef', 'camunda:escalationCode', 'escalationCode']);
        if (!escRef && !lintAttribute(node, ['camunda:escalationCode', 'escalationCode'])) {
          lintAddIssue(issues, 'escalation-definition', node, 'L’événement d’escalade ne référence aucun code ou objet d’escalade (escalationRef).', file.fileName);
        }
      });
    }

    // Définitions de signaux
    const signalDefs = lintDescendants(node, ['signaleventdefinition']);
    if (signalDefs.length) {
      signalDefs.forEach(sigDef => {
        const sigRef = lintAttribute(sigDef, ['signalRef', 'camunda:signalName', 'signalName', 'name']);
        if (!sigRef && !lintAttribute(node, ['signalRef'])) {
          lintAddIssue(issues, 'signal-definition', node, 'L’événement de signal ne précise aucune référence de signal (signalRef).', file.fileName);
        }
      });
    }

    // Définitions de messages
    const msgDefs = lintDescendants(node, ['messageeventdefinition']);
    if (msgDefs.length || type === 'receivetask') {
      const msgRef = msgDefs.some(mDef => lintAttribute(mDef, ['messageRef'])) || lintAttribute(node, ['messageRef', 'camunda:topic', 'zeebe:message']);
      const taskDef = lintDescendants(node, ['taskdefinition']).some(c => lintAttribute(c, ['type']));
      if (!msgRef && !taskDef) {
        lintAddIssue(issues, 'message-definition', node, 'L’élément de message ne précise pas de référence de message (messageRef).', file.fileName);
      }
    }

    if (type === 'boundaryevent') {
      const target = lintAttribute(node, ['attachedToRef']);
      if (!target) lintAddIssue(issues, 'boundary-reference', node, 'L’événement de bordure n’est rattaché à aucune activité.', file.fileName);
      else if (!idOwners.get(target)?.some(owner => ['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity', 'subprocess'].includes(lintLocalName(owner)) && lintFlowScope(owner) === lintFlowScope(node))) {
        lintAddIssue(issues, 'boundary-target', node, `L’activité rattachée « ${target} » est absente ou hors du scope de l’événement.`, file.fileName);
      }
    }
  });

  const idSet = new Set(idOwners.keys());
  sequenceFlows.forEach(flow => {
    ['sourceRef', 'targetRef'].forEach(attribute => {
      const ref = lintAttribute(flow, [attribute]);
      const flowScope = lintFlowScope(flow);
      const resolvesToFlowNode = ref && idOwners.get(ref)?.some(owner => flowNodeNames.has(lintLocalName(owner)) && lintFlowScope(owner) === flowScope);
      if (!ref || !resolvesToFlowNode) lintAddIssue(issues, 'flow-references', flow, `La référence ${attribute} « ${ref || 'vide'} » ne correspond à aucun nœud de flux du même scope.`, file.fileName);
    });

    const sourceId = lintAttribute(flow, ['sourceRef']);
    const targetId = lintAttribute(flow, ['targetRef']);
    const source = idOwners.get(sourceId)?.[0];
    const target = idOwners.get(targetId)?.[0];
    const hasCondition = lintFlowHasCondition(flow);

    // Vérification sequence flow intra-pool strict (OMG BPMN 2.0)
    if (source && target) {
      const sourceProcess = lintFlowScope(source);
      const targetProcess = lintFlowScope(target);
      if (sourceProcess && targetProcess && sourceProcess !== targetProcess && lintLocalName(sourceProcess) === 'process' && lintLocalName(targetProcess) === 'process') {
        lintAddIssue(issues, 'sequence-flow-cross-pool', flow, `Le flux de séquence « ${lintAttribute(flow, ['id']) || 'flow'} » traverse deux processus ou pools différents (« ${lintAttribute(sourceProcess, ['id'])} » vers « ${lintAttribute(targetProcess, ['id'])} »). Utilisez un flux de message.`, file.fileName);
      }
    }

    if (source && ['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(lintLocalName(source))) {
      const defaultFlow = lintAttribute(source, ['default']) === lintAttribute(flow, ['id']);
      if (!lintAttribute(flow, ['name']) && !defaultFlow && !hasCondition) {
        lintAddIssue(issues, 'gateway-flow-label', flow, 'Cette branche de décision n’a ni libellé, ni condition, ni indication de flux par défaut.', file.fileName);
      }
    }

    // Condition interdite sur passerelle parallèle
    if (source && lintLocalName(source) === 'parallelgateway') {
      if (hasCondition) {
        lintAddIssue(issues, 'parallel-gateway-condition', flow, 'Une passerelle parallèle (AND) ne doit pas comporter de condition sur ses flux sortants.', file.fileName);
      }
    }

    // Flux conditionnel direct depuis une activité
    if (hasCondition && source && ['task', 'servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity'].includes(lintLocalName(source))) {
      lintAddIssue(issues, 'conditional-flow-source', flow, `Le flux conditionnel part directement de l’activité « ${lintAttribute(source, ['name']) || sourceId} ». Utilisez plutôt une passerelle de décision.`, file.fileName);
    }
  });

  const idToProcess = new Map(processes.map(process => [lintAttribute(process, ['id']), process]));
  all.filter(element => lintLocalName(element) === 'callactivity').forEach(activity => {
    const actId = lintAttribute(activity, ['id']);
    const actName = lintAttribute(activity, ['name']) || actId;
    const target = lintAttribute(activity, ['calledElement', 'zeebe:calledElement']) || lintAttribute(lintDescendants(activity, ['calledElement'])[0], ['processId']);
    const batchList = getBpmnLintFiles();
    const isTargetInBatch = (Array.isArray(batchList) && batchList.some(f => {
      if (!f || !f.xmlDoc) return false;
      const fProcs = Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process');
      return fProcs.some(p => (p.getAttribute('id') || '').trim() === target);
    })) || (typeof bpmnBatch !== 'undefined' && Array.isArray(bpmnBatch) && bpmnBatch.some(b => b.processId === target));

    if (target && !idToProcess.has(target) && !isTargetInBatch) {
      lintAddIssue(issues, 'call-target-provided', activity, `Le processus appelé « ${target} » n’est fourni ni dans ce fichier ni dans le lot chargé.`, file.fileName);
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
        lintAddIssue(issues, 'call-activity-input-propagation-off', activity, `La Call Activity « ${actName} » a « Input propagation » activé (propagateAllParentVariables="${parentProp || 'true (par défaut)'}"). Vous devez désactiver « Propagate all parent process variables » (Off) pour isoler les variables d’entrée.`, file.fileName);
      }
      if (childProp !== 'false') {
        lintAddIssue(issues, 'call-activity-output-propagation-off', activity, `La Call Activity « ${actName} » a « Output propagation » activé (propagateAllChildVariables="${childProp || 'true (par défaut)'}"). Vous devez désactiver « Propagate all child process variables » (Off) pour éviter l’écrasement des variables du processus parent.`, file.fileName);
      }
    }

    // Camunda 7 legacy check
    const inVarsAll = lintDescendants(activity, ['in']).some(el => lintAttribute(el, ['variables']) === 'all');
    if (inVarsAll) {
      lintAddIssue(issues, 'call-activity-input-propagation-off', activity, `La Call Activity « ${actName} » propage toutes les variables parentes (<camunda:in variables="all">). Supprimez cette directive et déclarez des mappings de variables explicites.`, file.fileName);
    }
    const outVarsAll = lintDescendants(activity, ['out']).some(el => lintAttribute(el, ['variables']) === 'all');
    if (outVarsAll) {
      lintAddIssue(issues, 'call-activity-output-propagation-off', activity, `La Call Activity « ${actName} » propage toutes les variables filles (<camunda:out variables="all">). Supprimez cette directive et déclarez des mappings de variables explicites.`, file.fileName);
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
    if (!targetProcEl) {
      const activeBatch = getBpmnLintFiles();
      for (const f of (activeBatch || [])) {
        if (!f || !f.xmlDoc) continue;
        const docRoot = f.xmlDoc.documentElement || f.xmlDoc;
        const fProcs = [];
        if (docRoot && (docRoot.localName || '').toLowerCase() === 'process') {
          fProcs.push(docRoot);
        }
        if (typeof f.xmlDoc.getElementsByTagName === 'function') {
          fProcs.push(...Array.from(f.xmlDoc.getElementsByTagName('*')).filter(el => (el.localName || el.tagName.split(':').pop() || '').toLowerCase() === 'process'));
        }
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
            `Violation du contrat d’entrée : Le sous-processus « ${target} » requiert la/les variable(s) [${missingInputs.join(', ')}], mais la Call Activity « ${actName} » ne les injecte pas (propagateAllParentVariables="false").`,
            file.fileName
          );
        }
      } else if (inputMappings.length === 0) {
        if (!targetProcEl && !targetBatchProc) {
          lintAddIssue(
            issues,
            'call-activity-contract-input',
            activity,
            `La Call Activity « ${actName} » a la propagation désactivée (propagateAllParentVariables="false") mais ne déclare aucun mapping d’entrée (<zeebe:input>). Le sous-processus « ${target} » recevra un contexte vide.`,
            file.fileName
          );
        }
      }
    }

    // 2. Validation des sources du mapping d'entrée dans le parent (call-activity-source-undefined)
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
              `Le mapping d’entrée target="${m.target}" de la Call Activity « ${actName} » référence « ${m.source} », mais la variable « ${v} » n’est produite par aucun élément en amont dans le processus parent.`,
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
              `Le mapping de sortie target="${m.target}" de la Call Activity « ${actName} » attend la variable source « ${m.source} », mais celle-ci n’est produite par aucune activité dans le sous-processus « ${target} ».`,
              file.fileName
            );
          }
        });
      });
    }
  });

  all.filter(element => lintLocalName(element) === 'lane').forEach(lane => {
    lintDescendants(lane, ['flowNodeRef']).forEach(ref => {
      const id = (ref.textContent || '').trim();
      if (!id || !idSet.has(id)) lintAddIssue(issues, 'lane-reference', lane, `La lane référence un élément absent : « ${id || 'vide'} ».`, file.fileName);
    });
  });

  if (lintRule('lane-assignment')) {
    const assigned = new Set(all.filter(element => lintLocalName(element) === 'flowNodeRef').map(element => (element.textContent || '').trim()));
    flowNodes.filter(node => !assigned.has(lintAttribute(node, ['id']))).forEach(node => lintAddIssue(issues, 'lane-assignment', node, 'Aucune lane ne référence cette activité.', file.fileName));
  }
  if (!all.some(element => lintLocalName(element) === 'bpmndiagram')) lintAddIssue(issues, 'diagram-layout', root, 'Aucun BPMNDiagram n’a été trouvé ; le modèle peut être valide mais sans diagramme affichable.', file.fileName);

  // Audit des Messages et Signaux au niveau racine / définitions
  all.filter(el => ['message', 'messageeventdefinition'].includes(lintLocalName(el))).forEach(el => {
    const mName = lintAttribute(el, ['name']);
    if (mName && lintRule('message-pascal-suffix')) {
      const isPascalMessage = /^[A-Z][a-zA-Z0-9]*Message$/.test(mName);
      if (!isPascalMessage) {
        lintAddIssue(issues, 'message-pascal-suffix', el, `Le message « ${mName} » doit être en PascalCase et se terminer par "Message" (ex: ${lintSuggestNameCorrection('message-pascal-suffix', mName)}).`, file.fileName);
      }
    }
  });

  all.filter(el => ['signal', 'signaleventdefinition'].includes(lintLocalName(el))).forEach(el => {
    const sName = lintAttribute(el, ['name']);
    if (sName && lintRule('signal-pascal-suffix')) {
      const isPascalSignal = /^[A-Z][a-zA-Z0-9]*(Signal|Signak)$/.test(sName);
      if (!isPascalSignal) {
        lintAddIssue(issues, 'signal-pascal-suffix', el, `Le signal « ${sName} » doit être en PascalCase et se terminer par "Signal" (ex: ${lintSuggestNameCorrection('signal-pascal-suffix', sName)}).`, file.fileName);
      }
    }
  });

  const FEEL_RESERVED = new Set([
    'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds',
    'string', 'number', 'boolean', 'context', 'list', 'null', 'true', 'false', 'function',
    'for', 'return', 'if', 'then', 'else', 'some', 'every', 'satisfies', 'instance', 'of',
    'and', 'or', 'not', 'execution', 'task', 'between', 'count', 'sum', 'min', 'max', 'avg',
    'contains', 'abs', 'floor', 'ceiling', 'round', 'sort', 'reverse', 'flatten', 'distinct',
    'values', 'get', 'value', 'put', 'empty', 'all', 'any', 'now', 'today'
  ]);

  const declaredVariables = new Map();
  const expressionVariables = new Map();

  const addDeclaredVariable = (name, element) => {
    const normalized = String(name || '').trim();
    if (normalized) declaredVariables.set(normalized, element);
  };

  const addExpressionVariable = (name, element) => {
    const normalized = String(name || '').trim();
    // Les fonctions et mots réservés FEEL dans les scripts logiques ne sont JAMAIS des variables
    if (normalized && !FEEL_RESERVED.has(normalized.toLowerCase())) {
      expressionVariables.set(normalized, element);
    }
  };

  all.forEach(element => {
    const type = lintLocalName(element);
    if (['inputparameter', 'outputparameter', 'input', 'output', 'in', 'out', 'formfield', 'property'].includes(type)) {
      addDeclaredVariable(lintAttribute(element, ['name', 'target', 'id']), element);
      const source = lintAttribute(element, ['source']);
      if (source) {
        if (/[=$#]/.test(source)) {
          lintExpressionIdentifiers(source).forEach(name => addExpressionVariable(name, element));
        } else {
          addExpressionVariable(source, element);
        }
      }
    }
    if (type === 'script') {
      const resVar = lintAttribute(element, ['resultVariable']);
      if (resVar) addDeclaredVariable(resVar, element);
      const scriptExpr = lintAttribute(element, ['expression']) || element.textContent || '';
      if (scriptExpr) {
        lintExpressionIdentifiers(scriptExpr).forEach(name => addExpressionVariable(name, element));
      }
    }
    if (type === 'calleddecision') {
      const resVar = lintAttribute(element, ['resultVariable']);
      if (resVar) addDeclaredVariable(resVar, element);
    }
    if (type === 'loopcharacteristics') {
      const inEl = lintAttribute(element, ['inputElement']);
      const outEl = lintAttribute(element, ['outputElement']);
      if (inEl) addDeclaredVariable(inEl, element);
      if (outEl) addDeclaredVariable(outEl, element);
      const inColl = lintAttribute(element, ['inputCollection']);
      if (inColl) lintExpressionIdentifiers(inColl).forEach(name => addExpressionVariable(name, element));
    }
    if (type === 'conditionexpression') {
      lintExpressionIdentifiers(element.textContent).forEach(name => addExpressionVariable(name, element));
    }
    if (!['conditionexpression', 'script', 'inputparameter', 'outputparameter', 'input', 'output', 'in', 'out'].includes(type) && !element.children.length && /(?:\$\{|#\{|^\s*=)/.test((element.textContent || '').trim())) {
      lintExpressionIdentifiers(element.textContent).forEach(name => addExpressionVariable(name, element));
    }
    Array.from(element.attributes || []).forEach(attribute => {
      const attrName = (attribute.localName || '').toLowerCase();
      if (['sourceexpression', 'conditionexpression', 'expression'].includes(attrName) || /(?:\$\{|#\{|^\s*=)/.test(attribute.value)) {
        lintExpressionIdentifiers(attribute.value).forEach(name => addExpressionVariable(name, element));
      }
    });
  });

  // 1. Audit variable-reserved : appliqué STRICTEMENT aux variables déclarées (target, resultVariable, id...)
  if (lintRule('variable-reserved')) {
    declaredVariables.forEach((element, name) => {
      if (FEEL_RESERVED.has(name.toLowerCase())) {
        lintAddIssue(issues, 'variable-reserved', element, `La variable « ${name} » utilise un mot réservé par FEEL / Zeebe.`, file.fileName);
      }
    });
  }

  // 2. Audit variable-naming (camelCase) sur l'ensemble des variables métier déclarées et consommées
  const allAuditedVars = new Map([...expressionVariables, ...declaredVariables]);
  allAuditedVars.forEach((element, name) => {
    const lowerName = name.toLowerCase();
    // Tolérance pour les variables techniques de migration reconnues et exclusion des mots réservés
    const isTechnicalMigrationVar = ['migration', 'old_migration', 'migration_loop', 'migration_max_wait_loop', 'migrationactivities'].includes(lowerName);

    if (lintRule('variable-naming') && !isTechnicalMigrationVar && !FEEL_RESERVED.has(lowerName)) {
      if (typeof checkVariable === 'function') {
        const result = checkVariable(name);
        result.issues.forEach(issue => lintAddIssue(issues, 'variable-naming', element, `Variable « ${name} » : ${issue.msg}`, file.fileName, issue.sev === 'warn' ? 'warning' : undefined));
      } else if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        lintAddIssue(issues, 'variable-naming', element, `La variable « ${name} » doit être en camelCase strict sans accents ni caractères spéciaux (ex: ${lintConvertToCamelCase(name)}).`, file.fileName);
      }
    }
  });

  bpmnLintRules.filter(rule => rule.enabled && rule.custom).forEach(rule => {
    let regex;
    try {
      regex = new RegExp(rule.pattern, rule.flags || '');
    } catch (error) {
      lintAddIssue(issues, rule.id, root, `Expression régulière invalide pour la règle « ${rule.label} » : ${error.message}`, file.fileName, 'error');
      return;
    }
    const targets = all.filter(element => lintMatchesTarget(element, rule.target));
    targets.forEach(element => {
      const value = lintAttribute(element, [rule.attribute || 'name']);
      regex.lastIndex = 0;
      if (value && !regex.test(value)) lintAddIssue(issues, rule.id, element, `« ${value} » ne respecte pas le motif ${rule.pattern}.`, file.fileName);
    });
  });

  issues.sort((a, b) => lintSeverityRank(a.severity) - lintSeverityRank(b.severity));
  const blockers = issues.filter(issue => ['blocker', 'error'].includes(issue.severity)).length;
  const warnings = issues.filter(issue => issue.severity === 'warning').length;
  const score = lintScore(issues, all.length + flowNodes.length);

  // Calcul des métriques typologiques
  const serviceTasks = all.filter(el => ['servicetask', 'sendtask', 'receivetask', 'businessruletask'].includes(lintLocalName(el))).length;
  const userTasks = all.filter(el => ['usertask', 'manualtask'].includes(lintLocalName(el))).length;
  const scriptTasks = all.filter(el => lintLocalName(el) === 'scripttask').length;
  const callActivities = all.filter(el => lintLocalName(el) === 'callactivity').length;
  const subProcesses = all.filter(el => lintLocalName(el) === 'subprocess').length;
  const gateways = all.filter(el => ['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway'].includes(lintLocalName(el)));
  const events = all.filter(el => ['startevent', 'endevent', 'intermediatecatchevent', 'intermediatethrowevent', 'boundaryevent'].includes(lintLocalName(el))).length;

  // Complexité Cyclomatique V(G) = E - N + 2P
  const cyclomatic = Math.max(1, sequenceFlows.length - flowNodes.length + (2 * Math.max(1, processes.length)));

  // Comptages par catégorie et règle
  const categoryCounts = {};
  const ruleCounts = {};
  issues.forEach(issue => {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    ruleCounts[issue.ruleId] = (ruleCounts[issue.ruleId] || 0) + 1;
  });

  const metrics = {
    serviceTasks,
    userTasks,
    scriptTasks,
    callActivities,
    subProcesses,
    gatewaysCount: gateways.length,
    eventsCount: events,
    sequenceFlowsCount: sequenceFlows.length,
    cyclomatic,
    categoryCounts,
    ruleCounts
  };

  return {
    ...file,
    issues,
    score,
    elementCount: all.length,
    processCount: processes.length,
    blockers,
    warnings,
    status: blockers ? 'Bloquant' : warnings ? 'À revoir' : 'Conforme',
    metrics
  };
}

function lintFormatDebt(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (hours < 7) {
    return `${hours}h${remainingMin ? ` ${remainingMin}m` : ''}`;
  }
  const days = (minutes / 420).toFixed(1);
  return `${days} j/h (${hours}h)`;
}

function lintSafeFormula(val) {
  if (typeof sanitizeFormula === 'function') return sanitizeFormula(val);
  if (typeof val === 'string' && /^[=+@-]/i.test(val)) return `'${val}`;
  return val;
}

function lintSafeAoA(aoa) {
  if (typeof sanitizeAoA === 'function') return sanitizeAoA(aoa);
  return aoa.map(row => row.map(cell => lintSafeFormula(cell)));
}

function lintSafeQuote(str) {
  if (typeof window.qq === 'function') return window.qq(str);
  return `"${String(str ?? '').replace(/"/g, '""')}"`;
}

function lintBuildReport() {
  const processOwners = new Map();
  const providedProcessIds = new Set();
  bpmnLintFiles.forEach(file => lintElements(file.xmlDoc).filter(element => lintLocalName(element) === 'process').forEach(process => {
    const id = lintAttribute(process, ['id']);
    if (id) {
      providedProcessIds.add(id);
      if (!processOwners.has(id)) processOwners.set(id, []);
      processOwners.get(id).push({ file, process });
    }
  }));

  const analyzed = bpmnLintFiles.map(file => auditBpmnLintFile(file));
  processOwners.forEach((owners, id) => {
    if (owners.length < 2 || !lintRule('duplicate-process-id-batch')) return;
    owners.forEach(({ file, process }) => {
      const result = analyzed.find(item => item.fileName === file.fileName);
      if (result) lintAddIssue(result.issues, 'duplicate-process-id-batch', process, `L’ID de processus « ${id} » est déclaré dans plusieurs fichiers du lot.`, file.fileName);
    });
  });
  analyzed.forEach(result => result.issues.forEach(issue => {
    if (issue.ruleId !== 'call-target-provided') return;
    const match = issue.message.match(/« (.+) »/);
    if (match && providedProcessIds.has(match[1])) {
      issue.resolvedByBatch = true;
    }
  }));
  analyzed.forEach(result => { result.issues = result.issues.filter(issue => !issue.resolvedByBatch); });

  const processNodes = new Map();
  const callEdges = [];
  bpmnLintFiles.forEach(file => {
    lintElements(file.xmlDoc).filter(element => lintLocalName(element) === 'process').forEach(process => {
      const id = lintAttribute(process, ['id']);
      if (id && !processNodes.has(id)) processNodes.set(id, { id, name: lintAttribute(process, ['name']) || id, fileName: file.fileName, process });
    });
    lintElements(file.xmlDoc).filter(element => lintLocalName(element) === 'callactivity').forEach(activity => {
      let parent = activity.parentElement;
      while (parent && lintLocalName(parent) !== 'process') parent = parent.parentElement;
      const target = lintAttribute(activity, ['calledElement', 'zeebe:calledElement']) || lintAttribute(lintDescendants(activity, ['calledElement'])[0], ['processId']);
      const source = lintAttribute(parent, ['id']);
      if (source && target) callEdges.push({ source, target, activity, fileName: file.fileName });
    });
  });

  const outgoingCalls = new Map(Array.from(processNodes.keys(), id => [id, []]));
  const incomingTargets = new Set();
  const missingTargets = new Set();
  callEdges.forEach(edge => {
    if (processNodes.has(edge.source)) outgoingCalls.get(edge.source).push(edge);
    if (processNodes.has(edge.target)) incomingTargets.add(edge.target);
    else missingTargets.add(edge.target);
  });

  const roots = Array.from(processNodes.values()).filter(process => !incomingTargets.has(process.id));
  const state = new Map();
  const stack = [];
  const cycleKeys = new Set();
  const cycles = [];
  const cycleEdges = new Set();
  processNodes.forEach((_, startId) => {
    if (state.has(startId)) return;
    state.set(startId, 1);
    stack.push({ id: startId, nextEdge: 0 });
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const edges = outgoingCalls.get(frame.id) || [];
      if (frame.nextEdge >= edges.length) {
        state.set(frame.id, 2);
        stack.pop();
        continue;
      }

      const edge = edges[frame.nextEdge++];
      if (!processNodes.has(edge.target)) continue;
      if (state.get(edge.target) === 1) {
        cycleEdges.add(edge);
        const pathIndex = stack.findIndex(item => item.id === edge.target);
        const cyclePath = stack.slice(pathIndex).map(item => item.id).concat(edge.target);
        const cycleKey = Array.from(new Set(cyclePath.slice(0, -1))).sort().join('|');
        if (!cycleKeys.has(cycleKey)) {
          cycleKeys.add(cycleKey);
          cycles.push(cyclePath);
          const result = analyzed.find(item => item.fileName === edge.fileName);
          if (result) lintAddIssue(result.issues, 'call-cycle', edge.activity, `Cycle d’appels BPMN détecté : ${cyclePath.map(id => processNodes.get(id)?.name || id).join(' → ')}.`, edge.fileName);
        }
      } else if (!state.has(edge.target)) {
        state.set(edge.target, 1);
        stack.push({ id: edge.target, nextEdge: 0 });
      }
    }
  });

  const depthEdges = callEdges.filter(edge => processNodes.has(edge.source) && processNodes.has(edge.target) && !cycleEdges.has(edge));
  const depthIndegree = new Map(Array.from(processNodes.keys(), id => [id, 0]));
  const depthOutgoing = new Map(Array.from(processNodes.keys(), id => [id, []]));
  depthEdges.forEach(edge => {
    depthIndegree.set(edge.target, depthIndegree.get(edge.target) + 1);
    depthOutgoing.get(edge.source).push(edge.target);
  });
  const depthQueue = Array.from(depthIndegree).filter(([, indegree]) => indegree === 0).map(([id]) => id);
  const depthByProcess = new Map(Array.from(processNodes.keys(), id => [id, 1]));
  for (let queueIndex = 0; queueIndex < depthQueue.length; queueIndex++) {
    const processId = depthQueue[queueIndex];
    (depthOutgoing.get(processId) || []).forEach(target => {
      depthByProcess.set(target, Math.max(depthByProcess.get(target), depthByProcess.get(processId) + 1));
      depthIndegree.set(target, depthIndegree.get(target) - 1);
      if (depthIndegree.get(target) === 0) depthQueue.push(target);
    });
  }
  const maxDepth = Math.max(0, ...depthByProcess.values());
  window.bpmnLintGraph = {
    processCount: processNodes.size,
    callCount: callEdges.length,
    missingTargetCount: missingTargets.size,
    cycleCount: cycles.length,
    roots: roots.map(process => ({ id: process.id, name: process.name, fileName: process.fileName })),
    maxDepth,
    missingTargets: Array.from(missingTargets),
    cycles
  };

  analyzed.forEach(result => {
    result.blockers = result.issues.filter(issue => ['blocker', 'error'].includes(issue.severity)).length;
    result.warnings = result.issues.filter(issue => issue.severity === 'warning').length;
    result.score = result.parseError ? 0 : lintScore(result.issues, result.elementCount + result.processCount);
    result.status = result.blockers ? 'Bloquant' : result.warnings ? 'À revoir' : 'Conforme';
  });
  bpmnLintResults = analyzed;
  window.bpmnLintResults = bpmnLintResults;
  renderBpmnLintResults();
  return analyzed;
}

const BPMN_LINT_RULE_KNOWLEDGE = {
  "definitions-root": {
    "standard": "OMG BPMN 2.0 §8.2.1",
    "badge": "Structure Racine",
    "explanation": "Le document XML doit obligatoirement avoir comme élément racine <bpmn:definitions> (ou <definitions> avec namespace BPMN 2.0). Tout fichier sans racine valide ne peut pas être interprété par les moteurs d'exécution Camunda/Zeebe ni par les modeleurs conformes OMG.",
    "badDesc": "Document XML sans balise racine BPMN conforme (ex: balise HTML, XML générique ou balise process isolée).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Pas de balise racine definitions -->\n<process id=\"mon-processus\" isExecutable=\"true\">\n  <startEvent id=\"start\" />\n</process>",
    "goodDesc": "Balise racine <bpmn:definitions> avec déclaration correcte des namespaces standard OMG BPMN 2.0.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Racine definitions standard OMG -->\n<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\"\n                  xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\"\n                  xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\"\n                  xmlns:zeebe=\"http://camunda.org/schema/zeebe/1.0\"\n                  id=\"Definitions_1\"\n                  targetNamespace=\"http://bpmn.io/schema/bpmn\">\n  <bpmn:process id=\"process-commande\" isExecutable=\"true\">\n    ...\n  </bpmn:process>\n</bpmn:definitions>",
    "impact": "🚨 Échec immédiat du déploiement (Parser Error Zeebe). Fichier illisible par le moteur.",
    "autoFixable": false
  },
  "definitions-namespace": {
    "standard": "OMG BPMN 2.0 §8.2.2",
    "badge": "Namespace XML",
    "explanation": "Le namespace cible et le schéma BPMN 2.0 (http://www.omg.org/spec/BPMN/20100524/MODEL) doivent être déclarés. Les anciens namespaces BPMN 1.x ou les URI erronées empêchent le moteur de reconnaître la sémantique exécutable.",
    "badDesc": "Namespace manquant ou URL obsolète (ex: bpmn 1.2 ou schéma non officiel).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Namespace OMG manquant ou invalide -->\n<definitions xmlns=\"http://ancien-schema.org/bpmn\">\n  <process id=\"Process_1\" />\n</definitions>",
    "goodDesc": "Namespace officiel OMG BPMN 2.0 MODEL présent sur la racine.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Namespace officiel OMG BPMN 2.0 -->\n<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\"\n                  targetNamespace=\"http://bpmn.io/schema/bpmn\">",
    "impact": "🚨 Rejet du schéma XML par Camunda Cloud / Engine.",
    "autoFixable": false
  },
  "process-id": {
    "standard": "OMG BPMN 2.0 §10.1 & Bouygues Telecom Std",
    "badge": "Identité Processus",
    "explanation": "Chaque définition de processus doit comporter un attribut id non vide. Cet ID technique est la clé de déploiement, de versioning et d'instanciation par l'API Zeebe (createProcessInstanceByKey).",
    "badDesc": "Balise <bpmn:process> sans attribut id ou avec un id vide.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : ID de processus absent -->\n<bpmn:process isExecutable=\"true\" name=\"Validation Contrat\">\n  <bpmn:startEvent id=\"StartEvent_1\" />\n</bpmn:process>",
    "goodDesc": "Attribut id renseigné de manière explicite et unique.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : ID technique présent et explicite -->\n<bpmn:process id=\"process-validation-contrat\" name=\"Validation Contrat\" isExecutable=\"true\">\n  <bpmn:startEvent id=\"StartEvent_1\" />\n</bpmn:process>",
    "impact": "🚨 Impossibilité d'instancier le processus par clé technique.",
    "autoFixable": true
  },
  "duplicate-id": {
    "standard": "W3C XML ID / OMG BPMN 2.0 §8.2",
    "badge": "Unicité XML",
    "explanation": "Tous les éléments du document XML (tâches, événements, passerelles, flux de séquence) doivent avoir un attribut id strictement unique. Deux éléments avec le même id provoquent des comportements indéterminés ou des crashs de parsing.",
    "badDesc": "Deux éléments distincts partagent le même identifiant technique.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : ID dupliqué 'Task_1' -->\n<bpmn:serviceTask id=\"Task_1\" name=\"Vérifier le stock\" />\n...\n<bpmn:userTask id=\"Task_1\" name=\"Valider le panier\" />",
    "goodDesc": "Identifiants techniques distincts pour chaque élément du diagramme.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : IDs uniques et typés -->\n<bpmn:serviceTask id=\"Task_verifier_stock\" name=\"Vérifier le stock\" />\n...\n<bpmn:userTask id=\"Task_valider_panier\" name=\"Valider le panier\" />",
    "impact": "🚨 Conflit de routage et crash d'exécution Zeebe lors du déclenchement du nœud.",
    "autoFixable": false
  },
  "flow-references": {
    "standard": "OMG BPMN 2.0 §8.3.3",
    "badge": "Intégrité Graphique",
    "explanation": "Chaque flux de séquence (sequenceFlow) doit référencer des nœuds source (sourceRef) et cible (targetRef) existants dans le même processus. Un flux orphelin génère une rupture de jeton.",
    "badDesc": "Attribut targetRef ou sourceRef pointant vers un ID inexistant.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : targetRef 'Task_Inconnue' n'existe pas -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"StartEvent_1\" targetRef=\"Task_Inconnue\" />",
    "goodDesc": "sourceRef et targetRef pointent vers des éléments réels du flux.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Références résolues -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"StartEvent_1\" targetRef=\"Task_verifier_stock\" />\n<bpmn:serviceTask id=\"Task_verifier_stock\" name=\"Vérifier le stock\" />",
    "impact": "🚨 Jeton bloqué indéfiniment ou exception Zeebe \"Target node not found\".",
    "autoFixable": false
  },
  "sequence-flow-cross-pool": {
    "standard": "OMG BPMN 2.0 §10.2.1",
    "badge": "Frontières Pools",
    "explanation": "La norme BPMN interdit formellement de faire traverser un flux de séquence (sequenceFlow) entre deux pools/participants différents. Les interactions inter-pools doivent exclusivement utiliser des flux de messages (messageFlow).",
    "badDesc": "Flux séquentiel reliant un nœud du Pool A à un nœud du Pool B.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : sequenceFlow traversant entre deux pools -->\n<bpmn:sequenceFlow id=\"Flow_inter\" sourceRef=\"Task_Pool_A\" targetRef=\"Task_Pool_B\" />",
    "goodDesc": "Utilisation d'un messageFlow en pointillés pour relier deux pools distincts.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : messageFlow pour la communication inter-pools -->\n<bpmn:messageFlow id=\"MsgFlow_1\" sourceRef=\"Task_Pool_A\" targetRef=\"Event_Pool_B\" />",
    "impact": "🚨 Violation grave du standard BPMN 2.0 et échec de validation Camunda Modeler.",
    "autoFixable": false
  },
  "message-flow-valid": {
    "standard": "OMG BPMN 2.0 §10.2.2",
    "badge": "Flux Messages",
    "explanation": "Les flux de messages (bpmn:messageFlow) sont réservés à la communication asynchrone entre deux pools distincts. Ils ne doivent jamais être utilisés à l'intérieur d'un même pool.",
    "badDesc": "Message flow utilisé pour relier deux tâches au sein du même participant.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : messageFlow intra-pool -->\n<bpmn:messageFlow id=\"MsgFlow_intra\" sourceRef=\"Task_1\" targetRef=\"Task_2\" />",
    "goodDesc": "SequenceFlow intra-pool et MessageFlow inter-pools.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : sequenceFlow au sein du même pool -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"Task_1\" targetRef=\"Task_2\" />",
    "impact": "⚠️ Incohérence sémantique majeure dans la collaboration BPMN.",
    "autoFixable": false
  },
  "start-event": {
    "standard": "OMG BPMN 2.0 §10.4.2",
    "badge": "Point d'Entrée",
    "explanation": "Tout processus ou sous-processus exécutable doit posséder au moins un événement de début (bpmn:startEvent). Sans événement de début, l'instance ne peut jamais démarrer.",
    "badDesc": "Processus sans aucune balise bpmn:startEvent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Pas d'événement de début -->\n<bpmn:process id=\"process-sans-debut\" isExecutable=\"true\">\n  <bpmn:serviceTask id=\"Task_1\" name=\"Faire l'action\" />\n</bpmn:process>",
    "goodDesc": "Événement de début clairement identifié relié à la première tâche.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Événement de début standard -->\n<bpmn:process id=\"process-avec-debut\" isExecutable=\"true\">\n  <bpmn:startEvent id=\"StartEvent_1\" name=\"Commande reçue\">\n    <bpmn:outgoing>Flow_1</bpmn:outgoing>\n  </bpmn:startEvent>\n  <bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"StartEvent_1\" targetRef=\"Task_1\" />\n  ...\n</bpmn:process>",
    "impact": "🚨 Processus non déclenchable par l'orchestrateur.",
    "autoFixable": false
  },
  "multiple-none-start-events": {
    "standard": "OMG BPMN 2.0 §10.4.2 & Camunda Best Practice",
    "badge": "Ambigüité Début",
    "explanation": "Un processus de premier niveau ne doit comporter qu'un SEUL événement de début non typé (\"None Start Event\"). Avoir plusieurs débuts non typés crée des instanciations concurrentes non maîtrisées.",
    "badDesc": "Deux événements de début simples (none) dans le même processus principal.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Deux événements de début simples concurrents -->\n<bpmn:startEvent id=\"Start_1\" name=\"Début standard\" />\n<bpmn:startEvent id=\"Start_2\" name=\"Autre début\" />",
    "goodDesc": "Un unique début simple, ou des débuts différenciés par des déclencheurs (Message, Timer, Signal).",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Début unique non typé -->\n<bpmn:startEvent id=\"Start_Unique\" name=\"Demande initialisée\" />",
    "impact": "🟠 Instanciations multiples indésirables ou comportement imprévisible.",
    "autoFixable": false
  },
  "end-event": {
    "standard": "OMG BPMN 2.0 §10.4.3",
    "badge": "Terminaison",
    "explanation": "Chaque chemin d'exécution doit aboutir à un événement de fin (bpmn:endEvent). L'absence d'événement de fin laisse des jetons suspendus en mémoire et empêche la clôture propre de l'instance.",
    "badDesc": "Processus sans événement de fin ou flux s'arrêtant sur une tâche intermédiaire.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Fin abrupte sans endEvent -->\n<bpmn:serviceTask id=\"Task_derniere\" name=\"Envoi email confirmation\" />\n<!-- Aucun endEvent connecté -->",
    "goodDesc": "Événement de fin connecté avec état métier explicite.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Clôture via un endEvent -->\n<bpmn:serviceTask id=\"Task_derniere\" name=\"Envoi email confirmation\">\n  <bpmn:outgoing>Flow_to_end</bpmn:outgoing>\n</bpmn:serviceTask>\n<bpmn:sequenceFlow id=\"Flow_to_end\" sourceRef=\"Task_derniere\" targetRef=\"EndEvent_1\" />\n<bpmn:endEvent id=\"EndEvent_1\" name=\"Commande finalisée\" />",
    "impact": "🚨 Instance de processus restant indéfiniment active (\"Zombie Instance\").",
    "autoFixable": false
  },
  "start-incoming": {
    "standard": "OMG BPMN 2.0 §10.4.2",
    "badge": "Intégrité Début",
    "explanation": "Un événement de début ne peut pas avoir de flux de séquence entrant (incoming). S'il est nécessaire de boucler, le flux doit revenir vers une passerelle ou une tâche en aval.",
    "badDesc": "Flux de séquence pointant vers un bpmn:startEvent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : startEvent avec un flux entrant -->\n<bpmn:startEvent id=\"StartEvent_1\">\n  <bpmn:incoming>Flow_boucle_retour</bpmn:incoming>\n</bpmn:startEvent>",
    "goodDesc": "Le flux de retour boucle sur une passerelle XOR de convergence.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Boucle sur passerelle XOR -->\n<bpmn:startEvent id=\"StartEvent_1\">\n  <bpmn:outgoing>Flow_1</bpmn:outgoing>\n</bpmn:startEvent>\n<bpmn:exclusiveGateway id=\"Gateway_join\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <bpmn:incoming>Flow_boucle_retour</bpmn:incoming>\n</bpmn:exclusiveGateway>",
    "impact": "🚨 Rejet immédiat par le moteur Zeebe au déploiement.",
    "autoFixable": false
  },
  "end-outgoing": {
    "standard": "OMG BPMN 2.0 §10.4.3",
    "badge": "Intégrité Fin",
    "explanation": "Un événement de fin (bpmn:endEvent) consomme le jeton et ne peut pas avoir de flux de séquence sortant (outgoing). Tout élément placé après un endEvent est inaccessible.",
    "badDesc": "bpmn:endEvent possédant une balise <outgoing>.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : endEvent avec flux sortant -->\n<bpmn:endEvent id=\"EndEvent_1\">\n  <bpmn:outgoing>Flow_apres_fin</bpmn:outgoing>\n</bpmn:endEvent>",
    "goodDesc": "endEvent sans aucun flux sortant.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : endEvent terminal propre -->\n<bpmn:endEvent id=\"EndEvent_1\" name=\"Contrat archivé\">\n  <bpmn:incoming>Flow_vers_fin</bpmn:incoming>\n</bpmn:endEvent>",
    "impact": "🚨 Erreur de modélisation bloquante au déploiement.",
    "autoFixable": false
  },
  "intermediate-flows": {
    "standard": "OMG BPMN 2.0 §10.4.4",
    "badge": "Continuité Flux",
    "explanation": "Un événement intermédiaire (catch ou throw) placé dans le flux principal doit obligatoirement comporter au moins un flux entrant et au moins un flux sortant.",
    "badDesc": "Événement intermédiaire isolé sans flux entrant ou sans flux sortant.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Timer intermédiaire non connecté en sortie -->\n<bpmn:intermediateCatchEvent id=\"Timer_attente\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <!-- Manque <bpmn:outgoing> -->\n</bpmn:intermediateCatchEvent>",
    "goodDesc": "Événement intermédiaire inséré avec flux entrant et sortant.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Événement intermédiaire connecté -->\n<bpmn:intermediateCatchEvent id=\"Timer_attente\" name=\"Attente 24h\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <bpmn:outgoing>Flow_2</bpmn:outgoing>\n  <bpmn:timerEventDefinition>\n    <bpmn:timeDuration>PT24H</bpmn:timeDuration>\n  </bpmn:timerEventDefinition>\n</bpmn:intermediateCatchEvent>",
    "impact": "🟠 Jeton bloqué lors de l'évaluation de l'événement intermédiaire.",
    "autoFixable": false
  },
  "boundary-reference": {
    "standard": "OMG BPMN 2.0 §10.4.12",
    "badge": "Événement Bordure",
    "explanation": "Un événement de bordure (boundaryEvent) doit obligatoirement référencer l'activité sur laquelle il est attaché via l'attribut attachedToRef.",
    "badDesc": "Balise <bpmn:boundaryEvent> sans attribut attachedToRef ou référençant un élément inexistant.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : attachedToRef manquant -->\n<bpmn:boundaryEvent id=\"Error_1\" cancelActivity=\"true\">\n  <bpmn:errorEventDefinition />\n</bpmn:boundaryEvent>",
    "goodDesc": "attachedToRef pointant vers la tâche cible dans le même scope.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : attachedToRef valide -->\n<bpmn:serviceTask id=\"Task_appel_api\" name=\"Appel API Facturation\" />\n<bpmn:boundaryEvent id=\"Error_1\" attachedToRef=\"Task_appel_api\" cancelActivity=\"true\">\n  <bpmn:outgoing>Flow_erreur</bpmn:outgoing>\n  <bpmn:errorEventDefinition errorRef=\"Err_Api_500\" />\n</bpmn:boundaryEvent>",
    "impact": "🚨 Échec de parsing du schéma BPMN.",
    "autoFixable": false
  },
  "boundary-target": {
    "standard": "OMG BPMN 2.0 §10.4.12",
    "badge": "Cible Bordure",
    "explanation": "Un événement de bordure ne peut être rattaché qu'à une activité (Tâche, Sous-processus, Call Activity). Il ne peut pas être rattaché à une passerelle ou à un événement.",
    "badDesc": "attachedToRef pointant vers une passerelle ou un startEvent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Boundary attaché à une passerelle -->\n<bpmn:boundaryEvent id=\"Timer_1\" attachedToRef=\"Gateway_xor_1\" />",
    "goodDesc": "attachedToRef rattaché à une Tâche ou un Sous-Processus.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Boundary attaché à une Tâche -->\n<bpmn:boundaryEvent id=\"Timer_1\" attachedToRef=\"Task_validation\" />",
    "impact": "🚨 Rejet immédiat par le moteur BPMN.",
    "autoFixable": false
  },
  "boundary-incoming": {
    "standard": "OMG BPMN 2.0 §10.4.12",
    "badge": "Événement Bordure",
    "explanation": "Un événement de bordure est déclenché par un événement externe/exception sur l'activité hôte. Il ne peut JAMAIS avoir de flux de séquence entrant (incoming).",
    "badDesc": "bpmn:boundaryEvent contenant un flux <incoming>.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Boundary avec flux entrant -->\n<bpmn:boundaryEvent id=\"Boundary_1\" attachedToRef=\"Task_1\">\n  <bpmn:incoming>Flow_interdit</bpmn:incoming>\n  <bpmn:outgoing>Flow_derivation</bpmn:outgoing>\n</bpmn:boundaryEvent>",
    "goodDesc": "Boundary sans flux entrant, avec uniquement un flux sortant d'exception.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Uniquement flux sortant sur le boundary -->\n<bpmn:boundaryEvent id=\"Boundary_1\" attachedToRef=\"Task_1\">\n  <bpmn:outgoing>Flow_derivation</bpmn:outgoing>\n</bpmn:boundaryEvent>",
    "impact": "🚨 Violation formelle de la sémantique BPMN 2.0.",
    "autoFixable": false
  },
  "boundary-outgoing": {
    "standard": "OMG BPMN 2.0 §10.4.12",
    "badge": "Événement Bordure",
    "explanation": "Un événement de bordure doit posséder au moins un flux sortant pour dériver le jeton en cas de capture d'événement (erreur, timer, message). Sans flux sortant, l'exception est absorbée dans le vide.",
    "badDesc": "Boundary event sans flux sortant de dérivation.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Exception capturée sans branche de traitement -->\n<bpmn:boundaryEvent id=\"Error_catch\" attachedToRef=\"Task_1\">\n  <bpmn:errorEventDefinition errorRef=\"Err_1\" />\n</bpmn:boundaryEvent>",
    "goodDesc": "Flux sortant reliant l'événement de bordure à la gestion d'incident.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Flux sortant de compensation / remédiation -->\n<bpmn:boundaryEvent id=\"Error_catch\" attachedToRef=\"Task_1\">\n  <bpmn:outgoing>Flow_vers_remediation</bpmn:outgoing>\n  <bpmn:errorEventDefinition errorRef=\"Err_1\" />\n</bpmn:boundaryEvent>",
    "impact": "⚠️ Perte silencieuse de traitement en cas d'erreur.",
    "autoFixable": false
  },
  "event-subprocess-structure": {
    "standard": "OMG BPMN 2.0 §10.4.5",
    "badge": "Sous-processus Événementiel",
    "explanation": "Un sous-processus événementiel (triggeredByEvent=\"true\") ne doit comporter aucun flux de séquence entrant ni sortant, et son événement de début doit obligatoirement être typé (Message, Error, Timer, Signal).",
    "badDesc": "Sous-processus événementiel relié par un flux séquentiel ou début simple non typé.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Sous-processus événementiel relié par un flux -->\n<bpmn:subProcess id=\"EventSub_1\" triggeredByEvent=\"true\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <bpmn:startEvent id=\"Start_simple\" />\n</bpmn:subProcess>",
    "goodDesc": "Sous-processus événementiel autonome avec début Error/Message.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Début typé sans flux entrant/sortant -->\n<bpmn:subProcess id=\"EventSub_1\" triggeredByEvent=\"true\">\n  <bpmn:startEvent id=\"Start_error\" isInterrupting=\"true\">\n    <bpmn:outgoing>Flow_handler</bpmn:outgoing>\n    <bpmn:errorEventDefinition errorRef=\"Err_Technique\" />\n  </bpmn:startEvent>\n  ...\n</bpmn:subProcess>",
    "impact": "🚨 Erreur de compilation du modèle BPMN.",
    "autoFixable": false
  },
  "unreachable-node": {
    "standard": "OMG BPMN 2.0 §8.3 & Analyse Statique",
    "badge": "Code Mort",
    "explanation": "Tout élément du processus doit être atteignable par un chemin continu depuis au moins un événement de début. Les éléments orphelins constituent du code mort et polluent le diagramme.",
    "badDesc": "Tâche ou passerelle flottante déconnectée du reste du graphe.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche isolée sans chemin depuis le début -->\n<bpmn:serviceTask id=\"Task_oubliee\" name=\"Ancienne étape non reliée\" />",
    "goodDesc": "Tous les éléments sont connectés dans le flux de séquence principal.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Tous les nœuds sont reliés -->\n<bpmn:sequenceFlow id=\"Flow_5\" sourceRef=\"Gateway_1\" targetRef=\"Task_active\" />\n<bpmn:serviceTask id=\"Task_active\" name=\"Étape active\" />",
    "impact": "🟡 Dette technique, confusion pour les analystes et faux sentiment de complétude.",
    "autoFixable": false
  },
  "default-flow-reference": {
    "standard": "OMG BPMN 2.0 §10.5.1",
    "badge": "Branche par Défaut",
    "explanation": "L'attribut default d'une passerelle ou d'une activité doit faire référence à un identifiant de flux de séquence (sequenceFlow) existant et issu de ce même élément.",
    "badDesc": "Attribut default pointant vers un flux inexistant ou non relié au nœud.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : default pointant vers 'Flow_Inexistant' -->\n<bpmn:exclusiveGateway id=\"Gateway_1\" default=\"Flow_Inexistant\">\n  <bpmn:outgoing>Flow_A</bpmn:outgoing>\n</bpmn:exclusiveGateway>",
    "goodDesc": "Attribut default correspondant à l'une des balises <outgoing>.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Branche par défaut résolue -->\n<bpmn:exclusiveGateway id=\"Gateway_1\" default=\"Flow_Defaut\">\n  <bpmn:outgoing>Flow_Eligible</bpmn:outgoing>\n  <bpmn:outgoing>Flow_Defaut</bpmn:outgoing>\n</bpmn:exclusiveGateway>\n<bpmn:sequenceFlow id=\"Flow_Defaut\" sourceRef=\"Gateway_1\" targetRef=\"Task_Rejet\" />",
    "impact": "🚨 Incident d'exécution Zeebe en cas d'absence de match conditionnel.",
    "autoFixable": false
  },
  "flow-node-id": {
    "standard": "OMG BPMN 2.0 §8.2",
    "badge": "Identifiant Nœud",
    "explanation": "Chaque élément de flux (Task, Gateway, Event, SubProcess) doit posséder un identifiant id non vide.",
    "badDesc": "Élément XML de flux sans attribut id.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Task sans attribut id -->\n<bpmn:serviceTask name=\"Valider le dossier\" />",
    "goodDesc": "Identifiant technique présent.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : ID technique présent -->\n<bpmn:serviceTask id=\"Task_valider_dossier\" name=\"Valider le dossier\" />",
    "impact": "🚨 Impossibilité d'auditer ou d'orchestrer le nœud.",
    "autoFixable": false
  },
  "lane-reference": {
    "standard": "OMG BPMN 2.0 §10.2.3",
    "badge": "Intégrité Lanes",
    "explanation": "Toute référence d'élément <flowNodeRef> contenue dans une Lane doit correspondre à un élément de flux existant dans le processus parent.",
    "badDesc": "flowNodeRef pointant vers un ID de tâche supprimé ou inexistant.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Référence orpheline dans la lane -->\n<bpmn:lane id=\"Lane_Support\">\n  <bpmn:flowNodeRef>Task_Supprimee</bpmn:flowNodeRef>\n</bpmn:lane>",
    "goodDesc": "flowNodeRef pointant vers des éléments réels.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Références exactes dans la lane -->\n<bpmn:lane id=\"Lane_Support\">\n  <bpmn:flowNodeRef>Task_traitement_ticket</bpmn:flowNodeRef>\n</bpmn:lane>",
    "impact": "🟠 Problèmes d'affichage et d'assignation dans le Modeler.",
    "autoFixable": false
  },
  "duplicate-process-id-batch": {
    "standard": "Camunda Cloud Cluster Architecture",
    "badge": "Gouvernance Multi-fichiers",
    "explanation": "Dans un même lot de fichiers de déploiement, deux fichiers BPMN différents ne doivent pas définir le même identifiant de processus (<bpmn:process id=\"...\">), sous peine d'écrasement de version silencieux.",
    "badDesc": "Deux fichiers BPMN distincts contenant le même process id (ex: process-facturation).",
    "badSnippet": "<!-- Fichier A.bpmn -->\n<bpmn:process id=\"process-facturation\" ... />\n\n<!-- Fichier B.bpmn -->\n<bpmn:process id=\"process-facturation\" ... />",
    "goodDesc": "Identifiants de processus distincts pour chaque fichier du repository.",
    "goodSnippet": "<!-- Fichier A.bpmn -->\n<bpmn:process id=\"process-facturation-b2c\" ... />\n\n<!-- Fichier B.bpmn -->\n<bpmn:process id=\"process-facturation-b2b\" ... />",
    "impact": "🚨 Écrasement incontrôlé des définitions de processus sur le cluster Zeebe.",
    "autoFixable": false
  },
  "call-target": {
    "standard": "OMG BPMN 2.0 §10.3.3 & Zeebe Spec",
    "badge": "Call Activity",
    "explanation": "Une tâche d'appel (Call Activity) doit obligatoirement renseigner l'identifiant du processus cible à invoquer via l'attribut calledElement ou l'extension zeebe:calledElement.",
    "badDesc": "bpmn:callActivity sans attribut calledElement ni balise zeebe:calledElement.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Call Activity sans cible -->\n<bpmn:callActivity id=\"Call_1\" name=\"Sous-processus Facturation\" />",
    "goodDesc": "Attribut calledElement ou balise zeebe:calledElement avec processId cible défini.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Cible appelée explicitement -->\n<bpmn:callActivity id=\"Call_1\" name=\"Sous-processus Facturation\" calledElement=\"process-facturation\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"process-facturation\" propagateAllChildVariables=\"false\" propagateAllParentVariables=\"false\" />\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "impact": "🚨 Incident d'exécution critique Zeebe (Called element is empty).",
    "autoFixable": false
  },
  "call-target-provided": {
    "standard": "Bouygues Telecom CI/CD Governance",
    "badge": "Cohérence du Lot",
    "explanation": "Le sous-processus appelé par une Call Activity doit être présent dans le lot de fichiers BPMN analysés, pour garantir l'auditabilité globale et l'absence de dépendance orpheline.",
    "badDesc": "Call activity ciblant un process ID absent de l'ensemble des fichiers importés.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : process-inconnu n'est pas fourni dans le workspace -->\n<bpmn:callActivity id=\"Call_sub\" calledElement=\"process-inconnu\" />",
    "goodDesc": "Le fichier sous-processus correspondant est inclus dans le déploiement.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Le fichier 'process-facturation.bpmn' est présent dans le pack -->\n<bpmn:callActivity id=\"Call_sub\" calledElement=\"process-facturation\" />",
    "impact": "🟡 Risque de rupture de dépendance en environnement de recette/production.",
    "autoFixable": false
  },
  "call-cycle": {
    "standard": "Architecture Récursive BPMN",
    "badge": "Prévention Boucle Infinie",
    "explanation": "Les dépendances entre Call Activities ne doivent pas former de cycle récursif (Process A appelle Process B qui rappelle Process A). Les cycles d'appels entraînent une récursion infinie et l'effondrement du cluster.",
    "badDesc": "Cycle d'appel direct ou indirect détecté entre plusieurs diagrammes.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Cycle A -> B -> A -->\n<!-- process_a.bpmn appelle process_b -->\n<!-- process_b.bpmn appelle process_a -->",
    "goodDesc": "Architecture arborescente sans boucle récursive d'orchestration.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Flux hiérarchique clair A -> B -> C -->",
    "impact": "🚨 Boucle infinie d'instanciations, saturation mémoire et incident majeur.",
    "autoFixable": false
  },
  "call-activity-input-propagation-off": {
    "standard": "Bouygues Telecom Standard §4.2 & Zeebe 8.x",
    "badge": "Isolation Variables",
    "explanation": "Sur une Call Activity, la propagation automatique des variables parentes vers le sous-processus doit être DÉSACTIVÉE (propagateAllParentVariables=\"false\"). Toutes les entrées doivent être mappées explicitement via des balises <zeebe:input source=\"...\" target=\"...\" /> pour éviter toute pollution mémoire et effet de bord.",
    "badDesc": "propagateAllParentVariables omis ou positionné à \"true\".",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Propagation parente activée par défaut -->\n<bpmn:callActivity id=\"Call_Eligibilite\" calledElement=\"sub-process-eligibilite\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-process-eligibilite\" propagateAllParentVariables=\"true\" />\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "goodDesc": "propagateAllParentVariables=\"false\" avec entrées explicites.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Isolation stricte et mapping explicite -->\n<bpmn:callActivity id=\"Call_Eligibilite\" calledElement=\"sub-process-eligibilite\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-process-eligibilite\" propagateAllParentVariables=\"false\" propagateAllChildVariables=\"false\" />\n    <zeebe:ioMapping>\n      <zeebe:input source=\"= codePostal\" target=\"codePostal\" />\n      <zeebe:input source=\"= typeOffre\" target=\"typeOffre\" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "impact": "🚨 Pollution de l'espace mémoire du sous-processus et régressions silencieuses.",
    "autoFixable": true
  },
  "call-activity-output-propagation-off": {
    "standard": "Bouygues Telecom Standard §4.2 & Zeebe 8.x",
    "badge": "Isolation Variables",
    "explanation": "Sur une Call Activity, la propagation automatique des variables filles vers le parent doit être DÉSACTIVÉE (propagateAllChildVariables=\"false\"). Seules les variables de retour explicitement mappées (<zeebe:output source=\"...\" target=\"...\" />) doivent remonter dans le processus parent.",
    "badDesc": "propagateAllChildVariables omis ou positionné à \"true\".",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Propagation enfant globale vers le parent -->\n<bpmn:callActivity id=\"Call_Scoring\" calledElement=\"sub-scoring\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-scoring\" propagateAllChildVariables=\"true\" />\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "goodDesc": "propagateAllChildVariables=\"false\" avec sorties explicitement déclarées.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Retour de variables contrôlé -->\n<bpmn:callActivity id=\"Call_Scoring\" calledElement=\"sub-scoring\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-scoring\" propagateAllParentVariables=\"false\" propagateAllChildVariables=\"false\" />\n    <zeebe:ioMapping>\n      <zeebe:output source=\"= scoreClient\" target=\"scoreClient\" />\n      <zeebe:output source=\"= decisionScoring\" target=\"decisionScoring\" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "impact": "🚨 Écrasement involontaire de variables du processus parent par des variables temporaires du sous-processus.",
    "autoFixable": true
  },
  "call-activity-contract-input": {
    "standard": "Bouygues Telecom Data Contracts & Zeebe 8.x",
    "badge": "Contrat de Données",
    "explanation": "Lorsque la propagation des variables est isolée (propagateAllParentVariables=\"false\"), la Call Activity doit explicitement injecter l'ensemble des variables obligatoires consommées par le sous-processus cible.",
    "badDesc": "Call Activity n'injectant pas une variable attendue par le sous-processus.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Sous-processus requiert codePostal mais la Call Activity ne le transmet pas -->\n<bpmn:callActivity id=\"Call_1\" calledElement=\"sub-eligibilite\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-eligibilite\" propagateAllParentVariables=\"false\" />\n    <zeebe:ioMapping>\n      <zeebe:input source=\"= nomClient\" target=\"nomClient\" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "goodDesc": "Toutes les variables obligatoires du sous-processus sont mappées.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Mapping complet des entrées requises -->\n<bpmn:callActivity id=\"Call_1\" calledElement=\"sub-eligibilite\">\n  <bpmn:extensionElements>\n    <zeebe:calledElement processId=\"sub-eligibilite\" propagateAllParentVariables=\"false\" />\n    <zeebe:ioMapping>\n      <zeebe:input source=\"= nomClient\" target=\"nomClient\" />\n      <zeebe:input source=\"= codePostal\" target=\"codePostal\" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>",
    "impact": "🚨 Incident d'exécution critique Zeebe (Variable not found) lors du déroulement du sous-processus.",
    "autoFixable": false
  },
  "call-activity-source-undefined": {
    "standard": "Intégrité des Données Camunda 8",
    "badge": "Résolution Source",
    "explanation": "L'expression source d'un mapping d'entrée (<zeebe:input source=\"...\" target=\"...\" />) doit référencer des variables existantes et produites en amont dans le processus parent.",
    "badDesc": "Source de mapping d'entrée référençant une variable inexistante dans le processus parent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : variable_inexistante n'est jamais produite -->\n<zeebe:input source=\"= variable_inexistante\" target=\"monParam\" />",
    "goodDesc": "La source référence une variable initialisée ou produite par une tâche amont.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : variable existante -->\n<zeebe:input source=\"= clientId\" target=\"monParam\" />",
    "impact": "🚨 Évaluation de l'expression FEEL à null ou incident d'exécution à l'instanciation.",
    "autoFixable": false
  },
  "call-activity-contract-output": {
    "standard": "Bouygues Telecom Data Contracts & Zeebe 8.x",
    "badge": "Contrat de Sortie",
    "explanation": "L'expression source d'un mapping de sortie (<zeebe:output source=\"...\" target=\"...\" />) doit référencer une variable réellement produite dans le sous-processus appelé.",
    "badDesc": "Mapping de sortie attendant une variable qui n'est jamais générée par le sous-processus.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : scoreInconnu n'existe pas dans le sous-processus -->\n<zeebe:output source=\"= scoreInconnu\" target=\"score\" />",
    "goodDesc": "La variable retournée est bien produite par le sous-processus.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : variable produite par le sous-processus -->\n<zeebe:output source=\"= scoreEligibilite\" target=\"score\" />",
    "impact": "🟡 Valeur de retour nulle dans le processus parent pouvant corrompre la suite du flux.",
    "autoFixable": false
  },
  "activity-only-callactivity": {
    "standard": "Bouygues Telecom Architecture Modulaire PMG",
    "badge": "Architecture Processus",
    "explanation": "Dans le cadre de l'architecture modulaire Bouygues Telecom, les processus de haut niveau d'orchestration doivent privilégier les Call Activities pour déléguer les étapes techniques, évitant les processus monolithiques géants.",
    "badDesc": "Processus d'orchestration contenant un mélange massif de scriptTask et userTask locales non modulaires.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Monolithe sans découpage en sous-modules réutilisables -->",
    "goodDesc": "Découpage en modules fonctionnels autonomes appelés via Call Activity.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Découpage modulaire par domaine -->\n<bpmn:callActivity id=\"Call_Controle\" calledElement=\"sub-controle-eligibilite\" />\n<bpmn:callActivity id=\"Call_Contrat\" calledElement=\"sub-generation-contrat\" />",
    "impact": "🟡 Monolithe difficile à maintenir, tester et réutiliser.",
    "autoFixable": false
  },
  "dead-end-node": {
    "standard": "OMG BPMN 2.0 §8.3 & Théorie des Graphes",
    "badge": "Impasse Graphique",
    "explanation": "Tout nœud intermédiaire (qui n'est pas un événement de fin) doit posséder au moins un flux sortant pour permettre au jeton de continuer son cheminement.",
    "badDesc": "Tâche ou passerelle sans aucun flux sortant (impasse).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche en impasse sans flux sortant -->\n<bpmn:userTask id=\"Task_impasse\" name=\"Consulter le dossier\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <!-- Aucun outgoing -->\n</bpmn:userTask>",
    "goodDesc": "La tâche est reliée à l'étape suivante ou à un événement de fin.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Tâche reliée au flux aval -->\n<bpmn:userTask id=\"Task_valide\" name=\"Consulter le dossier\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <bpmn:outgoing>Flow_2</bpmn:outgoing>\n</bpmn:userTask>",
    "impact": "🚨 Jeton d'exécution bloqué définitivement dans la tâche.",
    "autoFixable": false
  },
  "no-path-to-end": {
    "standard": "OMG BPMN 2.0 §8.3 & Intégrité du Flux",
    "badge": "Terminaison Garanties",
    "explanation": "Il doit exister un chemin continu depuis chaque élément du processus menant à au moins un événement de fin (bpmn:endEvent).",
    "badDesc": "Branche formant une boucle fermée sans aucune porte de sortie vers un endEvent.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Boucle sans chemin de sortie vers la fin -->\n<bpmn:serviceTask id=\"Task_A\">\n  <bpmn:outgoing>Flow_to_B</bpmn:outgoing>\n</bpmn:serviceTask>\n<bpmn:serviceTask id=\"Task_B\">\n  <bpmn:outgoing>Flow_to_A</bpmn:outgoing>\n</bpmn:serviceTask>",
    "goodDesc": "Présence d'une condition de sortie menant à un événement de fin.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Passerelle avec branche de sortie vers EndEvent -->\n<bpmn:exclusiveGateway id=\"Gateway_exit\" default=\"Flow_loop\">\n  <bpmn:outgoing>Flow_to_end</bpmn:outgoing>\n  <bpmn:outgoing>Flow_loop</bpmn:outgoing>\n</bpmn:exclusiveGateway>\n<bpmn:sequenceFlow id=\"Flow_to_end\" sourceRef=\"Gateway_exit\" targetRef=\"End_1\" />",
    "impact": "🚨 Blocage perpétuel de l'instance dans le moteur.",
    "autoFixable": false
  },
  "gateway-branches": {
    "standard": "OMG BPMN 2.0 §10.5",
    "badge": "Passerelle Utile",
    "explanation": "Une passerelle (Gateway) a pour rôle de diverger (Split : >= 2 flux sortants) ou de converger (Join : >= 2 flux entrants). Une passerelle avec 1 seul flux entrant et 1 seul flux sortant est inutile.",
    "badDesc": "Passerelle triviale avec 1 entrée et 1 sortie.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Passerelle inutile 1-vers-1 -->\n<bpmn:exclusiveGateway id=\"Gateway_inutile\">\n  <bpmn:incoming>Flow_1</bpmn:incoming>\n  <bpmn:outgoing>Flow_2</bpmn:outgoing>\n</bpmn:exclusiveGateway>",
    "goodDesc": "Remplacer la passerelle inutile par un flux direct, ou ajouter les branches nécessaires.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Flux direct sans passerelle superflue -->\n<bpmn:sequenceFlow id=\"Flow_direct\" sourceRef=\"Task_1\" targetRef=\"Task_2\" />",
    "impact": "🟡 Complexité visuelle inutile et surcoût de processing.",
    "autoFixable": false
  },
  "parallel-gateway-condition": {
    "standard": "OMG BPMN 2.0 §10.5.3",
    "badge": "Passerelle Parallèle (AND)",
    "explanation": "Une passerelle parallèle (AND / parallelGateway) active simultanément TOUTES ses branches sortantes. Par définition normative, AUCUNE condition (conditionExpression) ne doit figurer sur ses flux sortants.",
    "badDesc": "Flux sortant d'une passerelle parallèle contenant une expression de condition.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Condition sur branche parallèle AND -->\n<bpmn:parallelGateway id=\"Fork_AND\" />\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"Fork_AND\" targetRef=\"Task_1\">\n  <bpmn:conditionExpression xsi:type=\"bpmn:tFormalExpression\">= montant > 100</bpmn:conditionExpression>\n</bpmn:sequenceFlow>",
    "goodDesc": "Branches de passerelle parallèle sans expression conditionnelle.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Branches parallèles sans condition -->\n<bpmn:parallelGateway id=\"Fork_AND\" />\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"Fork_AND\" targetRef=\"Task_1\" />\n<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"Fork_AND\" targetRef=\"Task_2\" />",
    "impact": "🚨 Comportement indéterminé ou rejet au déploiement Camunda.",
    "autoFixable": false
  },
  "parallel-gateway-default": {
    "standard": "OMG BPMN 2.0 §10.5.3",
    "badge": "Passerelle Parallèle (AND)",
    "explanation": "Une passerelle parallèle active toutes ses branches sans arbitrage ; elle ne doit donc JAMAIS comporter d'attribut default (branche par défaut).",
    "badDesc": "Balise parallelGateway avec attribut default=\"...\".",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : default sur une passerelle AND -->\n<bpmn:parallelGateway id=\"Fork_AND\" default=\"Flow_1\" />",
    "goodDesc": "Passerelle parallèle sans attribut default.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : parallelGateway sans default -->\n<bpmn:parallelGateway id=\"Fork_AND\" />",
    "impact": "🚨 Violation de la norme OMG BPMN 2.0.",
    "autoFixable": false
  },
  "exclusive-gateway-default": {
    "standard": "OMG BPMN 2.0 §10.5.1 & Bouygues Telecom Std",
    "badge": "Robustesse Décision (XOR)",
    "explanation": "Une passerelle exclusive (XOR) divergente doit OBLIGATOIREMENT définir une branche par défaut (attribut default). Si aucune des conditions FEEL n'est satisfaite à l'exécution, le moteur emprunte la branche par défaut au lieu de lever un Incident critique.",
    "badDesc": "Passerelle exclusive sans attribut default.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Pas de branche par défaut sur le XOR -->\n<bpmn:exclusiveGateway id=\"Gateway_Decision\" name=\"Client éligible ?\">\n  <bpmn:outgoing>Flow_Oui</bpmn:outgoing>\n  <bpmn:outgoing>Flow_Non</bpmn:outgoing>\n</bpmn:exclusiveGateway>",
    "goodDesc": "Attribut default configuré vers la branche de repli/rejet.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Branche par défaut explicite -->\n<bpmn:exclusiveGateway id=\"Gateway_Decision\" name=\"Client éligible ?\" default=\"Flow_Non\">\n  <bpmn:outgoing>Flow_Oui</bpmn:outgoing>\n  <bpmn:outgoing>Flow_Non</bpmn:outgoing>\n</bpmn:exclusiveGateway>\n<bpmn:sequenceFlow id=\"Flow_Oui\" sourceRef=\"Gateway_Decision\" targetRef=\"Task_OK\">\n  <bpmn:conditionExpression xsi:type=\"bpmn:tFormalExpression\">= estEligible = true</bpmn:conditionExpression>\n</bpmn:sequenceFlow>\n<bpmn:sequenceFlow id=\"Flow_Non\" sourceRef=\"Gateway_Decision\" targetRef=\"Task_Rejet\" />",
    "impact": "🚨 Incident bloquant d'exécution Zeebe si aucune condition n'est remplie (Unhandled condition).",
    "autoFixable": false
  },
  "exclusive-gateway-conditions": {
    "standard": "OMG BPMN 2.0 §10.5.1",
    "badge": "Conditions Décision (XOR)",
    "explanation": "Sur une passerelle exclusive (XOR), chaque branche sortante qui n'est PAS la branche par défaut doit obligatoirement posséder une expression de condition (conditionExpression).",
    "badDesc": "Branche non-par-défaut sans expression conditionnelle.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Branche sans condition et non par défaut -->\n<bpmn:sequenceFlow id=\"Flow_Oui\" sourceRef=\"Gateway_Decision\" targetRef=\"Task_OK\" />",
    "goodDesc": "Expression FEEL valide sur chaque branche conditionnelle.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Condition FEEL explicite -->\n<bpmn:sequenceFlow id=\"Flow_Oui\" sourceRef=\"Gateway_Decision\" targetRef=\"Task_OK\">\n  <bpmn:conditionExpression xsi:type=\"bpmn:tFormalExpression\">= statut = \"VALIDE\"</bpmn:conditionExpression>\n</bpmn:sequenceFlow>",
    "impact": "🚨 Blocage du moteur lors du routage.",
    "autoFixable": false
  },
  "loop-max-counter-timer": {
    "standard": "Bouygues Telecom Anti-Crash Pattern v4.2",
    "badge": "Stabilité Cluster",
    "explanation": "Toute boucle de retraitement ou de retry métier dans le diagramme BPMN doit OBLIGATOIREMENT intégrer un compteur maximal d'itérations (ex: maxBoucle >= 3) ET une temporisation minimale (Timer intermédiaire >= 1 minute). Les boucles rapides sans délai provoquent des tempêtes de jobs et saturent le cluster.",
    "badDesc": "Boucle de retour directe sans timer ni borne de comptage maximale.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Boucle infinie directe sans timer ni garde-fou -->\n<bpmn:sequenceFlow id=\"Flow_retry\" sourceRef=\"Gateway_echec\" targetRef=\"Task_appel_api\" />",
    "goodDesc": "Boucle avec incrément de compteur, test de dépassement et timer d'attente.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Garde-fou de boucle + Temporisation -->\n<bpmn:sequenceFlow id=\"Flow_retry\" sourceRef=\"Gateway_echec\" targetRef=\"Timer_attente_retry\">\n  <bpmn:conditionExpression xsi:type=\"bpmn:tFormalExpression\">= nbTentatives &lt; 3</bpmn:conditionExpression>\n</bpmn:sequenceFlow>\n<bpmn:intermediateCatchEvent id=\"Timer_attente_retry\" name=\"Attente 5 min\">\n  <bpmn:timerEventDefinition>\n    <bpmn:timeDuration>PT5M</bpmn:timeDuration>\n  </bpmn:timerEventDefinition>\n</bpmn:intermediateCatchEvent>",
    "impact": "🚨 Tempête d'appels, surcharge CPU/Zeebe et incident de production majeur.",
    "autoFixable": false
  },
  "event-based-gateway-targets": {
    "standard": "OMG BPMN 2.0 §10.5.5",
    "badge": "Passerelle Événementielle",
    "explanation": "Une passerelle basée sur les événements (eventBasedGateway) ne peut cibler QUE des événements intermédiaires de type Catch (Timer, Message, Signal) ou des Receive Tasks. Elle ne doit jamais cibler directement des Service Tasks ou des passerelles.",
    "badDesc": "eventBasedGateway ciblant une ServiceTask ou une UserTask.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : eventBasedGateway ciblant une ServiceTask -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"EventGateway_1\" targetRef=\"ServiceTask_1\" />",
    "goodDesc": "Cible des événements intermédiaires ou receiveTask.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Cible des événements Message ou Timer -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"EventGateway_1\" targetRef=\"IntermediateMsg_Recu\" />\n<bpmn:sequenceFlow id=\"Flow_2\" sourceRef=\"EventGateway_1\" targetRef=\"IntermediateTimer_Timeout\" />",
    "impact": "🚨 Rejet immédiat du diagramme par le moteur Zeebe.",
    "autoFixable": false
  },
  "gateway-mixed": {
    "standard": "OMG BPMN 2.0 & Bruce Silver Best Practices",
    "badge": "Lisibilité Décision",
    "explanation": "Il est fortement conseillé de séparer les rôles de convergence (Join : multiples entrées, 1 sortie) et de divergence (Split : 1 entrée, multiples sorties) au lieu d'utiliser une passerelle mixte (N entrées, M sorties).",
    "badDesc": "Passerelle avec 3 flux entrants et 3 flux sortants simultanés.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Passerelle mixte N-vers-M -->\n<bpmn:exclusiveGateway id=\"Gateway_mixte\">\n  <bpmn:incoming>In_1</bpmn:incoming><bpmn:incoming>In_2</bpmn:incoming>\n  <bpmn:outgoing>Out_1</bpmn:outgoing><bpmn:outgoing>Out_2</bpmn:outgoing>\n</bpmn:exclusiveGateway>",
    "goodDesc": "Deux passerelles distinctes : une passerelle de join suivie d'une passerelle de split.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Join puis Split séparés -->\n<bpmn:exclusiveGateway id=\"Gateway_join\">...</bpmn:exclusiveGateway>\n<bpmn:sequenceFlow id=\"Flow_link\" sourceRef=\"Gateway_join\" targetRef=\"Gateway_split\" />\n<bpmn:exclusiveGateway id=\"Gateway_split\">...</bpmn:exclusiveGateway>",
    "impact": "🔵 Diagramme difficile à lire et sémantique ambiguë.",
    "autoFixable": false
  },
  "conditional-flow-source": {
    "standard": "OMG BPMN 2.0 §10.5 & Style BPMN",
    "badge": "Décision Explicite",
    "explanation": "Les expressions conditionnelles doivent être portées par des passerelles de décision (XOR/OR) et non directement issues d'une tâche de travail.",
    "badDesc": "Tâche émettant plusieurs flux de séquence avec conditions directement sans passerelle.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche avec flux conditionnels sortants -->\n<bpmn:serviceTask id=\"Task_1\">\n  <bpmn:outgoing>Flow_succes</bpmn:outgoing>\n  <bpmn:outgoing>Flow_echec</bpmn:outgoing>\n</bpmn:serviceTask>",
    "goodDesc": "La tâche sort vers une passerelle exclusive qui arbitre les conditions.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Tâche -> Passerelle XOR -> Branches conditionnelles -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"Task_1\" targetRef=\"Gateway_decision\" />\n<bpmn:exclusiveGateway id=\"Gateway_decision\" name=\"Résultat OK ?\" default=\"Flow_echec\">\n  <bpmn:outgoing>Flow_succes</bpmn:outgoing>\n  <bpmn:outgoing>Flow_echec</bpmn:outgoing>\n</bpmn:exclusiveGateway>",
    "impact": "🟡 Diagramme confus masquant la logique de décision métier.",
    "autoFixable": false
  },
  "gateway-flow-label": {
    "standard": "Conventions de Documentation Bouygues Telecom",
    "badge": "Lisibilité Graphique",
    "explanation": "Chaque branche issue d'une passerelle exclusive de décision doit avoir un libellé textuel explicite (ex: \"Oui\", \"Non\", \"Montant > 1000€\") pour rendre le diagramme compréhensible par les équipes métier.",
    "badDesc": "Branches sortantes d'une passerelle XOR sans nom ni description textuelle.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Flux sortants anonymes -->\n<bpmn:sequenceFlow id=\"Flow_1\" sourceRef=\"Gateway_decision\" targetRef=\"Task_A\" />",
    "goodDesc": "Branches nommées clairement en adéquation avec la question de la passerelle.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Nommage explicite des branches -->\n<bpmn:sequenceFlow id=\"Flow_1\" name=\"Oui (éligible)\" sourceRef=\"Gateway_decision\" targetRef=\"Task_A\" />\n<bpmn:sequenceFlow id=\"Flow_2\" name=\"Non (rejet)\" sourceRef=\"Gateway_decision\" targetRef=\"Task_B\" />",
    "impact": "🟡 Manque de clarté pour l'audit métier et la recette.",
    "autoFixable": false
  },
  "multiple-end-events-labeled": {
    "standard": "Conventions de Modélisation Bouygues Telecom",
    "badge": "États Finaux",
    "explanation": "Lorsqu'un processus possède plusieurs événements de fin, chacun d'eux doit avoir un nom explicite décrivant l'état final métier atteint (ex: \"Commande validée\", \"Dossier rejeté\", \"Demande annulée\").",
    "badDesc": "Multiples événements de fin sans libellé ou avec des noms génériques (\"EndEvent_1\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Fins multiples anonymes -->\n<bpmn:endEvent id=\"End_1\" />\n<bpmn:endEvent id=\"End_2\" />",
    "goodDesc": "Chaque fin caractérise précisément le résultat obtenu.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : États finaux caractérisés -->\n<bpmn:endEvent id=\"End_OK\" name=\"Contrat activé avec succès\" />\n<bpmn:endEvent id=\"End_KO\" name=\"Demande rejetée par scoring\" />",
    "impact": "🟡 Difficulté d'analyse des indicateurs de performance (KPIs) et du reporting.",
    "autoFixable": false
  },
  "process-complexity": {
    "standard": "Bouygues Telecom Governance / KISS Principle",
    "badge": "Gouvernance & Clarté",
    "explanation": "Un diagramme de processus ne doit pas dépasser 35 à 40 nœuds dans un même scope. Au-delà, la complexité cyclomatique devient ingérable et le modèle doit être découpé en sous-processus modulaires (Call Activities).",
    "badDesc": "Processus spaghetti contenant plus de 50 tâches, passerelles et événements entremêlés.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Monolithe géant de 80 éléments -->",
    "goodDesc": "Découpage modulaire : Processus chapeau + Sous-processus d'étape.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Processus d'orchestration concis -->",
    "impact": "🟡 Risque élevé d'erreurs de modélisation, tests difficiles et maintenance complexe.",
    "autoFixable": false
  },
  "process-id-kebab": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Convention ID",
    "explanation": "L'identifiant technique du processus (<bpmn:process id=\"...\">) doit être rédigé en kebab-case strict (minuscules et tirets, ex: process-facturation-client). Cela garantit la compatibilité multi-plateformes et l'uniformité des URLs de déploiement.",
    "badDesc": "ID avec majuscules, espaces, underscores ou caractères accentués (ex: Process_Facturation Client).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : PascalCase ou snake_case -->\n<bpmn:process id=\"Process_FacturationClient\" ... />",
    "goodDesc": "Identifiant en kebab-case propre et descriptif.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : kebab-case strict -->\n<bpmn:process id=\"process-facturation-client\" ... />",
    "impact": "🟠 Problèmes d'interopérabilité d'URLs dans les pipelines CI/CD.",
    "autoFixable": true
  },
  "process-name-capital": {
    "standard": "Charte Éditoriale Bouygues Telecom",
    "badge": "Sémantique Nommage",
    "explanation": "Le nom affiché du processus (attribut name) doit débuter par une lettre majuscule pour assurer une présentation soignée dans Camunda Operate, Tasklist et les dashboards.",
    "badDesc": "Nom commençant par une minuscule (ex: \"gestion des abonnements\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Minuscule initiale -->\n<bpmn:process name=\"gestion des abonnements\" ... />",
    "goodDesc": "Majuscule initiale et libellé soigné.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Majuscule initiale -->\n<bpmn:process name=\"Gestion des abonnements\" ... />",
    "impact": "🟡 Image dégradée dans les interfaces utilisateurs et rapports.",
    "autoFixable": true
  },
  "empty-name": {
    "standard": "OMG BPMN 2.0 & Bonnes Pratiques",
    "badge": "Documentation Éléments",
    "explanation": "Toutes les tâches (Service Task, User Task, Send Task, Call Activity) et événements métier doivent posséder un libellé textuel (attribut name) non vide.",
    "badDesc": "Tâche sans attribut name.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche anonyme -->\n<bpmn:serviceTask id=\"Task_1\" />",
    "goodDesc": "Nom fonctionnel précis.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Nom fonctionnel présent -->\n<bpmn:serviceTask id=\"Task_1\" name=\"Notifier le client par SMS\" />",
    "impact": "🟡 Modèle incompréhensible en supervision dans Operate.",
    "autoFixable": false
  },
  "task-imperative": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Tâche",
    "explanation": "Le libellé d'une tâche doit obligatoirement être formulé avec un Verbe à l'infinitif suivi d'un Complément d'objet direct (ex: \"Valider le panier\", \"Envoyer la facture\", \"Calculer l'éligibilité\").",
    "badDesc": "Nom sous forme de nom commun isolé ou participe (ex: \"Validation panier\", \"Facture envoyée\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Nommage non infinitif -->\n<bpmn:userTask name=\"Validation du dossier\" />",
    "goodDesc": "Verbe d'action à l'infinitif + complément.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Verbe à l'infinitif + Complément -->\n<bpmn:userTask name=\"Valider le dossier client\" />",
    "impact": "🟡 Confusion entre tâche d'action et événement d'état.",
    "autoFixable": false
  },
  "subprocess-noun-phrase": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Sous-processus",
    "explanation": "Un sous-processus ou une Call Activity doit être nommé sous la forme d'un groupe nominal décrivant l'activité globale (ex: \"Gestion des réclamations\", \"Traitement de la commande\").",
    "badDesc": "Sous-processus nommé avec un verbe direct d'action simple.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Verbe simple pour un sous-processus complet -->\n<bpmn:subProcess name=\"Traiter\" />",
    "goodDesc": "Phrase nominale descriptive.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Phrase nominale -->\n<bpmn:subProcess name=\"Traitement des litiges de facturation\" />",
    "impact": "🟡 Lisibilité globale de l'architecture.",
    "autoFixable": false
  },
  "gateway-question": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Décision",
    "explanation": "Les passerelles exclusives (XOR) et inclusives (OR) doivent obligatoirement être formulées sous forme d'une Question se terminant par un point d'interrogation « ? » (ex: \"Client éligible ?\", \"Montant supérieur à 500 € ?\").",
    "badDesc": "Passerelle nommée sans point d'interrogation ou avec un verbe d'action.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Nom d'action sans point d'interrogation -->\n<bpmn:exclusiveGateway name=\"Vérifier éligibilité\" />",
    "goodDesc": "Question fermée ou explicite avec « ? ».",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Question avec point d'interrogation -->\n<bpmn:exclusiveGateway name=\"Client éligible ?\" />",
    "impact": "🟠 Ambiguïté sur les critères de décision.",
    "autoFixable": true
  },
  "gateway-parallel-no-question": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Passerelle AND",
    "explanation": "Une passerelle parallèle (AND) exécute simultanément toutes les branches sans poser de question. Elle ne doit donc JAMAIS comporter de point d'interrogation dans son libellé.",
    "badDesc": "Passerelle AND avec un point d'interrogation (ex: \"Exécuter en parallèle ?\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : '?' sur une passerelle parallèle -->\n<bpmn:parallelGateway name=\"Traiter les deux flux ?\" />",
    "goodDesc": "Nom descriptif d'action simultanée sans « ? ».",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Libellé informatif sans point d'interrogation -->\n<bpmn:parallelGateway name=\"Traitement parallèle des pièces\" />",
    "impact": "🟡 Confusion sémantique entre aiguillage décisionnel et parallélisme.",
    "autoFixable": true
  },
  "event-start-past-participle": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Début",
    "explanation": "Un événement de début marque la survenance d'un fait déclencheur. Il doit être nommé sous la forme \"Objet + Participe passé\" (ex: \"Dossier reçu\", \"Demande soumise\", \"Abonnement résilié\").",
    "badDesc": "Événement de début nommé avec un verbe à l'infinitif (ex: \"Recevoir la commande\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Verbe infinitif sur un début -->\n<bpmn:startEvent name=\"Recevoir la commande\" />",
    "goodDesc": "Fait accompli au participe passé.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Fait déclencheur au participe passé -->\n<bpmn:startEvent name=\"Commande reçue\" />",
    "impact": "🟡 Confusion visuelle avec une tâche.",
    "autoFixable": false
  },
  "event-end-state": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Fin",
    "explanation": "Un événement de fin représente l'état métier final atteint par le processus. Il doit être formulé comme un état accompli (ex: \"Commande expédiée\", \"Dossier refusé\").",
    "badDesc": "Événement de fin nommé comme une action (ex: \"Expédier la commande\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Action sur un événement de fin -->\n<bpmn:endEvent name=\"Expédier la commande\" />",
    "goodDesc": "État métier final.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : État final accompli -->\n<bpmn:endEvent name=\"Commande expédiée\" />",
    "impact": "🟡 Lisibilité du cycle de vie des instances.",
    "autoFixable": false
  },
  "event-catch-waiting": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Attente",
    "explanation": "Un événement intermédiaire d'attente (Catch) doit décrire l'élément ou la durée attendue (ex: \"Attente confirmation client\", \"Délai 48h écoulé\").",
    "badDesc": "Événement intermédiaire avec un libellé vague ou vide.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Nom vague -->\n<bpmn:intermediateCatchEvent name=\"Event_1\" />",
    "goodDesc": "Description précise de l'attente.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Description claire -->\n<bpmn:intermediateCatchEvent name=\"Paiement bancaire reçu\" />",
    "impact": "🟡 Compréhension du temps d'attente dans Operate.",
    "autoFixable": false
  },
  "event-boundary-exception": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Sémantique Exception",
    "explanation": "Un événement de bordure (Boundary) doit nommer explicitement la nature de l'erreur ou de l'incident intercepté (ex: \"Erreur 500 API\", \"Timeout 15 min\").",
    "badDesc": "Boundary anonyme ou générique.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Boundary anonyme -->\n<bpmn:boundaryEvent name=\"\" />",
    "goodDesc": "Nom explicite de l'exception.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Incident explicite -->\n<bpmn:boundaryEvent name=\"Échec authentification client\" />",
    "impact": "🟡 Traçabilité des exceptions dans les logs.",
    "autoFixable": false
  },
  "message-pascal-suffix": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Convention Message",
    "explanation": "Les noms de messages BPMN doivent être écrits en PascalCase et obligatoirement se terminer par le suffixe \"Message\" (ex: DemandeCreationCompteMessage).",
    "badDesc": "Nom de message en minuscules sans suffixe (ex: \"nouveau-compte\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Pas de suffixe Message ni de PascalCase -->\n<bpmn:message id=\"Msg_1\" name=\"nouveau_client\" />",
    "goodDesc": "PascalCase + Suffixe \"Message\".",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Format normalisé -->\n<bpmn:message id=\"Msg_1\" name=\"NouveauClientMessage\" />",
    "impact": "🟠 Incohérences de corrélation de messages inter-systèmes.",
    "autoFixable": false
  },
  "signal-pascal-suffix": {
    "standard": "Bouygues Telecom Naming Convention v4.2",
    "badge": "Convention Signal",
    "explanation": "Les signaux BPMN doivent être écrits en PascalCase et se terminer par le suffixe \"Signal\" (ex: CoupureReseauSignal).",
    "badDesc": "Nom de signal non normalisé (ex: \"incident_fibre\").",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Signal non formaté -->\n<bpmn:signal id=\"Sig_1\" name=\"incident_fibre\" />",
    "goodDesc": "PascalCase + Suffixe \"Signal\".",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Format normalisé -->\n<bpmn:signal id=\"Sig_1\" name=\"IncidentFibreSignal\" />",
    "impact": "🟠 Risque de collision d'événements diffusés.",
    "autoFixable": false
  },
  "variable-naming": {
    "standard": "Bouygues Telecom Variable Governance",
    "badge": "Nommage Variables",
    "explanation": "Toutes les variables de processus doivent être écrites en camelCase strict (ex: identifiantClient, montantTotalTtc, codePostal). Les underscores, tirets et majuscules initiales sont interdits.",
    "badDesc": "Variables en snake_case ou kebab-case (ex: id_client, montant-total).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Variable non camelCase -->\n<zeebe:input source=\"= ID_CLIENT\" target=\"ID_CLIENT\" />",
    "goodDesc": "Variable en camelCase propre.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : camelCase strict -->\n<zeebe:input source=\"= idClient\" target=\"idClient\" />",
    "impact": "🟠 Problèmes d'interopérabilité FEEL et mapping DMN.",
    "autoFixable": false
  },
  "variable-reserved": {
    "standard": "Camunda FEEL ISO 19510 Spec",
    "badge": "Mots Réservés FEEL",
    "explanation": "Les noms de variables ne doivent pas utiliser les mots réservés du langage d'expression FEEL (ex: true, false, null, and, or, not, if, then, else, for, return, date, time).",
    "badDesc": "Variable nommée avec un mot réservé FEEL (ex: date, return, if).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Nom réservé FEEL -->\n<zeebe:output source=\"= resultat\" target=\"date\" />",
    "goodDesc": "Nom de variable contextuel non réservé.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Variable contextualisée -->\n<zeebe:output source=\"= resultat\" target=\"dateSignatureContrat\" />",
    "impact": "🚨 Erreur de syntaxe d'évaluation FEEL et plantage des conditions.",
    "autoFixable": false
  },
  "variable-collection-plural": {
    "standard": "Bouygues Telecom Best Practice",
    "badge": "Convention Listes",
    "explanation": "Les variables contenant des listes ou collections d'objets doivent porter un nom au pluriel ou se terminer par List ou Items (ex: contratsList, adresses, equipements).",
    "badDesc": "Variable de type liste au singulier (ex: contrat).",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Liste au singulier -->\n<zeebe:output source=\"= listeContrats\" target=\"contrat\" />",
    "goodDesc": "Nom de collection explicite.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Pluriel explicite -->\n<zeebe:output source=\"= listeContrats\" target=\"contratsList\" />",
    "impact": "🟡 Confusion de typage lors de la modélisation.",
    "autoFixable": false
  },
  "process-name": {
    "standard": "Documentation Bouygues Telecom",
    "badge": "Documentation",
    "explanation": "Le processus doit obligatoirement comporter un libellé métier clair via l'attribut name sur la balise <bpmn:process>.",
    "badDesc": "Attribut name manquant sur le processus.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Processus sans nom lisible -->\n<bpmn:process id=\"process-commande-fibre\" isExecutable=\"true\">",
    "goodDesc": "Nom métier documenté.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Nom métier complet -->\n<bpmn:process id=\"process-commande-fibre\" name=\"Traitement de la commande Fibre B2C\" isExecutable=\"true\">",
    "impact": "🟡 Affichage technique brut dans les consoles de supervision.",
    "autoFixable": false
  },
  "process-executable": {
    "standard": "OMG BPMN 2.0 §10.1 & Camunda Engine",
    "badge": "Exécutabilité",
    "explanation": "Pour être déployé et instancié par le moteur d'orchestration Camunda / Zeebe, le processus doit posséder l'attribut isExecutable=\"true\".",
    "badDesc": "isExecutable=\"false\" ou attribut omis.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Processus non marqué exécutable -->\n<bpmn:process id=\"process-1\" isExecutable=\"false\">",
    "goodDesc": "isExecutable=\"true\" explicite.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Processus exécutable -->\n<bpmn:process id=\"process-1\" isExecutable=\"true\">",
    "impact": "🚨 Le moteur refuse d'exécuter le processus après déploiement.",
    "autoFixable": true
  },
  "service-implementation": {
    "standard": "Camunda 8 Zeebe Specification",
    "badge": "Service Task",
    "explanation": "Une tâche de service (bpmn:serviceTask ou bpmn:sendTask) doit comporter une définition d'exécution valide : balise <zeebe:taskDefinition type=\"...\" /> pour un Job Worker Zeebe ou un Connecteur.",
    "badDesc": "ServiceTask vide sans type de Job Worker configuré.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Service Task sans worker type -->\n<bpmn:serviceTask id=\"Task_appel_api\" name=\"Appeler API CRM\" />",
    "goodDesc": "Type de tâche Job Worker spécifié.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Type de worker défini -->\n<bpmn:serviceTask id=\"Task_appel_api\" name=\"Appeler API CRM\">\n  <bpmn:extensionElements>\n    <zeebe:taskDefinition type=\"crm-client-worker\" retries=\"3\" />\n  </bpmn:extensionElements>\n</bpmn:serviceTask>",
    "impact": "🚨 Incident immédiat au runtime : Aucun worker ne peut dépiler la tâche.",
    "autoFixable": false
  },
  "business-rule-implementation": {
    "standard": "Camunda 8 DMN & Worker Spec",
    "badge": "Business Rule Task",
    "explanation": "Une tâche de règle métier (bpmn:businessRuleTask) doit comporter soit une référence de table de décision DMN (<zeebe:calledDecision decisionId=\"...\" />), soit une définition de Job Worker (<zeebe:taskDefinition type=\"...\" />).",
    "badDesc": "BusinessRuleTask sans DMN appelée ni Worker.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche de règle métier sans DMN -->\n<bpmn:businessRuleTask id=\"Task_decision\" name=\"Calculer tarif\" />",
    "goodDesc": "Appel DMN configuré avec gestion des variables de résultat.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Appel DMN Zeebe conforme -->\n<bpmn:businessRuleTask id=\"Task_decision\" name=\"Calculer tarif\">\n  <bpmn:extensionElements>\n    <zeebe:calledDecision decisionId=\"decision-calcul-tarif\" resultVariable=\"tarifCalcule\" />\n  </bpmn:extensionElements>\n</bpmn:businessRuleTask>",
    "impact": "🚨 Incident bloquant Zeebe : règle métier non exécutable.",
    "autoFixable": false
  },
  "user-assignment": {
    "standard": "Camunda Tasklist & Gouvernance",
    "badge": "User Task",
    "explanation": "Une tâche utilisateur (bpmn:userTask) doit comporter des règles d'affectation (Candidate Groups ou Assignee). Une tâche sans affectation ne sera visible dans la bannette d'aucun opérateur.",
    "badDesc": "UserTask sans aucun groupe candidat ni affectation.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : UserTask orpheline sans destinataire -->\n<bpmn:userTask id=\"Task_validation\" name=\"Valider le justificatif\" />",
    "goodDesc": "Candidate Groups renseignés pour le routage d'équipe.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Affectation par groupe de compétences -->\n<bpmn:userTask id=\"Task_validation\" name=\"Valider le justificatif\">\n  <bpmn:extensionElements>\n    <zeebe:assignmentDefinition candidateGroups=\"ROLE_GESTIONNAIRE_N1\" />\n  </bpmn:extensionElements>\n</bpmn:userTask>",
    "impact": "🟠 Tâche bloquée en attente sans destinataire dans Tasklist.",
    "autoFixable": false
  },
  "user-task-candidate-groups-only": {
    "standard": "Bouygues Telecom Governance Standard v4.2",
    "badge": "Règle Gouvernance",
    "explanation": "Pour garantir la continuité de service en cas d'absence d'un collaborateur, les User Tasks doivent obligatoirement utiliser des GROUPES CANDIDATS (candidateGroups). L'assignation nominative directe (assignee=\"nom.prenom\") est strictement interdite.",
    "badDesc": "UserTask avec un collaborateur nominatif en dur.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Affectation nominative directe en dur -->\n<bpmn:userTask id=\"Task_approbation\" name=\"Approuver le devis\">\n  <bpmn:extensionElements>\n    <zeebe:assignmentDefinition assignee=\"jean.dupont@bouyguestelecom.fr\" />\n  </bpmn:extensionElements>\n</bpmn:userTask>",
    "goodDesc": "Affectation via groupe de rôles (Candidate Groups).",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Affectation collective par rôle -->\n<bpmn:userTask id=\"Task_approbation\" name=\"Approuver le devis\">\n  <bpmn:extensionElements>\n    <zeebe:assignmentDefinition candidateGroups=\"EQUIPE_VALIDATION_DEVIS\" />\n  </bpmn:extensionElements>\n</bpmn:userTask>",
    "impact": "🚨 Blocage des dossiers en production en cas de congés ou départ d'un collaborateur.",
    "autoFixable": false
  },
  "user-task-camunda-implementation": {
    "standard": "Camunda 8.5+ Architecture Standard",
    "badge": "Type Implémentation",
    "explanation": "Sur Camunda 8, les tâches humaines doivent utiliser le type natif \"Camunda User Task\" (géré par Tasklist Zeebe) plutôt qu'un Job Worker technique custom.",
    "badDesc": "UserTask configurée comme Job Worker externe.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : User Task exécutée via Job Worker externe -->\n<bpmn:userTask id=\"Task_1\">\n  <bpmn:extensionElements>\n    <zeebe:taskDefinition type=\"human-worker\" />\n  </bpmn:extensionElements>\n</bpmn:userTask>",
    "goodDesc": "User Task native Camunda.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : User Task standard Camunda 8 -->\n<bpmn:userTask id=\"Task_1\" name=\"Contrôler les pièces justificatives\">\n  <bpmn:extensionElements>\n    <zeebe:assignmentDefinition candidateGroups=\"EQUIPE_CONFORMITE\" />\n  </bpmn:extensionElements>\n</bpmn:userTask>",
    "impact": "🟠 Incompatibilité avec les fonctionnalités avancées de Camunda Tasklist.",
    "autoFixable": true
  },
  "timer-definition": {
    "standard": "OMG BPMN 2.0 §10.4.4 & ISO 8601",
    "badge": "Définition Minuteur",
    "explanation": "Un événement Timer doit obligatoirement comporter une expression valide de durée (timeDuration, ex: PT1H), de date fixe (timeDate, ex: 2026-12-31T23:59:59Z) ou de cycle (timeCycle, ex: R/PT15M).",
    "badDesc": "bpmn:timerEventDefinition vide sans expression temporelle.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Timer sans définition -->\n<bpmn:intermediateCatchEvent id=\"Timer_1\">\n  <bpmn:timerEventDefinition />\n</bpmn:intermediateCatchEvent>",
    "goodDesc": "Durée ISO 8601 conforme ou expression FEEL valide.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Durée ISO 8601 déclarée -->\n<bpmn:intermediateCatchEvent id=\"Timer_1\" name=\"Attente 2 heures\">\n  <bpmn:timerEventDefinition>\n    <bpmn:timeDuration>PT2H</bpmn:timeDuration>\n  </bpmn:timerEventDefinition>\n</bpmn:intermediateCatchEvent>",
    "impact": "🚨 Échec d'évaluation temporelle et incident moteur Zeebe.",
    "autoFixable": false
  },
  "error-definition": {
    "standard": "OMG BPMN 2.0 §10.4.6",
    "badge": "Gestion Erreurs",
    "explanation": "Un événement d'erreur (bpmn:errorEventDefinition) doit référencer une erreur déclarée (errorRef) ou un code d'erreur métier (errorCode) pour permettre un rattrapage ciblé.",
    "badDesc": "Error event definition sans code d'erreur.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Erreur anonyme non typée -->\n<bpmn:endEvent id=\"End_Error\">\n  <bpmn:errorEventDefinition />\n</bpmn:endEvent>",
    "goodDesc": "Erreur typée avec code précis réutilisable.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Code d'erreur explicite -->\n<bpmn:error id=\"Err_Stock\" name=\"STOCK_EPUISE\" errorCode=\"ERR_STOCK_001\" />\n...\n<bpmn:endEvent id=\"End_Error\" name=\"Erreur stock épuisé\">\n  <bpmn:errorEventDefinition errorRef=\"Err_Stock\" />\n</bpmn:endEvent>",
    "impact": "🟠 Impossibilité de capturer sélectivement l'erreur en amont.",
    "autoFixable": false
  },
  "escalation-definition": {
    "standard": "OMG BPMN 2.0 §10.4.7",
    "badge": "Escalade",
    "explanation": "Un événement d'escalade doit définir une référence d'escalade (escalationRef) ou un code d'escalade.",
    "badDesc": "EscalationEventDefinition sans code d'escalade.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Escalade non typée -->\n<bpmn:intermediateThrowEvent id=\"Esc_1\">\n  <bpmn:escalationEventDefinition />\n</bpmn:intermediateThrowEvent>",
    "goodDesc": "Référence d'escalade configurée.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Code d'escalade défini -->\n<bpmn:escalation id=\"Esc_Delai\" name=\"DELAI_DEPASSE\" escalationCode=\"ESC_TIMEOUT\" />\n...\n<bpmn:intermediateThrowEvent id=\"Esc_1\" name=\"Escalade délai\">\n  <bpmn:escalationEventDefinition escalationRef=\"Esc_Delai\" />\n</bpmn:intermediateThrowEvent>",
    "impact": "🟠 Escalade ignorée par les récepteurs de bordure.",
    "autoFixable": false
  },
  "message-definition": {
    "standard": "OMG BPMN 2.0 §10.4.8 & Zeebe Correlation",
    "badge": "Corrélation Message",
    "explanation": "Un événement Message ou une Receive Task doit obligatoirement référencer une définition de message (messageRef) et comporter une clé de corrélation (correlationKey) pour être dépilé.",
    "badDesc": "Receive Task sans messageRef ni clé de corrélation.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Message sans clé de corrélation -->\n<bpmn:receiveTask id=\"Receive_Paiement\" />",
    "goodDesc": "MessageRef avec subscription Zeebe et correlationKey FEEL.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Clé de corrélation déclarée -->\n<bpmn:message id=\"Msg_Paiement\" name=\"PaiementConfirmeMessage\">\n  <bpmn:extensionElements>\n    <zeebe:subscription correlationKey=\"= numCommande\" />\n  </bpmn:extensionElements>\n</bpmn:message>\n<bpmn:receiveTask id=\"Receive_Paiement\" messageRef=\"Msg_Paiement\" />",
    "impact": "🚨 Incident critique Zeebe : Corrélation de message impossible.",
    "autoFixable": false
  },
  "signal-definition": {
    "standard": "OMG BPMN 2.0 §10.4.9",
    "badge": "Signal Broadcast",
    "explanation": "Un événement Signal doit référencer un signalRef valide présent dans la section <definitions>.",
    "badDesc": "Signal event sans balise signalRef.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Signal sans référence -->\n<bpmn:intermediateCatchEvent id=\"Sig_Catch\">\n  <bpmn:signalEventDefinition />\n</bpmn:intermediateCatchEvent>",
    "goodDesc": "Signal global référencé par son ID.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Signal global référencé -->\n<bpmn:signal id=\"Sig_Arret\" name=\"ArretUrgenceSignal\" />\n...\n<bpmn:intermediateCatchEvent id=\"Sig_Catch\" name=\"Arrêt d'urgence reçu\">\n  <bpmn:signalEventDefinition signalRef=\"Sig_Arret\" />\n</bpmn:intermediateCatchEvent>",
    "impact": "🚨 Échec d'interception du signal diffusé.",
    "autoFixable": false
  },
  "lane-assignment": {
    "standard": "OMG BPMN 2.0 §10.2.3",
    "badge": "Organisation",
    "explanation": "Si le diagramme utilise des couloirs de responsabilité (Lanes), chaque activité du processus doit être affectée à une Lane pour clarifier qui réalise l'action.",
    "badDesc": "Tâche flottante hors couloir dans un processus subdivisé en Lanes.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Tâche orpheline non assignée à un couloir -->",
    "goodDesc": "Toutes les activités sont rattachées via <flowNodeRef> à leur Lane respective.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Affectation claire aux départements -->\n<bpmn:lane id=\"Lane_ServiceClient\" name=\"Service Client\">\n  <bpmn:flowNodeRef>Task_accueil</bpmn:flowNodeRef>\n</bpmn:lane>",
    "impact": "🔵 Diagramme moins lisible au niveau organisationnel.",
    "autoFixable": false
  },
  "diagram-layout": {
    "standard": "OMG BPMN 2.0 Diagram Interchange (DI)",
    "badge": "Mise en Page DI",
    "explanation": "Le fichier BPMN doit contenir les métadonnées graphiques BPMNDiagram / BPMNShape / BPMNEdge pour s'afficher correctement dans Camunda Modeler et les visualiseurs Web.",
    "badDesc": "Fichier XML pur sans balise <bpmndi:BPMNDiagram>.",
    "badSnippet": "<!-- ❌ Mauvaise Pratique : Aucune coordonnée graphique (DI) -->",
    "goodDesc": "Section <bpmndi:BPMNDiagram> complète avec positions x, y, width, height.",
    "goodSnippet": "<!-- ✅ Bonne Pratique : Métadonnées DI conformes -->\n<bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n  <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"process-1\">\n    <bpmndi:BPMNShape id=\"_BPMNShape_Start\" bpmnElement=\"StartEvent_1\">\n      <dc:Bounds x=\"179\" y=\"99\" width=\"36\" height=\"36\" />\n    </bpmndi:BPMNShape>\n  </bpmndi:BPMNPlane>\n</bpmndi:BPMNDiagram>",
    "impact": "🔵 Éléments empilés à l'origine (0,0) ou écran blanc dans le visualiseur.",
    "autoFixable": false
  }
};

let bpmnLintRulesCategoryFilter = 'all';
let bpmnLintRuleSearchQuery = '';
let bpmnLintRuleSeverityFilter = 'all';
let bpmnLintExpandedRules = new Set();

window.filterBpmnLintRulesCategory = function(cat) {
  bpmnLintRulesCategoryFilter = cat;
  renderBpmnLintRules();
};

window.onBpmnLintRulesSearch = function(query) {
  bpmnLintRuleSearchQuery = (query || '').trim().toLowerCase();
  renderBpmnLintRules();
};

window.onBpmnLintRulesSeverityChange = function(sev) {
  bpmnLintRuleSeverityFilter = sev || 'all';
  renderBpmnLintRules();
};

window.toggleBpmnLintRuleDetail = function(ruleId) {
  if (bpmnLintExpandedRules.has(ruleId)) {
    bpmnLintExpandedRules.delete(ruleId);
  } else {
    bpmnLintExpandedRules.add(ruleId);
  }
  renderBpmnLintRules();
};

window.bpmnLintToggleAllRuleDetails = function(expand) {
  if (expand) {
    bpmnLintRules.forEach(r => bpmnLintExpandedRules.add(r.id));
  } else {
    bpmnLintExpandedRules.clear();
  }
  renderBpmnLintRules();
};

window.bpmnLintToggleAllRules = function(enable) {
  bpmnLintRules.forEach(r => { r.enabled = !!enable; });
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.copyBpmnLintRuleSnippet = function(ruleId, type) {
  const k = BPMN_LINT_RULE_KNOWLEDGE[ruleId];
  if (!k) return;
  const snippet = type === 'bad' ? k.badSnippet : k.goodSnippet;
  if (!snippet) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet).then(() => {
      alert(`📋 Extrait XML (${type === 'bad' ? 'Anti-pattern' : 'Bonne pratique'}) copié dans le presse-papiers !`);
    }).catch(() => {
      prompt('Copiez le code ci-dessous :', snippet);
    });
  } else {
    prompt('Copiez le code ci-dessous :', snippet);
  }
};

window.applyBpmnLintPreset = function(presetName) {
  if (!bpmnLintRules || !bpmnLintRules.length) {
    loadBpmnLintRules();
  }

  if (presetName === 'bouygues') {
    // Profil Standard Bouygues Telecom (Équilibré & Robuste)
    bpmnLintRules.forEach(r => {
      const def = DEFAULT_BPMN_LINT_RULES.find(d => d.id === r.id);
      if (def) {
        r.enabled = def.enabled;
        r.severity = def.severity;
      } else {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('🛡️ Profil « Standard Bouygues Telecom » appliqué avec succès !');
  } else if (presetName === 'strict') {
    // Profil Strict Production (CI/CD Zero-Defect)
    bpmnLintRules.forEach(r => {
      r.enabled = true;
      if (r.category === 'Structure' || r.category === 'Dépendances' || r.id.includes('propagation') || r.id.includes('loop')) {
        r.severity = 'blocker';
      } else {
        r.severity = 'error';
      }
    });
    alert('🚀 Profil « Strict Production (CI/CD Zero-Defect) » appliqué : Toutes les règles sont activées en Bloquant / Erreur !');
  } else if (presetName === 'prototyping') {
    // Profil Prototypage / Conception Rapide
    bpmnLintRules.forEach(r => {
      if (r.category === 'Structure') {
        r.enabled = true;
        r.severity = 'error';
      } else if (r.category === 'Nommage' || r.category === 'Documentation') {
        r.enabled = false;
        r.severity = 'info';
      } else {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('🎨 Profil « Prototypage Rapide » appliqué : Focus sur la structure sans contraintes de nommage.');
  } else if (presetName === 'naming') {
    // Profil Focus Nommage & Sémantique Métier
    bpmnLintRules.forEach(r => {
      if (r.category === 'Nommage') {
        r.enabled = true;
        r.severity = 'error';
      } else if (r.category === 'Documentation' || r.category === 'Gouvernance') {
        r.enabled = true;
        r.severity = 'warning';
      }
    });
    alert('✍️ Profil « Focus Nommage & Métier » appliqué avec sévérité renforcée sur les libellés et variables.');
  }

  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.loadBpmnLintRules = function() {
  try {
    const raw = localStorage.getItem(BPMN_LINT_RULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Fusionner avec les règles par défaut pour intégrer les nouvelles règles éventuelles
        const loadedMap = new Map(parsed.map(r => [r.id, r]));
        bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(def => {
          if (loadedMap.has(def.id)) {
            const saved = loadedMap.get(def.id);
            return { ...def, enabled: saved.enabled, severity: saved.severity };
          }
          return { ...def };
        });
        // Ajouter les règles personnalisées d'équipe sauvegardées
        parsed.filter(r => r.custom).forEach(cr => {
          if (!bpmnLintRules.some(r => r.id === cr.id)) {
            bpmnLintRules.push(cr);
          }
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Erreur lors du chargement des règles BPMN Lint depuis localStorage:', e);
  }
  bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(r => ({ ...r }));
};

window.saveBpmnLintRules = function() {
  try {
    localStorage.setItem(BPMN_LINT_RULES_KEY, JSON.stringify(bpmnLintRules));
  } catch (e) {
    console.warn('Impossible de sauvegarder les règles BPMN Lint dans localStorage:', e);
  }
};

window.resetBpmnLintRules = function() {
  if (confirm('Voulez-vous réinitialiser toutes les règles à la configuration standard Bouygues Telecom ?')) {
    bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(r => ({ ...r }));
    saveBpmnLintRules();
    renderBpmnLintRules();
    invalidateBpmnLintReport();
    alert('🔄 Configuration des règles réinitialisée par défaut.');
  }
};

window.exportBpmnLintRules = function() {
  const data = JSON.stringify(bpmnLintRules, null, 2);
  const now = new Date().toISOString().slice(0, 10);
  dl(data, `regles_bpmn_lint_${now}.json`, 'application/json;charset=utf-8;');
};

window.importBpmnLintRules = function(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed)) {
        bpmnLintRules = parsed;
        saveBpmnLintRules();
        renderBpmnLintRules();
        invalidateBpmnLintReport();
        alert(`✅ ${parsed.length} règles importées avec succès !`);
      } else {
        alert('Format de fichier JSON invalide : une liste de règles est attendue.');
      }
    } catch (err) {
      alert(`Erreur lors de l'import : ${err.message}`);
    }
  };
  reader.readAsText(file);
};

function renderBpmnLintRules() {
  if (!bpmnLintRules || !bpmnLintRules.length) {
    loadBpmnLintRules();
  }

  const body = document.getElementById('bpmnLintRulesBody');
  const catFilterContainer = document.getElementById('bpmnLintRulesCatFilters');
  const kpiContainer = document.getElementById('bpmnLintRulesCountsBadges');

  // 1. Rendu des KPIs et statistiques de couverture
  if (kpiContainer) {
    const total = bpmnLintRules.length;
    const active = bpmnLintRules.filter(r => r.enabled).length;
    const blockers = bpmnLintRules.filter(r => r.enabled && r.severity === 'blocker').length;
    const errors = bpmnLintRules.filter(r => r.enabled && r.severity === 'error').length;
    const warnings = bpmnLintRules.filter(r => r.enabled && r.severity === 'warning').length;
    const infos = bpmnLintRules.filter(r => r.enabled && r.severity === 'info').length;
    const customCount = bpmnLintRules.filter(r => r.custom).length;

    kpiContainer.innerHTML = `
      <span style="font-size:12px; font-weight:800; color:var(--text-primary); margin-right:4px;">Couverture :</span>
      <span class="badge" style="background:#f1f5f9; color:#334155; font-weight:700; padding:3px 8px;" title="Nombre total de règles dans le référentiel">${total} règles</span>
      <span class="badge" style="background:#dcfce7; color:#166534; font-weight:800; padding:3px 8px;" title="Règles actuellement actives">${active} actives</span>
      <span class="badge" style="background:#fee2e2; color:#991b1b; font-weight:800; padding:3px 8px;" title="Contrôles bloquants (No-Go)">${blockers} bloquants</span>
      <span class="badge" style="background:#ffedd5; color:#9a3412; font-weight:800; padding:3px 8px;" title="Erreurs">${errors} erreurs</span>
      <span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; padding:3px 8px;" title="Avertissements">${warnings} avertissements</span>
      ${infos > 0 ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; padding:3px 8px;" title="Informations">${infos} infos</span>` : ''}
      ${customCount > 0 ? `<span class="badge" style="background:#f3e8ff; color:#6b21a8; font-weight:800; padding:3px 8px;" title="Règles d'équipe personnalisées">${customCount} équipe</span>` : ''}
    `;
  }

  // 2. Rendu des filtres de catégories (Pills)
  if (catFilterContainer) {
    const categories = ['all', 'Structure', 'Modélisation', 'Nommage', 'Dépendances', 'Déploiement', 'Documentation', 'Gouvernance', 'Règle équipe'];
    catFilterContainer.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'Toutes les règles' : cat;
      const count = cat === 'all' ? bpmnLintRules.length : bpmnLintRules.filter(r => (r.category || 'Règle équipe') === cat || (cat === 'Règle équipe' && r.custom)).length;
      const active = bpmnLintRulesCategoryFilter === cat ? 'active' : '';
      return `<button class="pill ${active}" onclick="filterBpmnLintRulesCategory('${lintEscape(cat)}')">${lintEscape(label)} (${count})</button>`;
    }).join('');
  }

  if (!body) return;

  // 3. Filtrage multi-critères
  const filtered = bpmnLintRules.filter(rule => {
    // Filtre de catégorie
    if (bpmnLintRulesCategoryFilter !== 'all') {
      if (bpmnLintRulesCategoryFilter === 'Règle équipe') {
        if (!rule.custom && rule.category !== 'Règle équipe') return false;
      } else {
        if ((rule.category || 'Règle équipe') !== bpmnLintRulesCategoryFilter) return false;
      }
    }

    // Filtre de sévérité / statut
    if (bpmnLintRuleSeverityFilter === 'enabled' && !rule.enabled) return false;
    if (bpmnLintRuleSeverityFilter === 'disabled' && rule.enabled) return false;
    if (['blocker', 'error', 'warning', 'info'].includes(bpmnLintRuleSeverityFilter)) {
      if (rule.severity !== bpmnLintRuleSeverityFilter) return false;
    }

    // Filtre de recherche texte
    if (bpmnLintRuleSearchQuery) {
      const k = BPMN_LINT_RULE_KNOWLEDGE[rule.id] || {};
      const searchable = [
        rule.id,
        rule.label,
        rule.category,
        rule.severity,
        rule.target || '',
        rule.pattern || '',
        k.standard || '',
        k.badge || '',
        k.explanation || '',
        k.badDesc || '',
        k.goodDesc || '',
        k.badSnippet || '',
        k.goodSnippet || ''
      ].join(' ').toLowerCase();

      if (!searchable.includes(bpmnLintRuleSearchQuery)) return false;
    }

    return true;
  });

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px; text-align:center; color:var(--text-secondary);">🔍 Aucune règle ne correspond aux critères de recherche et filtres actuels.</td></tr>';
    return;
  }

  // 4. Génération des lignes du tableau et tiroirs d'explications accordéons
  body.innerHTML = filtered.map(rule => {
    const index = bpmnLintRules.indexOf(rule);
    const k = BPMN_LINT_RULE_KNOWLEDGE[rule.id] || {
      standard: rule.custom ? 'Règle Équipe Projet' : 'Standard OMG BPMN 2.0 / Camunda',
      badge: rule.category || 'Général',
      explanation: rule.custom ? `Contrôle par expression régulière sur l'élément <${rule.target}> et l'attribut '${rule.attribute || 'name'}'.` : 'Contrôle intégré du moteur d\'audit BPMN 2.0.',
      badDesc: rule.custom ? `L'attribut ne correspond pas au motif '${rule.pattern}'.` : 'Cas de non-conformité détecté.',
      badSnippet: `<!-- ❌ Non-conforme : Violation de la règle ${rule.label} -->`,
      goodDesc: rule.custom ? `L'attribut doit respecter le motif '${rule.pattern}'.` : 'Pratique recommandée pour ce composant.',
      goodSnippet: `<!-- ✅ Conforme : Respect des conventions d'architecture -->`,
      impact: rule.severity === 'blocker' ? '🚨 Incident bloquant pour le déploiement' : '⚠️ Non-conformité aux bonnes pratiques',
      autoFixable: false
    };

    const isExpanded = bpmnLintExpandedRules.has(rule.id);

    return `
    <tr class="bpmn-lint-rule-row ${isExpanded ? 'expanded' : ''}" onclick="toggleBpmnLintRuleDetail('${lintEscape(rule.id)}')">
      <td style="text-align:center;" onclick="event.stopPropagation();">
        <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleBpmnLintRule(${index}, this.checked)" title="Activer / Désactiver la règle" style="cursor:pointer; width:16px; height:16px;">
      </td>
      <td>
        <div class="bpmn-lint-rule-label-container">
          <div class="bpmn-lint-rule-title">
            <span>${lintEscape(rule.label)}</span>
            ${k.autoFixable ? '<span class="bpmn-lint-autofix-badge" title="Cette règle dispose d\'un Auto-Fix automatique">⚙️ Auto-Fix</span>' : ''}
            ${rule.custom ? '<small class="bpmn-lint-custom-label" style="background:#f3e8ff; color:#6b21a8; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">ÉQUIPE</small>' : ''}
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:3px;">
            <span class="bpmn-lint-standard-badge">${lintEscape(k.standard)}</span>
            <span style="font-size:11px; color:var(--text-tertiary);">ID: <code>${lintEscape(rule.id)}</code></span>
          </div>
        </div>
      </td>
      <td>
        <span class="badge" style="font-size:11px; font-weight:700;">${lintEscape(rule.category || 'Équipe')}</span>
      </td>
      <td onclick="event.stopPropagation();">
        <button type="button" class="btn-ghost" onclick="toggleBpmnLintRuleDetail('${lintEscape(rule.id)}')" style="display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; padding:4px 10px; border:1px solid var(--border-color, #cbd5e1); border-radius:6px; background:#fff; color:var(--brand-primary, #003882);">
          <span>💡</span>
          <span>${isExpanded ? 'Masquer détails' : 'Voir explications & exemples'}</span>
          <span style="font-size:10px; transition:transform 0.2s; transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}">▼</span>
        </button>
      </td>
      <td onclick="event.stopPropagation();">
        <select class="srt" onchange="setBpmnLintSeverity(${index}, this.value)" style="font-weight:700; font-size:11.5px; padding:4px 8px; border-radius:6px;">
          ${['blocker', 'error', 'warning', 'info'].map(value => `<option value="${value}" ${rule.severity === value ? 'selected' : ''}>${value === 'blocker' ? '🔴 Bloquant' : value === 'error' ? '🟠 Erreur' : value === 'warning' ? '🟡 Avertissement' : '🔵 Info'}</option>`).join('')}
        </select>
      </td>
      <td style="text-align:center;" onclick="event.stopPropagation();">
        ${rule.custom ? `<button class="btn-ghost" onclick="deleteBpmnLintRule(${index})" aria-label="Supprimer la règle" style="color:#dc2626; font-size:11px; font-weight:700; padding:4px 8px; border:1px solid #fecdd3; border-radius:4px; background:#fff1f2;">🗑️ Supprimer</button>` : `<button class="btn-ghost" onclick="toggleBpmnLintRuleDetail('${lintEscape(rule.id)}')" style="font-size:11px; padding:4px 8px; border:1px solid var(--border-color); border-radius:4px; background:#fff;" title="Consulter la fiche pédagogique">${isExpanded ? '▲ Replier' : '📖 Fiche'}</button>`}
      </td>
    </tr>
    ${isExpanded ? `
    <tr class="bpmn-lint-drawer-row">
      <td colspan="6" style="padding:0 0 12px 0; border-top:none;">
        <div class="bpmn-lint-rule-drawer">
          <!-- En-tête du tiroir pédagogique -->
          <div class="bpmn-lint-drawer-header">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="bpmn-lint-standard-badge" style="background:#003882; color:#fff; font-weight:800; border:none; padding:3px 9px;">${lintEscape(k.standard)}</span>
                <span class="badge" style="font-size:11px; background:#e0f2fe; color:#0369a1; font-weight:800;">${lintEscape(k.badge)}</span>
                ${k.autoFixable ? '<span class="bpmn-lint-autofix-badge">✨ Correction automatique disponible</span>' : ''}
              </div>
              <strong style="font-size:14px; color:var(--text-primary); display:block; margin-top:4px;">${lintEscape(rule.label)}</strong>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn-ghost" onclick="copyBpmnLintRuleSnippet('${lintEscape(rule.id)}', 'good')" title="Copier le snippet XML de bonne pratique" style="font-size:11px; font-weight:700; padding:4px 10px; border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; border-radius:6px;">
                📋 Copier XML Conforme
              </button>
              <button type="button" class="btn-ghost" onclick="toggleBpmnLintRuleDetail('${lintEscape(rule.id)}')" title="Fermer ce tiroir" style="font-size:11px; font-weight:700; padding:4px 8px; border:1px solid var(--border-color); border-radius:6px;">
                ✖
              </button>
            </div>
          </div>

          <!-- Explication technique et métier -->
          <div class="bpmn-lint-drawer-explanation">
            <strong>Pourquoi ce contrôle est essentiel :</strong><br>
            ${lintEscape(k.explanation)}
          </div>

          <!-- Alerte impact opérationnel -->
          <div class="bpmn-lint-drawer-impact-box">
            <span>${lintEscape(k.impact)}</span>
          </div>

          <!-- Grille comparative : Anti-pattern vs Standard Recommandé -->
          <div class="bpmn-lint-diff-grid">
            <!-- ❌ Mauvaise Pratique -->
            <div class="bpmn-lint-diff-card bad">
              <div class="bpmn-lint-diff-header">
                <span>❌ Mauvaise Pratique (Anti-pattern)</span>
                <button type="button" class="bpmn-lint-btn-copy-code" onclick="copyBpmnLintRuleSnippet('${lintEscape(rule.id)}', 'bad')">📋 Copier</button>
              </div>
              <div class="bpmn-lint-diff-desc">
                ${lintEscape(k.badDesc)}
              </div>
              <div class="bpmn-lint-code-wrapper">
                <pre><code>${lintEscape(k.badSnippet)}</code></pre>
              </div>
            </div>

            <!-- ✅ Bonne Pratique -->
            <div class="bpmn-lint-diff-card good">
              <div class="bpmn-lint-diff-header">
                <span>✅ Bonne Pratique (Standard Recommandé)</span>
                <button type="button" class="bpmn-lint-btn-copy-code" onclick="copyBpmnLintRuleSnippet('${lintEscape(rule.id)}', 'good')">📋 Copier</button>
              </div>
              <div class="bpmn-lint-diff-desc">
                ${lintEscape(k.goodDesc)}
              </div>
              <div class="bpmn-lint-code-wrapper">
                <pre><code>${lintEscape(k.goodSnippet)}</code></pre>
              </div>
            </div>
          </div>

          <!-- Pied du tiroir avec actions rapides -->
          <div class="bpmn-lint-drawer-actions">
            <div style="font-size:11.5px; color:var(--text-secondary);">
              <span>Statut de la règle : </span>
              <strong style="color:${rule.enabled ? '#166534' : '#991b1b'};">${rule.enabled ? '✅ Active' : '❌ Désactivée'}</strong>
              <span> · Sévérité configurée : </span>
              <strong style="text-transform:uppercase;">${lintEscape(rule.severity)}</strong>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-ghost" onclick="toggleBpmnLintRule(${index}, ${!rule.enabled}); renderBpmnLintRules();" style="font-size:11.5px; font-weight:700; padding:4px 12px; border:1px solid var(--border-color); border-radius:6px; background:#fff;">
                ${rule.enabled ? 'Désactiver' : 'Activer'} cette règle
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>` : ''}
    `;
  }).join('');
}

let bpmnLintViewerInstance = null;
let bpmnLintViewerActiveFileName = null;
let bpmnLintViewerActiveIssues = [];

let bpmnLintTourCurrentIndex = 0;

window.bpmnLintUpdateTourBanner = function() {
  const banner = document.getElementById('bpmnLintTourBanner');
  if (!banner) return;
  if (!bpmnLintViewerActiveIssues || !bpmnLintViewerActiveIssues.length) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
  const issue = bpmnLintViewerActiveIssues[bpmnLintTourCurrentIndex] || bpmnLintViewerActiveIssues[0];
  if (!issue) return;

  const sevEl = document.getElementById('bpmnLintTourSeverity');
  if (sevEl) {
    sevEl.className = `bpmn-lint-severity ${lintEscape(issue.severity)}`;
    sevEl.textContent = issue.severity;
  }
  const ruleEl = document.getElementById('bpmnLintTourRule');
  if (ruleEl) ruleEl.textContent = issue.rule;
  const elemEl = document.getElementById('bpmnLintTourElement');
  if (elemEl) elemEl.textContent = issue.elementId || issue.elementName || issue.elementType;
  const msgEl = document.getElementById('bpmnLintTourMessage');
  if (msgEl) msgEl.textContent = issue.message;
  const recEl = document.getElementById('bpmnLintTourRecommendation');
  if (recEl) recEl.textContent = issue.recommendation ? `💡 Action : ${issue.recommendation}` : '';
  const counterEl = document.getElementById('bpmnLintTourCounter');
  if (counterEl) counterEl.textContent = `${bpmnLintTourCurrentIndex + 1} / ${bpmnLintViewerActiveIssues.length}`;
};

window.bpmnLintTourNext = function() {
  if (!bpmnLintViewerActiveIssues.length) return;
  bpmnLintTourCurrentIndex = (bpmnLintTourCurrentIndex + 1) % bpmnLintViewerActiveIssues.length;
  const issue = bpmnLintViewerActiveIssues[bpmnLintTourCurrentIndex];
  const drawerItem = document.querySelector(`.bpmn-lint-drawer-item[data-issue-idx="${bpmnLintTourCurrentIndex}"]`);
  bpmnLintFocusElement(issue.elementId, drawerItem, bpmnLintTourCurrentIndex);
  if (drawerItem) drawerItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.bpmnLintTourPrev = function() {
  if (!bpmnLintViewerActiveIssues.length) return;
  bpmnLintTourCurrentIndex = (bpmnLintTourCurrentIndex - 1 + bpmnLintViewerActiveIssues.length) % bpmnLintViewerActiveIssues.length;
  const issue = bpmnLintViewerActiveIssues[bpmnLintTourCurrentIndex];
  const drawerItem = document.querySelector(`.bpmn-lint-drawer-item[data-issue-idx="${bpmnLintTourCurrentIndex}"]`);
  bpmnLintFocusElement(issue.elementId, drawerItem, bpmnLintTourCurrentIndex);
  if (drawerItem) drawerItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.copyCurrentTourIssueTicket = function() {
  const issue = bpmnLintViewerActiveIssues[bpmnLintTourCurrentIndex];
  if (!issue) return;
  copyBpmnLintSingleTicket(issue);
};

window.openBpmnLintViewer = function(fileName, targetElementId) {
  const modal = document.getElementById('bpmnLintViewerModal');
  const canvasContainer = document.getElementById('bpmnLintViewerCanvas');
  const fileNameTitle = document.getElementById('bpmnLintModalFileName');
  const modalBadge = document.getElementById('bpmnLintModalBadge');
  const modalSubTitle = document.getElementById('bpmnLintModalSubTitle');
  const drawerList = document.getElementById('bpmnLintDrawerList');
  const drawerBadge = document.getElementById('bpmnLintDrawerBadge');
  const modalIssueCount = document.getElementById('bpmnLintModalIssueCount');

  if (!modal || !canvasContainer) return;

  const file = bpmnLintFiles.find(f => f.fileName === fileName) || (window.bpmnLintResults || []).find(r => r.fileName === fileName);
  if (!file || !file.source) {
    alert(`Le contenu du fichier BPMN « ${fileName} » n’est pas disponible.`);
    return;
  }

  bpmnLintViewerActiveFileName = fileName;
  if (fileNameTitle) fileNameTitle.textContent = fileName;

  // Trouver les résultats et constats associés
  const result = (window.bpmnLintResults || []).find(r => r.fileName === fileName);
  const fileIssues = result ? result.issues : [];
  bpmnLintViewerActiveIssues = fileIssues;
  bpmnLintTourCurrentIndex = 0;

  if (modalBadge) {
    if (!result) {
      modalBadge.className = 'badge ok';
      modalBadge.textContent = 'Non audité';
    } else if (result.blockers) {
      modalBadge.className = 'badge err';
      modalBadge.textContent = `${result.blockers} bloquant(s) · Score ${result.score}%`;
    } else if (result.warnings) {
      modalBadge.className = 'badge warn';
      modalBadge.textContent = `${result.warnings} avertissement(s) · Score ${result.score}%`;
    } else {
      modalBadge.className = 'badge ok';
      modalBadge.textContent = `100% Conforme`;
    }
  }

  if (modalSubTitle) {
    modalSubTitle.textContent = result ? `${result.elementCount} éléments · ${result.processCount} processus · Visite guidée : touches ← / → ou boutons ci-dessous` : 'Visualisation du diagramme BPMN 2.0';
  }

  if (modalIssueCount) modalIssueCount.textContent = String(fileIssues.length);
  if (drawerBadge) drawerBadge.textContent = String(fileIssues.length);

  // Remplir le volet latéral des constats
  if (drawerList) {
    if (!fileIssues.length) {
      drawerList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-tertiary); font-size:12px;">✅ Aucun constat détecté sur ce fichier.</div>';
    } else {
      drawerList.innerHTML = fileIssues.map((issue, idx) => `
        <div class="bpmn-lint-drawer-item ${targetElementId && targetElementId === issue.elementId ? 'active' : ''}" 
             data-element-id="${lintEscape(issue.elementId)}" 
             data-issue-idx="${idx}"
             onclick="bpmnLintFocusElement('${lintEscape(issue.elementId)}', this, ${idx})">
          <div class="bpmn-lint-drawer-item-top">
            <strong>${lintEscape(issue.rule)}</strong>
            <span class="bpmn-lint-severity ${lintEscape(issue.severity)}">${lintEscape(issue.severity)}</span>
          </div>
          <p>${lintEscape(issue.message)}</p>
          <small>Élément : <code>${lintEscape(issue.elementId || issue.elementName || (issue.isProcessLevel ? 'Processus global' : issue.elementType))}</code>${issue.suggestedOwner ? ` · Resp: ${lintEscape(issue.suggestedOwner)}` : ''}</small>
        </div>
      `).join('');
    }
  }

  modal.style.display = 'flex';
  bpmnLintUpdateTourBanner();

  // Nettoyer l'ancien canevas
  canvasContainer.innerHTML = '';
  canvasContainer.classList.remove('bpmn-canvas-focused');
  if (bpmnLintViewerInstance) {
    try { bpmnLintViewerInstance.destroy(); } catch (e) {}
    bpmnLintViewerInstance = null;
  }

  if (typeof BpmnJS === 'undefined') {
    canvasContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;">⚠️ La bibliothèque BpmnJS n’est pas disponible.</div>';
    return;
  }

  try {
    bpmnLintViewerInstance = new BpmnJS({
      container: '#bpmnLintViewerCanvas'
    });

    bpmnLintViewerInstance.importXML(file.source).then(() => {
      const canvas = bpmnLintViewerInstance.get('canvas');
      const elementRegistry = bpmnLintViewerInstance.get('elementRegistry');
      const overlays = bpmnLintViewerInstance.get('overlays');
      const eventBus = bpmnLintViewerInstance.get('eventBus');

      canvas.zoom('fit-viewport');

      // Marquer visuellement UNIQUEMENT les éléments de flux spécifiques (ignorer conteneurs racines)
      fileIssues.forEach(issue => {
        if (!issue.elementId || issue.isProcessLevel) return;
        const shape = elementRegistry.get(issue.elementId);
        if (!shape) return;

        const shapeType = String(shape.type || '').toLowerCase();
        // Ne JAMAIS marquer les grands conteneurs de process ou pools entiers
        if (shapeType.includes('process') || shapeType.includes('participant') || shapeType.includes('collaboration')) {
          return;
        }

        const isBlocker = ['blocker', 'error'].includes(issue.severity);
        canvas.addMarker(issue.elementId, isBlocker ? 'bpmn-highlight-blocker' : 'bpmn-highlight-issue');

        try {
          overlays.add(issue.elementId, 'lint-badge', {
            position: { bottom: 0, right: 0 },
            html: `<div title="${lintEscape(issue.rule)}: ${lintEscape(issue.message)}" style="background:${isBlocker ? '#dc2626' : '#ea580c'}; color:#fff; border-radius:50%; width:18px; height:18px; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.3); cursor:pointer;">${isBlocker ? '!' : '⚠'}</div>`
          });
        } catch (e) {}
      });

      // Synchronisation au clic sur un élément du diagramme BPMN
      if (eventBus) {
        eventBus.on('element.click', function(e) {
          const el = e.element;
          if (!el || !el.id) return;
          const matchIdx = fileIssues.findIndex(i => i.elementId === el.id);
          if (matchIdx !== -1) {
            const drawerItem = document.querySelector(`.bpmn-lint-drawer-item[data-issue-idx="${matchIdx}"]`);
            bpmnLintFocusElement(el.id, drawerItem, matchIdx);
            if (drawerItem) drawerItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      }

      // Si un élément cible a été demandé, focus dessus
      if (targetElementId) {
        const targetIdx = fileIssues.findIndex(i => i.elementId === targetElementId);
        setTimeout(() => {
          bpmnLintFocusElement(targetElementId, null, targetIdx !== -1 ? targetIdx : 0);
        }, 150);
      }
    }).catch(err => {
      console.error('Erreur import XML dans le visualiseur BPMN:', err);
      canvasContainer.innerHTML = `<div style="padding:40px; text-align:center; color:#dc2626;"><strong>Erreur d’affichage du diagramme :</strong><p>${lintEscape(err.message)}</p></div>`;
    });
  } catch (e) {
    console.error('Erreur initialisation BpmnJS:', e);
  }
};

window.closeBpmnLintViewer = function() {
  const modal = document.getElementById('bpmnLintViewerModal');
  if (modal) modal.style.display = 'none';
  if (bpmnLintViewerInstance) {
    try { bpmnLintViewerInstance.destroy(); } catch (e) {}
    bpmnLintViewerInstance = null;
  }
};

window.bpmnLintViewerZoomIn = function() {
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  canvas.zoom(canvas.zoom() * 1.25);
};

window.bpmnLintViewerZoomOut = function() {
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  canvas.zoom(canvas.zoom() * 0.8);
};

window.bpmnLintViewerZoomFit = function() {
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  canvas.zoom('fit-viewport');
  window.bpmnLintClearFocus();
};

window.bpmnLintViewerToggleIssues = function() {
  const drawer = document.getElementById('bpmnLintViewerDrawer');
  if (drawer) {
    drawer.classList.toggle('collapsed');
    setTimeout(() => {
      if (bpmnLintViewerInstance) {
        bpmnLintViewerInstance.get('canvas').resized();
      }
    }, 260);
  }
};

window.bpmnLintViewerExportSvg = async function() {
  if (!bpmnLintViewerInstance || !bpmnLintViewerActiveFileName) {
    alert('Aucun diagramme actif à exporter en SVG.');
    return;
  }
  try {
    const result = await bpmnLintViewerInstance.saveSVG();
    const svgContent = result.svg;
    const baseName = bpmnLintViewerActiveFileName.replace(/\.(bpmn|xml)$/i, '');
    dl(svgContent, `${baseName}_diagram.svg`, 'image/svg+xml;charset=utf-8;');
  } catch (err) {
    alert(`Erreur lors de l'export SVG : ${err.message}`);
  }
};

window.bpmnLintClearFocus = function(event) {
  if (event) event.stopPropagation();
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  const elementRegistry = bpmnLintViewerInstance.get('elementRegistry');
  const overlays = bpmnLintViewerInstance.get('overlays');
  const canvasContainer = document.getElementById('bpmnLintViewerCanvas');

  if (canvasContainer) canvasContainer.classList.remove('bpmn-canvas-focused');
  elementRegistry.forEach(el => canvas.removeMarker(el.id, 'bpmn-highlight-focus'));
  try { overlays.remove({ type: 'focus-popover' }); } catch (e) {}

  document.querySelectorAll('.bpmn-lint-drawer-item').forEach(i => i.classList.remove('active'));
};

window.bpmnLintFocusElement = function(elementId, drawerItemEl, issueIndex) {
  if (!bpmnLintViewerInstance) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  const elementRegistry = bpmnLintViewerInstance.get('elementRegistry');
  const overlays = bpmnLintViewerInstance.get('overlays');
  const canvasContainer = document.getElementById('bpmnLintViewerCanvas');

  if (typeof issueIndex === 'number' && issueIndex >= 0) {
    bpmnLintTourCurrentIndex = issueIndex;
  } else if (elementId) {
    const foundIdx = bpmnLintViewerActiveIssues.findIndex(i => i.elementId === elementId);
    if (foundIdx !== -1) bpmnLintTourCurrentIndex = foundIdx;
  }
  bpmnLintUpdateTourBanner();

  // Nettoyer l'ancien popover et markers de focus
  try { overlays.remove({ type: 'focus-popover' }); } catch (e) {}
  elementRegistry.forEach(el => canvas.removeMarker(el.id, 'bpmn-highlight-focus'));

  const issue = (typeof issueIndex === 'number' && bpmnLintViewerActiveIssues[issueIndex])
    ? bpmnLintViewerActiveIssues[issueIndex]
    : bpmnLintViewerActiveIssues.find(i => i.elementId === elementId);

  // Mettre en évidence dans le drawer
  document.querySelectorAll('.bpmn-lint-drawer-item').forEach(i => i.classList.remove('active'));
  if (drawerItemEl) {
    drawerItemEl.classList.add('active');
  } else if (elementId) {
    const elItem = document.querySelector(`.bpmn-lint-drawer-item[data-element-id="${elementId}"]`);
    if (elItem) elItem.classList.add('active');
  }

  // Si c'est un problème au niveau global du processus (pas de shape graphique unique)
  if (!elementId || (issue && issue.isProcessLevel)) {
    if (canvasContainer) canvasContainer.classList.remove('bpmn-canvas-focused');
    return;
  }

  const shape = elementRegistry.get(elementId);
  if (!shape) {
    if (canvasContainer) canvasContainer.classList.remove('bpmn-canvas-focused');
    return;
  }

  // Activer le mode focus visuel sur le canevas (contraste accru sans rien masquer)
  if (canvasContainer) canvasContainer.classList.add('bpmn-canvas-focused');

  // Ajouter marker focus animé sur le composant exact (visibilité 100% sans popover encombrant)
  canvas.addMarker(elementId, 'bpmn-highlight-focus');

  // Centrer et zoomer confortablement sur l'élément sélectionné
  try {
    canvas.scrollToElement(shape);
  } catch (e) {
    const bbox = shape;
    if (bbox.x !== undefined && bbox.y !== undefined) {
      canvas.viewbox({
        x: bbox.x - 200,
        y: bbox.y - 150,
        width: 600,
        height: 400
      });
    }
  }
};

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('keydown', function(e) {
    const jiraModal = document.getElementById('jiraTicketModal');
    if (jiraModal && jiraModal.style.display !== 'none') {
      if (e.key === 'Escape') {
        closeJiraTicketModal();
        return;
      }
    }

    const modal = document.getElementById('bpmnLintViewerModal');
    if (!modal || modal.style.display === 'none') return;
    if (e.key === 'Escape') {
      closeBpmnLintViewer();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      bpmnLintTourNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      bpmnLintTourPrev();
    }
  });
}

function renderBpmnLintFiles() {
  const body = document.getElementById('bpmnLintFilesBody');
  if (!body) return;
  const count = document.getElementById('bpmnLintFileCount');
  if (count) count.textContent = bpmnLintFiles.length;
  body.innerHTML = bpmnLintFiles.map((file, index) => `
    <tr>
      <td>
        <a href="javascript:void(0)" class="bpmn-lint-clickable-file" onclick="openBpmnLintViewer('${lintEscape(file.fileName)}')" title="Cliquer pour afficher le diagramme BPMN">
          <span>🗺️</span> ${lintEscape(file.fileName)}
        </a>
      </td>
      <td>${file.xmlDoc ? lintElements(file.xmlDoc).length : '—'}</td>
      <td>${file.xmlDoc ? lintElements(file.xmlDoc).filter(element => lintLocalName(element) === 'process').length : '—'}</td>
      <td><span class="badge ${file.parseError ? 'err' : 'ok'}">${file.parseError ? 'XML invalide' : 'Prêt'}</span></td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn-ghost" onclick="openBpmnLintViewer('${lintEscape(file.fileName)}')" title="Visualiser le diagramme BPMN" style="padding:4px 10px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
            <span>👁️</span> Visualiser
          </button>
          <button class="btn-ghost" onclick="removeBpmnLintFile(${index})">Retirer</button>
        </div>
      </td>
    </tr>`).join('');
  const runButton = document.getElementById('runBpmnLintBtn');
  if (runButton) runButton.disabled = !bpmnLintFiles.length;
  const exportButton = document.getElementById('exportBpmnLintBtn');
  if (exportButton) exportButton.disabled = !bpmnLintResults.length;
  const fixButton = document.getElementById('autofixBpmnLintBtn');
  if (fixButton) fixButton.disabled = !bpmnLintResults.length;
}

window.bpmnLintFilterByMatrixCell = function(fileName, key, isCategory) {
  bpmnLintFilters.file = fileName || 'all';
  if (isCategory) {
    bpmnLintFilters.category = key || 'all';
    bpmnLintFilters.search = '';
  } else {
    // rule id
    bpmnLintFilters.category = 'all';
    const rule = bpmnLintRules.find(r => r.id === key);
    bpmnLintFilters.search = rule ? rule.label : (key || '');
  }
  bpmnLintFilters.severity = 'all';
  bpmnLintFilters.type = 'all';
  bpmnLintFilters.owner = 'all';
  bpmnLintFilter = 'all';
  bpmnLintSearch = bpmnLintFilters.search;
  bpmnLintVisibleLimit = 200;
  renderBpmnLintResults();
  const tableEl = document.querySelector('.bpmn-lint-issues-table');
  if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.bpmnLintCopyExecutiveSummary = function() {
  if (!bpmnLintResults.length) return;
  const data = bpmnLintReportData();
  const summaryText = `📊 **AUDIT SANTÉ BPMN — BILAN EXÉCUTIF**
- Date : ${new Date(data.generatedAt).toLocaleString('fr-FR')}
- Verdict : ${data.readiness}
- Score Moyen de Santé : ${data.averageScore}%
- Fichiers BPMN : ${data.summary?.files || 0}
- Éléments Analysés : ${data.summary?.elements || 0}
- Anomalies Bloquantes : ${data.summary?.blockers || 0}
- Avertissements : ${data.summary?.warnings || 0}
- Complexité Cyclomatique Moyenne : ${data.summary?.averageCyclomatic || 0}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summaryText).then(() => {
      alert('Bilan exécutif copié dans le presse-papiers !');
    });
  } else {
    alert(summaryText);
  }
};

function renderBpmnLintResults() {
  const results = bpmnLintResults;
  const issues = results.flatMap(result => result.issues);
  const totalElements = results.reduce((sum, result) => sum + result.elementCount, 0);
  const blockerCount = issues.filter(issue => ['blocker', 'error'].includes(issue.severity)).length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  const averageScore = results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0;
  const averageCyclomatic = results.length ? Math.round(results.reduce((sum, r) => sum + (r.metrics?.cyclomatic || 1), 0) / results.length) : 1;

  const kpi = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  kpi('bpmnLintKpiFiles', String(results.length));
  kpi('bpmnLintKpiElements', totalElements.toLocaleString('fr-FR'));
  kpi('bpmnLintKpiBlockers', String(blockerCount));
  kpi('bpmnLintKpiWarnings', String(warningCount));
  kpi('bpmnLintKpiScore', `${averageScore}%`);

  // Cartouche exécutif de verdict
  const execVerdictEl = document.getElementById('bpmnLintExecutiveVerdict');
  if (execVerdictEl) {
    if (!results.length) {
      execVerdictEl.innerHTML = `
        <div class="bpmn-lint-verdict-card neutral">
          <div class="bpmn-lint-verdict-icon">⏸️</div>
          <div class="bpmn-lint-verdict-info">
            <h4>En attente d'audit</h4>
            <p>Chargez des fichiers BPMN puis lancez l'audit pour calculer le verdict de conformité.</p>
          </div>
        </div>`;
    } else if (blockerCount > 0) {
      execVerdictEl.innerHTML = `
        <div class="bpmn-lint-verdict-card blocked">
          <div class="bpmn-lint-verdict-icon">🛑</div>
          <div class="bpmn-lint-verdict-info">
            <div class="bpmn-lint-verdict-badge err">DÉPLOIEMENT BLOQUÉ (NO-GO)</div>
            <h4>${blockerCount} anomalie(s) bloquante(s) ou critique(s) détectée(s)</h4>
            <p>Le lot ne peut pas être mis en production dans cet état. Des corrections bloquantes sont requises.</p>
          </div>
          <button class="btn-ghost" onclick="bpmnLintCopyExecutiveSummary()" title="Copier le résumé exécutif">📋 Copier synthèse</button>
        </div>`;
    } else if (warningCount > 0 || averageScore < 90) {
      execVerdictEl.innerHTML = `
        <div class="bpmn-lint-verdict-card warning">
          <div class="bpmn-lint-verdict-icon">⚠️</div>
          <div class="bpmn-lint-verdict-info">
            <div class="bpmn-lint-verdict-badge warn">GO CONDITIONNEL (RÉSERVES)</div>
            <h4>Aucun bloquant critique · ${warningCount} avertissement(s) à lever</h4>
            <p>Mise en production envisageable après validation des points d'attention métier.</p>
          </div>
          <button class="btn-ghost" onclick="bpmnLintCopyExecutiveSummary()" title="Copier le résumé exécutif">📋 Copier synthèse</button>
        </div>`;
    } else {
      execVerdictEl.innerHTML = `
        <div class="bpmn-lint-verdict-card success">
          <div class="bpmn-lint-verdict-icon">🚀</div>
          <div class="bpmn-lint-verdict-info">
            <div class="bpmn-lint-verdict-badge ok">GO PRODUCTION (CONFORME)</div>
            <h4>Lot 100% conforme aux règles BPMN actives</h4>
            <p>Excellente modélisation. Aucune anomalie détectée sur l'ensemble des ${results.length} diagrammes.</p>
          </div>
          <button class="btn-ghost" onclick="bpmnLintCopyExecutiveSummary()" title="Copier le résumé exécutif">📋 Copier synthèse</button>
        </div>`;
    }
  }

  const graph = window.bpmnLintGraph || { processCount: 0, callCount: 0, missingTargetCount: 0, cycleCount: 0, roots: [], maxDepth: 0 };
  kpi('bpmnLintGraphProcesses', String(graph.processCount));
  kpi('bpmnLintGraphCalls', String(graph.callCount));
  kpi('bpmnLintGraphMissing', String(graph.missingTargetCount));
  kpi('bpmnLintGraphCycles', String(graph.cycleCount));
  kpi('bpmnLintGraphDepth', String(graph.maxDepth));
  const roots = document.getElementById('bpmnLintGraphRoots');
  if (roots) roots.innerHTML = graph.roots.length ? graph.roots.map(root => `
    <span class="bpmn-lint-root-item" style="cursor:pointer;" onclick="openBpmnLintViewer('${lintEscape(root.fileName)}', '${lintEscape(root.id)}')">
      <strong>🗺️ ${lintEscape(root.name)}</strong>
      <small>${lintEscape(root.fileName)} · ${lintEscape(root.id)}</small>
    </span>`).join('') : '<span class="bpmn-lint-empty-note">Aucune racine détectée</span>';
  const missing = document.getElementById('bpmnLintGraphMissingList');
  if (missing) missing.textContent = graph.missingTargets?.length ? graph.missingTargets.join(', ') : 'Aucune cible absente';
  const status = document.getElementById('bpmnLintReadiness');
  if (status) {
    status.textContent = !results.length ? 'Aucun audit lancé' : blockerCount ? 'Bloquant · non prêt pour la revue' : warningCount ? 'À revoir avant la revue métier' : 'Aucune anomalie détectée par les règles actives';
    status.className = `bpmn-lint-readiness ${blockerCount ? 'is-blocked' : warningCount ? 'needs-review' : 'is-clear'}`;
  }

  // 1. Matrice 2D Heatmap (BPMN x Catégories)
  const heatmapContainer = document.getElementById('bpmnLintHeatmapContainer');
  if (heatmapContainer) {
    const categories = ['Structure', 'Dépendances', 'Modélisation', 'Nommage', 'Déploiement', 'Documentation', 'Gouvernance', 'Règle équipe'];
    const headerHtml = `<tr><th>Diagramme BPMN</th>${categories.map(c => `<th>${lintEscape(c)}</th>`).join('')}<th>Total Anomalies</th></tr>`;
    const rowsHtml = results.map(res => {
      const cats = res.metrics?.categoryCounts || {};
      const totalIssues = res.issues.length;
      
      const cells = categories.map(cat => {
        const count = cats[cat] || 0;
        let cellClass = 'heatmap-cell-zero';
        if (count >= 5) cellClass = 'heatmap-cell-danger';
        else if (count >= 3) cellClass = 'heatmap-cell-warn';
        else if (count >= 1) cellClass = 'heatmap-cell-low';
        
        return `<td class="${cellClass}" onclick="bpmnLintFilterByMatrixCell('${lintEscape(res.fileName)}', '${lintEscape(cat)}', true)" title="Filtrer ${count} anomalie(s) ${lintEscape(cat)} sur ${lintEscape(res.fileName)}">${count || '-'}</td>`;
      }).join('');

      return `<tr>
        <td>
          <a href="javascript:void(0)" class="bpmn-lint-clickable-file" onclick="openBpmnLintViewer('${lintEscape(res.fileName)}')">
            <span>🗺️</span> ${lintEscape(res.fileName)}
          </a>
        </td>
        ${cells}
        <td><strong>${totalIssues}</strong></td>
      </tr>`;
    }).join('');

    heatmapContainer.innerHTML = results.length ? `
      <div class="tbl-wrap bpmn-lint-matrix-scroll">
        <table class="bpmn-lint-heatmap-tbl">
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>` : '<p class="bpmn-lint-empty-note">Aucune donnée de matrice disponible.</p>';
  }

  // 2. Répartition Typologique & Automatisation
  const typologyContainer = document.getElementById('bpmnLintTypologyContainer');
  if (typologyContainer) {
    const sumMetrics = results.reduce((acc, r) => {
      const m = r.metrics || {};
      acc.serviceTasks += m.serviceTasks || 0;
      acc.userTasks += m.userTasks || 0;
      acc.scriptTasks += m.scriptTasks || 0;
      acc.callActivities += m.callActivities || 0;
      acc.gateways += m.gatewaysCount || 0;
      acc.events += m.eventsCount || 0;
      acc.sequenceFlows += m.sequenceFlowsCount || 0;
      return acc;
    }, { serviceTasks: 0, userTasks: 0, scriptTasks: 0, callActivities: 0, gateways: 0, events: 0, sequenceFlows: 0 });

    const totalTasks = sumMetrics.serviceTasks + sumMetrics.userTasks + sumMetrics.scriptTasks;
    const autoRate = totalTasks ? Math.round(((sumMetrics.serviceTasks + sumMetrics.scriptTasks) / totalTasks) * 100) : 0;

    typologyContainer.innerHTML = results.length ? `
      <div class="bpmn-lint-typo-grid">
        <div class="bpmn-lint-typo-card">
          <div class="bpmn-lint-typo-stat">
            <strong>${autoRate}%</strong>
            <span>Taux d'Automatisation des Tâches</span>
          </div>
          <div class="bpmn-lint-progress-bar">
            <div class="bpmn-lint-progress-fill" style="width:${autoRate}%;"></div>
          </div>
          <small>${sumMetrics.serviceTasks + sumMetrics.scriptTasks} tâches automatisées / ${totalTasks} tâches au total</small>
        </div>
        <div class="bpmn-lint-typo-details">
          <div class="bpmn-lint-typo-pill"><span>⚙️ Service Tasks</span> <strong>${sumMetrics.serviceTasks}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>👤 User Tasks</span> <strong>${sumMetrics.userTasks}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>📜 Script Tasks</span> <strong>${sumMetrics.scriptTasks}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>🔄 Call Activities</span> <strong>${sumMetrics.callActivities}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>🔀 Passerelles (Gateways)</span> <strong>${sumMetrics.gateways}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>⏱️ Événements (Events)</span> <strong>${sumMetrics.events}</strong></div>
          <div class="bpmn-lint-typo-pill"><span>➡️ Flux séquentiels</span> <strong>${sumMetrics.sequenceFlows}</strong></div>
        </div>
      </div>` : '<p class="bpmn-lint-empty-note">Aucun diagramme analysé.</p>';
  }

  // Populate filter dropdowns dynamically based on available files/issues
  const fileSelect = document.getElementById('bpmnLintFilterFile');
  if (fileSelect) {
    const currentVal = bpmnLintFilters.file;
    const uniqueFiles = Array.from(new Set(results.map(r => r.fileName))).sort((a, b) => a.localeCompare(b, 'fr'));
    fileSelect.innerHTML = `<option value="all">Tous les fichiers (${uniqueFiles.length})</option>` +
      uniqueFiles.map(f => `<option value="${lintEscape(f)}"${f === currentVal ? ' selected' : ''}>${lintEscape(f)}</option>`).join('');
    fileSelect.value = uniqueFiles.includes(currentVal) ? currentVal : 'all';
  }

  const categorySelect = document.getElementById('bpmnLintFilterCategory');
  if (categorySelect) {
    const currentVal = bpmnLintFilters.category;
    const uniqueCategories = Array.from(new Set(issues.map(i => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
    categorySelect.innerHTML = `<option value="all">Toutes les catégories</option>` +
      uniqueCategories.map(c => `<option value="${lintEscape(c)}"${c === currentVal ? ' selected' : ''}>${lintEscape(c)}</option>`).join('');
    categorySelect.value = uniqueCategories.includes(currentVal) ? currentVal : 'all';
  }

  const typeSelect = document.getElementById('bpmnLintFilterType');
  if (typeSelect) {
    const currentVal = bpmnLintFilters.type;
    const uniqueTypes = Array.from(new Set(issues.map(i => i.elementType).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
    typeSelect.innerHTML = `<option value="all">Tous les types d'éléments</option>` +
      uniqueTypes.map(t => `<option value="${lintEscape(t)}"${t === currentVal ? ' selected' : ''}>${lintEscape(t)}</option>`).join('');
    typeSelect.value = uniqueTypes.includes(currentVal) ? currentVal : 'all';
  }

  const ownerSelect = document.getElementById('bpmnLintFilterOwner');
  if (ownerSelect) {
    const currentVal = bpmnLintFilters.owner;
    const uniqueOwners = Array.from(new Set(issues.map(i => i.suggestedOwner).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
    ownerSelect.innerHTML = `<option value="all">Tous les responsables</option>` +
      uniqueOwners.map(o => `<option value="${lintEscape(o)}"${o === currentVal ? ' selected' : ''}>${lintEscape(o)}</option>`).join('');
    ownerSelect.value = uniqueOwners.includes(currentVal) ? currentVal : 'all';
  }

  const severitySelect = document.getElementById('bpmnLintFilterSeverity');
  if (severitySelect) {
    severitySelect.value = bpmnLintFilters.severity;
  }

  const searchInput = document.getElementById('bpmnLintFilterSearch');
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = bpmnLintFilters.search;
  }

  // Summary Table Sorting & Rendering
  const sortedResults = [...results].sort((a, b) => {
    const col = bpmnLintSummarySort.column;
    const factor = bpmnLintSummarySort.asc ? 1 : -1;
    if (typeof a[col] === 'number' && typeof b[col] === 'number') {
      return (a[col] - b[col]) * factor;
    }
    return String(a[col] || '').localeCompare(String(b[col] || ''), 'fr', { numeric: true, sensitivity: 'base' }) * factor;
  });

  const summaryBody = document.getElementById('bpmnLintSummaryBody');
  if (summaryBody) summaryBody.innerHTML = sortedResults.map(result => `
    <tr>
      <td>
        <a href="javascript:void(0)" class="bpmn-lint-clickable-file" onclick="openBpmnLintViewer('${lintEscape(result.fileName)}')" title="Cliquer pour afficher le diagramme BPMN">
          <span>🗺️</span> ${lintEscape(result.fileName)}
        </a>
      </td>
      <td>${result.processCount}</td>
      <td>${result.elementCount}</td>
      <td><strong>${result.score}%</strong></td>
      <td><span class="badge ${result.blockers ? 'err' : result.warnings ? 'warn' : 'ok'}">${lintEscape(result.status)}</span></td>
      <td>${result.blockers}</td>
      <td>${result.warnings}</td>
    </tr>`).join('');

  // Update Summary Table Sort Icons
  ['fileName', 'processCount', 'elementCount', 'score', 'status', 'blockers', 'warnings'].forEach(col => {
    const icon = document.getElementById(`sort-summary-${col}`);
    if (icon) {
      if (bpmnLintSummarySort.column === col) {
        icon.className = 'sort-icon active';
        icon.textContent = bpmnLintSummarySort.asc ? '▲' : '▼';
      } else {
        icon.className = 'sort-icon';
        icon.textContent = '↕';
      }
    }
  });

  const priorities = document.getElementById('bpmnLintPriorities');
  if (priorities) priorities.innerHTML = lintPriorities(issues).map((item, index) => `
    <article class="bpmn-lint-priority" style="cursor:pointer;" onclick="openBpmnLintViewer('${lintEscape(item.fileName)}', '${item.examples.length ? lintEscape(item.examples[0]) : ''}')">
      <span class="bpmn-lint-priority-rank">${index + 1}</span>
      <div>
        <strong>${lintEscape(item.rule)}</strong>
        <small>${lintEscape(item.fileName)} · ${item.count} constat${item.count > 1 ? 's' : ''}${item.examples.length ? ` · ${lintEscape(item.examples.join(', '))}` : ''}</small>
        <p>${lintEscape(item.recommendation)}</p>
        <small>Responsable suggéré : ${lintEscape(item.owner)} · <span style="color:var(--brand-cyan, #009CD7); font-weight:600;">👁️ Localiser sur le diagramme</span></small>
      </div>
      <span class="bpmn-lint-severity ${lintEscape(item.severity)}">${lintEscape(item.severity)}</span>
    </article>`).join('') || '<p class="bpmn-lint-empty-note">Aucune action prioritaire détectée.</p>';

  // Multi-criteria Filtering
  let visible = bpmnLintGetFilteredIssues();

  // RACI Issues Sorting
  visible.sort((a, b) => {
    const col = bpmnLintSort.column;
    const factor = bpmnLintSort.asc ? 1 : -1;
    if (col === 'severity') {
      const diff = lintSeverityRank(a.severity) - lintSeverityRank(b.severity);
      return diff !== 0 ? (bpmnLintSort.asc ? -diff : diff) : a.fileName.localeCompare(b.fileName, 'fr');
    }
    const valA = String(a[col] || '');
    const valB = String(b[col] || '');
    const comp = valA.localeCompare(valB, 'fr', { numeric: true, sensitivity: 'base' });
    if (comp !== 0) return comp * factor;
    return a.fileName.localeCompare(b.fileName, 'fr');
  });

  // Store visible for quick ticket copy by index
  window.bpmnLintCurrentVisibleIssues = visible;

  // Update RACI Issues Table Sort Icons
  ['fileName', 'severity', 'category', 'rule', 'elementId', 'message', 'suggestedOwner', 'recommendation', 'businessTest'].forEach(col => {
    const icon = document.getElementById(`sort-issue-${col}`);
    if (icon) {
      if (bpmnLintSort.column === col) {
        icon.className = 'sort-icon active';
        icon.textContent = bpmnLintSort.asc ? '▲' : '▼';
      } else {
        icon.className = 'sort-icon';
        icon.textContent = '↕';
      }
    }
  });

  const visibleCount = document.getElementById('bpmnLintVisibleCount');
  if (visibleCount) visibleCount.textContent = `${Math.min(visible.length, bpmnLintVisibleLimit)} / ${visible.length} constats affichés (sur ${issues.length} au total)`;
  const moreButton = document.getElementById('bpmnLintMoreIssues');
  if (moreButton) moreButton.hidden = visible.length <= bpmnLintVisibleLimit;
  const issueBody = document.getElementById('bpmnLintIssuesBody');
  if (issueBody) issueBody.innerHTML = visible.length ? visible.slice(0, bpmnLintVisibleLimit).map((issue, idx) => `
    <tr style="cursor:pointer;" onclick="openBpmnLintViewer('${lintEscape(issue.fileName)}', '${lintEscape(issue.elementId)}')">
      <td>
        <a href="javascript:void(0)" class="bpmn-lint-clickable-file" onclick="event.stopPropagation(); openBpmnLintViewer('${lintEscape(issue.fileName)}', '${lintEscape(issue.elementId)}')">
          <span>🗺️</span> ${lintEscape(issue.fileName)}
        </a>
      </td>
      <td><span class="bpmn-lint-severity ${lintEscape(issue.severity)}">${lintEscape(issue.severity)}</span></td>
      <td>${lintEscape(issue.category)}</td>
      <td>${lintEscape(issue.rule)}</td>
      <td>
        <code title="Cliquer pour localiser dans le diagramme BPMN" style="background:#e0f2fe; color:#0369a1; padding:3px 7px; border-radius:4px; font-weight:700; cursor:pointer;">
          ${lintEscape(issue.elementId || issue.elementName || issue.elementType)} 🔍
        </code>
      </td>
      <td>${lintEscape(issue.message)}</td>
      <td>${lintEscape(issue.suggestedOwner)}</td>
      <td>${lintEscape(issue.recommendation)}</td>
      <td>${lintEscape(issue.businessTest)}</td>
      <td style="text-align:center;">
        <button type="button" class="btn-ticket-copy" onclick="event.stopPropagation(); copyBpmnLintSingleTicketByIndex(${idx})" title="Copier ce constat au format ticket Jira / Markdown">
          📋 Ticket
        </button>
      </td>
    </tr>`).join('') : '<tr><td colspan="10" class="empty-state">Aucun problème ne correspond aux filtres.</td></tr>';
  renderBpmnLintFiles();

  const categoryContainer = document.getElementById('bpmnLintCategoryBreakdown');
  if (categoryContainer) {
    const categoryNames = ['Structure', 'Dépendances', 'Modélisation', 'Nommage', 'Déploiement', 'Documentation', 'Gouvernance', 'Règle équipe'];
    const categoryCounts = new Map(categoryNames.map(category => [category, 0]));
    issues.forEach(issue => categoryCounts.set(issue.category, (categoryCounts.get(issue.category) || 0) + 1));
    const maxCount = Math.max(1, ...categoryCounts.values());
    categoryContainer.innerHTML = categoryNames.map(category => {
      const count = categoryCounts.get(category) || 0;
      const width = Math.round((count / maxCount) * 100);
      return `<div class="bpmn-lint-category-row"><span>${lintEscape(category)}</span><div class="bpmn-lint-category-track"><span style="width:${width}%"></span></div><strong>${count}</strong></div>`;
    }).join('');
  }
}

function bpmnLintGetFilteredIssues() {
  const issues = (window.bpmnLintResults || []).flatMap(r => r.issues || []);
  return issues.filter(issue => {
    if (bpmnLintFilters.file !== 'all' && issue.fileName !== bpmnLintFilters.file) return false;
    if (bpmnLintFilters.severity !== 'all') {
      if (bpmnLintFilters.severity === 'blocker' && !(issue.severity === 'blocker' || issue.severity === 'error')) return false;
      if (bpmnLintFilters.severity !== 'blocker' && issue.severity !== bpmnLintFilters.severity) return false;
    }
    if (bpmnLintFilters.category !== 'all' && issue.category !== bpmnLintFilters.category) return false;
    if (bpmnLintFilters.type !== 'all' && (issue.elementType || '').toLowerCase() !== bpmnLintFilters.type.toLowerCase()) return false;
    if (bpmnLintFilters.owner !== 'all' && issue.suggestedOwner !== bpmnLintFilters.owner) return false;
    if (bpmnLintFilters.search) {
      const q = bpmnLintFilters.search.toLowerCase();
      const searchable = [
        issue.fileName,
        issue.rule,
        issue.category,
        issue.elementType,
        issue.elementId,
        issue.elementName,
        issue.message,
        issue.suggestedOwner,
        issue.recommendation,
        issue.businessTest
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

function getImpactDescription(issue) {
  const rid = (issue.ruleId || '').toLowerCase();
  if (rid.includes('input-propagation') || rid.includes('output-propagation')) {
    return 'Pollution ou écrasement incontrôlé des variables de portée globale, causant des régressions silencieuses et des effets de bord majeurs sur le processus parent/appelant.';
  }
  if (rid.includes('exclusive-gateway') || rid.includes('gateway-branches')) {
    return 'Blocage direct du jeton BPMN en cours d’exécution (Unhandled Condition / Incident Zeebe) si les conditions ne sont pas mutuellement exclusives ou si aucune condition n’est remplie.';
  }
  if (rid.includes('loop-max-counter-timer')) {
    return 'Risque de boucle infinie ou de surconsommation CPU/mémoire moteur (tempête de jobs) sans temporisation adéquate.';
  }
  if (rid.includes('candidate-groups') || rid.includes('user-assignment')) {
    return 'Assignation nominative rigide entraînant un arrêt de production si le collaborateur est indisponible.';
  }
  if (rid.includes('variable-reserved') || rid.includes('variable-naming')) {
    return 'Erreur de syntaxe FEEL ou échec d’accès aux propriétés de payload dans le moteur Zeebe.';
  }
  if (rid.includes('call-cycle') || rid.includes('call-target')) {
    return 'Échec d’invocation du sous-processus ou récursion infinie provoquant un dépassement de pile.';
  }
  if (rid.includes('parallel-gateway')) {
    return 'Comportement d’exécution non déterministe ou désynchronisation des jetons sur la passerelle parallèle.';
  }
  if (issue.severity === 'blocker' || issue.severity === 'error') {
    return 'Échec au déploiement Camunda ou incident bloquant lors de l’instanciation du processus métier.';
  }
  return 'Dette technique de modélisation et non-conformité aux règles de gouvernance BPMN 2.0 / Camunda.';
}

function generateJiraTicketData(issue, options = {}) {
  const sev = (issue.severity || 'warning').toLowerCase();
  const sevUpper = sev.toUpperCase();
  const elemId = issue.elementId || issue.elementName || issue.elementType || 'Global';
  const elemType = issue.elementType || 'bpmnElement';
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const projectKey = options.projectKey || 'BPMN';
  const issueType = options.issueType || (sev === 'blocker' || sev === 'error' ? 'Bug' : 'Dette Technique');
  
  let priorityName = 'Medium';
  let priorityLabel = 'Medium (P3)';
  if (sev === 'blocker') {
    priorityName = 'Highest';
    priorityLabel = 'Highest (P1 - Bloquant)';
  } else if (sev === 'error') {
    priorityName = 'High';
    priorityLabel = 'High (P2 - Erreur)';
  } else if (sev === 'info') {
    priorityName = 'Low';
    priorityLabel = 'Low (P4 - Info)';
  }

  const summary = `[BPMN-AUDIT][${sevUpper}] ${issue.fileName} - ${elemId} : ${issue.rule}`;
  const impactText = getImpactDescription(issue);
  const owner = issue.suggestedOwner || 'Équipe Camunda';
  const businessTest = issue.businessTest || 'Tester le parcours nominal de bout en bout et vérifier l’absence d’incident.';

  // 1. Jira Wiki Markup (Jira Server / Data Center)
  const jiraMarkup = `h3. 🚨 [BPMN AUDIT] {color:${sev === 'blocker' || sev === 'error' ? 'red' : 'orange'}}${issue.rule}{color}

|| Propriété || Valeur ||
| *Fichier BPMN* | {{${issue.fileName}}} |
| *Composant impacté* | {{${elemId}}} (${elemType}) |
| *Catégorie* | ${issue.category} |
| *Sévérité / Risque* | *${sevUpper}* (${priorityLabel}) |
| *Responsable RACI* | ${owner} |
| *Date de détection* | ${dateStr} |

h4. 🔍 1. Description du Constat (Anomalie)
{panel:title=Écart détecté par AuditFlow|borderStyle=solid|borderColor=#DE350B|titleBGColor=#FFEBE6|bgColor=#FFF5F5}
${issue.message}
{panel}

h4. 💥 2. Impact Métier & Technique
* *Moteur / Exécution :* ${impactText}
* *Gouvernance :* Non-conformité aux normes OMG BPMN 2.0 et standards Camunda.

h4. 🛠️ 3. Plan d'Action & Remédiation Recommandée
{panel:title=Étapes de correction dans Camunda Modeler|borderStyle=solid|borderColor=#0052CC|titleBGColor=#DEEBFF|bgColor=#F4F8FD}
# *Étape 1 :* Ouvrir le fichier {{${issue.fileName}}} dans Camunda Modeler.
# *Étape 2 :* Localiser et sélectionner le composant {{${elemId}}}.
# *Étape 3 :* ${issue.recommendation}
# *Étape 4 :* Vérifier les liaisons et sauvegarder le modèle.
{panel}

h4. 🧪 4. Critères d'Acceptation & Recette (Definition of Done)
* [ ] *Recette fonctionnelle :* ${businessTest}
* [ ] *Contrôle AuditFlow :* Ré-analyser le BPMN et confirmer la disparition de l’anomalie.
* [ ] *Validation Déploiement :* Valider le déploiement sur le cluster sans warning ni incident.

h4. 🏷️ Étiquettes Jira suggérées
{{bpmn-audit}}, {{camunda}}, {{${(issue.category || 'qualite').toLowerCase().replace(/[\s/]+/g, '-')}}}, {{auditflow}}
`;

  // 2. Markdown (Jira Cloud / GitHub / GitLab / Notion)
  const markdown = `### 🚨 [BPMN AUDIT] [${sevUpper}] ${issue.rule}

| Propriété | Détail |
| :--- | :--- |
| **Fichier BPMN** | \`${issue.fileName}\` |
| **Composant impacté** | \`${elemId}\` (\`${elemType}\`) |
| **Catégorie** | ${issue.category} |
| **Sévérité / Risque** | **${sevUpper}** (${priorityLabel}) |
| **Responsable RACI** | ${owner} |
| **Date de détection** | ${dateStr} |

---

#### 🔍 1. Description du Constat (Anomalie)
> **Écart détecté :**  
> ${issue.message}

#### 💥 2. Impact Métier & Technique
- **Moteur / Exécution :** ${impactText}
- **Gouvernance :** Non-conformité aux normes OMG BPMN 2.0 et standards Camunda.

#### 🛠️ 3. Plan d'Action & Remédiation Recommandée
1. Ouvrir le modèle \`${issue.fileName}\` dans Camunda Modeler.
2. Localiser et sélectionner l'élément \`${elemId}\`.
3. **Action corrective :** ${issue.recommendation}
4. Valider l'absence de régression et sauvegarder.

#### 🧪 4. Critères d'Acceptation & Recette (Definition of Done)
- [ ] **Recette fonctionnelle :** ${businessTest}
- [ ] **Contrôle AuditFlow :** Ré-analyser le BPMN et confirmer la disparition de l'anomalie.
- [ ] **Validation Déploiement :** Déploiement réussi sur l'environnement cible.

---
*Généré par AuditFlow BPMN Quality Engine*
`;

  // 3. JSON REST API Payload
  const jsonPayload = JSON.stringify({
    fields: {
      project: { key: projectKey },
      summary: summary,
      description: markdown,
      issuetype: { name: issueType },
      priority: { name: priorityName },
      labels: [
        'bpmn-audit',
        'camunda',
        (issue.category || 'qualite').toLowerCase().replace(/[\s/]+/g, '-'),
        'auditflow'
      ],
      environment: `Fichier: ${issue.fileName} | Élément: ${elemId}`
    }
  }, null, 2);

  // 4. HTML Preview
  const previewHtml = `
    <div style="font-family:inherit;">
      <h3 style="margin-top:0; color:var(--brand-primary,#003882); display:flex; align-items:center; gap:8px;">
        🚨 <span>${lintEscape(issue.rule)}</span>
        <span class="bpmn-lint-severity ${lintEscape(sev)}">${lintEscape(sevUpper)}</span>
      </h3>
      
      <table>
        <tr><th style="width:200px;">Fichier BPMN</th><td><code>${lintEscape(issue.fileName)}</code></td></tr>
        <tr><th>Composant impacté</th><td><code>${lintEscape(elemId)}</code> (${lintEscape(elemType)})</td></tr>
        <tr><th>Catégorie & Priorité</th><td>${lintEscape(issue.category)} · <strong>${lintEscape(priorityLabel)}</strong></td></tr>
        <tr><th>Responsable RACI</th><td><strong>${lintEscape(owner)}</strong></td></tr>
        <tr><th>Date</th><td>${lintEscape(dateStr)}</td></tr>
      </table>

      <h4 style="margin:16px 0 6px 0; color:var(--text-primary);">🔍 1. Description du Constat (Anomalie)</h4>
      <div class="jira-preview-panel-box alert">
        <strong>Écart détecté :</strong> ${lintEscape(issue.message)}
      </div>

      <h4 style="margin:16px 0 6px 0; color:var(--text-primary);">💥 2. Impact Métier & Technique</h4>
      <ul style="margin:4px 0 12px 18px; padding:0; font-size:12px; color:var(--text-secondary);">
        <li><strong>Moteur / Exécution :</strong> ${lintEscape(impactText)}</li>
        <li><strong>Gouvernance :</strong> Non-conformité aux normes OMG BPMN 2.0 et standards Camunda.</li>
      </ul>

      <h4 style="margin:16px 0 6px 0; color:var(--text-primary);">🛠️ 3. Plan d'Action & Remédiation</h4>
      <div class="jira-preview-panel-box action">
        <ol style="margin:4px 0 4px 18px; padding:0;">
          <li>Ouvrir <code>${lintEscape(issue.fileName)}</code> dans Camunda Modeler.</li>
          <li>Sélectionner l'élément <code>${lintEscape(elemId)}</code>.</li>
          <li><strong>Action corrective :</strong> ${lintEscape(issue.recommendation)}</li>
          <li>Vérifier les liaisons et sauvegarder.</li>
        </ol>
      </div>

      <h4 style="margin:16px 0 6px 0; color:var(--text-primary);">🧪 4. Critères d'Acceptation (Definition of Done)</h4>
      <ul style="margin:4px 0 12px 18px; padding:0; list-style-type:none; font-size:12px;">
        <li>☑️ <strong>Recette :</strong> ${lintEscape(businessTest)}</li>
        <li>☑️ <strong>AuditFlow :</strong> Score repassant à 100% après re-test.</li>
        <li>☑️ <strong>Déploiement :</strong> Zéro warning moteur sur l'environnement cible.</li>
      </ul>
    </div>
  `;

  return {
    summary,
    priorityLabel,
    owner,
    jiraMarkup,
    markdown,
    jsonPayload,
    previewHtml
  };
}

let currentJiraModalIssue = null;
let currentJiraModalFormat = 'jira';

window.openBpmnLintTourTicketModal = function() {
  if (!bpmnLintViewerActiveIssues || !bpmnLintViewerActiveIssues.length) return;
  const issue = bpmnLintViewerActiveIssues[bpmnLintTourCurrentIndex] || bpmnLintViewerActiveIssues[0];
  if (issue) window.openBpmnLintTicketModal(issue);
};

window.openBpmnLintTicketModalByIndex = function(idx) {
  const list = window.bpmnLintCurrentVisibleIssues || (window.bpmnLintResults || []).flatMap(r => r.issues || []);
  const issue = list[idx];
  if (issue) window.openBpmnLintTicketModal(issue);
};

window.openBpmnLintTicketModal = function(issue) {
  if (!issue) return;
  currentJiraModalIssue = issue;
  const modal = document.getElementById('jiraTicketModal');
  if (!modal) return;

  const sevBadge = document.getElementById('jiraModalSeverityBadge');
  if (sevBadge) {
    const s = (issue.severity || 'warning').toLowerCase();
    sevBadge.className = `bpmn-lint-severity ${s}`;
    sevBadge.textContent = s.toUpperCase();
  }

  const subTitle = document.getElementById('jiraModalSubTitle');
  if (subTitle) {
    subTitle.textContent = `${issue.fileName} · Élément : ${issue.elementId || issue.elementName || issue.elementType}`;
  }

  const feedback = document.getElementById('jiraCopyFeedback');
  if (feedback) feedback.style.display = 'none';

  updateJiraTicketContent();
  modal.style.display = 'flex';
};

window.closeJiraTicketModal = function() {
  const modal = document.getElementById('jiraTicketModal');
  if (modal) modal.style.display = 'none';
  currentJiraModalIssue = null;
};

window.setJiraTicketTab = function(format) {
  currentJiraModalFormat = format;
  document.querySelectorAll('.jira-format-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-format') === format);
  });
  updateJiraTicketContent();
};

window.updateJiraTicketContent = function() {
  if (!currentJiraModalIssue) return;
  const projectKey = (document.getElementById('jiraMetaProjectKey')?.value || 'BPMN').trim();
  const issueType = document.getElementById('jiraMetaIssueType')?.value || 'Bug';

  const data = generateJiraTicketData(currentJiraModalIssue, { projectKey, issueType });

  const summaryInput = document.getElementById('jiraTicketSummaryInput');
  if (summaryInput) summaryInput.value = data.summary;

  const priorityInput = document.getElementById('jiraMetaPriority');
  if (priorityInput) priorityInput.value = data.priorityLabel;

  const assigneeInput = document.getElementById('jiraMetaAssignee');
  if (assigneeInput) assigneeInput.value = data.owner;

  const textarea = document.getElementById('jiraTicketTextarea');
  const preview = document.getElementById('jiraTicketPreview');

  if (currentJiraModalFormat === 'preview') {
    if (textarea) textarea.style.display = 'none';
    if (preview) {
      preview.style.display = 'block';
      preview.innerHTML = data.previewHtml;
    }
  } else {
    if (preview) preview.style.display = 'none';
    if (textarea) {
      textarea.style.display = 'block';
      if (currentJiraModalFormat === 'jira') textarea.value = data.jiraMarkup;
      else if (currentJiraModalFormat === 'markdown') textarea.value = data.markdown;
      else if (currentJiraModalFormat === 'json') textarea.value = data.jsonPayload;
    }
  }
};

function showJiraFeedback(msg) {
  const fb = document.getElementById('jiraCopyFeedback');
  if (fb) {
    fb.textContent = msg || '✅ Copié dans le presse-papiers !';
    fb.style.display = 'inline-block';
    setTimeout(() => { fb.style.display = 'none'; }, 3000);
  }
}

window.copyJiraSummary = function() {
  const val = document.getElementById('jiraTicketSummaryInput')?.value || '';
  if (!val) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(val).then(() => showJiraFeedback('✅ Titre copié !'));
  }
};

window.copyJiraActiveContent = function() {
  if (!currentJiraModalIssue) return;
  const projectKey = (document.getElementById('jiraMetaProjectKey')?.value || 'BPMN').trim();
  const issueType = document.getElementById('jiraMetaIssueType')?.value || 'Bug';
  const data = generateJiraTicketData(currentJiraModalIssue, { projectKey, issueType });

  let textToCopy = data.jiraMarkup;
  if (currentJiraModalFormat === 'markdown') textToCopy = data.markdown;
  else if (currentJiraModalFormat === 'json') textToCopy = data.jsonPayload;
  else if (currentJiraModalFormat === 'preview') textToCopy = data.markdown;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => showJiraFeedback('✅ Description copiée !'));
  }
};

window.copyJiraFullTicket = function() {
  if (!currentJiraModalIssue) return;
  const projectKey = (document.getElementById('jiraMetaProjectKey')?.value || 'BPMN').trim();
  const issueType = document.getElementById('jiraMetaIssueType')?.value || 'Bug';
  const data = generateJiraTicketData(currentJiraModalIssue, { projectKey, issueType });

  let body = data.jiraMarkup;
  if (currentJiraModalFormat === 'markdown' || currentJiraModalFormat === 'preview') body = data.markdown;

  const fullText = `TITRE / SUMMARY :\n${data.summary}\n\nDESCRIPTION :\n${body}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => showJiraFeedback('✅ Titre + Description copiés !'));
  }
};

window.downloadJiraTicketFile = function() {
  if (!currentJiraModalIssue) return;
  const projectKey = (document.getElementById('jiraMetaProjectKey')?.value || 'BPMN').trim();
  const issueType = document.getElementById('jiraMetaIssueType')?.value || 'Bug';
  const data = generateJiraTicketData(currentJiraModalIssue, { projectKey, issueType });

  const ext = currentJiraModalFormat === 'json' ? 'json' : (currentJiraModalFormat === 'markdown' ? 'md' : 'txt');
  let content = data.jiraMarkup;
  if (currentJiraModalFormat === 'markdown' || currentJiraModalFormat === 'preview') content = data.markdown;
  else if (currentJiraModalFormat === 'json') content = data.jsonPayload;

  const filename = `ticket_jira_${(currentJiraModalIssue.elementId || 'bpmn')}_${currentJiraModalIssue.ruleId}.${ext}`;
  if (typeof dl === 'function') {
    dl(content, filename, 'text/plain;charset=utf-8;');
  }
};

window.copyBpmnLintSingleTicket = function(issue) {
  window.openBpmnLintTicketModal(issue);
};

window.copyBpmnLintSingleTicketByIndex = function(idx) {
  window.openBpmnLintTicketModalByIndex(idx);
};

window.copyBpmnLintFilteredIssuesMarkdown = function() {
  const issues = bpmnLintGetFilteredIssues();
  if (!issues.length) {
    alert('Aucun constat à copier.');
    return;
  }
  const summaryText = `# 📋 Plan d'Action BPMN — ${issues.length} anomalie(s) filtrée(s)\n\n` +
    issues.map((issue, idx) => `## #${idx + 1} [${issue.severity.toUpperCase()}] ${issue.rule} (${issue.fileName})\n` +
      `- **Élément :** \`${issue.elementId || issue.elementName || issue.elementType}\`\n` +
      `- **Responsable :** ${issue.suggestedOwner}\n` +
      `- **Constat :** ${issue.message}\n` +
      `- **Recommandation :** ${issue.recommendation}\n` +
      `- **Test recette :** ${issue.businessTest}\n`
    ).join('\n---\n\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summaryText).then(() => {
      alert(`📋 ${issues.length} ticket(s) copiés au format Markdown dans le presse-papiers !`);
    }).catch(() => {
      prompt('Copiez le texte ci-dessous :', summaryText);
    });
  } else {
    prompt('Copiez le texte ci-dessous :', summaryText);
  }
};

window.exportBpmnLintFilteredCsv = function() {
  const issues = bpmnLintGetFilteredIssues();
  if (!issues.length) {
    alert('Aucun constat ne correspond aux filtres actuels.');
    return;
  }
  const headers = ['Fichier', 'Gravité', 'Catégorie', 'Règle', 'ID Élément', 'Nom Élément', 'Type Élément', 'Constat', 'Responsable RACI', 'Recommandation', 'Test Recette'];
  const rows = issues.map(i => [
    i.fileName,
    i.severity,
    i.category,
    i.rule,
    i.elementId || '',
    i.elementName || '',
    i.elementType || '',
    i.message || '',
    i.suggestedOwner || '',
    i.recommendation || '',
    i.businessTest || ''
  ]);
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const now = new Date().toISOString().slice(0, 10);
  dl(csvContent, `Audit_BPMN_Plan_Action_${now}.csv`, 'text/csv;charset=utf-8;');
};

window.applyBpmnLintExtendedFixes = function() {
  if (!bpmnLintFiles.length) {
    alert('Aucun fichier BPMN chargé.');
    return;
  }
  let totalFixes = 0;

  bpmnLintFiles.forEach(file => {
    if (!file.xmlDoc) return;
    let fileFixes = 0;

    // 1. Nettoyage des espaces superflus
    lintElements(file.xmlDoc).forEach(el => {
      ['name', 'id'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && (val.startsWith(' ') || val.endsWith(' ') || /\s{2,}/.test(val))) {
          el.setAttribute(attr, val.trim().replace(/\s+/g, ' '));
          fileFixes++;
        }
      });
    });

    // 2. Formatage des IDs de process en kebab-case
    lintElements(file.xmlDoc).filter(el => lintLocalName(el) === 'process').forEach(proc => {
      const pid = proc.getAttribute('id');
      if (pid && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pid)) {
        const kebab = pid.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
        proc.setAttribute('id', kebab);
        fileFixes++;
      }
    });

    // 3. Ajout du '?' sur les passerelles exclusives XOR si manquant
    lintElements(file.xmlDoc).filter(el => lintLocalName(el) === 'exclusivegateway').forEach(gw => {
      const name = (gw.getAttribute('name') || '').trim();
      if (name && !name.endsWith('?')) {
        gw.setAttribute('name', name + ' ?');
        fileFixes++;
      }
    });

    // 4. Définir Implementation Type = "Camunda User task" sur les userTask
    lintElements(file.xmlDoc).filter(el => lintLocalName(el) === 'usertask').forEach(ut => {
      const type = ut.getAttribute('camunda:type') || ut.getAttribute('type');
      if (!type) {
        ut.setAttribute('camunda:type', 'external');
        fileFixes++;
      }
    });

    if (fileFixes > 0) {
      file.source = new XMLSerializer().serializeToString(file.xmlDoc);
      totalFixes += fileFixes;
    }
  });

  if (totalFixes === 0) {
    alert('Aucune correction automatique nécessaire. Vos diagrammes sont déjà conformes.');
  } else {
    alert(`✅ Auto-Fix étendu appliqué : ${totalFixes} correction(s) effectuée(s) !\nRelance de l'audit en cours...`);
    lintBuildReport();
    renderBpmnLintResults();
  }
};

function setBpmnLintPanel(panelName) {
  document.querySelectorAll('[data-bpmn-lint-panel]').forEach(panel => { panel.hidden = panel.dataset.bpmnLintPanel !== panelName; });
  document.querySelectorAll('[data-bpmn-lint-view]').forEach(button => button.classList.toggle('active', button.dataset.bpmnLintView === panelName));
}

window.initBpmnLintModule = function() {
  loadBpmnLintRules();
  renderBpmnLintRules();
  renderBpmnLintFiles();
  if (bpmnLintListenersReady) return;
  const zone = document.getElementById('bpmnLintDropZone');
  const input = document.getElementById('bpmnLintFileInput');
  const acceptFiles = files => addBpmnLintFiles(files);
  if (input) input.addEventListener('change', async event => {
    await acceptFiles(event.target.files);
    event.target.value = '';
  });
  if (zone) {
    zone.addEventListener('click', event => { if (event.target === zone || event.target.closest('.bpmn-lint-drop-content')) input?.click(); });
    zone.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.bpmn-lint-drop-content')) {
        event.preventDefault();
        input?.click();
      }
    });
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('drag'); acceptFiles(event.dataTransfer.files); });
  }
  bpmnLintListenersReady = true;
};

window.showBpmnLintPanel = setBpmnLintPanel;
window.addBpmnLintFiles = async function(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (window.validateFileSize && !window.validateFileSize(file)) continue;
    if (!/\.(bpmn|xml)$/i.test(file.name)) continue;
    const duplicate = bpmnLintFiles.some(item => item.fileName.toLowerCase() === file.name.toLowerCase());
    if (duplicate) {
      const replace = confirm(`Le fichier « ${file.name} » est déjà chargé. Le remplacer ?`);
      if (!replace) continue;
      bpmnLintFiles = bpmnLintFiles.filter(item => item.fileName.toLowerCase() !== file.name.toLowerCase());
    }
    const source = await file.text();
    try {
      const xmlDoc = new DOMParser().parseFromString(source, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      bpmnLintFiles.push({ fileName: file.name, source, xmlDoc: parserError ? null : xmlDoc, parseError: parserError ? parserError.textContent.trim() : '' });
    } catch (error) {
      bpmnLintFiles.push({ fileName: file.name, source, xmlDoc: null, parseError: error.message });
    }
  }
  window.bpmnLintFiles = bpmnLintFiles;
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = 'none';
  if (landscapeTab) landscapeTab.style.display = bpmnLintFiles.length ? '' : 'none';
  renderBpmnLintFiles();
  renderBpmnLintResults();
  if (document.getElementById('panel-bpmn-lint-results')?.classList.contains('active')) {
    switchTab('bpmn-lint-import');
  }
};

window.removeBpmnLintFile = function(index) {
  bpmnLintFiles.splice(index, 1);
  window.bpmnLintFiles = bpmnLintFiles;
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  if (resultTab) resultTab.style.display = 'none';
  renderBpmnLintFiles();
  renderBpmnLintResults();
  if (document.getElementById('panel-bpmn-lint-results')?.classList.contains('active')) {
    switchTab('bpmn-lint-import');
  }
};

window.clearBpmnLintFiles = function() {
  bpmnLintFiles = [];
  window.bpmnLintFiles = bpmnLintFiles;
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = 'none';
  if (landscapeTab) landscapeTab.style.display = 'none';
  renderBpmnLintFiles();
  renderBpmnLintResults();
};

window.runBpmnLint = function() {
  if (!bpmnLintFiles.length) return;
  lintBuildReport();
  const resultTab = document.getElementById('bpmnLintResultsTab');
  const landscapeTab = document.getElementById('bpmnLintLandscapeTab');
  if (resultTab) resultTab.style.display = '';
  if (landscapeTab) landscapeTab.style.display = '';
  switchTab('bpmn-lint-results');
};

let bpmnLintSearchDebounceTimer = null;
window.setBpmnLintIssueFilter = function(key, value) {
  if (key in bpmnLintFilters) {
    bpmnLintFilters[key] = value || (key === 'search' ? '' : 'all');
    if (key === 'severity') bpmnLintFilter = bpmnLintFilters[key];
    if (key === 'search') bpmnLintSearch = bpmnLintFilters[key];
  }
  bpmnLintVisibleLimit = 200;
  if (key === 'search') {
    clearTimeout(bpmnLintSearchDebounceTimer);
    bpmnLintSearchDebounceTimer = setTimeout(() => {
      renderBpmnLintResults();
    }, 150);
  } else {
    renderBpmnLintResults();
  }
};

window.resetBpmnLintFilters = function() {
  bpmnLintFilters = {
    severity: 'all',
    category: 'all',
    file: 'all',
    type: 'all',
    owner: 'all',
    search: ''
  };
  bpmnLintFilter = 'all';
  bpmnLintSearch = '';
  bpmnLintVisibleLimit = 200;
  
  const searchInput = document.getElementById('bpmnLintFilterSearch');
  if (searchInput) searchInput.value = '';
  const fileSelect = document.getElementById('bpmnLintFilterFile');
  if (fileSelect) fileSelect.value = 'all';
  const sevSelect = document.getElementById('bpmnLintFilterSeverity');
  if (sevSelect) sevSelect.value = 'all';
  const catSelect = document.getElementById('bpmnLintFilterCategory');
  if (catSelect) catSelect.value = 'all';
  const typeSelect = document.getElementById('bpmnLintFilterType');
  if (typeSelect) typeSelect.value = 'all';
  const ownerSelect = document.getElementById('bpmnLintFilterOwner');
  if (ownerSelect) ownerSelect.value = 'all';

  renderBpmnLintResults();
};

window.sortBpmnLintIssues = function(column) {
  if (bpmnLintSort.column === column) {
    bpmnLintSort.asc = !bpmnLintSort.asc;
  } else {
    bpmnLintSort.column = column;
    bpmnLintSort.asc = column === 'severity' ? false : true;
  }
  renderBpmnLintResults();
};

window.sortBpmnLintSummary = function(column) {
  if (bpmnLintSummarySort.column === column) {
    bpmnLintSummarySort.asc = !bpmnLintSummarySort.asc;
  } else {
    bpmnLintSummarySort.column = column;
    bpmnLintSummarySort.asc = column === 'score' || column === 'blockers' || column === 'warnings' ? false : true;
  }
  renderBpmnLintResults();
};

window.filterBpmnLintIssues = function(filter) {
  window.setBpmnLintIssueFilter('severity', filter);
};

window.searchBpmnLintIssues = function(value) {
  window.setBpmnLintIssueFilter('search', value);
};

window.showMoreBpmnLintIssues = function() {
  bpmnLintVisibleLimit += 200;
  renderBpmnLintResults();
};

window.bpmnLintToggleAllSections = function(expand) {
  document.querySelectorAll('#panel-bpmn-lint-results details.bpmn-lint-section-collapse, #panel-bpmn-lint-results details.bpmn-lint-details-collapse')
    .forEach(el => { el.open = !!expand; });
};

window.toggleBpmnLintRule = function(index, enabled) {
  if (!bpmnLintRules[index]) return;
  bpmnLintRules[index].enabled = enabled;
  saveBpmnLintRules();
  invalidateBpmnLintReport();
};

window.setBpmnLintSeverity = function(index, severity) {
  if (!bpmnLintRules[index] || !['blocker', 'error', 'warning', 'info'].includes(severity)) return;
  bpmnLintRules[index].severity = severity;
  saveBpmnLintRules();
  invalidateBpmnLintReport();
};

window.addBpmnLintCustomRule = function(event) {
  event?.preventDefault();
  const label = document.getElementById('bpmnLintCustomLabel').value.trim();
  const target = document.getElementById('bpmnLintCustomTarget').value;
  const attribute = document.getElementById('bpmnLintCustomAttribute').value;
  const pattern = document.getElementById('bpmnLintCustomPattern').value;
  const severity = document.getElementById('bpmnLintCustomSeverity').value;
  if (!label || !pattern) { alert('Saisissez un nom de règle et une expression régulière.'); return; }
  try { new RegExp(pattern); } catch (error) { alert(`Expression régulière invalide : ${error.message}`); return; }
  bpmnLintRules.push({ id: `team-${Date.now()}`, label, category: 'Règle équipe', target, attribute, pattern, severity, enabled: true, custom: true });
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
  event.target.reset();
};
window.deleteBpmnLintRule = function(index) {
  if (!bpmnLintRules[index]) return;
  bpmnLintRules.splice(index, 1);
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

let bpmnLintCurrentExportFormat = 'excel';

window.openBpmnLintExportModal = function() {
  if (!bpmnLintResults.length) {
    alert('Veuillez lancer un audit BPMN avant d’ouvrir le Studio d’Export.');
    return;
  }
  const modal = document.getElementById('bpmnLintExportModal');
  if (!modal) return;

  // Pré-remplir avec le fichier actif si disponible
  const scopeSelect = document.getElementById('exportScopeFiles');
  if (scopeSelect && bpmnLintViewerActiveFileName) {
    const activeOpt = scopeSelect.querySelector('option[value="active"]');
    if (activeOpt) activeOpt.textContent = `Uniquement « ${bpmnLintViewerActiveFileName} »`;
  }

  window.setBpmnLintExportFormat(bpmnLintCurrentExportFormat || 'excel');
  modal.style.display = 'flex';
};

window.closeBpmnLintExportModal = function() {
  const modal = document.getElementById('bpmnLintExportModal');
  if (modal) modal.style.display = 'none';
};

window.setBpmnLintExportFormat = function(format) {
  bpmnLintCurrentExportFormat = format;
  document.querySelectorAll('.export-format-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-format') === format);
  });
  const btn = document.getElementById('btnExecuteExport');
  if (btn) {
    const labels = {
      excel: '📊 Exporter Classeur Excel (.xlsx)',
      pdf: '📑 Imprimer / Exporter en PDF',
      html: '🌐 Télécharger Rapport HTML (.html)',
      csv: '📄 Exporter Tableau CSV (.csv)',
      markdown: '📝 Télécharger Pack Markdown (.md)',
      json: '⚙️ Exporter Archive JSON (.json)'
    };
    btn.textContent = labels[format] || '📥 Exporter le Rapport';
  }
};

function getExportConfigFromModal() {
  const format = bpmnLintCurrentExportFormat || 'excel';
  const scopeFiles = document.getElementById('exportScopeFiles')?.value || 'all';
  const scopeSeverity = document.getElementById('exportScopeSeverity')?.value || 'all';
  const customTitle = (document.getElementById('exportCustomTitle')?.value || "Rapport d'Audit Santé & Qualité BPMN 2.0").trim();
  const customAuthor = (document.getElementById('exportCustomAuthor')?.value || "Bouygues Telecom / Paprika").trim();

  const sections = {
    summary: document.getElementById('chkExportSummary')?.checked ?? true,
    matrix: document.getElementById('chkExportMatrix')?.checked ?? true,
    typology: document.getElementById('chkExportTypology')?.checked ?? true,
    files: document.getElementById('chkExportFiles')?.checked ?? true,
    issues: document.getElementById('chkExportRaci')?.checked ?? true,
    rules: document.getElementById('chkExportRules')?.checked ?? false
  };

  return { format, scopeFiles, scopeSeverity, customTitle, customAuthor, sections };
}

function buildConfiguredBpmnLintReportData(config) {
  let targetResults = bpmnLintResults;
  if (config.scopeFiles === 'active' && bpmnLintViewerActiveFileName) {
    targetResults = bpmnLintResults.filter(r => r.fileName === bpmnLintViewerActiveFileName);
  }

  let issues = targetResults.flatMap(r => r.issues || []);
  if (config.scopeSeverity === 'errors-only') {
    issues = issues.filter(i => ['blocker', 'error'].includes(i.severity));
  } else if (config.scopeSeverity === 'current-filters') {
    const filteredIds = new Set(bpmnLintGetFilteredIssues().map(i => `${i.fileName}_${i.elementId}_${i.ruleId}`));
    issues = issues.filter(i => filteredIds.has(`${i.fileName}_${i.elementId}_${i.ruleId}`));
  }

  const totalElements = targetResults.reduce((sum, r) => sum + (r.elementCount || 0), 0);
  const blockerCount = issues.filter(i => ['blocker', 'error'].includes(i.severity)).length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const averageCyclomatic = targetResults.length ? Math.round(targetResults.reduce((sum, r) => sum + (r.metrics?.cyclomatic || 1), 0) / targetResults.length) : 1;
  const averageScore = targetResults.length ? Math.round(targetResults.reduce((sum, r) => sum + (r.score || 0), 0) / targetResults.length) : 0;

  const readiness = blockerCount > 0 ? 'DÉPLOIEMENT BLOQUÉ (NO-GO)' : warningCount > 0 ? 'GO CONDITIONNEL (Réserves)' : 'GO PRODUCTION (100% Conforme)';

  // Matrice 2D Fichiers x Règles
  const activeRules = bpmnLintRules.filter(r => r.enabled);
  const matrix2D = targetResults.map(file => {
    const row = { fileName: file.fileName, score: file.score, totalIssues: file.issues.length };
    activeRules.forEach(rule => {
      row[rule.id] = (file.metrics?.ruleCounts || {})[rule.id] || 0;
    });
    return row;
  });

  return {
    title: config.customTitle,
    author: config.customAuthor,
    generatedAt: new Date().toISOString(),
    readiness,
    averageScore,
    summary: config.sections.summary ? {
      files: targetResults.length,
      elements: totalElements,
      blockers: blockerCount,
      warnings: warningCount,
      averageCyclomatic
    } : null,
    architecture: config.sections.summary ? { ...window.bpmnLintGraph } : null,
    matrix2D: config.sections.matrix ? matrix2D : null,
    typology: config.sections.typology ? targetResults.map(res => ({
      fileName: res.fileName,
      serviceTasks: res.metrics?.serviceTasks || 0,
      userTasks: res.metrics?.userTasks || 0,
      scriptTasks: res.metrics?.scriptTasks || 0,
      callActivities: res.metrics?.callActivities || 0,
      gateways: res.metrics?.gatewaysCount || 0,
      events: res.metrics?.eventsCount || 0,
      sequenceFlows: res.metrics?.sequenceFlowsCount || 0,
      cyclomatic: res.metrics?.cyclomatic || 1
    })) : null,
    files: config.sections.files ? targetResults.map(({ source, xmlDoc, ...file }) => ({
      fileName: file.fileName,
      score: file.score,
      status: file.status,
      processCount: file.processCount,
      elementCount: file.elementCount,
      blockers: file.blockers,
      warnings: file.warnings,
      cyclomatic: file.metrics?.cyclomatic || 1
    })) : null,
    issues: config.sections.issues ? issues : null,
    rules: config.sections.rules ? activeRules : null,
    scopeNotice: 'Audit statique certifié Bouygues Telecom / Paprika : vérifie les standards BPMN 2.0 (OMG), l’exécution Camunda 8/7 et la gouvernance d’architecture.'
  };
}

function generateBpmnLintHtmlReport(data) {
  const issuesList = data.issues || [];
  const rows = issuesList.map(issue => `
    <tr>
      <td><strong>${lintEscape(issue.fileName)}</strong></td>
      <td><span class="bpmn-badge-sev ${lintEscape(issue.severity)}">${lintEscape(issue.severity)}</span></td>
      <td>${lintEscape(issue.category)}</td>
      <td>${lintEscape(issue.rule)}</td>
      <td><code>${lintEscape(issue.elementId || issue.elementName || issue.elementType)}</code></td>
      <td>${lintEscape(issue.message)}</td>
      <td><strong>${lintEscape(issue.suggestedOwner)}</strong></td>
      <td>${lintEscape(issue.recommendation)}</td>
      <td><small>${lintEscape(issue.businessTest)}</small></td>
    </tr>`).join('');

  const activeRules = bpmnLintRules.filter(r => r.enabled);
  const matrixHeaders = `<tr><th>Diagramme BPMN</th><th>Score</th><th>Total</th>${activeRules.map(r => `<th>${lintEscape(r.label.length > 22 ? r.label.slice(0, 20) + '…' : r.label)}</th>`).join('')}</tr>`;
  const matrixRows = (data.matrix2D || []).map(row => `
    <tr>
      <td><strong>${lintEscape(row.fileName)}</strong></td>
      <td><strong>${row.score}%</strong></td>
      <td>${row.totalIssues}</td>
      ${activeRules.map(r => `<td style="text-align:center; ${row[r.id] ? 'background:#fee2e2; color:#991b1b; font-weight:bold;' : 'color:#94a3b8;'}">${row[r.id] || '-'}</td>`).join('')}
    </tr>`).join('');

  const typoRows = (data.typology || []).map(t => `
    <tr>
      <td><strong>${lintEscape(t.fileName)}</strong></td>
      <td>${t.serviceTasks}</td>
      <td>${t.userTasks}</td>
      <td>${t.scriptTasks}</td>
      <td>${t.callActivities}</td>
      <td>${t.gateways}</td>
      <td>${t.events}</td>
      <td>${t.sequenceFlows}</td>
      <td><strong>${t.cyclomatic}</strong></td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${lintEscape(data.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 30px; line-height: 1.5; background: #fff; }
    h1 { color: #003882; margin: 0 0 4px 0; font-size: 24px; font-weight: 800; }
    h2 { color: #003882; margin: 24px 0 10px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    .header-bar { border-bottom: 3px solid #009CD7; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .verdict-banner { padding: 16px 20px; border-radius: 10px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; background: ${data.summary?.blockers ? '#fef2f2; border: 1px solid #f87171;' : data.summary?.warnings ? '#fffbeb; border: 1px solid #fcd34d;' : '#f0fdf4; border: 1px solid #86efac;'}; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .kpi-box { padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
    .kpi-box .val { font-size: 24px; font-weight: 800; color: #003882; }
    .kpi-box .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0 24px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 11.5px; }
    .bpmn-badge-sev { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .bpmn-badge-sev.blocker, .bpmn-badge-sev.error { background: #fee2e2; color: #991b1b; }
    .bpmn-badge-sev.warning { background: #fef3c7; color: #92400e; }
    .bpmn-badge-sev.info { background: #e0f2fe; color: #0369a1; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 11px; color: #0f172a; font-family: monospace; }
    section { margin-top: 28px; page-break-inside: avoid; }
    .notice { padding: 12px 16px; background: #fff7ed; border-left: 4px solid #ea580c; font-size: 12px; color: #7c2d12; border-radius: 6px; margin-top: 24px; }
    @media print { body { margin: 8mm; } section { page-break-inside: avoid; } .no-print { display:none; } }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <h1>${lintEscape(data.title)}</h1>
      <p style="margin:0; color:#64748b; font-size:13px;">${lintEscape(data.author)} · Moteur d'Audit & Gouvernance Paprika AuditFlow</p>
    </div>
    <div style="text-align:right; font-size:12px; color:#64748b;">
      Généré le <strong>${lintEscape(new Date(data.generatedAt).toLocaleString('fr-FR'))}</strong>
    </div>
  </div>

  ${data.summary ? `
  <div class="verdict-banner">
    <div>
      <span style="font-size:11px; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; color:${data.summary.blockers ? '#991b1b' : data.summary.warnings ? '#92400e' : '#166534'};">VERDICT DE DÉPLOIEMENT</span>
      <h2 style="margin:4px 0 0; font-size:18px; color:#0f172a; border:none; padding:0;">${lintEscape(data.readiness)}</h2>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-box"><div class="val">${data.summary.files}</div><div class="lbl">Fichiers BPMN</div></div>
    <div class="kpi-box"><div class="val">${data.averageScore}%</div><div class="lbl">Score Moyen</div></div>
    <div class="kpi-box"><div class="val" style="color:#dc2626;">${data.summary.blockers}</div><div class="lbl">Bloquants / Erreurs</div></div>
    <div class="kpi-box"><div class="val" style="color:#d97706;">${data.summary.warnings}</div><div class="lbl">Avertissements</div></div>
  </div>` : ''}

  ${data.matrix2D ? `
  <section>
    <h2>1. Matrice 2D des Risques (BPMN × Catégories de règles)</h2>
    <table>${matrixHeaders}${matrixRows}</table>
  </section>` : ''}

  ${data.typology ? `
  <section>
    <h2>2. Répartition Typologique &amp; Mix d'Automatisation</h2>
    <table>
      <thead>
        <tr>
          <th>Fichier BPMN</th>
          <th>Service Tasks</th>
          <th>User Tasks</th>
          <th>Script Tasks</th>
          <th>Call Activities</th>
          <th>Gateways</th>
          <th>Events</th>
          <th>Flux Séquentiels</th>
          <th>Complexité Cyclomatique</th>
        </tr>
      </thead>
      <tbody>${typoRows}</tbody>
    </table>
  </section>` : ''}

  ${data.files ? `
  <section>
    <h2>3. Synthèse de Santé &amp; Fiches par Diagramme</h2>
    <table>
      <thead>
        <tr>
          <th>Fichier BPMN</th>
          <th>Score</th>
          <th>Statut</th>
          <th>Processus</th>
          <th>Éléments</th>
          <th>Bloquants</th>
          <th>Avertissements</th>
          <th>Complexité</th>
        </tr>
      </thead>
      <tbody>${data.files.map(f => `
        <tr>
          <td><strong>${lintEscape(f.fileName)}</strong></td>
          <td><strong>${f.score}%</strong></td>
          <td>${lintEscape(f.status)}</td>
          <td>${f.processCount}</td>
          <td>${f.elementCount}</td>
          <td style="color:${f.blockers ? '#dc2626; font-weight:bold;' : 'inherit'};">${f.blockers}</td>
          <td style="color:${f.warnings ? '#d97706; font-weight:bold;' : 'inherit'};">${f.warnings}</td>
          <td>${f.cyclomatic}</td>
        </tr>`).join('')}</tbody>
    </table>
  </section>` : ''}

  ${data.issues ? `
  <section>
    <h2>4. Plan d'Action RACI, Remédiation &amp; Recette</h2>
    <table>
      <thead>
        <tr>
          <th>Fichier BPMN</th>
          <th>Sévérité</th>
          <th>Catégorie</th>
          <th>Règle</th>
          <th>Élément</th>
          <th>Constat</th>
          <th>Responsable RACI</th>
          <th>Recommandation</th>
          <th>Test de Recette</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center;">Aucune anomalie détectée.</td></tr>'}</tbody>
    </table>
  </section>` : ''}

  <div class="notice">
    <strong>Note de conformité :</strong> ${lintEscape(data.scopeNotice)}
  </div>
</body>
</html>`;
}

function generateBpmnLintMarkdownReport(data) {
  let md = `# 📋 ${data.title}\n\n`;
  md += `> **Organisation :** ${data.author} | **Date :** ${new Date(data.generatedAt).toLocaleString('fr-FR')}\n\n`;
  md += `## 🎯 Verdict de Déploiement : **${data.readiness}** (Score Moyen : **${data.averageScore}%**)\n\n`;

  if (data.summary) {
    md += `### 📊 Synthèse Globale\n`;
    md += `- **Fichiers BPMN analysés :** ${data.summary.files}\n`;
    md += `- **Éléments vérifiés :** ${data.summary.elements}\n`;
    md += `- **Anomalies bloquantes / erreurs :** ${data.summary.blockers}\n`;
    md += `- **Avertissements :** ${data.summary.warnings}\n`;
    md += `- **Complexité cyclomatique moyenne :** ${data.summary.averageCyclomatic}\n\n`;
  }

  if (data.files && data.files.length) {
    md += `### 📁 Santé par Diagramme BPMN\n\n`;
    md += `| Fichier | Score | Statut | Processus | Éléments | Bloquants | Avertissements | Cyclomatique |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    data.files.forEach(f => {
      md += `| \`${f.fileName}\` | **${f.score}%** | ${f.status} | ${f.processCount} | ${f.elementCount} | ${f.blockers} | ${f.warnings} | ${f.cyclomatic} |\n`;
    });
    md += `\n`;
  }

  if (data.issues && data.issues.length) {
    md += `### 🛠️ Plan d'Action RACI & Remédiation (${data.issues.length} anomalie(s))\n\n`;
    data.issues.forEach((issue, idx) => {
      md += `#### #${idx + 1} [${issue.severity.toUpperCase()}] ${issue.rule} — \`${issue.fileName}\`\n`;
      md += `- **Composant :** \`${issue.elementId || issue.elementName || issue.elementType}\` (${issue.elementType})\n`;
      md += `- **Catégorie :** ${issue.category} | **Responsable RACI :** **${issue.suggestedOwner}**\n`;
      md += `- **Constat :** ${issue.message}\n`;
      md += `- **Action recommandée :** ${issue.recommendation}\n`;
      md += `- **Test recette / DoD :** ${issue.businessTest}\n\n`;
    });
  }

  md += `---\n*${data.scopeNotice}*\n`;
  return md;
}

window.previewBpmnLintReportInWindow = function() {
  if (!bpmnLintResults.length) { alert('Aucun audit chargé.'); return; }
  const config = getExportConfigFromModal();
  const data = buildConfiguredBpmnLintReportData(config);
  const html = generateBpmnLintHtmlReport(data);

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    alert('La fenêtre d’aperçu a été bloquée par votre navigateur.');
    return;
  }
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
};

window.executeBpmnLintConfiguredExport = async function() {
  if (!bpmnLintResults.length) { alert('Aucun audit à exporter.'); return; }
  const config = getExportConfigFromModal();
  const data = buildConfiguredBpmnLintReportData(config);
  const baseName = config.customTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  if (config.format === 'json') {
    dl(JSON.stringify(data, null, 2), `${baseName}.json`, 'application/json;charset=utf-8;');
    closeBpmnLintExportModal();
    return;
  }

  if (config.format === 'markdown') {
    const md = generateBpmnLintMarkdownReport(data);
    dl(md, `${baseName}.md`, 'text/markdown;charset=utf-8;');
    closeBpmnLintExportModal();
    return;
  }

  if (config.format === 'csv') {
    const lines = [['Type', 'Fichier', 'Sévérité', 'Catégorie', 'Règle', 'ID Élément', 'Nom Élément', 'Constat', 'Responsable RACI', 'Recommandation', 'Test Recette']];
    if (data.summary) {
      lines.push(['Synthèse', '', '', '', 'Verdict Déploiement', '', '', data.readiness, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Score moyen', '', '', `${data.averageScore}%`, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Fichiers BPMN', '', '', data.summary.files, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Éléments analysés', '', '', data.summary.elements, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Bloquants', '', '', data.summary.blockers, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Avertissements', '', '', data.summary.warnings, '', '', '']);
    }
    (data.issues || []).forEach(issue => {
      lines.push(['Anomalie', issue.fileName, issue.severity, issue.category, issue.rule, issue.elementId || '', issue.elementName || '', issue.message, issue.suggestedOwner || '', issue.recommendation || '', issue.businessTest || '']);
    });
    const csv = lines.map(row => row.map(lintSafeQuote).join(',')).join('\r\n');
    dl('\uFEFF' + csv, `${baseName}.csv`, 'text/csv;charset=utf-8;');
    closeBpmnLintExportModal();
    return;
  }

  if (config.format === 'excel') {
    if (!window.XLSX) { alert('La bibliothèque SheetJS/Excel n’est pas disponible. Choisissez le format HTML ou CSV.'); return; }
    const safeJsonRows = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? lintSafeFormula(value) : value])));
    const workbook = XLSX.utils.book_new();

    // 1. Synthèse
    if (data.summary) {
      const summaryRows = [
        [data.title.toUpperCase()],
        ['Auteur / Organisation', data.author],
        ['Généré le', new Date(data.generatedAt).toLocaleString('fr-FR')],
        ['Verdict Global de Déploiement', data.readiness],
        ['Score Moyen de Santé', `${data.averageScore}%`],
        ['Complexité Cyclomatique Moyenne', data.summary.averageCyclomatic],
        ['Nombre Total de Fichiers BPMN', data.summary.files],
        ['Nombre Total d’Éléments Analysés', data.summary.elements],
        ['Anomalies Bloquantes / Erreurs', data.summary.blockers],
        ['Avertissements', data.summary.warnings]
      ];
      if (data.architecture) {
        summaryRows.push([]);
        summaryRows.push(['ARCHITECTURE DES PROCESSUS & CALL ACTIVITIES']);
        summaryRows.push(['Processus Détectés', data.architecture.processCount || 0]);
        summaryRows.push(['Call Activities', data.architecture.callCount || 0]);
        summaryRows.push(['Processus Cibles Absents', data.architecture.missingTargetCount || 0]);
        summaryRows.push(['Cycles d’Appels', data.architecture.cycleCount || 0]);
        summaryRows.push(['Profondeur Maximale', data.architecture.maxDepth || 0]);
      }
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA(summaryRows)), 'Synthèse Exécutive');
    }

    // 2. Matrice 2D
    if (data.matrix2D?.length) {
      const activeRules = bpmnLintRules.filter(r => r.enabled);
      const matrixHeaders = ['Fichier BPMN', 'Score Santé', 'Total Anomalies', ...activeRules.map(r => `${r.label} [${r.category}]`)];
      const matrixRows = data.matrix2D.map(row => [
        row.fileName,
        `${row.score}%`,
        row.totalIssues,
        ...activeRules.map(r => row[r.id] || 0)
      ]);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA([matrixHeaders, ...matrixRows])), 'Matrice 2D Risques');
    }

    // 3. Typologies
    if (data.typology?.length) {
      const typoHeaders = ['Fichier BPMN', 'Service Tasks', 'User Tasks', 'Script Tasks', 'Call Activities', 'Gateways', 'Events', 'Flux Séquentiels', 'Complexité Cyclomatique'];
      const typoRows = data.typology.map(t => [
        t.fileName,
        t.serviceTasks,
        t.userTasks,
        t.scriptTasks,
        t.callActivities,
        t.gateways,
        t.events,
        t.sequenceFlows,
        t.cyclomatic
      ]);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA([typoHeaders, ...typoRows])), 'Mix Automatisation');
    }

    // 4. Fiches BPMN
    if (data.files?.length) {
      const fileRows = data.files.map(f => ({
        'Fichier BPMN': f.fileName,
        'Score (%)': f.score,
        'Statut': f.status,
        'Processus': f.processCount,
        'Éléments': f.elementCount,
        'Bloquants': f.blockers,
        'Avertissements': f.warnings,
        'Complexité': f.cyclomatic
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeJsonRows(fileRows)), 'Fiches Diagrammes');
    }

    // 5. Plan d'Action RACI
    if (data.issues?.length) {
      const raciRows = data.issues.map(issue => ({
        'Fichier BPMN': issue.fileName,
        'Sévérité': issue.severity,
        'Catégorie': issue.category,
        'Règle': issue.rule,
        'ID Élément': issue.elementId || '',
        'Nom Élément': issue.elementName || issue.elementType || '',
        'Constat Détaillé': issue.message,
        'Responsable RACI': issue.suggestedOwner || '',
        'Recommandation': issue.recommendation || '',
        'Test de Recette / DoD': issue.businessTest || ''
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeJsonRows(raciRows)), 'Plan d’Action RACI');
    }

    // 6. Référentiel des Règles
    if (data.rules?.length) {
      const ruleRows = data.rules.map(r => ({
        'ID Règle': r.id,
        'Libellé': r.label,
        'Catégorie': r.category,
        'Sévérité': r.severity,
        'Actif': r.enabled ? 'Oui' : 'Non'
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeJsonRows(ruleRows)), 'Règles d’Audit');
    }

    XLSX.writeFile(workbook, `${baseName}.xlsx`);
    closeBpmnLintExportModal();
    return;
  }

  // HTML / PDF
  const reportHtml = generateBpmnLintHtmlReport(data);
  if (config.format === 'html') {
    dl(reportHtml, `${baseName}.html`, 'text/html;charset=utf-8;');
    closeBpmnLintExportModal();
  } else {
    // PDF via print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('La fenêtre d’impression PDF a été bloquée. Le rapport a été téléchargé en HTML.');
      dl(reportHtml, `${baseName}.html`, 'text/html;charset=utf-8;');
      closeBpmnLintExportModal();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
    closeBpmnLintExportModal();
  }
};

window.exportBpmnLintReport = function() {
  window.openBpmnLintExportModal();
};

window.applyBpmnLintSafeFixes = async function(applySemanticNaming = false) {
  if (!bpmnLintFiles.length) return;
  const validFiles = bpmnLintFiles.filter(file => file.xmlDoc);
  if (!validFiles.length) { alert('Aucun fichier BPMN analysable à corriger.'); return; }
  
  const corrected = validFiles.map(file => {
    const clone = file.xmlDoc.cloneNode(true);
    let changes = 0;
    
    // 1. Nettoyage des libellés et espaces
    lintElements(clone).forEach(element => {
      if (!element.hasAttribute('name')) return;
      const original = element.getAttribute('name');
      let updated = original.trim();
      
      if (applySemanticNaming) {
        const type = lintLocalName(element);
        // Passerelles XOR/OR -> ajout '?' si absent
        if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(type) && updated && !updated.endsWith('?')) {
          updated += ' ?';
        }
        // Passerelles AND -> suppression '?'
        if (type === 'parallelgateway' && updated && updated.includes('?')) {
          updated = updated.replace(/\?/g, '').trim();
        }
        // Process name -> Majuscule initiale
        if (type === 'process' && updated && /^[a-zà-öø-ÿ]/.test(updated)) {
          updated = updated.charAt(0).toUpperCase() + updated.slice(1);
        }
      }

      if (updated !== original) {
        element.setAttribute('name', updated);
        changes++;
      }
    });

    // 2. Correction des IDs de process en kebab-case si sémantique
    if (applySemanticNaming) {
      lintElements(clone).filter(el => lintLocalName(el) === 'process').forEach(proc => {
        const pid = proc.getAttribute('id');
        if (pid && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pid)) {
          const newId = lintConvertToKebabCase(pid);
          if (newId && newId !== pid) {
            proc.setAttribute('id', newId);
            changes++;
          }
        }
      });
    }

    return { fileName: file.fileName, source: new XMLSerializer().serializeToString(clone), changes };
  });

  const changedCount = corrected.reduce((sum, file) => sum + file.changes, 0);
  if (!changedCount) {
    alert(applySemanticNaming 
      ? 'Toutes les conventions de nommage et libellés sont déjà conformes dans ces fichiers.' 
      : 'Aucun espace superflu détecté.');
    return;
  }
  
  if (validFiles.length !== bpmnLintFiles.length) alert(`${bpmnLintFiles.length - validFiles.length} fichier(s) XML invalide(s) seront exclus du pack corrigé.`);
  
  if (corrected.length > 1 && window.JSZip) {
    const zip = new JSZip();
    corrected.forEach(file => zip.file(file.fileName.replace(/\.(bpmn|xml)$/i, (_, extension) => `_lint-corrected.${extension.toLowerCase()}`), file.source));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'auditflow_bpmn_corriges.zip'; anchor.click(); URL.revokeObjectURL(url);
  } else {
    corrected.forEach(file => dl(file.source, file.fileName.replace(/\.(bpmn|xml)$/i, (_, extension) => `_lint-corrected.${extension.toLowerCase()}`), 'application/xml;charset=utf-8;'));
  }
  
  alert(`${changedCount} correction(s) appliquée(s). Les fichiers corrigés ont été téléchargés sans altérer les originaux.`);
};

window.downloadCorrectedBpmnFile = function() {
  window.applyBpmnLintSafeFixes(true);
};

window.importBpmnLintRulesFromInput = function(input) {
  const file = input.files && input.files[0];
  window.importBpmnLintRules(file);
  input.value = '';
};

// Fermeture des modales via touche Escape & clic extérieur
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      window.closeJiraTicketModal?.();
      window.closeBpmnLintExportModal?.();
    }
  });

  window.addEventListener('click', function(event) {
    const jiraModal = document.getElementById('jiraTicketModal');
    if (jiraModal && event.target === jiraModal) {
      window.closeJiraTicketModal();
    }
    const exportModal = document.getElementById('bpmnLintExportModal');
    if (exportModal && event.target === exportModal) {
      window.closeBpmnLintExportModal();
    }
  });
}


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
          html: `<div title="${elIssues.length} anomalie(s) : ${lintEscape(elIssues.map(i => i.rule).join(' | '))}" style="background:${hasBlocker ? '#dc2626' : '#ea580c'}; color:#fff; border-radius:10px; padding:1px 6px; font-size:10px; font-weight:800; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.35);">${elIssues.length}</div>`
        });
      } catch (e) {}
    }
  });
};

if (typeof window !== 'undefined') {
  window.auditBpmnLintFile = auditBpmnLintFile;
  window.loadBpmnLintRules = loadBpmnLintRules;
  window.DEFAULT_BPMN_LINT_RULES = DEFAULT_BPMN_LINT_RULES;
  window.setBpmnLintFiles = setBpmnLintFiles;
  window.getBpmnLintFiles = getBpmnLintFiles;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { auditBpmnLintFile, loadBpmnLintRules, DEFAULT_BPMN_LINT_RULES, setBpmnLintFiles, getBpmnLintFiles };
}
