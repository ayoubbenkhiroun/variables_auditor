const BPMN_LINT_RULES_KEY = 'auditflow_bpmn_lint_rules_v1';

const DEFAULT_BPMN_LINT_RULES = [
  { id: 'definitions-root', label: 'Racine BPMN definitions', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'definitions-namespace', label: 'Namespace BPMN 2.0 valide', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'process-id', label: 'ID technique de processus présent', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'duplicate-process-id-batch', label: 'IDs de processus uniques dans le lot', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'duplicate-id', label: 'Identifiants BPMN uniques', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'flow-references', label: 'Références des flux résolues', category: 'Structure', severity: 'blocker', enabled: true },
  { id: 'call-target', label: 'Cible de Call Activity renseignée', category: 'Structure', severity: 'error', enabled: true },
  { id: 'call-target-provided', label: 'Processus appelé fourni dans le lot', category: 'Dépendances', severity: 'warning', enabled: true },
  { id: 'call-cycle', label: 'Absence de cycle entre processus appelés', category: 'Dépendances', severity: 'error', enabled: true },
  { id: 'process-name', label: 'Nom de processus documenté', category: 'Documentation', severity: 'warning', enabled: true },
  { id: 'process-executable', label: 'Processus marqué exécutable', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'start-event', label: 'Événement de début présent', category: 'Structure', severity: 'error', enabled: true },
  { id: 'multiple-none-start-events', label: 'Événement de début None unique', category: 'Structure', severity: 'error', enabled: true },
  { id: 'end-event', label: 'Événement de fin présent', category: 'Structure', severity: 'error', enabled: true },
  { id: 'event-subprocess-structure', label: 'Sous-processus événementiel conforme', category: 'Structure', severity: 'error', enabled: true },
  { id: 'unreachable-node', label: 'Éléments atteignables depuis un événement de début', category: 'Structure', severity: 'warning', enabled: true },
  { id: 'dead-end-node', label: 'Éléments reliés à un chemin de sortie', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'no-path-to-end', label: 'Chemin possible vers une fin', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'start-incoming', label: 'Début sans flux entrant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'end-outgoing', label: 'Fin sans flux sortant', category: 'Structure', severity: 'error', enabled: true },
  { id: 'gateway-branches', label: 'Passerelles avec branches suffisantes', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'parallel-gateway-condition', label: 'Passerelle parallèle (AND) sans condition', category: 'Modélisation', severity: 'error', enabled: true },
  { id: 'exclusive-gateway-default', label: 'Passerelle exclusive avec branche par défaut', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'gateway-mixed', label: 'Séparation convergence et divergence (Join / Split)', category: 'Modélisation', severity: 'info', enabled: false },
  { id: 'conditional-flow-source', label: 'Flux conditionnel issu d’une passerelle de décision', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'default-flow-reference', label: 'Branche par défaut résolue', category: 'Structure', severity: 'error', enabled: true },
  { id: 'flow-node-id', label: 'ID technique des éléments de flux présent', category: 'Structure', severity: 'error', enabled: true },
  { id: 'empty-name', label: 'Libellés des éléments renseignés', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'task-imperative', label: 'Tâches formulées avec un verbe d’action', category: 'Nommage', severity: 'warning', enabled: false },
  { id: 'subprocess-noun-phrase', label: 'Sous-processus formulé en phrase nominale', category: 'Nommage', severity: 'warning', enabled: false },
  { id: 'event-start-past-participle', label: 'Événement de début : Objet + Participe passé', category: 'Nommage', severity: 'warning', enabled: false },
  { id: 'event-end-state', label: 'Événement de fin formulé en état final', category: 'Nommage', severity: 'warning', enabled: false },
  { id: 'gateway-question', label: 'Passerelles de décision formulées en question', category: 'Nommage', severity: 'warning', enabled: true },
  { id: 'gateway-flow-label', label: 'Branches de décision explicites', category: 'Modélisation', severity: 'warning', enabled: true },
  { id: 'service-implementation', label: 'Implémentation des tâches de service définie', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'user-assignment', label: 'Affectation des tâches utilisateur définie', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'script-content', label: 'Contenu des scripts présent', category: 'Déploiement', severity: 'error', enabled: true },
  { id: 'timer-definition', label: 'Définition temporelle des minuteurs (Timer)', category: 'Déploiement', severity: 'error', enabled: true },
  { id: 'error-definition', label: 'Définition d’erreur sur événements Error', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'message-definition', label: 'Définition de message sur événements Message', category: 'Déploiement', severity: 'warning', enabled: true },
  { id: 'boundary-reference', label: 'Événements de bordure rattachés', category: 'Structure', severity: 'error', enabled: true },
  { id: 'boundary-target', label: 'Cible de bordure valide', category: 'Structure', severity: 'error', enabled: true },
  { id: 'lane-reference', label: 'Références de lanes résolues', category: 'Structure', severity: 'error', enabled: true },
  { id: 'lane-assignment', label: 'Activités affectées à une lane', category: 'Gouvernance', severity: 'info', enabled: false },
  { id: 'diagram-layout', label: 'Diagramme avec informations de mise en page', category: 'Documentation', severity: 'info', enabled: false },
  { id: 'variable-naming', label: 'Variables conformes aux règles actives', category: 'Nommage', severity: 'error', enabled: true }
];

let bpmnLintFiles = [];
let bpmnLintResults = [];
let bpmnLintRules = [];
let bpmnLintListenersReady = false;
let bpmnLintFilter = 'all';
let bpmnLintSearch = '';
let bpmnLintVisibleLimit = 200;
window.bpmnLintResults = bpmnLintResults;
window.bpmnLintGraph = { processCount: 0, callCount: 0, missingTargetCount: 0, cycleCount: 0, roots: [], maxDepth: 0 };

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
  const text = String(expression || '');
  if (!/(?:\$\{|#\{|^\s*=)/.test(text)) return [];
  const clean = text
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ')
    .replace(/\.\s*[A-Za-z_][A-Za-z0-9_]*/g, ' ');
  const reserved = new Set(['true', 'false', 'null', 'empty', 'and', 'or', 'not', 'if', 'then', 'else', 'for', 'in', 'return', 'some', 'every', 'satisfies', 'instance', 'of', 'count', 'sum', 'min', 'max', 'avg', 'date', 'time', 'duration', 'years', 'months', 'days', 'hours', 'minutes', 'seconds', 'execution', 'task', 'authenticatedUserId', 'getVariable', 'setVariable']);
  return Array.from(new Set((clean.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(name => !reserved.has(name.toLowerCase()))));
}

function lintFlowScope(element) {
  let current = element && element.parentElement;
  while (current) {
    if (['process', 'subprocess'].includes(lintLocalName(current))) return current;
    current = current.parentElement;
  }
  return null;
}

function loadBpmnLintRules() {
  try {
    const saved = JSON.parse(localStorage.getItem(BPMN_LINT_RULES_KEY) || 'null');
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

function lintAddIssue(issues, ruleId, element, message, fileName, severityOverride) {
  const rule = lintRule(ruleId);
  if (!rule) return;
  const guidance = lintIssueGuidance(ruleId, element, message);
  issues.push({
    fileName,
    ruleId,
    rule: rule.label,
    category: rule.category,
    severity: severityOverride || rule.severity,
    elementType: element ? lintLocalName(element) : 'document',
    elementId: element ? lintAttribute(element, ['id']) : '',
    elementName: element ? lintAttribute(element, ['name']) : '',
    message,
    recommendation: guidance.recommendation,
    suggestedOwner: guidance.owner,
    businessTest: guidance.businessTest
  });
}

function lintIssueGuidance(ruleId, element, message) {
  const id = element ? lintAttribute(element, ['id']) : '';
  const checks = {
    'definitions-root': ['Réexporter le diagramme depuis un modeleur BPMN conforme au standard 2.0.', 'Équipe modélisation', 'Importer le fichier dans le modeleur cible et vérifier que le diagramme s’ouvre sans erreur.'],
    'definitions-namespace': ['Vérifier le namespace BPMN 2.0 et régénérer le XML depuis le modeleur.', 'Équipe modélisation', 'Ouvrir puis réexporter le modèle avec la version de modeleur supportée.'],
    'process-id': ['Attribuer un ID technique unique au processus.', 'Équipe modélisation', 'Déployer le modèle et vérifier que le processus attendu apparaît dans le moteur.'],
    'duplicate-process-id-batch': ['Renommer les processus pour obtenir des IDs uniques dans le lot déployé.', 'Équipe architecture', 'Déployer le lot complet et vérifier qu’aucune définition n’écrase une autre.'],
    'duplicate-id': ['Générer un nouvel ID unique pour chaque élément concerné, puis vérifier toutes ses références.', 'Équipe modélisation', 'Valider que les flux, lanes et références pointent vers le bon élément après renommage.'],
    'flow-references': ['Corriger la référence sourceRef/targetRef vers un élément du même scope de flux.', 'Équipe modélisation', 'Rejouer le chemin concerné et confirmer que le jeton passe par le nœud attendu.'],
    'call-target': ['Renseigner calledElement ou la définition Zeebe du processus appelé.', 'Équipe Camunda', 'Démarrer le processus parent et vérifier que le sous-processus est invoqué.'],
    'call-target-provided': ['Ajouter le BPMN cible au package, ou documenter et valider son déploiement externe.', 'Équipe architecture', 'Déployer parent et cible dans l’environnement d’intégration puis tester l’appel réel.'],
    'call-cycle': ['Vérifier les appels récursifs et définir une condition de terminaison ou supprimer le cycle.', 'Équipe architecture', 'Exécuter un scénario borné et vérifier qu’aucune récursion non maîtrisée ne persiste.'],
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
    'gateway-branches': ['Prévoir au moins deux branches sortantes pour cette décision ou supprimer la passerelle inutile.', 'Product Owner + Camunda', 'Tester chaque issue de la décision.'],
    'parallel-gateway-condition': ['Supprimer la condition sur le flux sortant de la passerelle parallèle (AND) ou utiliser une passerelle exclusive (XOR) / inclusive (OR).', 'Équipe Camunda', 'Vérifier que toutes les branches de la passerelle parallèle s’exécutent simultanément sans condition.'],
    'exclusive-gateway-default': ['Définir un flux par défaut (attribut default) sur la passerelle exclusive pour garantir une issue en cas d’absence de condition satisfaite.', 'Équipe Camunda + métier', 'Tester un scénario hors-cadre et confirmer la prise du chemin par défaut.'],
    'gateway-mixed': ['Séparer la passerelle en une passerelle de fusion (Join) suivie d’une passerelle de décision (Split).', 'Équipe modélisation', 'Vérifier la bonne synchronisation des jetons en amont et leur distribution en aval.'],
    'conditional-flow-source': ['Insérer une passerelle exclusive (XOR) ou inclusive (OR) après l’activité au lieu d’utiliser des flux conditionnels directs.', 'Équipe modélisation', 'Vérifier la lisibilité du diagramme et le routage des jetons selon la condition.'],
    'default-flow-reference': ['Pointer le flux par défaut vers une branche sortante existante du même scope.', 'Équipe Camunda', 'Tester le cas où aucune condition explicite ne correspond.'],
    'flow-node-id': ['Attribuer un ID technique stable et unique à l’élément.', 'Équipe modélisation', 'Réexporter puis redéployer le BPMN et vérifier ses références entrantes/sortantes.'],
    'empty-name': ['Ajouter un libellé métier court et actionnable.', 'Product Owner', 'Faire relire le libellé par un représentant métier.'],
    'task-imperative': ['Nommer l’activité avec un verbe d’action à l’infinitif et un complément.', 'Product Owner', 'Vérifier que le libellé décrit une action observable par l’utilisateur métier.'],
    'subprocess-noun-phrase': ['Nommer le sous-processus par une phrase nominale (ex: « Gestion des réclamations »).', 'Product Owner', 'Faire valider l’intitulé du sous-processus par les représentants métier.'],
    'event-start-past-participle': ['Formuler l’événement de début au format « Objet + Participe passé » (ex: « Demande reçue »).', 'Product Owner', 'Vérifier la clarté du déclencheur métier.'],
    'event-end-state': ['Nommer l’événement de fin en décrivant l’état métier final atteint (ex: « Commande expédiée »).', 'Product Owner', 'Confirmer la désignation de l’état final avec le métier.'],
    'gateway-question': ['Formuler la passerelle comme une question de décision.', 'Product Owner', 'Faire confirmer que les sorties couvrent toutes les réponses possibles.'],
    'gateway-flow-label': ['Documenter la condition de chaque branche ou désigner le flux par défaut.', 'Équipe Camunda + métier', 'Tester les valeurs aux frontières et vérifier une seule branche prise par scénario.'],
    'service-implementation': ['Configurer le type de tâche, le worker, la classe ou l’expression attendue.', 'Équipe Camunda', 'Vérifier l’activation du worker et traiter au moins un job de bout en bout.'],
    'user-assignment': ['Définir assignee, candidate users/groups ou assignmentDefinition.', 'Équipe workflow', 'Créer une tâche utilisateur et vérifier sa visibilité par le bon rôle.'],
    'script-content': ['Ajouter le script et vérifier son format et son moteur d’exécution.', 'Équipe développement', 'Exécuter les cas nominaux, limites et erreurs du script.'],
    'timer-definition': ['Renseigner une durée (timeDuration), une date (timeDate) ou un cycle (timeCycle) ISO 8601 ou FEEL sur l’événement minuteur.', 'Équipe Camunda', 'Vérifier l’armement et le déclenchement du timer dans le moteur Camunda.'],
    'error-definition': ['Associer une référence d’erreur (errorRef) ou un code d’erreur métier (errorCode) à l’événement d’erreur.', 'Équipe Camunda', 'Déclencher l’erreur métier et valider la capture par le gestionnaire associé.'],
    'message-definition': ['Associer une référence de message (messageRef) ou un nom de message Zeebe à l’événement ou à la Receive Task.', 'Équipe Camunda', 'Publier le message et vérifier la corrélation d’instance.'],
    'boundary-reference': ['Renseigner attachedToRef vers l’activité protégée.', 'Équipe modélisation', 'Déclencher l’erreur ou le timeout et confirmer l’interruption/la reprise attendue.'],
    'boundary-target': ['Rattacher cet événement à une activité existante du même scope.', 'Équipe modélisation', 'Déclencher cet événement et vérifier le chemin d’exception.'],
    'lane-reference': ['Corriger la référence flowNodeRef vers l’ID existant.', 'Équipe modélisation', 'Vérifier que l’activité apparaît dans le bon rôle ou la bonne lane.'],
    'lane-assignment': ['Affecter l’activité à une lane ou documenter son rôle transverse.', 'Product Owner', 'Confirmer le propriétaire et le responsable de traitement du cas.'],
    'diagram-layout': ['Exporter le diagramme avec ses informations BPMNDiagram/BPMNPlane.', 'Équipe modélisation', 'Ouvrir le fichier dans le visualiseur prévu et vérifier la lisibilité du layout.'],
    'variable-naming': ['Appliquer la convention de nommage puis mettre à jour toutes les références de la variable.', 'Équipe Camunda', 'Tester le mapping entrant/sortant et la condition qui consomme la variable.']
  };
  const selected = checks[ruleId] || [
    'Examiner le constat et appliquer la convention d’équipe correspondante.',
    'Responsable du processus',
    'Ajouter un scénario métier couvrant le comportement concerné et valider le résultat attendu.'
  ];
  return { recommendation: selected[0], owner: selected[1], businessTest: selected[2], evidence: id || message };
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
  const issues = [];
  if (file.parseError || !file.xmlDoc) {
    issues.push({ fileName: file.fileName, ruleId: 'xml-parse', rule: 'XML BPMN analysable', category: 'Structure', severity: 'blocker', elementType: 'document', elementId: '', elementName: '', message: file.parseError || 'Document XML vide.' });
    return { ...file, issues, score: 0, elementCount: 0, status: 'Bloquant', processCount: 0 };
  }

  const root = file.xmlDoc.documentElement;
  const all = lintElements(file.xmlDoc);
  const processes = all.filter(element => lintLocalName(element) === 'process');
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
  if (root.namespaceURI !== 'http://www.omg.org/spec/BPMN/20100524/MODEL') {
    lintAddIssue(issues, 'definitions-namespace', root, 'Le document doit utiliser le namespace BPMN 2.0 du modèle OMG.', file.fileName);
  }
  if (!processes.length) {
    lintAddIssue(issues, 'process-id', root, 'Aucun élément process n’a été trouvé.', file.fileName);
  }

  idOwners.forEach((owners, id) => {
    if (owners.length > 1) owners.slice(1).forEach(element => lintAddIssue(issues, 'duplicate-id', element, `L’identifiant « ${id} » est utilisé ${owners.length} fois dans ce fichier.`, file.fileName));
  });

  processes.forEach(process => {
    const processId = lintAttribute(process, ['id']);
    if (!processId) lintAddIssue(issues, 'process-id', process, 'Le processus ne possède pas d’ID technique.', file.fileName);
    if (!lintAttribute(process, ['name'])) lintAddIssue(issues, 'process-name', process, 'Le processus n’a pas de nom métier.', file.fileName);
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
    }

    const reachable = new Set(starts.map(start => lintAttribute(start, ['id'])).filter(Boolean));
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
        lintAddIssue(issues, 'unreachable-node', node, `L’élément ${nodeId || type} n’est atteignable depuis aucun événement de début du processus.`, file.fileName);
      }
      if (!['startevent', 'endevent', 'boundaryevent'].includes(type) && nodeId && (!inCount || !outCount)) {
        lintAddIssue(issues, 'dead-end-node', node, `L’élément ${nodeId} n’a pas à la fois un flux entrant et un flux sortant.`, file.fileName);
      }
      if (ends.length && nodeId && reachable.has(nodeId) && !canReachEnd.has(nodeId) && type !== 'boundaryevent') {
        lintAddIssue(issues, 'no-path-to-end', node, `Aucun chemin depuis ${nodeId} ne mène à un événement de fin de ce scope.`, file.fileName);
      }
      if (type === 'startevent' && inCount) lintAddIssue(issues, 'start-incoming', node, 'Un événement de début possède un flux entrant.', file.fileName);
      if (type === 'endevent' && outCount) lintAddIssue(issues, 'end-outgoing', node, 'Un événement de fin possède un flux sortant.', file.fileName);
      
      if (['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway'].includes(type) && outCount === 1 && inCount <= 1) {
        lintAddIssue(issues, 'gateway-branches', node, 'Cette passerelle ne possède qu’une seule branche sortante.', file.fileName);
      }

      // Contrôle passerelle mixte (Join + Split simultané)
      if (['exclusivegateway', 'inclusivegateway', 'parallelgateway', 'eventbasedgateway', 'complexgateway'].includes(type) && inCount > 1 && outCount > 1) {
        lintAddIssue(issues, 'gateway-mixed', node, 'Passerelle mixte (convergence et divergence simultanées) : il est conseillé de séparer la passerelle de fusion de la passerelle de décision.', file.fileName);
      }

      // Contrôle de branche par défaut sur passerelle exclusive divergente
      if (type === 'exclusivegateway' && outCount >= 2) {
        const defaultId = lintAttribute(node, ['default']);
        const nodeFlows = scopedFlows.filter(flow => lintAttribute(flow, ['sourceRef']) === nodeId);
        const hasConditionalBranches = nodeFlows.some(flow => lintDescendants(flow, ['conditionExpression']).some(el => (el.textContent || '').trim()));
        if (hasConditionalBranches && !defaultId) {
          lintAddIssue(issues, 'exclusive-gateway-default', node, 'Cette passerelle exclusive (XOR) comporte des branches conditionnelles sans flux par défaut (default).', file.fileName);
        }
      }

      const defaultId = lintAttribute(node, ['default']);
      if (defaultId && !scopedFlows.some(flow => lintAttribute(flow, ['id']) === defaultId && lintAttribute(flow, ['sourceRef']) === nodeId)) {
        lintAddIssue(issues, 'default-flow-reference', node, `Le flux par défaut « ${defaultId} » n’est pas une branche sortante de cette passerelle.`, file.fileName);
      }
    });
  });

  flowNodes.forEach(node => {
    const type = lintLocalName(node);
    const id = lintAttribute(node, ['id']);
    const name = lintAttribute(node, ['name']);
    if (!id) lintAddIssue(issues, 'flow-node-id', node, `L’élément ${type} n’a pas d’ID technique.`, file.fileName);
    if (!name) lintAddIssue(issues, 'empty-name', node, `L’élément ${id || type} n’a pas de libellé.`, file.fileName);

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

    if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(type) && name && !name.trim().endsWith('?')) {
      lintAddIssue(issues, 'gateway-question', node, `La passerelle « ${name} » devrait exprimer une question (se terminant par un point d’interrogation).`, file.fileName);
    }
    if (type === 'callactivity' && !lintAttribute(node, ['calledElement', 'zeebe:calledElement'])) {
      const childTarget = lintDescendants(node, ['calledElement'])[0];
      if (!childTarget || !lintAttribute(childTarget, ['processId'])) lintAddIssue(issues, 'call-target', node, 'La Call Activity ne précise pas de processus appelé.', file.fileName);
    }
    if (type === 'servicetask') {
      const implementation = ['camunda:class', 'camunda:delegateExpression', 'camunda:expression', 'camunda:type', 'camunda:topic', 'zeebe:taskDefinition'].some(name => lintAttribute(node, [name]));
      const taskDefinition = lintDescendants(node, ['taskDefinition']).some(child => lintAttribute(child, ['type']));
      if (!implementation && !taskDefinition) lintAddIssue(issues, 'service-implementation', node, 'Aucune classe, expression, topic ou définition de tâche Zeebe n’est configurée.', file.fileName);
    }
    if (type === 'usertask') {
      const assignment = ['camunda:assignee', 'camunda:candidateUsers', 'camunda:candidateGroups', 'zeebe:assignee', 'zeebe:candidateGroups'].some(name => lintAttribute(node, [name]));
      const assignmentDefinition = lintDescendants(node, ['assignmentDefinition']).some(child => lintAttribute(child, ['assignee', 'candidateGroups']));
      if (!assignment && !assignmentDefinition) lintAddIssue(issues, 'user-assignment', node, 'Aucun assignee, candidat ou groupe candidat n’est défini.', file.fileName);
    }
    if (type === 'scripttask' && !lintDescendants(node, ['script']).some(script => (script.textContent || '').trim())) {
      lintAddIssue(issues, 'script-content', node, 'La Script Task ne contient pas de script exécutable.', file.fileName);
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
      if (!ref || !resolvesToFlowNode) lintAddIssue(issues, 'flow-references', flow, `La référence ${attribute} « ${ref || 'vide'} » ne correspond à aucun nœud de flux du fichier.`, file.fileName);
    });

    const sourceId = lintAttribute(flow, ['sourceRef']);
    const source = idOwners.get(sourceId)?.[0];
    const hasCondition = lintDescendants(flow, ['conditionExpression']).some(element => (element.textContent || '').trim());

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
    const target = lintAttribute(activity, ['calledElement', 'zeebe:calledElement']) || lintAttribute(lintDescendants(activity, ['calledElement'])[0], ['processId']);
    if (target && idToProcess.size && !idToProcess.has(target)) {
      lintAddIssue(issues, 'call-target-provided', activity, `Le processus appelé « ${target} » n’est pas inclus dans ce fichier.`, file.fileName);
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

  const variables = new Map();
  const addVariable = (name, element) => {
    const normalized = String(name || '').trim();
    if (normalized) variables.set(normalized, element);
  };
  all.forEach(element => {
    const type = lintLocalName(element);
    if (['inputparameter', 'outputparameter', 'input', 'output', 'in', 'out', 'formfield', 'property'].includes(type)) {
      addVariable(lintAttribute(element, ['name', 'target', 'id']), element);
      const source = lintAttribute(element, ['source']);
      if (source && !/[=$#]/.test(source)) addVariable(source, element);
    }
    if (['conditionexpression', 'script'].includes(type)) {
      lintExpressionIdentifiers(element.textContent).forEach(name => addVariable(name, element));
    }
    if (!['conditionexpression', 'script'].includes(type) && !element.children.length && /(?:\$\{|#\{|^\s*=)/.test((element.textContent || '').trim())) {
      lintExpressionIdentifiers(element.textContent).forEach(name => addVariable(name, element));
    }
    Array.from(element.attributes || []).forEach(attribute => {
      if (['sourceexpression', 'conditionexpression'].includes((attribute.localName || '').toLowerCase()) || /(?:\$\{|#\{|^\s*=)/.test(attribute.value)) {
        lintExpressionIdentifiers(attribute.value).forEach(name => addVariable(name, element));
      }
    });
  });
  if (lintRule('variable-naming') && typeof checkVariable === 'function') {
    variables.forEach((element, name) => {
      const result = checkVariable(name);
      result.issues.forEach(issue => lintAddIssue(issues, 'variable-naming', element, `Variable « ${name} » : ${issue.msg}`, file.fileName, issue.sev === 'warn' ? 'warning' : undefined));
    });
  }

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

function renderBpmnLintRules() {
  const body = document.getElementById('bpmnLintRulesBody');
  if (!body) return;
  body.innerHTML = bpmnLintRules.map((rule, index) => `
    <tr>
      <td><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleBpmnLintRule(${index}, this.checked)"></td>
      <td>${lintEscape(rule.label)}${rule.custom ? '<small class="bpmn-lint-custom-label">Personnalisée</small>' : ''}</td>
      <td>${lintEscape(rule.category || 'Équipe')}</td>
      <td>${rule.custom ? `${lintEscape(rule.target)} · ${lintEscape(rule.attribute || 'name')} · <code>${lintEscape(rule.pattern)}</code>` : 'Contrôle BPMN intégré'}</td>
      <td><select class="srt" onchange="setBpmnLintSeverity(${index}, this.value)">${['blocker', 'error', 'warning', 'info'].map(value => `<option value="${value}" ${rule.severity === value ? 'selected' : ''}>${value === 'blocker' ? 'Bloquant' : value === 'error' ? 'Erreur' : value === 'warning' ? 'Avertissement' : 'Info'}</option>`).join('')}</select></td>
      <td>${rule.custom ? `<button class="btn-ghost" onclick="deleteBpmnLintRule(${index})" aria-label="Supprimer la règle">Supprimer</button>` : ''}</td>
    </tr>`).join('');
}

let bpmnLintViewerInstance = null;
let bpmnLintViewerActiveFileName = null;

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
    modalSubTitle.textContent = result ? `${result.elementCount} éléments analysés · ${result.processCount} processus · Cliquez sur un constat pour localiser l’élément` : 'Visualisation du diagramme BPMN 2.0';
  }

  if (modalIssueCount) modalIssueCount.textContent = String(fileIssues.length);
  if (drawerBadge) drawerBadge.textContent = String(fileIssues.length);

  // Remplir le volet latéral des constats
  if (drawerList) {
    if (!fileIssues.length) {
      drawerList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-tertiary); font-size:12px;">✅ Aucun constat détecté sur ce fichier.</div>';
    } else {
      drawerList.innerHTML = fileIssues.map(issue => `
        <div class="bpmn-lint-drawer-item ${targetElementId && targetElementId === issue.elementId ? 'active' : ''}" onclick="bpmnLintFocusElement('${lintEscape(issue.elementId)}', this)">
          <div class="bpmn-lint-drawer-item-top">
            <strong>${lintEscape(issue.rule)}</strong>
            <span class="bpmn-lint-severity ${lintEscape(issue.severity)}">${lintEscape(issue.severity)}</span>
          </div>
          <p>${lintEscape(issue.message)}</p>
          <small>Élément : <code>${lintEscape(issue.elementId || issue.elementName || issue.elementType)}</code>${issue.suggestedOwner ? ` · Resp: ${lintEscape(issue.suggestedOwner)}` : ''}</small>
        </div>
      `).join('');
    }
  }

  modal.style.display = 'flex';

  // Nettoyer l'ancien canevas
  canvasContainer.innerHTML = '';
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

      canvas.zoom('fit-viewport');

      // Marquer visuellement les éléments ayant des anomalies
      fileIssues.forEach(issue => {
        if (!issue.elementId) return;
        const shape = elementRegistry.get(issue.elementId);
        if (!shape) return;

        const isBlocker = ['blocker', 'error'].includes(issue.severity);
        canvas.addMarker(issue.elementId, isBlocker ? 'bpmn-highlight-blocker' : 'bpmn-highlight-issue');

        try {
          overlays.add(issue.elementId, 'lint-badge', {
            position: { bottom: 0, right: 0 },
            html: `<div title="${lintEscape(issue.message)}" style="background:${isBlocker ? '#dc2626' : '#ea580c'}; color:#fff; border-radius:50%; width:18px; height:18px; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.3); cursor:pointer;">${isBlocker ? '!' : '⚠'}</div>`
          });
        } catch (e) {}
      });

      // Si un élément cible a été demandé, focus dessus
      if (targetElementId) {
        setTimeout(() => {
          bpmnLintFocusElement(targetElementId);
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

window.bpmnLintFocusElement = function(elementId, drawerItemEl) {
  if (!bpmnLintViewerInstance || !elementId) return;
  const canvas = bpmnLintViewerInstance.get('canvas');
  const elementRegistry = bpmnLintViewerInstance.get('elementRegistry');
  const shape = elementRegistry.get(elementId);
  if (!shape) return;

  // Nettoyer les focus existants
  elementRegistry.forEach(el => canvas.removeMarker(el.id, 'bpmn-highlight-focus'));

  // Ajouter marker focus
  canvas.addMarker(elementId, 'bpmn-highlight-focus');

  // Centrer et zoomer sur l'élément
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

  // Mettre en évidence dans le drawer
  if (drawerItemEl) {
    document.querySelectorAll('.bpmn-lint-drawer-item').forEach(i => i.classList.remove('active'));
    drawerItemEl.classList.add('active');
  }
};

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('bpmnLintViewerModal');
      if (modal && modal.style.display !== 'none') {
        closeBpmnLintViewer();
      }
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
  bpmnLintSearch = fileName || '';
  if (isCategory) {
    bpmnLintFilter = 'all';
  } else {
    // rule id
    const rule = bpmnLintRules.find(r => r.id === key);
    if (rule) bpmnLintSearch = rule.label;
  }
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

  // 3. Tableau Croisé 2D (BPMN x Règles actives)
  const matrix2dContainer = document.getElementById('bpmnLintMatrix2dContainer');
  if (matrix2dContainer) {
    const activeRules = bpmnLintRules.filter(r => r.enabled);
    const mHeaderHtml = `<tr><th style="min-width:180px;">Diagramme BPMN</th>${activeRules.map(r => `<th title="${lintEscape(r.label)} (${lintEscape(r.category)})">${lintEscape(r.label.length > 22 ? r.label.slice(0, 20) + '…' : r.label)}</th>`).join('')}<th>Total</th></tr>`;
    
    const mRowsHtml = results.map(res => {
      const rCounts = res.metrics?.ruleCounts || {};
      const rowCells = activeRules.map(r => {
        const c = rCounts[r.id] || 0;
        return `<td class="${c > 0 ? (['blocker', 'error'].includes(r.severity) ? 'cell-viol-err' : 'cell-viol-warn') : 'cell-viol-ok'}" onclick="bpmnLintFilterByMatrixCell('${lintEscape(res.fileName)}', '${lintEscape(r.id)}', false)" title="Filtrer règle « ${lintEscape(r.label)} » sur ${lintEscape(res.fileName)}">${c || '-'}</td>`;
      }).join('');
      return `<tr>
        <td>
          <a href="javascript:void(0)" class="bpmn-lint-clickable-file" onclick="openBpmnLintViewer('${lintEscape(res.fileName)}')">
            <span>🗺️</span> ${lintEscape(res.fileName)}
          </a>
        </td>
        ${rowCells}
        <td><strong>${res.issues.length}</strong></td>
      </tr>`;
    }).join('');

    matrix2dContainer.innerHTML = results.length ? `
      <div class="tbl-wrap bpmn-lint-matrix-scroll">
        <table class="bpmn-lint-matrix-tbl">
          <thead>${mHeaderHtml}</thead>
          <tbody>${mRowsHtml}</tbody>
        </table>
      </div>` : '<p class="bpmn-lint-empty-note">Aucune donnée disponible.</p>';
  }

  const summaryBody = document.getElementById('bpmnLintSummaryBody');
  if (summaryBody) summaryBody.innerHTML = results.map(result => `
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

  let visible = issues.filter(issue => bpmnLintFilter === 'all' || issue.severity === bpmnLintFilter || (bpmnLintFilter === 'error' && issue.severity === 'blocker'));
  if (bpmnLintSearch) {
    const query = bpmnLintSearch.toLowerCase();
    visible = visible.filter(issue => [issue.fileName, issue.rule, issue.category, issue.elementType, issue.elementId, issue.elementName, issue.message].join(' ').toLowerCase().includes(query));
  }
  visible.sort((a, b) => lintSeverityRank(a.severity) - lintSeverityRank(b.severity) || a.fileName.localeCompare(b.fileName, 'fr'));
  const visibleCount = document.getElementById('bpmnLintVisibleCount');
  if (visibleCount) visibleCount.textContent = `${Math.min(visible.length, bpmnLintVisibleLimit)} / ${visible.length} constats affichés`;
  const moreButton = document.getElementById('bpmnLintMoreIssues');
  if (moreButton) moreButton.hidden = visible.length <= bpmnLintVisibleLimit;
  const issueBody = document.getElementById('bpmnLintIssuesBody');
  if (issueBody) issueBody.innerHTML = visible.length ? visible.slice(0, bpmnLintVisibleLimit).map(issue => `
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
    </tr>`).join('') : '<tr><td colspan="9" class="empty-state">Aucun problème ne correspond aux filtres.</td></tr>';
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

window.removeBpmnLintFile = function(index) {
  bpmnLintFiles.splice(index, 1);
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
  bpmnLintResults = [];
  window.bpmnLintResults = bpmnLintResults;
  const resultTab = document.getElementById('bpmnLintResultsTab');
  if (resultTab) resultTab.style.display = 'none';
  renderBpmnLintFiles();
  renderBpmnLintResults();
};

window.runBpmnLint = function() {
  if (!bpmnLintFiles.length) return;
  lintBuildReport();
  const resultTab = document.getElementById('bpmnLintResultsTab');
  if (resultTab) resultTab.style.display = '';
  switchTab('bpmn-lint-results');
};

window.filterBpmnLintIssues = function(filter) {
  bpmnLintFilter = filter;
  bpmnLintVisibleLimit = 200;
  renderBpmnLintResults();
};

window.searchBpmnLintIssues = function(value) {
  bpmnLintSearch = (value || '').trim();
  bpmnLintVisibleLimit = 200;
  renderBpmnLintResults();
};

window.showMoreBpmnLintIssues = function() {
  bpmnLintVisibleLimit += 200;
  renderBpmnLintResults();
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
  if (!bpmnLintRules[index]?.custom) return;
  bpmnLintRules.splice(index, 1);
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.resetBpmnLintRules = function() {
  if (!confirm('Restaurer les règles Lint par défaut ? Les règles personnalisées seront supprimées.')) return;
  bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(rule => ({ ...rule }));
  saveBpmnLintRules();
  renderBpmnLintRules();
  invalidateBpmnLintReport();
};

window.exportBpmnLintRules = function() {
  const config = { appName: 'AuditFlow Pro', version: 1, rules: bpmnLintRules };
  dl(JSON.stringify(config, null, 2), 'auditflow_bpmn_lint_rules.json', 'application/json;charset=utf-8;');
};

window.importBpmnLintRules = function(file) {
  if (!file) return;
  if (window.validateFileSize && !window.validateFileSize(file)) return;
  file.text().then(text => {
    const data = JSON.parse(text);
    if (!Array.isArray(data.rules)) throw new Error('Le fichier ne contient pas de liste rules.');
    const valid = data.rules.filter(rule => rule && typeof rule.id === 'string' && typeof rule.label === 'string');
    bpmnLintRules = DEFAULT_BPMN_LINT_RULES.map(rule => ({ ...rule, ...(valid.find(item => item.id === rule.id) || {}) }));
    valid.filter(rule => rule.custom && !bpmnLintRules.some(base => base.id === rule.id)).forEach(rule => bpmnLintRules.push(rule));
    saveBpmnLintRules();
    renderBpmnLintRules();
    invalidateBpmnLintReport();
  }).catch(error => alert(`Import des règles impossible : ${error.message}`));
};

function bpmnLintSelectedSections() {
  return {
    summary: document.getElementById('lintExportSummary')?.checked !== false,
    matrix: document.getElementById('lintExportMatrix')?.checked !== false,
    files: document.getElementById('lintExportFiles')?.checked !== false,
    issues: document.getElementById('lintExportIssues')?.checked !== false,
    rules: document.getElementById('lintExportRules')?.checked === true
  };
}

function bpmnLintReportData() {
  const sections = bpmnLintSelectedSections();
  const issues = bpmnLintResults.flatMap(result => result.issues);
  const totalElements = bpmnLintResults.reduce((sum, result) => sum + result.elementCount, 0);
  const blockerCount = issues.filter(issue => ['blocker', 'error'].includes(issue.severity)).length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  const totalDebtMinutes = bpmnLintResults.reduce((sum, r) => sum + (r.metrics?.remediationDebtMinutes || 0), 0);
  const averageCfc = bpmnLintResults.length ? Math.round(bpmnLintResults.reduce((sum, r) => sum + (r.metrics?.cfc || 0), 0) / bpmnLintResults.length) : 0;
  const averageCyclomatic = bpmnLintResults.length ? Math.round(bpmnLintResults.reduce((sum, r) => sum + (r.metrics?.cyclomatic || 1), 0) / bpmnLintResults.length) : 1;

  const readiness = blockerCount > 0 ? 'DÉPLOIEMENT BLOQUÉ (NO-GO)' : warningCount > 0 ? 'GO CONDITIONNEL (Réserves)' : 'GO PRODUCTION (Conforme)';

  // Génération de la matrice 2D Fichiers x Règles
  const activeRules = bpmnLintRules.filter(r => r.enabled);
  const matrix2D = bpmnLintResults.map(file => {
    const row = { fileName: file.fileName, score: file.score, totalIssues: file.issues.length };
    activeRules.forEach(rule => {
      row[rule.id] = (file.metrics?.ruleCounts || {})[rule.id] || 0;
    });
    return row;
  });

  return {
    title: 'Audit Santé BPMN — Rapport Exécutif & Matrice Qualité',
    generatedAt: new Date().toISOString(),
    readiness,
    averageScore: bpmnLintResults.length ? Math.round(bpmnLintResults.reduce((sum, result) => sum + result.score, 0) / bpmnLintResults.length) : 0,
    summary: sections.summary ? {
      files: bpmnLintResults.length,
      elements: totalElements,
      blockers: blockerCount,
      warnings: warningCount,
      averageCyclomatic
    } : undefined,
    architecture: sections.summary ? { ...window.bpmnLintGraph } : undefined,
    priorities: sections.summary ? lintPriorities(issues) : undefined,
    matrix2D: sections.matrix ? matrix2D : undefined,
    files: sections.files ? bpmnLintResults.map(({ source, xmlDoc, ...file }) => ({
      fileName: file.fileName,
      score: file.score,
      status: file.status,
      processCount: file.processCount,
      elementCount: file.elementCount,
      blockers: file.blockers,
      warnings: file.warnings,
      cyclomatic: file.metrics?.cyclomatic || 1
    })) : undefined,
    issues: sections.issues ? issues : undefined,
    activeRules: sections.rules ? activeRules : undefined,
    scopeNotice: 'Audit statique certifié Bouygues Telecom / Paprika : vérifie les standards BPMN 2.0, l’exécution Camunda et les conventions d’architecture.'
  };
}

window.exportBpmnLintReport = async function() {
  if (!bpmnLintResults.length) { alert('Lancez un audit avant d’exporter.'); return; }
  const selectedSections = bpmnLintSelectedSections();
  if (!Object.values(selectedSections).some(Boolean)) { alert('Sélectionnez au moins une section à exporter.'); return; }
  const data = bpmnLintReportData();
  const format = document.getElementById('bpmnLintExportFormat').value;

  if (format === 'json') {
    dl(JSON.stringify(data, null, 2), 'auditflow_bpmn_lint_report.json', 'application/json;charset=utf-8;');
    return;
  }

  if (format === 'csv') {
    const lines = [['Type', 'Fichier', 'Sévérité', 'Catégorie', 'Règle / Indicateur', 'Élément ID', 'Nom Élément', 'Message / Constat', 'Responsable RACI', 'Recommandation', 'Test Recette']];
    if (data.summary) {
      lines.push(['Synthèse', '', '', '', 'Verdict Déploiement', '', '', data.readiness, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Score moyen', '', '', `${data.averageScore}%`, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Fichiers BPMN', '', '', data.summary.files, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Éléments analysés', '', '', data.summary.elements, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Bloquants / Erreurs', '', '', data.summary.blockers, '', '', '']);
      lines.push(['Synthèse', '', '', '', 'Avertissements', '', '', data.summary.warnings, '', '', '']);
    }
    (data.files || []).forEach(file => {
      lines.push(['Fichier BPMN', file.fileName, file.status, '', `Score: ${file.score}%`, '', '', `Cyclo: ${file.cyclomatic} | Bloquants: ${file.blockers} | Warn: ${file.warnings}`, '', '', '']);
    });
    (data.issues || []).forEach(issue => {
      lines.push(['Anomalie', issue.fileName, issue.severity, issue.category, issue.rule, issue.elementId || '', issue.elementName || '', issue.message, issue.suggestedOwner || '', issue.recommendation || '', issue.businessTest || '']);
    });
    const csv = lines.map(row => row.map(lintSafeQuote).join(',')).join('\r\n');
    dl('\uFEFF' + csv, 'auditflow_bpmn_lint_report.csv', 'text/csv;charset=utf-8;');
    return;
  }

  if (format === 'excel') {
    if (!window.XLSX) { alert('La bibliothèque Excel n’est pas disponible. Choisissez CSV ou HTML.'); return; }
    const safeJsonRows = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? lintSafeFormula(value) : value])));
    const workbook = XLSX.utils.book_new();

    // Onglet 1 : Synthèse Exécutive
    if (data.summary) {
      const summaryRows = [
        ['RAPPORT D’AUDIT SANTÉ BPMN — SYNTHÈSE EXÉCUTIVE'],
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
        summaryRows.push(['Processus Détectés', data.architecture.processCount]);
        summaryRows.push(['Call Activities', data.architecture.callCount]);
        summaryRows.push(['Processus Cibles Absents', data.architecture.missingTargetCount]);
        summaryRows.push(['Cycles d’Appels', data.architecture.cycleCount]);
        summaryRows.push(['Profondeur Maximale', data.architecture.maxDepth]);
      }
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA(summaryRows)), 'Synthèse Exécutive');
    }

    // Onglet 2 : Matrice 2D (BPMN x Règles)
    if (data.matrix2D?.length) {
      const activeRules = bpmnLintRules.filter(r => r.enabled);
      const matrixHeaders = ['Fichier BPMN', 'Score Santé', 'Total Anomalies', ...activeRules.map(r => `${r.label} [${r.category}]`)];
      const matrixRows = data.matrix2D.map(row => [
        row.fileName,
        `${row.score}%`,
        row.totalIssues,
        ...activeRules.map(r => row[r.id] || 0)
      ]);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA([matrixHeaders, ...matrixRows])), 'Matrice 2D (BPMN x Règles)');
    }

    // Onglet 3 : Domaines & Typologies
    const typoRows = [
      ['RÉPARTITION TYPOLOGIQUE DES ACTIVITÉS & DOMAINES D’ANOMALIES'],
      [],
      ['Fichier BPMN', 'Service Tasks', 'User Tasks', 'Script Tasks', 'Call Activities', 'Gateways', 'Events', 'Flux Séquentiels', 'Cyclomatique']
    ];
    bpmnLintResults.forEach(res => {
      const m = res.metrics || {};
      typoRows.push([
        res.fileName,
        m.serviceTasks || 0,
        m.userTasks || 0,
        m.scriptTasks || 0,
        m.callActivities || 0,
        m.gatewaysCount || 0,
        m.eventsCount || 0,
        m.sequenceFlowsCount || 0,
        m.cyclomatic || 1
      ]);
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(lintSafeAoA(typoRows)), 'Domaines & Typologies');

    // Onglet 4 : Fiches BPMN & Complexité
    if (data.files) {
      const fileRows = data.files.map(f => ({
        'Fichier BPMN': f.fileName,
        'Score (%)': f.score,
        'Statut': f.status,
        'Processus': f.processCount,
        'Éléments': f.elementCount,
        'Bloquants': f.blockers,
        'Avertissements': f.warnings,
        'Cyclomatique': f.cyclomatic
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeJsonRows(fileRows)), 'Fiches BPMN & Complexité');
    }

    // Onglet 5 : Plan d'Action RACI & Remédiation
    if (data.issues) {
      const raciRows = data.issues.map(issue => ({
        'Fichier BPMN': issue.fileName,
        'Sévérité': issue.severity,
        'Catégorie': issue.category,
        'Règle': issue.rule,
        'ID Élément': issue.elementId || '',
        'Nom Élément': issue.elementName || issue.elementType || '',
        'Constat Détaillé': issue.message,
        'Responsable RACI Suggéré': issue.suggestedOwner || '',
        'Recommandation d’Action': issue.recommendation || '',
        'Test de Recette / Vérification': issue.businessTest || ''
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeJsonRows(raciRows)), 'Plan d’Action RACI');
    }

    XLSX.writeFile(workbook, 'auditflow_bpmn_sante_rapport_complet.xlsx');
    return;
  }

  // HTML / PDF Export
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
  const matrixHeaders = `<tr><th>Diagramme BPMN</th><th>Score</th><th>Total</th>${activeRules.map(r => `<th>${lintEscape(r.label.length > 20 ? r.label.slice(0, 18) + '…' : r.label)}</th>`).join('')}</tr>`;
  const matrixRows = (data.matrix2D || []).map(row => `
    <tr>
      <td><strong>${lintEscape(row.fileName)}</strong></td>
      <td><strong>${row.score}%</strong></td>
      <td>${row.totalIssues}</td>
      ${activeRules.map(r => `<td style="text-align:center; ${row[r.id] ? 'background:#fee2e2; color:#991b1b; font-weight:bold;' : 'color:#94a3b8;'}">${row[r.id] || '-'}</td>`).join('')}
    </tr>`).join('');

  const reportHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${lintEscape(data.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 30px; line-height: 1.5; background: #fff; }
    h1 { color: #003882; margin-bottom: 4px; font-size: 24px; }
    .header-bar { border-bottom: 2px solid #009CD7; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .verdict-banner { padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; background: ${data.summary?.blockers ? '#fef2f2; border: 1px solid #f87171;' : data.summary?.warnings ? '#fffbeb; border: 1px solid #fcd34d;' : '#f0fdf4; border: 1px solid #86efac;'}; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .kpi-box { padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; }
    .kpi-box .val { font-size: 22px; font-weight: 800; color: #003882; }
    .kpi-box .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 28px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    .bpmn-badge-sev { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .bpmn-badge-sev.blocker, .bpmn-badge-sev.error { background: #fee2e2; color: #991b1b; }
    .bpmn-badge-sev.warning { background: #fef3c7; color: #92400e; }
    .bpmn-badge-sev.info { background: #e0f2fe; color: #0369a1; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 11px; color: #0f172a; }
    section { margin-top: 32px; page-break-inside: avoid; }
    .notice { padding: 12px 16px; background: #fff7ed; border-left: 4px solid #ea580c; font-size: 12px; color: #7c2d12; border-radius: 4px; margin-top: 24px; }
    @media print { body { margin: 10mm; } section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <h1>${lintEscape(data.title)}</h1>
      <p style="margin:0; color:#64748b; font-size:13px;">Paprika AuditFlow Pro · Gouvernance & Qualité BPMN Bouygues Telecom</p>
    </div>
    <div style="text-align:right; font-size:12px; color:#64748b;">
      Généré le <strong>${lintEscape(new Date(data.generatedAt).toLocaleString('fr-FR'))}</strong>
    </div>
  </div>

  <div class="verdict-banner">
    <div>
      <span style="font-size:11px; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; color:${data.summary?.blockers ? '#991b1b' : data.summary?.warnings ? '#92400e' : '#166534'};">VERDICT DE DÉPLOIEMENT</span>
      <h2 style="margin:4px 0 0; font-size:18px; color:#0f172a;">${lintEscape(data.readiness)}</h2>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-box"><div class="val">${data.summary?.files || 0}</div><div class="lbl">Fichiers BPMN</div></div>
    <div class="kpi-box"><div class="val">${data.averageScore}%</div><div class="lbl">Score Moyen</div></div>
    <div class="kpi-box"><div class="val" style="color:#dc2626;">${data.summary?.blockers || 0}</div><div class="lbl">Bloquants / Erreurs</div></div>
    <div class="kpi-box"><div class="val" style="color:#d97706;">${data.summary?.warnings || 0}</div><div class="lbl">Avertissements</div></div>
  </div>

  ${data.matrix2D ? `
  <section>
    <h2>1. Matrice 2D Croisée (BPMN × Règles actives)</h2>
    <table>${matrixHeaders}${matrixRows}</table>
  </section>` : ''}

  ${data.issues ? `
  <section>
    <h2>2. Plan d'Action RACI &amp; Remédiation Détaillée</h2>
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
    <strong>Note de portée :</strong> ${lintEscape(data.scopeNotice)}
  </div>
</body>
</html>`;

  if (format === 'html') {
    dl(reportHtml, 'auditflow_bpmn_lint_report.html', 'text/html;charset=utf-8;');
  } else {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('La fenêtre d’impression a été bloquée. Exportez le rapport en HTML.'); return; }
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};

window.applyBpmnLintSafeFixes = async function() {
  if (!bpmnLintFiles.length) return;
  const validFiles = bpmnLintFiles.filter(file => file.xmlDoc);
  if (!validFiles.length) { alert('Aucun fichier BPMN analysable à corriger.'); return; }
  const corrected = validFiles.map(file => {
    const clone = file.xmlDoc.cloneNode(true);
    let changes = 0;
    lintElements(clone).forEach(element => {
      if (element.namespaceURI !== 'http://www.omg.org/spec/BPMN/20100524/MODEL' || !element.hasAttribute('name')) return;
      const original = element.getAttribute('name');
      const trimmed = original.trim();
      if (trimmed !== original) { element.setAttribute('name', trimmed); changes++; }
    });
    return { fileName: file.fileName, source: new XMLSerializer().serializeToString(clone), changes };
  });
  const changedCount = corrected.reduce((sum, file) => sum + file.changes, 0);
  if (!changedCount) { alert('Aucune correction automatique sûre n’est applicable. Les corrections sémantiques restent à valider par l’équipe.'); return; }
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
  alert(`${changedCount} libellé(s) nettoyé(s). Les fichiers originaux n’ont pas été modifiés.`);
};

window.importBpmnLintRulesFromInput = function(input) {
  const file = input.files && input.files[0];
  window.importBpmnLintRules(file);
  input.value = '';
};
