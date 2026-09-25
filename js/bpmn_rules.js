// ---------- BPMN Naming Rules Module Logic ----------

const DEFAULT_BPMN_RULES = [
  {
    id: 'process-id-kebab',
    label: 'PROCESS ID en kebab-case',
    desc: 'L\'identifiant technique du processus doit être en kebab-case (ex: mon-processus-metier).',
    target: 'process-id',
    type: 'regex',
    pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
    severity: 'err',
    enabled: true,
    errorMessage: 'L\'ID du processus doit être en kebab-case (minuscules, chiffres et tirets uniquement).'
  },
  {
    id: 'process-name-capital',
    label: 'Nom de processus : Majuscule',
    desc: 'Le nom d\'affichage du processus doit commencer par une majuscule.',
    target: 'process-name',
    type: 'regex',
    pattern: '^[A-ZÀ-ÖØ-ß].*$',
    severity: 'warn',
    enabled: true,
    errorMessage: 'Le nom d\'affichage du processus doit commencer par une lettre majuscule.'
  },
  {
    id: 'variable-camel',
    label: 'Variables : camelCase strict',
    desc: 'Les variables de processus doivent être en camelCase strict, sans accents ni caractères spéciaux.',
    target: 'variable',
    type: 'regex',
    pattern: '^[a-z][a-zA-Z0-9]*$',
    severity: 'err',
    enabled: true,
    errorMessage: 'Le nom de la variable doit débuter par une minuscule et ne contenir que des lettres et chiffres.'
  },
  {
    id: 'variable-reserved',
    label: 'Variables : Mots réservés',
    desc: 'Les variables ne doivent pas porter de mots réservés FEEL ou Zeebe (ex: date, time, duration).',
    target: 'variable',
    type: 'custom',
    severity: 'err',
    enabled: true,
    errorMessage: 'La variable utilise un mot clé réservé par FEEL ou le moteur Zeebe.'
  },
  {
    id: 'variable-collection-plural',
    label: 'Variables : Collection au pluriel',
    desc: 'Les variables de type liste/collection doivent être au pluriel (ex: productItems, emails).',
    target: 'variable-collection',
    type: 'regex',
    pattern: '.*(s|List|Items|Collection|Set|Array)$',
    severity: 'warn',
    enabled: true,
    errorMessage: 'Les variables de collection/liste doivent se terminer par un pluriel ou un terme explicite.'
  },
  {
    id: 'task-verb-infinitive',
    label: 'Tâches : Verbe Infinitif + Complément',
    desc: 'Le nom de l\'activité doit commencer par un verbe d\'action à l\'infinitif (ex: Calculer la TVA).',
    target: 'task',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'Le libellé de l\'activité doit commencer par un verbe à l\'infinitif suivi d\'un complément (2 mots min).'
  },
  {
    id: 'subprocess-noun-phrase',
    label: 'Sous-processus : Phrase nominale',
    desc: 'Un sous-processus doit être nommé par une phrase nominale (ex: Gestion des réclamations).',
    target: 'subprocess',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'Le sous-processus doit être nommé par une phrase nominale (sans verbe à l\'infinitif au début).'
  },
  {
    id: 'gateway-divergent-question',
    label: 'Gateways divergentes : Question ?',
    desc: 'Une passerelle divergente (ex: Exclusive, Inclusive) doit poser une question claire se terminant par un "?".',
    target: 'gateway-divergent',
    type: 'regex',
    pattern: '^.*\\?\\s*$',
    severity: 'err',
    enabled: true,
    errorMessage: 'Le libellé de la passerelle divergente doit se terminer par un point d\'interrogation (?).'
  },
  {
    id: 'gateway-parallel-no-question',
    label: 'Gateways AND : Pas de question',
    desc: 'Une passerelle parallèle ne doit pas porter de question (pas de point d\'interrogation).',
    target: 'gateway-parallel',
    type: 'regex',
    pattern: '^[^?]*$',
    severity: 'warn',
    enabled: true,
    errorMessage: 'Une passerelle parallèle (AND) ne doit pas comporter de point d\'interrogation.'
  },
  {
    id: 'sequence-flow-labeled',
    label: 'Flux de transition : Réponse attendue',
    desc: 'Chaque flux sortant d\'une passerelle divergente doit porter un libellé (réponse à la question).',
    target: 'sequence-flow',
    type: 'custom',
    severity: 'err',
    enabled: true,
    errorMessage: 'Le flux de transition doit porter un libellé représentant la réponse à la question de la passerelle.'
  },
  {
    id: 'event-start-noun-pastpart',
    label: 'Événement Début : Objet + Participe Passé',
    desc: 'Un événement de début doit être qualifié par un Objet suivi d\'un Participe Passé (ex: Commande reçue).',
    target: 'event-start',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'L\'événement de début doit être nommé au format "Objet + Participe Passé" (ex: Dossier reçu).'
  },
  {
    id: 'event-catch-waiting',
    label: 'Événement Attente : Description précise',
    desc: 'Un événement intermédiaire d\'attente doit décrire ce qui est intercepté pour continuer.',
    target: 'event-catch',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'L\'événement d\'attente doit décrire ce qui déclenche la suite du processus (ex: Paiement reçu).'
  },
  {
    id: 'event-end-state',
    label: 'Événement Fin : État métier final',
    desc: 'Un événement de fin doit qualifier l\'état métier final du chemin de processus (ex: Commande expédiée).',
    target: 'event-end',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'L\'événement de fin doit qualifier l\'état métier de réussite ou d\'échec (ex: Contrat signé).'
  },
  {
    id: 'event-boundary-exception',
    label: 'Événement Bordure : Exception ou Alerte',
    desc: 'Un événement de bordure doit qualifier l\'exception, l\'alerte ou le minuteur (ex: Délai expiré).',
    target: 'event-boundary',
    type: 'custom',
    severity: 'warn',
    enabled: true,
    errorMessage: 'L\'événement de bordure doit qualifier l\'alerte ou le minuteur rattaché.'
  },
  {
    id: 'message-pascal-suffix',
    label: 'Messages : PascalCase + Message',
    desc: 'Les définitions de messages doivent être en PascalCase et finir par "Message" (ex: PaymentReceivedMessage).',
    target: 'message',
    type: 'regex',
    pattern: '^[A-Z][a-zA-Z0-9]*Message$',
    severity: 'err',
    enabled: true,
    errorMessage: 'Le nom du message doit être en PascalCase et finir par le mot "Message".'
  },
  {
    id: 'signal-pascal-suffix',
    label: 'Signaux : PascalCase + Signal',
    desc: 'Les signaux doivent être en PascalCase et finir par le mot "Signal" (ex: GlobalAlertSignal).',
    target: 'signal',
    type: 'regex',
    pattern: '^[A-Z][a-zA-Z0-9]*(Signal|Signak)$',
    severity: 'err',
    enabled: true,
    errorMessage: 'Le nom du signal doit être en PascalCase et finir par "Signal".'
  }
];

let bpmnRules = [];

// Charger les règles de nommage BPMN depuis le localStorage
function loadBpmnRules() {
  const data = localStorage.getItem('pda_camunda_bpmn_rules');
  if (data) {
    try {
      bpmnRules = JSON.parse(data);
      // Fusionner avec les règles par défaut au cas où de nouvelles règles ont été ajoutées
      DEFAULT_BPMN_RULES.forEach(defRule => {
        if (!bpmnRules.some(r => r.id === defRule.id)) {
          bpmnRules.push({ ...defRule });
        }
      });
    } catch (e) {
      console.error("Erreur de lecture des règles BPMN du localStorage, réinitialisation", e);
      bpmnRules = DEFAULT_BPMN_RULES.map(r => ({ ...r }));
    }
  } else {
    bpmnRules = DEFAULT_BPMN_RULES.map(r => ({ ...r }));
  }
  return bpmnRules;
}

// Enregistrer les règles dans le localStorage
function saveBpmnRules() {
  localStorage.setItem('pda_camunda_bpmn_rules', JSON.stringify(bpmnRules));
}

// Réinitialiser les règles
function resetBpmnRulesToDefault() {
  bpmnRules = DEFAULT_BPMN_RULES.map(r => ({ ...r }));
  saveBpmnRules();
  return bpmnRules;
}

// Heuristiques d'analyse linguistique en français
const FRENCH_INFINITIVE_ENDINGS = ['er', 'ir', 're', 'oir'];
const FRENCH_EXCEPTIONS_INFINITIVE = new Set([
  'sur', 'par', 'pour', 'soir', 'noir', 'hier', 'mer', 'fer', 'ver', 'air', 'clair', 'danger', 
  'cancer', 'hiver', 'leger', 'premier', 'dernier', 'car', 'bar', 'char', 'dur', 'mur', 'pur', 
  'sûr', 'empire', 'frère', 'père', 'mère', 'arrière', 'derrière', 'manière', 'matière', 
  'histoire', 'victoire', 'maire', 'paire', 'contraire', 'inventaire', 'commentaire', 
  'partenaire', 'secrétaire', 'itinéraire'
]);

function startsWithInfinitiveVerb(str) {
  if (!str) return false;
  const words = str.trim().split(/[\s'\-]+/);
  if (words.length === 0) return false;
  
  const firstWord = words[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Enlever les accents
  
  const matchesEnding = FRENCH_INFINITIVE_ENDINGS.some(ending => firstWord.endsWith(ending));
  if (!matchesEnding) return false;
  
  return !FRENCH_EXCEPTIONS_INFINITIVE.has(firstWord);
}

function checkFrenchPastParticipleEnding(word) {
  if (!word) return false;
  const w = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Fin de participe passé régulier / irrégulier : -e, -ee (é/ée), -i, -ie, -u, -ue, -t, -te, -s, -se
  return /(e|i|u|t|s)e?$/.test(w);
}

// Convertisseurs de casse et générateurs de suggestions
function convertToKebabCase(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function convertToPascalCase(s) {
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function convertToCamelCaseLocal(s) {
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.map((w, idx) => {
    if (idx === 0) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join('');
}

function suggestBpmnNameCorrection(targetType, currentLabel, ruleId) {
  if (!currentLabel) return '';
  const label = currentLabel.trim();
  
  switch(ruleId) {
    case 'process-id-kebab':
      return convertToKebabCase(label);
      
    case 'process-name-capital':
      return label.charAt(0).toUpperCase() + label.slice(1);
      
    case 'variable-camel':
      return convertToCamelCaseLocal(label);
      
    case 'variable-reserved':
      return convertToCamelCaseLocal(label) + 'Val';
      
    case 'variable-collection-plural':
      if (label.endsWith('List') || label.endsWith('Items') || label.endsWith('s')) return label;
      return label + 'Items';
      
    case 'task-verb-infinitive':
      // Si la tâche est nommée "Facturation client" -> "Traiter la facturation client"
      if (!startsWithInfinitiveVerb(label)) {
        const words = label.split(/\s+/);
        const first = words[0];
        if (first.toLowerCase() === 'gestion') {
          return 'Gérer ' + words.slice(1).join(' ');
        } else if (first.toLowerCase() === 'creation') {
          return 'Créer ' + words.slice(1).join(' ');
        } else if (first.toLowerCase() === 'validation') {
          return 'Valider ' + words.slice(1).join(' ');
        } else if (first.toLowerCase() === 'envoi') {
          return 'Envoyer ' + words.slice(1).join(' ');
        } else if (first.toLowerCase() === 'calcul') {
          return 'Calculer ' + words.slice(1).join(' ');
        } else {
          return 'Traiter ' + label.charAt(0).toLowerCase() + label.slice(1);
        }
      }
      return label;
      
    case 'subprocess-noun-phrase':
      // Gérer les retours -> Gestion des retours
      if (startsWithInfinitiveVerb(label)) {
        const words = label.split(/\s+/);
        const first = words[0].toLowerCase();
        if (first.startsWith('gerer')) {
          return 'Gestion ' + words.slice(1).join(' ');
        } else if (first.startsWith('creer')) {
          return 'Création ' + words.slice(1).join(' ');
        } else if (first.startsWith('valider')) {
          return 'Validation ' + words.slice(1).join(' ');
        } else if (first.startsWith('envoyer')) {
          return 'Envoi ' + words.slice(1).join(' ');
        } else if (first.startsWith('calculer')) {
          return 'Calcul ' + words.slice(1).join(' ');
        }
      }
      return label.charAt(0).toUpperCase() + label.slice(1);
      
    case 'gateway-divergent-question':
      if (!label.endsWith('?')) return label + ' ?';
      return label;
      
    case 'gateway-parallel-no-question':
      return label.replace(/\?/g, '').trim();
      
    case 'sequence-flow-labeled':
      return label || '[Réponse]';
      
    case 'event-start-noun-pastpart':
      // Commande -> Commande reçue
      if (label.split(/\s+/).length < 2) {
        return label + ' reçu';
      }
      return label;
      
    case 'event-catch-waiting':
      return label || 'Message reçu';
      
    case 'event-end-state':
      return label || 'Processus terminé';
      
    case 'event-boundary-exception':
      return label || 'Erreur interceptée';
      
    case 'message-pascal-suffix':
      const pascalMsg = convertToPascalCase(label);
      if (pascalMsg.endsWith('Message')) return pascalMsg;
      return pascalMsg + 'Message';
      
    case 'signal-pascal-suffix':
      const pascalSig = convertToPascalCase(label);
      if (pascalSig.endsWith('Signal') || pascalSig.endsWith('Signak')) return pascalSig;
      return pascalSig + 'Signal';
      
    default:
      return label;
  }
}

// Fonction d'audit d'un élément par rapport aux règles de nommage
function auditBpmnElement(targetType, elementId, elementName, elementNode, extraData = {}) {
  const activeRules = bpmnRules.filter(r => r.enabled && r.target === targetType);
  const issues = [];
  const nameToCheck = (elementName || '').trim();
  
  activeRules.forEach(rule => {
    let passed = true;
    
    if (rule.type === 'regex') {
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern);
        passed = regex.test(nameToCheck);
      }
    } else if (rule.type === 'custom') {
      switch(rule.id) {
        case 'variable-reserved':
          const reservedSet = new Set(['if','else','for','in','return','true','false','null','and','or','not','between','instance','of','function','every','satisfies','some','context','is','date','time','duration','years','months','days','hours','minutes','seconds']);
          // Ajouter les mots réservés personnalisés si présents dans le DOM
          const customTextarea = document.getElementById('customReserved');
          if (customTextarea) {
            customTextarea.value.split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean).forEach(w => reservedSet.add(w));
          }
          passed = !reservedSet.has(nameToCheck.toLowerCase());
          break;
          
        case 'task-verb-infinitive':
          // Doit commencer par un verbe à l'infinitif et faire au moins 2 mots
          if (nameToCheck) {
            const hasInfinitive = startsWithInfinitiveVerb(nameToCheck);
            const hasComplement = nameToCheck.split(/\s+/).length >= 2;
            passed = hasInfinitive && hasComplement;
          } else {
            passed = false; // Vide = non conforme
          }
          break;
          
        case 'subprocess-noun-phrase':
          // Phrase nominale : pas de verbe à l'infinitif en premier, et commence par une majuscule
          if (nameToCheck) {
            const hasInfinitive = startsWithInfinitiveVerb(nameToCheck);
            const startsCapital = /^[A-ZÀ-ÖØ-ß]/.test(nameToCheck);
            passed = !hasInfinitive && startsCapital;
          } else {
            passed = false;
          }
          break;
          
        case 'sequence-flow-labeled':
          // Si sa source est une gateway divergente, il doit être labellisé
          if (extraData.sourceIsDivergent) {
            passed = nameToCheck.length > 0;
          } else {
            passed = true; // Optionnel si ce n'est pas une gateway décisionnelle
          }
          break;
          
        case 'event-start-noun-pastpart':
          if (nameToCheck) {
            const words = nameToCheck.split(/\s+/);
            if (words.length >= 2) {
              const lastWord = words[words.length - 1];
              passed = checkFrenchPastParticipleEnding(lastWord);
            } else {
              passed = false;
            }
          } else {
            passed = false;
          }
          break;
          
        case 'event-catch-waiting':
        case 'event-end-state':
        case 'event-boundary-exception':
          // Doit être non vide et commencer par une majuscule
          if (nameToCheck) {
            passed = /^[A-ZÀ-ÖØ-ß]/.test(nameToCheck);
          } else {
            passed = false;
          }
          break;
      }
    }
    
    if (!passed) {
      issues.push({
        ruleId: rule.id,
        msg: rule.errorMessage || 'Format invalide',
        sev: rule.severity || 'warn',
        ruleLabel: rule.label
      });
    }
  });
  
  const hasErr = issues.some(i => i.sev === 'err');
  const hasWarn = issues.some(i => i.sev === 'warn');
  const status = hasErr ? 'invalid' : (hasWarn ? 'warn' : 'valid');
  
  // Générer une suggestion combinée
  let suggested = nameToCheck;
  issues.forEach(issue => {
    suggested = suggestBpmnNameCorrection(targetType, suggested, issue.ruleId);
  });
  
  return {
    issues,
    status,
    suggested: (status !== 'valid') ? suggested : ''
  };
}

// Fonction pour extraire et auditer tous les éléments d'un BPMN XML
function auditBpmnXmlDoc(xmlDoc) {
  const elements = [];
  let uniqueIdCounter = 1;
  
  // 1. Helper pour ajouter un élément audité
  function addElement(targetType, id, name, node, typeLabel, extraData = {}) {
    const cleanName = (name || '').trim();
    const { issues, status, suggested } = auditBpmnElement(targetType, id, cleanName, node, extraData);
    
    // Attribuer un identifiant temporaire dans le XML pour retrouver le nœud plus tard lors de l'export
    if (node && typeof node.setAttribute === 'function') {
      if (!node.hasAttribute('data-bpmn-auditor-id')) {
        node.setAttribute('data-bpmn-auditor-id', 'bpmn_el_' + uniqueIdCounter++);
      }
    }
    
    elements.push({
      id: id,
      name: cleanName,
      type: targetType,
      typeLabel: typeLabel,
      status: status,
      issues: issues,
      suggested: suggested,
      editedSuggestion: suggested,
      xmlId: node ? node.getAttribute('data-bpmn-auditor-id') : null,
      node: node
    });
  }

  // 2. Extraire et auditer le processus (ID et Nom)
  const processes = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS('*', 'process') : xmlDoc.getElementsByTagName('process');
  for (let i = 0; i < processes.length; i++) {
    const proc = processes[i];
    const procId = proc.getAttribute('id') || '';
    const procName = proc.getAttribute('name') || '';
    
    if (procId) {
      addElement('process-id', procId, procId, proc, 'ID de Processus');
    }
    if (procName) {
      addElement('process-name', procId, procName, proc, 'Nom de Processus');
    }
  }

  // Maper les types de gateways pour vérifier les flux sortants
  const divergentGateways = new Set();
  const allElements = xmlDoc.getElementsByTagName('*');
  
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const ln = el.localName ? el.localName.toLowerCase() : '';
    
    if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(ln)) {
      const id = el.getAttribute('id');
      if (id) divergentGateways.add(id);
    }
  }

  // 3. Parcourir tous les éléments
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const localName = el.localName ? el.localName.toLowerCase() : '';
    const nameAttr = el.getAttribute('name') || '';
    const idAttr = el.getAttribute('id') || '';

    // Tasks & Subprocesses
    if (['servicetask', 'usertask', 'scripttask', 'sendtask', 'receivetask', 'manualtask', 'businessruletask', 'callactivity'].includes(localName)) {
      addElement('task', idAttr, nameAttr, el, 'Tâche');
    } else if (localName === 'subprocess') {
      addElement('subprocess', idAttr, nameAttr, el, 'Sous-processus');
    }
    // Gateways
    else if (['exclusivegateway', 'inclusivegateway', 'eventbasedgateway'].includes(localName)) {
      addElement('gateway-divergent', idAttr, nameAttr, el, 'Passerelle Divergente');
    } else if (localName === 'parallelgateway') {
      addElement('gateway-parallel', idAttr, nameAttr, el, 'Passerelle Parallèle (AND)');
    }
    // Events
    else if (localName === 'startevent') {
      addElement('event-start', idAttr, nameAttr, el, 'Événement Début');
    } else if (localName === 'endevent') {
      addElement('event-end', idAttr, nameAttr, el, 'Événement Fin');
    } else if (['intermediatecatchevent', 'intermediatethrowevent'].includes(localName)) {
      addElement('event-catch', idAttr, nameAttr, el, 'Événement Intermédiaire');
    } else if (localName === 'boundaryevent') {
      addElement('event-boundary', idAttr, nameAttr, el, 'Événement Bordure');
    }
    // Messages & Signals
    else if (localName === 'message') {
      // Les messages ont souvent un attribut name
      addElement('message', idAttr, nameAttr || el.getAttribute('id'), el, 'Message');
    } else if (localName === 'signal') {
      addElement('signal', idAttr, nameAttr || el.getAttribute('id'), el, 'Signal');
    }
    // Sequence flows
    else if (localName === 'sequenceflow') {
      const sourceRef = el.getAttribute('sourceRef') || '';
      const sourceIsDivergent = divergentGateways.has(sourceRef);
      // On ne valide que si la source est divergente (les autres transitions n'exigent pas de label)
      if (sourceIsDivergent) {
        addElement('sequence-flow', idAttr, nameAttr, el, 'Flux Sortant', { sourceIsDivergent });
      }
    }
  }

  // 4. Extraire aussi les variables associées pour les auditer par rapport aux règles de nommage
  // (Juste pour avoir un audit global de conformité du fichier BPMN)
  // On utilise l'extracteur existant de app.js (ou équivalent) si possible.
  // Pour éviter de dupliquer la logique complexe d'expressions, on peut l'intégrer au tableau des résultats.
  
  return elements;
}

// Télécharger le BPMN XML avec les corrections de nommage appliquées
function generateCorrectedBpmnXml(clonedDoc, bpmnElements) {
  // Construire la table de correspondance : ID technique XML -> Nouvelle valeur
  const nameMap = new Map(); // originalName -> correctedName
  const nodeMap = new Map(); // xmlTempId -> correctedName
  
  bpmnElements.forEach(item => {
    if (item.status !== 'valid' && item.editedSuggestion && item.editedSuggestion.trim() !== item.name) {
      if (item.xmlId) {
        nodeMap.set(item.xmlId, item.editedSuggestion.trim());
      }
      nameMap.set(item.name.trim(), item.editedSuggestion.trim());
    }
  });

  // Appliquer les changements sur les nœuds identifiés par leur attribut data-bpmn-auditor-id
  nodeMap.forEach((newVal, xmlTempId) => {
    const node = clonedDoc.querySelector(`[data-bpmn-auditor-id="${xmlTempId}"]`);
    if (node) {
      const localName = node.localName ? node.localName.toLowerCase() : '';
      if (localName === 'process' && node.getAttribute('id') === node.getAttribute('name')) {
        // Cas particulier où l'ID et le nom sont identiques
        // Si c'est l'ID de processus qu'on change
        // On verra en fonction du type
      }
      
      // Si l'élément est un processus et que la règle était sur l'ID
      // Trouver quel item correspond
      const matchingItems = bpmnElements.filter(e => e.xmlId === xmlTempId);
      matchingItems.forEach(item => {
        if (item.type === 'process-id') {
          node.setAttribute('id', newVal);
        } else if (item.type === 'process-name' || item.type === 'task' || item.type === 'subprocess' || item.type === 'gateway-divergent' || item.type === 'gateway-parallel' || item.type === 'event-start' || item.type === 'event-catch' || item.type === 'event-end' || item.type === 'event-boundary' || item.type === 'message' || item.type === 'signal' || item.type === 'sequence-flow') {
          node.setAttribute('name', newVal);
        }
      });
    }
  });

  // Nettoyer les attributs temporaires
  const tempNodes = clonedDoc.querySelectorAll('[data-bpmn-auditor-id]');
  tempNodes.forEach(n => n.removeAttribute('data-bpmn-auditor-id'));

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clonedDoc);
}
