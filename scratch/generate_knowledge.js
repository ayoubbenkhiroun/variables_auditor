// Generate and validate full BPMN Lint Rule Knowledge base
const fs = require('fs');

const BPMN_LINT_RULE_KNOWLEDGE = {
  'definitions-root': {
    standard: 'OMG BPMN 2.0 §8.2.1',
    badge: 'Structure Racine',
    explanation: 'Le document XML doit obligatoirement avoir comme élément racine <bpmn:definitions> (ou <definitions> avec namespace BPMN 2.0). Tout fichier sans racine valide ne peut pas être interprété par les moteurs d\'exécution Camunda/Zeebe ni par les modeleurs conformes OMG.',
    badDesc: 'Document XML sans balise racine BPMN conforme (ex: balise HTML, XML générique ou balise process isolée).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Pas de balise racine definitions -->
<process id="mon-processus" isExecutable="true">
  <startEvent id="start" />
</process>`,
    goodDesc: 'Balise racine <bpmn:definitions> avec déclaration correcte des namespaces standard OMG BPMN 2.0.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Racine definitions standard OMG -->
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process-commande" isExecutable="true">
    ...
  </bpmn:process>
</bpmn:definitions>`,
    impact: '🚨 Échec immédiat du déploiement (Parser Error Zeebe). Fichier illisible par le moteur.',
    autoFixable: false
  },

  'definitions-namespace': {
    standard: 'OMG BPMN 2.0 §8.2.2',
    badge: 'Namespace XML',
    explanation: 'Le namespace cible et le schéma BPMN 2.0 (http://www.omg.org/spec/BPMN/20100524/MODEL) doivent être déclarés. Les anciens namespaces BPMN 1.x ou les URI erronées empêchent le moteur de reconnaître la sémantique exécutable.',
    badDesc: 'Namespace manquant ou URL obsolète (ex: bpmn 1.2 ou schéma non officiel).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Namespace OMG manquant ou invalide -->
<definitions xmlns="http://ancien-schema.org/bpmn">
  <process id="Process_1" />
</definitions>`,
    goodDesc: 'Namespace officiel OMG BPMN 2.0 MODEL présent sur la racine.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Namespace officiel OMG BPMN 2.0 -->
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  targetNamespace="http://bpmn.io/schema/bpmn">`,
    impact: '🚨 Rejet du schéma XML par Camunda Cloud / Engine.',
    autoFixable: false
  },

  'process-id': {
    standard: 'OMG BPMN 2.0 §10.1 & Bouygues Telecom Std',
    badge: 'Identité Processus',
    explanation: 'Chaque définition de processus doit comporter un attribut id non vide. Cet ID technique est la clé de déploiement, de versioning et d\'instanciation par l\'API Zeebe (createProcessInstanceByKey).',
    badDesc: 'Balise <bpmn:process> sans attribut id ou avec un id vide.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : ID de processus absent -->
<bpmn:process isExecutable="true" name="Validation Contrat">
  <bpmn:startEvent id="StartEvent_1" />
</bpmn:process>`,
    goodDesc: 'Attribut id renseigné de manière explicite et unique.',
    goodSnippet: `<!-- ✅ Bonne Pratique : ID technique présent et explicite -->
<bpmn:process id="process-validation-contrat" name="Validation Contrat" isExecutable="true">
  <bpmn:startEvent id="StartEvent_1" />
</bpmn:process>`,
    impact: '🚨 Impossibilité d\'instancier le processus par clé technique.',
    autoFixable: true
  },

  'duplicate-id': {
    standard: 'W3C XML ID / OMG BPMN 2.0 §8.2',
    badge: 'Unicité XML',
    explanation: 'Tous les éléments du document XML (tâches, événements, passerelles, flux de séquence) doivent avoir un attribut id strictement unique. Deux éléments avec le même id provoquent des comportements indéterminés ou des crashs de parsing.',
    badDesc: 'Deux éléments distincts partagent le même identifiant technique.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : ID dupliqué 'Task_1' -->
<bpmn:serviceTask id="Task_1" name="Vérifier le stock" />
...
<bpmn:userTask id="Task_1" name="Valider le panier" />`,
    goodDesc: 'Identifiants techniques distincts pour chaque élément du diagramme.',
    goodSnippet: `<!-- ✅ Bonne Pratique : IDs uniques et typés -->
<bpmn:serviceTask id="Task_verifier_stock" name="Vérifier le stock" />
...
<bpmn:userTask id="Task_valider_panier" name="Valider le panier" />`,
    impact: '🚨 Conflit de routage et crash d\'exécution Zeebe lors du déclenchement du nœud.',
    autoFixable: false
  },

  'flow-references': {
    standard: 'OMG BPMN 2.0 §8.3.3',
    badge: 'Intégrité Graphique',
    explanation: 'Chaque flux de séquence (sequenceFlow) doit référencer des nœuds source (sourceRef) et cible (targetRef) existants dans le même processus. Un flux orphelin génère une rupture de jeton.',
    badDesc: 'Attribut targetRef ou sourceRef pointant vers un ID inexistant.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : targetRef 'Task_Inconnue' n'existe pas -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_Inconnue" />`,
    goodDesc: 'sourceRef et targetRef pointent vers des éléments réels du flux.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Références résolues -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_verifier_stock" />
<bpmn:serviceTask id="Task_verifier_stock" name="Vérifier le stock" />`,
    impact: '🚨 Jeton bloqué indéfiniment ou exception Zeebe "Target node not found".',
    autoFixable: false
  },

  'sequence-flow-cross-pool': {
    standard: 'OMG BPMN 2.0 §10.2.1',
    badge: 'Frontières Pools',
    explanation: 'La norme BPMN interdit formellement de faire traverser un flux de séquence (sequenceFlow) entre deux pools/participants différents. Les interactions inter-pools doivent exclusivement utiliser des flux de messages (messageFlow).',
    badDesc: 'Flux séquentiel reliant un nœud du Pool A à un nœud du Pool B.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : sequenceFlow traversant entre deux pools -->
<bpmn:sequenceFlow id="Flow_inter" sourceRef="Task_Pool_A" targetRef="Task_Pool_B" />`,
    goodDesc: 'Utilisation d\'un messageFlow en pointillés pour relier deux pools distincts.',
    goodSnippet: `<!-- ✅ Bonne Pratique : messageFlow pour la communication inter-pools -->
<bpmn:messageFlow id="MsgFlow_1" sourceRef="Task_Pool_A" targetRef="Event_Pool_B" />`,
    impact: '🚨 Violation grave du standard BPMN 2.0 et échec de validation Camunda Modeler.',
    autoFixable: false
  },

  'message-flow-valid': {
    standard: 'OMG BPMN 2.0 §10.2.2',
    badge: 'Flux Messages',
    explanation: 'Les flux de messages (bpmn:messageFlow) sont réservés à la communication asynchrone entre deux pools distincts. Ils ne doivent jamais être utilisés à l\'intérieur d\'un même pool.',
    badDesc: 'Message flow utilisé pour relier deux tâches au sein du même participant.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : messageFlow intra-pool -->
<bpmn:messageFlow id="MsgFlow_intra" sourceRef="Task_1" targetRef="Task_2" />`,
    goodDesc: 'SequenceFlow intra-pool et MessageFlow inter-pools.',
    goodSnippet: `<!-- ✅ Bonne Pratique : sequenceFlow au sein du même pool -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />`,
    impact: '⚠️ Incohérence sémantique majeure dans la collaboration BPMN.',
    autoFixable: false
  },

  'start-event': {
    standard: 'OMG BPMN 2.0 §10.4.2',
    badge: 'Point d\'Entrée',
    explanation: 'Tout processus ou sous-processus exécutable doit posséder au moins un événement de début (bpmn:startEvent). Sans événement de début, l\'instance ne peut jamais démarrer.',
    badDesc: 'Processus sans aucune balise bpmn:startEvent.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Pas d'événement de début -->
<bpmn:process id="process-sans-debut" isExecutable="true">
  <bpmn:serviceTask id="Task_1" name="Faire l'action" />
</bpmn:process>`,
    goodDesc: 'Événement de début clairement identifié relié à la première tâche.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Événement de début standard -->
<bpmn:process id="process-avec-debut" isExecutable="true">
  <bpmn:startEvent id="StartEvent_1" name="Commande reçue">
    <bpmn:outgoing>Flow_1</bpmn:outgoing>
  </bpmn:startEvent>
  <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
  ...
</bpmn:process>`,
    impact: '🚨 Processus non déclenchable par l\'orchestrateur.',
    autoFixable: false
  },

  'multiple-none-start-events': {
    standard: 'OMG BPMN 2.0 §10.4.2 & Camunda Best Practice',
    badge: 'Ambigüité Début',
    explanation: 'Un processus de premier niveau ne doit comporter qu\'un SEUL événement de début non typé ("None Start Event"). Avoir plusieurs débuts non typés crée des instanciations concurrentes non maîtrisées.',
    badDesc: 'Deux événements de début simples (none) dans le même processus principal.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Deux événements de début simples concurrents -->
<bpmn:startEvent id="Start_1" name="Début standard" />
<bpmn:startEvent id="Start_2" name="Autre début" />`,
    goodDesc: 'Un unique début simple, ou des débuts différenciés par des déclencheurs (Message, Timer, Signal).',
    goodSnippet: `<!-- ✅ Bonne Pratique : Début unique non typé -->
<bpmn:startEvent id="Start_Unique" name="Demande initialisée" />`,
    impact: '🟠 Instanciations multiples indésirables ou comportement imprévisible.',
    autoFixable: false
  },

  'end-event': {
    standard: 'OMG BPMN 2.0 §10.4.3',
    badge: 'Terminaison',
    explanation: 'Chaque chemin d\'exécution doit aboutir à un événement de fin (bpmn:endEvent). L\'absence d\'événement de fin laisse des jetons suspendus en mémoire et empêche la clôture propre de l\'instance.',
    badDesc: 'Processus sans événement de fin ou flux s\'arrêtant sur une tâche intermédiaire.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Fin abrupte sans endEvent -->
<bpmn:serviceTask id="Task_derniere" name="Envoi email confirmation" />
<!-- Aucun endEvent connecté -->`,
    goodDesc: 'Événement de fin connecté avec état métier explicite.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Clôture via un endEvent -->
<bpmn:serviceTask id="Task_derniere" name="Envoi email confirmation">
  <bpmn:outgoing>Flow_to_end</bpmn:outgoing>
</bpmn:serviceTask>
<bpmn:sequenceFlow id="Flow_to_end" sourceRef="Task_derniere" targetRef="EndEvent_1" />
<bpmn:endEvent id="EndEvent_1" name="Commande finalisée" />`,
    impact: '🚨 Instance de processus restant indéfiniment active ("Zombie Instance").',
    autoFixable: false
  },

  'start-incoming': {
    standard: 'OMG BPMN 2.0 §10.4.2',
    badge: 'Intégrité Début',
    explanation: 'Un événement de début ne peut pas avoir de flux de séquence entrant (incoming). S\'il est nécessaire de boucler, le flux doit revenir vers une passerelle ou une tâche en aval.',
    badDesc: 'Flux de séquence pointant vers un bpmn:startEvent.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : startEvent avec un flux entrant -->
<bpmn:startEvent id="StartEvent_1">
  <bpmn:incoming>Flow_boucle_retour</bpmn:incoming>
</bpmn:startEvent>`,
    goodDesc: 'Le flux de retour boucle sur une passerelle XOR de convergence.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Boucle sur passerelle XOR -->
<bpmn:startEvent id="StartEvent_1">
  <bpmn:outgoing>Flow_1</bpmn:outgoing>
</bpmn:startEvent>
<bpmn:exclusiveGateway id="Gateway_join">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:incoming>Flow_boucle_retour</bpmn:incoming>
</bpmn:exclusiveGateway>`,
    impact: '🚨 Rejet immédiat par le moteur Zeebe au déploiement.',
    autoFixable: false
  },

  'end-outgoing': {
    standard: 'OMG BPMN 2.0 §10.4.3',
    badge: 'Intégrité Fin',
    explanation: 'Un événement de fin (bpmn:endEvent) consomme le jeton et ne peut pas avoir de flux de séquence sortant (outgoing). Tout élément placé après un endEvent est inaccessible.',
    badDesc: 'bpmn:endEvent possédant une balise <outgoing>.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : endEvent avec flux sortant -->
<bpmn:endEvent id="EndEvent_1">
  <bpmn:outgoing>Flow_apres_fin</bpmn:outgoing>
</bpmn:endEvent>`,
    goodDesc: 'endEvent sans aucun flux sortant.',
    goodSnippet: `<!-- ✅ Bonne Pratique : endEvent terminal propre -->
<bpmn:endEvent id="EndEvent_1" name="Contrat archivé">
  <bpmn:incoming>Flow_vers_fin</bpmn:incoming>
</bpmn:endEvent>`,
    impact: '🚨 Erreur de modélisation bloquante au déploiement.',
    autoFixable: false
  },

  'intermediate-flows': {
    standard: 'OMG BPMN 2.0 §10.4.4',
    badge: 'Continuité Flux',
    explanation: 'Un événement intermédiaire (catch ou throw) placé dans le flux principal doit obligatoirement comporter au moins un flux entrant et au moins un flux sortant.',
    badDesc: 'Événement intermédiaire isolé sans flux entrant ou sans flux sortant.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Timer intermédiaire non connecté en sortie -->
<bpmn:intermediateCatchEvent id="Timer_attente">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <!-- Manque <bpmn:outgoing> -->
</bpmn:intermediateCatchEvent>`,
    goodDesc: 'Événement intermédiaire inséré avec flux entrant et sortant.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Événement intermédiaire connecté -->
<bpmn:intermediateCatchEvent id="Timer_attente" name="Attente 24h">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration>PT24H</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>`,
    impact: '🟠 Jeton bloqué lors de l\'évaluation de l\'événement intermédiaire.',
    autoFixable: false
  },

  'boundary-reference': {
    standard: 'OMG BPMN 2.0 §10.4.12',
    badge: 'Événement Bordure',
    explanation: 'Un événement de bordure (boundaryEvent) doit obligatoirement référencer l\'activité sur laquelle il est attaché via l\'attribut attachedToRef.',
    badDesc: 'Balise <bpmn:boundaryEvent> sans attribut attachedToRef ou référençant un élément inexistant.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : attachedToRef manquant -->
<bpmn:boundaryEvent id="Error_1" cancelActivity="true">
  <bpmn:errorEventDefinition />
</bpmn:boundaryEvent>`,
    goodDesc: 'attachedToRef pointant vers la tâche cible dans le même scope.',
    goodSnippet: `<!-- ✅ Bonne Pratique : attachedToRef valide -->
<bpmn:serviceTask id="Task_appel_api" name="Appel API Facturation" />
<bpmn:boundaryEvent id="Error_1" attachedToRef="Task_appel_api" cancelActivity="true">
  <bpmn:outgoing>Flow_erreur</bpmn:outgoing>
  <bpmn:errorEventDefinition errorRef="Err_Api_500" />
</bpmn:boundaryEvent>`,
    impact: '🚨 Échec de parsing du schéma BPMN.',
    autoFixable: false
  },

  'boundary-target': {
    standard: 'OMG BPMN 2.0 §10.4.12',
    badge: 'Cible Bordure',
    explanation: 'Un événement de bordure ne peut être rattaché qu\'à une activité (Tâche, Sous-processus, Call Activity). Il ne peut pas être rattaché à une passerelle ou à un événement.',
    badDesc: 'attachedToRef pointant vers une passerelle ou un startEvent.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Boundary attaché à une passerelle -->
<bpmn:boundaryEvent id="Timer_1" attachedToRef="Gateway_xor_1" />`,
    goodDesc: 'attachedToRef rattaché à une Tâche ou un Sous-Processus.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Boundary attaché à une Tâche -->
<bpmn:boundaryEvent id="Timer_1" attachedToRef="Task_validation" />`,
    impact: '🚨 Rejet immédiat par le moteur BPMN.',
    autoFixable: false
  },

  'boundary-incoming': {
    standard: 'OMG BPMN 2.0 §10.4.12',
    badge: 'Événement Bordure',
    explanation: 'Un événement de bordure est déclenché par un événement externe/exception sur l\'activité hôte. Il ne peut JAMAIS avoir de flux de séquence entrant (incoming).',
    badDesc: 'bpmn:boundaryEvent contenant un flux <incoming>.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Boundary avec flux entrant -->
<bpmn:boundaryEvent id="Boundary_1" attachedToRef="Task_1">
  <bpmn:incoming>Flow_interdit</bpmn:incoming>
  <bpmn:outgoing>Flow_derivation</bpmn:outgoing>
</bpmn:boundaryEvent>`,
    goodDesc: 'Boundary sans flux entrant, avec uniquement un flux sortant d\'exception.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Uniquement flux sortant sur le boundary -->
<bpmn:boundaryEvent id="Boundary_1" attachedToRef="Task_1">
  <bpmn:outgoing>Flow_derivation</bpmn:outgoing>
</bpmn:boundaryEvent>`,
    impact: '🚨 Violation formelle de la sémantique BPMN 2.0.',
    autoFixable: false
  },

  'boundary-outgoing': {
    standard: 'OMG BPMN 2.0 §10.4.12',
    badge: 'Événement Bordure',
    explanation: 'Un événement de bordure doit posséder au moins un flux sortant pour dériver le jeton en cas de capture d\'événement (erreur, timer, message). Sans flux sortant, l\'exception est absorbée dans le vide.',
    badDesc: 'Boundary event sans flux sortant de dérivation.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Exception capturée sans branche de traitement -->
<bpmn:boundaryEvent id="Error_catch" attachedToRef="Task_1">
  <bpmn:errorEventDefinition errorRef="Err_1" />
</bpmn:boundaryEvent>`,
    goodDesc: 'Flux sortant reliant l\'événement de bordure à la gestion d\'incident.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Flux sortant de compensation / remédiation -->
<bpmn:boundaryEvent id="Error_catch" attachedToRef="Task_1">
  <bpmn:outgoing>Flow_vers_remediation</bpmn:outgoing>
  <bpmn:errorEventDefinition errorRef="Err_1" />
</bpmn:boundaryEvent>`,
    impact: '⚠️ Perte silencieuse de traitement en cas d\'erreur.',
    autoFixable: false
  },

  'event-subprocess-structure': {
    standard: 'OMG BPMN 2.0 §10.4.5',
    badge: 'Sous-processus Événementiel',
    explanation: 'Un sous-processus événementiel (triggeredByEvent="true") ne doit comporter aucun flux de séquence entrant ni sortant, et son événement de début doit obligatoirement être typé (Message, Error, Timer, Signal).',
    badDesc: 'Sous-processus événementiel relié par un flux séquentiel ou début simple non typé.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Sous-processus événementiel relié par un flux -->
<bpmn:subProcess id="EventSub_1" triggeredByEvent="true">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:startEvent id="Start_simple" />
</bpmn:subProcess>`,
    goodDesc: 'Sous-processus événementiel autonome avec début Error/Message.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Début typé sans flux entrant/sortant -->
<bpmn:subProcess id="EventSub_1" triggeredByEvent="true">
  <bpmn:startEvent id="Start_error" isInterrupting="true">
    <bpmn:outgoing>Flow_handler</bpmn:outgoing>
    <bpmn:errorEventDefinition errorRef="Err_Technique" />
  </bpmn:startEvent>
  ...
</bpmn:subProcess>`,
    impact: '🚨 Erreur de compilation du modèle BPMN.',
    autoFixable: false
  },

  'unreachable-node': {
    standard: 'OMG BPMN 2.0 §8.3 & Analyse Statique',
    badge: 'Code Mort',
    explanation: 'Tout élément du processus doit être atteignable par un chemin continu depuis au moins un événement de début. Les éléments orphelins constituent du code mort et polluent le diagramme.',
    badDesc: 'Tâche ou passerelle flottante déconnectée du reste du graphe.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche isolée sans chemin depuis le début -->
<bpmn:serviceTask id="Task_oubliee" name="Ancienne étape non reliée" />`,
    goodDesc: 'Tous les éléments sont connectés dans le flux de séquence principal.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Tous les nœuds sont reliés -->
<bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_1" targetRef="Task_active" />
<bpmn:serviceTask id="Task_active" name="Étape active" />`,
    impact: '🟡 Dette technique, confusion pour les analystes et faux sentiment de complétude.',
    autoFixable: false
  },

  'default-flow-reference': {
    standard: 'OMG BPMN 2.0 §10.5.1',
    badge: 'Branche par Défaut',
    explanation: 'L\'attribut default d\'une passerelle ou d\'une activité doit faire référence à un identifiant de flux de séquence (sequenceFlow) existant et issu de ce même élément.',
    badDesc: 'Attribut default pointant vers un flux inexistant ou non relié au nœud.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : default pointant vers 'Flow_Inexistant' -->
<bpmn:exclusiveGateway id="Gateway_1" default="Flow_Inexistant">
  <bpmn:outgoing>Flow_A</bpmn:outgoing>
</bpmn:exclusiveGateway>`,
    goodDesc: 'Attribut default correspondant à l\'une des balises <outgoing>.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Branche par défaut résolue -->
<bpmn:exclusiveGateway id="Gateway_1" default="Flow_Defaut">
  <bpmn:outgoing>Flow_Eligible</bpmn:outgoing>
  <bpmn:outgoing>Flow_Defaut</bpmn:outgoing>
</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="Flow_Defaut" sourceRef="Gateway_1" targetRef="Task_Rejet" />`,
    impact: '🚨 Incident d\'exécution Zeebe en cas d\'absence de match conditionnel.',
    autoFixable: false
  },

  'flow-node-id': {
    standard: 'OMG BPMN 2.0 §8.2',
    badge: 'Identifiant Nœud',
    explanation: 'Chaque élément de flux (Task, Gateway, Event, SubProcess) doit posséder un identifiant id non vide.',
    badDesc: 'Élément XML de flux sans attribut id.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Task sans attribut id -->
<bpmn:serviceTask name="Valider le dossier" />`,
    goodDesc: 'Identifiant technique présent.',
    goodSnippet: `<!-- ✅ Bonne Pratique : ID technique présent -->
<bpmn:serviceTask id="Task_valider_dossier" name="Valider le dossier" />`,
    impact: '🚨 Impossibilité d\'auditer ou d\'orchestrer le nœud.',
    autoFixable: false
  },

  'lane-reference': {
    standard: 'OMG BPMN 2.0 §10.2.3',
    badge: 'Intégrité Lanes',
    explanation: 'Toute référence d\'élément <flowNodeRef> contenue dans une Lane doit correspondre à un élément de flux existant dans le processus parent.',
    badDesc: 'flowNodeRef pointant vers un ID de tâche supprimé ou inexistant.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Référence orpheline dans la lane -->
<bpmn:lane id="Lane_Support">
  <bpmn:flowNodeRef>Task_Supprimee</bpmn:flowNodeRef>
</bpmn:lane>`,
    goodDesc: 'flowNodeRef pointant vers des éléments réels.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Références exactes dans la lane -->
<bpmn:lane id="Lane_Support">
  <bpmn:flowNodeRef>Task_traitement_ticket</bpmn:flowNodeRef>
</bpmn:lane>`,
    impact: '🟠 Problèmes d\'affichage et d\'assignation dans le Modeler.',
    autoFixable: false
  },

  'duplicate-process-id-batch': {
    standard: 'Camunda Cloud Cluster Architecture',
    badge: 'Gouvernance Multi-fichiers',
    explanation: 'Dans un même lot de fichiers de déploiement, deux fichiers BPMN différents ne doivent pas définir le même identifiant de processus (<bpmn:process id="...">), sous peine d\'écrasement de version silencieux.',
    badDesc: 'Deux fichiers BPMN distincts contenant le même process id (ex: process-facturation).',
    badSnippet: `<!-- Fichier A.bpmn -->
<bpmn:process id="process-facturation" ... />

<!-- Fichier B.bpmn -->
<bpmn:process id="process-facturation" ... />`,
    goodDesc: 'Identifiants de processus distincts pour chaque fichier du repository.',
    goodSnippet: `<!-- Fichier A.bpmn -->
<bpmn:process id="process-facturation-b2c" ... />

<!-- Fichier B.bpmn -->
<bpmn:process id="process-facturation-b2b" ... />`,
    impact: '🚨 Écrasement incontrôlé des définitions de processus sur le cluster Zeebe.',
    autoFixable: false
  },

  'call-target': {
    standard: 'OMG BPMN 2.0 §10.3.3 & Zeebe Spec',
    badge: 'Call Activity',
    explanation: 'Une tâche d\'appel (Call Activity) doit obligatoirement renseigner l\'identifiant du processus cible à invoquer via l\'attribut calledElement ou l\'extension zeebe:calledElement.',
    badDesc: 'bpmn:callActivity sans attribut calledElement ni balise zeebe:calledElement.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Call Activity sans cible -->
<bpmn:callActivity id="Call_1" name="Sous-processus Facturation" />`,
    goodDesc: 'Attribut calledElement ou balise zeebe:calledElement avec processId cible défini.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Cible appelée explicitement -->
<bpmn:callActivity id="Call_1" name="Sous-processus Facturation" calledElement="process-facturation">
  <bpmn:extensionElements>
    <zeebe:calledElement processId="process-facturation" propagateAllChildVariables="false" propagateAllParentVariables="false" />
  </bpmn:extensionElements>
</bpmn:callActivity>`,
    impact: '🚨 Incident d\'exécution critique Zeebe (Called element is empty).',
    autoFixable: false
  },

  'call-target-provided': {
    standard: 'Bouygues Telecom CI/CD Governance',
    badge: 'Cohérence du Lot',
    explanation: 'Le sous-processus appelé par une Call Activity doit être présent dans le lot de fichiers BPMN analysés, pour garantir l\'auditabilité globale et l\'absence de dépendance orpheline.',
    badDesc: 'Call activity ciblant un process ID absent de l\'ensemble des fichiers importés.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : process-inconnu n'est pas fourni dans le workspace -->
<bpmn:callActivity id="Call_sub" calledElement="process-inconnu" />`,
    goodDesc: 'Le fichier sous-processus correspondant est inclus dans le déploiement.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Le fichier 'process-facturation.bpmn' est présent dans le pack -->
<bpmn:callActivity id="Call_sub" calledElement="process-facturation" />`,
    impact: '🟡 Risque de rupture de dépendance en environnement de recette/production.',
    autoFixable: false
  },

  'call-cycle': {
    standard: 'Architecture Récursive BPMN',
    badge: 'Prévention Boucle Infinie',
    explanation: 'Les dépendances entre Call Activities ne doivent pas former de cycle récursif (Process A appelle Process B qui rappelle Process A). Les cycles d\'appels entraînent une récursion infinie et l\'effondrement du cluster.',
    badDesc: 'Cycle d\'appel direct ou indirect détecté entre plusieurs diagrammes.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Cycle A -> B -> A -->
<!-- process_a.bpmn appelle process_b -->
<!-- process_b.bpmn appelle process_a -->`,
    goodDesc: 'Architecture arborescente sans boucle récursive d\'orchestration.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Flux hiérarchique clair A -> B -> C -->`,
    impact: '🚨 Boucle infinie d\'instanciations, saturation mémoire et incident majeur.',
    autoFixable: false
  },

  'call-activity-input-propagation-off': {
    standard: 'Bouygues Telecom Standard §4.2 & Zeebe 8.x',
    badge: 'Isolation Variables',
    explanation: 'Sur une Call Activity, la propagation automatique des variables parentes vers le sous-processus doit être DÉSACTIVÉE (propagateAllParentVariables="false"). Toutes les entrées doivent être mappées explicitement via des balises <zeebe:input source="..." target="..." /> pour éviter toute pollution mémoire et effet de bord.',
    badDesc: 'propagateAllParentVariables omis ou positionné à "true".',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Propagation parente activée par défaut -->
<bpmn:callActivity id="Call_Eligibilite" calledElement="sub-process-eligibilite">
  <bpmn:extensionElements>
    <zeebe:calledElement processId="sub-process-eligibilite" propagateAllParentVariables="true" />
  </bpmn:extensionElements>
</bpmn:callActivity>`,
    goodDesc: 'propagateAllParentVariables="false" avec entrées explicites.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Isolation stricte et mapping explicite -->
<bpmn:callActivity id="Call_Eligibilite" calledElement="sub-process-eligibilite">
  <bpmn:extensionElements>
    <zeebe:calledElement processId="sub-process-eligibilite" propagateAllParentVariables="false" propagateAllChildVariables="false" />
    <zeebe:ioMapping>
      <zeebe:input source="= codePostal" target="codePostal" />
      <zeebe:input source="= typeOffre" target="typeOffre" />
    </zeebe:ioMapping>
  </bpmn:extensionElements>
</bpmn:callActivity>`,
    impact: '🚨 Pollution de l\'espace mémoire du sous-processus et régressions silencieuses.',
    autoFixable: true
  },

  'call-activity-output-propagation-off': {
    standard: 'Bouygues Telecom Standard §4.2 & Zeebe 8.x',
    badge: 'Isolation Variables',
    explanation: 'Sur une Call Activity, la propagation automatique des variables filles vers le parent doit être DÉSACTIVÉE (propagateAllChildVariables="false"). Seules les variables de retour explicitement mappées (<zeebe:output source="..." target="..." />) doivent remonter dans le processus parent.',
    badDesc: 'propagateAllChildVariables omis ou positionné à "true".',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Propagation enfant globale vers le parent -->
<bpmn:callActivity id="Call_Scoring" calledElement="sub-scoring">
  <bpmn:extensionElements>
    <zeebe:calledElement processId="sub-scoring" propagateAllChildVariables="true" />
  </bpmn:extensionElements>
</bpmn:callActivity>`,
    goodDesc: 'propagateAllChildVariables="false" avec sorties explicitement déclarées.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Retour de variables contrôlé -->
<bpmn:callActivity id="Call_Scoring" calledElement="sub-scoring">
  <bpmn:extensionElements>
    <zeebe:calledElement processId="sub-scoring" propagateAllParentVariables="false" propagateAllChildVariables="false" />
    <zeebe:ioMapping>
      <zeebe:output source="= scoreClient" target="scoreClient" />
      <zeebe:output source="= decisionScoring" target="decisionScoring" />
    </zeebe:ioMapping>
  </bpmn:extensionElements>
</bpmn:callActivity>`,
    impact: '🚨 Écrasement involontaire de variables du processus parent par des variables temporaires du sous-processus.',
    autoFixable: true
  },

  'activity-only-callactivity': {
    standard: 'Bouygues Telecom Architecture Modulaire PMG',
    badge: 'Architecture Processus',
    explanation: 'Dans le cadre de l\'architecture modulaire Bouygues Telecom, les processus de haut niveau d\'orchestration doivent privilégier les Call Activities pour déléguer les étapes techniques, évitant les processus monolithiques géants.',
    badDesc: 'Processus d\'orchestration contenant un mélange massif de scriptTask et userTask locales non modulaires.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Monolithe sans découpage en sous-modules réutilisables -->`,
    goodDesc: 'Découpage en modules fonctionnels autonomes appelés via Call Activity.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Découpage modulaire par domaine -->
<bpmn:callActivity id="Call_Controle" calledElement="sub-controle-eligibilite" />
<bpmn:callActivity id="Call_Contrat" calledElement="sub-generation-contrat" />`,
    impact: '🟡 Monolithe difficile à maintenir, tester et réutiliser.',
    autoFixable: false
  },

  'dead-end-node': {
    standard: 'OMG BPMN 2.0 §8.3 & Théorie des Graphes',
    badge: 'Impasse Graphique',
    explanation: 'Tout nœud intermédiaire (qui n\'est pas un événement de fin) doit posséder au moins un flux sortant pour permettre au jeton de continuer son cheminement.',
    badDesc: 'Tâche ou passerelle sans aucun flux sortant (impasse).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche en impasse sans flux sortant -->
<bpmn:userTask id="Task_impasse" name="Consulter le dossier">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <!-- Aucun outgoing -->
</bpmn:userTask>`,
    goodDesc: 'La tâche est reliée à l\'étape suivante ou à un événement de fin.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Tâche reliée au flux aval -->
<bpmn:userTask id="Task_valide" name="Consulter le dossier">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
</bpmn:userTask>`,
    impact: '🚨 Jeton d\'exécution bloqué définitivement dans la tâche.',
    autoFixable: false
  },

  'no-path-to-end': {
    standard: 'OMG BPMN 2.0 §8.3 & Intégrité du Flux',
    badge: 'Terminaison Garanties',
    explanation: 'Il doit exister un chemin continu depuis chaque élément du processus menant à au moins un événement de fin (bpmn:endEvent).',
    badDesc: 'Branche formant une boucle fermée sans aucune porte de sortie vers un endEvent.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Boucle sans chemin de sortie vers la fin -->
<bpmn:serviceTask id="Task_A">
  <bpmn:outgoing>Flow_to_B</bpmn:outgoing>
</bpmn:serviceTask>
<bpmn:serviceTask id="Task_B">
  <bpmn:outgoing>Flow_to_A</bpmn:outgoing>
</bpmn:serviceTask>`,
    goodDesc: 'Présence d\'une condition de sortie menant à un événement de fin.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Passerelle avec branche de sortie vers EndEvent -->
<bpmn:exclusiveGateway id="Gateway_exit" default="Flow_loop">
  <bpmn:outgoing>Flow_to_end</bpmn:outgoing>
  <bpmn:outgoing>Flow_loop</bpmn:outgoing>
</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="Flow_to_end" sourceRef="Gateway_exit" targetRef="End_1" />`,
    impact: '🚨 Blocage perpétuel de l\'instance dans le moteur.',
    autoFixable: false
  },

  'gateway-branches': {
    standard: 'OMG BPMN 2.0 §10.5',
    badge: 'Passerelle Utile',
    explanation: 'Une passerelle (Gateway) a pour rôle de diverger (Split : >= 2 flux sortants) ou de converger (Join : >= 2 flux entrants). Une passerelle avec 1 seul flux entrant et 1 seul flux sortant est inutile.',
    badDesc: 'Passerelle triviale avec 1 entrée et 1 sortie.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Passerelle inutile 1-vers-1 -->
<bpmn:exclusiveGateway id="Gateway_inutile">
  <bpmn:incoming>Flow_1</bpmn:incoming>
  <bpmn:outgoing>Flow_2</bpmn:outgoing>
</bpmn:exclusiveGateway>`,
    goodDesc: 'Remplacer la passerelle inutile par un flux direct, ou ajouter les branches nécessaires.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Flux direct sans passerelle superflue -->
<bpmn:sequenceFlow id="Flow_direct" sourceRef="Task_1" targetRef="Task_2" />`,
    impact: '🟡 Complexité visuelle inutile et surcoût de processing.',
    autoFixable: false
  },

  'parallel-gateway-condition': {
    standard: 'OMG BPMN 2.0 §10.5.3',
    badge: 'Passerelle Parallèle (AND)',
    explanation: 'Une passerelle parallèle (AND / parallelGateway) active simultanément TOUTES ses branches sortantes. Par définition normative, AUCUNE condition (conditionExpression) ne doit figurer sur ses flux sortants.',
    badDesc: 'Flux sortant d\'une passerelle parallèle contenant une expression de condition.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Condition sur branche parallèle AND -->
<bpmn:parallelGateway id="Fork_AND" />
<bpmn:sequenceFlow id="Flow_1" sourceRef="Fork_AND" targetRef="Task_1">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= montant > 100</bpmn:conditionExpression>
</bpmn:sequenceFlow>`,
    goodDesc: 'Branches de passerelle parallèle sans expression conditionnelle.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Branches parallèles sans condition -->
<bpmn:parallelGateway id="Fork_AND" />
<bpmn:sequenceFlow id="Flow_1" sourceRef="Fork_AND" targetRef="Task_1" />
<bpmn:sequenceFlow id="Flow_2" sourceRef="Fork_AND" targetRef="Task_2" />`,
    impact: '🚨 Comportement indéterminé ou rejet au déploiement Camunda.',
    autoFixable: false
  },

  'parallel-gateway-default': {
    standard: 'OMG BPMN 2.0 §10.5.3',
    badge: 'Passerelle Parallèle (AND)',
    explanation: 'Une passerelle parallèle active toutes ses branches sans arbitrage ; elle ne doit donc JAMAIS comporter d\'attribut default (branche par défaut).',
    badDesc: 'Balise parallelGateway avec attribut default="...".',
    badSnippet: `<!-- ❌ Mauvaise Pratique : default sur une passerelle AND -->
<bpmn:parallelGateway id="Fork_AND" default="Flow_1" />`,
    goodDesc: 'Passerelle parallèle sans attribut default.',
    goodSnippet: `<!-- ✅ Bonne Pratique : parallelGateway sans default -->
<bpmn:parallelGateway id="Fork_AND" />`,
    impact: '🚨 Violation de la norme OMG BPMN 2.0.',
    autoFixable: false
  },

  'exclusive-gateway-default': {
    standard: 'OMG BPMN 2.0 §10.5.1 & Bouygues Telecom Std',
    badge: 'Robustesse Décision (XOR)',
    explanation: 'Une passerelle exclusive (XOR) divergente doit OBLIGATOIREMENT définir une branche par défaut (attribut default). Si aucune des conditions FEEL n\'est satisfaite à l\'exécution, le moteur emprunte la branche par défaut au lieu de lever un Incident critique.',
    badDesc: 'Passerelle exclusive sans attribut default.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Pas de branche par défaut sur le XOR -->
<bpmn:exclusiveGateway id="Gateway_Decision" name="Client éligible ?">
  <bpmn:outgoing>Flow_Oui</bpmn:outgoing>
  <bpmn:outgoing>Flow_Non</bpmn:outgoing>
</bpmn:exclusiveGateway>`,
    goodDesc: 'Attribut default configuré vers la branche de repli/rejet.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Branche par défaut explicite -->
<bpmn:exclusiveGateway id="Gateway_Decision" name="Client éligible ?" default="Flow_Non">
  <bpmn:outgoing>Flow_Oui</bpmn:outgoing>
  <bpmn:outgoing>Flow_Non</bpmn:outgoing>
</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="Flow_Oui" sourceRef="Gateway_Decision" targetRef="Task_OK">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= estEligible = true</bpmn:conditionExpression>
</bpmn:sequenceFlow>
<bpmn:sequenceFlow id="Flow_Non" sourceRef="Gateway_Decision" targetRef="Task_Rejet" />`,
    impact: '🚨 Incident bloquant d\'exécution Zeebe si aucune condition n\'est remplie (Unhandled condition).',
    autoFixable: false
  },

  'exclusive-gateway-conditions': {
    standard: 'OMG BPMN 2.0 §10.5.1',
    badge: 'Conditions Décision (XOR)',
    explanation: 'Sur une passerelle exclusive (XOR), chaque branche sortante qui n\'est PAS la branche par défaut doit obligatoirement posséder une expression de condition (conditionExpression).',
    badDesc: 'Branche non-par-défaut sans expression conditionnelle.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Branche sans condition et non par défaut -->
<bpmn:sequenceFlow id="Flow_Oui" sourceRef="Gateway_Decision" targetRef="Task_OK" />`,
    goodDesc: 'Expression FEEL valide sur chaque branche conditionnelle.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Condition FEEL explicite -->
<bpmn:sequenceFlow id="Flow_Oui" sourceRef="Gateway_Decision" targetRef="Task_OK">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= statut = "VALIDE"</bpmn:conditionExpression>
</bpmn:sequenceFlow>`,
    impact: '🚨 Blocage du moteur lors du routage.',
    autoFixable: false
  },

  'loop-max-counter-timer': {
    standard: 'Bouygues Telecom Anti-Crash Pattern v4.2',
    badge: 'Stabilité Cluster',
    explanation: 'Toute boucle de retraitement ou de retry métier dans le diagramme BPMN doit OBLIGATOIREMENT intégrer un compteur maximal d\'itérations (ex: maxBoucle >= 3) ET une temporisation minimale (Timer intermédiaire >= 1 minute). Les boucles rapides sans délai provoquent des tempêtes de jobs et saturent le cluster.',
    badDesc: 'Boucle de retour directe sans timer ni borne de comptage maximale.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Boucle infinie directe sans timer ni garde-fou -->
<bpmn:sequenceFlow id="Flow_retry" sourceRef="Gateway_echec" targetRef="Task_appel_api" />`,
    goodDesc: 'Boucle avec incrément de compteur, test de dépassement et timer d\'attente.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Garde-fou de boucle + Temporisation -->
<bpmn:sequenceFlow id="Flow_retry" sourceRef="Gateway_echec" targetRef="Timer_attente_retry">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= nbTentatives &lt; 3</bpmn:conditionExpression>
</bpmn:sequenceFlow>
<bpmn:intermediateCatchEvent id="Timer_attente_retry" name="Attente 5 min">
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration>PT5M</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>`,
    impact: '🚨 Tempête d\'appels, surcharge CPU/Zeebe et incident de production majeur.',
    autoFixable: false
  },

  'event-based-gateway-targets': {
    standard: 'OMG BPMN 2.0 §10.5.5',
    badge: 'Passerelle Événementielle',
    explanation: 'Une passerelle basée sur les événements (eventBasedGateway) ne peut cibler QUE des événements intermédiaires de type Catch (Timer, Message, Signal) ou des Receive Tasks. Elle ne doit jamais cibler directement des Service Tasks ou des passerelles.',
    badDesc: 'eventBasedGateway ciblant une ServiceTask ou une UserTask.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : eventBasedGateway ciblant une ServiceTask -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="EventGateway_1" targetRef="ServiceTask_1" />`,
    goodDesc: 'Cible des événements intermédiaires ou receiveTask.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Cible des événements Message ou Timer -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="EventGateway_1" targetRef="IntermediateMsg_Recu" />
<bpmn:sequenceFlow id="Flow_2" sourceRef="EventGateway_1" targetRef="IntermediateTimer_Timeout" />`,
    impact: '🚨 Rejet immédiat du diagramme par le moteur Zeebe.',
    autoFixable: false
  },

  'gateway-mixed': {
    standard: 'OMG BPMN 2.0 & Bruce Silver Best Practices',
    badge: 'Lisibilité Décision',
    explanation: 'Il est fortement conseillé de séparer les rôles de convergence (Join : multiples entrées, 1 sortie) et de divergence (Split : 1 entrée, multiples sorties) au lieu d\'utiliser une passerelle mixte (N entrées, M sorties).',
    badDesc: 'Passerelle avec 3 flux entrants et 3 flux sortants simultanés.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Passerelle mixte N-vers-M -->
<bpmn:exclusiveGateway id="Gateway_mixte">
  <bpmn:incoming>In_1</bpmn:incoming><bpmn:incoming>In_2</bpmn:incoming>
  <bpmn:outgoing>Out_1</bpmn:outgoing><bpmn:outgoing>Out_2</bpmn:outgoing>
</bpmn:exclusiveGateway>`,
    goodDesc: 'Deux passerelles distinctes : une passerelle de join suivie d\'une passerelle de split.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Join puis Split séparés -->
<bpmn:exclusiveGateway id="Gateway_join">...</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="Flow_link" sourceRef="Gateway_join" targetRef="Gateway_split" />
<bpmn:exclusiveGateway id="Gateway_split">...</bpmn:exclusiveGateway>`,
    impact: '🔵 Diagramme difficile à lire et sémantique ambiguë.',
    autoFixable: false
  },

  'conditional-flow-source': {
    standard: 'OMG BPMN 2.0 §10.5 & Style BPMN',
    badge: 'Décision Explicite',
    explanation: 'Les expressions conditionnelles doivent être portées par des passerelles de décision (XOR/OR) et non directement issues d\'une tâche de travail.',
    badDesc: 'Tâche émettant plusieurs flux de séquence avec conditions directement sans passerelle.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche avec flux conditionnels sortants -->
<bpmn:serviceTask id="Task_1">
  <bpmn:outgoing>Flow_succes</bpmn:outgoing>
  <bpmn:outgoing>Flow_echec</bpmn:outgoing>
</bpmn:serviceTask>`,
    goodDesc: 'La tâche sort vers une passerelle exclusive qui arbitre les conditions.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Tâche -> Passerelle XOR -> Branches conditionnelles -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Gateway_decision" />
<bpmn:exclusiveGateway id="Gateway_decision" name="Résultat OK ?" default="Flow_echec">
  <bpmn:outgoing>Flow_succes</bpmn:outgoing>
  <bpmn:outgoing>Flow_echec</bpmn:outgoing>
</bpmn:exclusiveGateway>`,
    impact: '🟡 Diagramme confus masquant la logique de décision métier.',
    autoFixable: false
  },

  'gateway-flow-label': {
    standard: 'Conventions de Documentation Bouygues Telecom',
    badge: 'Lisibilité Graphique',
    explanation: 'Chaque branche issue d\'une passerelle exclusive de décision doit avoir un libellé textuel explicite (ex: "Oui", "Non", "Montant > 1000€") pour rendre le diagramme compréhensible par les équipes métier.',
    badDesc: 'Branches sortantes d\'une passerelle XOR sans nom ni description textuelle.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Flux sortants anonymes -->
<bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_decision" targetRef="Task_A" />`,
    goodDesc: 'Branches nommées clairement en adéquation avec la question de la passerelle.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Nommage explicite des branches -->
<bpmn:sequenceFlow id="Flow_1" name="Oui (éligible)" sourceRef="Gateway_decision" targetRef="Task_A" />
<bpmn:sequenceFlow id="Flow_2" name="Non (rejet)" sourceRef="Gateway_decision" targetRef="Task_B" />`,
    impact: '🟡 Manque de clarté pour l\'audit métier et la recette.',
    autoFixable: false
  },

  'multiple-end-events-labeled': {
    standard: 'Conventions de Modélisation Bouygues Telecom',
    badge: 'États Finaux',
    explanation: 'Lorsqu\'un processus possède plusieurs événements de fin, chacun d\'eux doit avoir un nom explicite décrivant l\'état final métier atteint (ex: "Commande validée", "Dossier rejeté", "Demande annulée").',
    badDesc: 'Multiples événements de fin sans libellé ou avec des noms génériques ("EndEvent_1").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Fins multiples anonymes -->
<bpmn:endEvent id="End_1" />
<bpmn:endEvent id="End_2" />`,
    goodDesc: 'Chaque fin caractérise précisément le résultat obtenu.',
    goodSnippet: `<!-- ✅ Bonne Pratique : États finaux caractérisés -->
<bpmn:endEvent id="End_OK" name="Contrat activé avec succès" />
<bpmn:endEvent id="End_KO" name="Demande rejetée par scoring" />`,
    impact: '🟡 Difficulté d\'analyse des indicateurs de performance (KPIs) et du reporting.',
    autoFixable: false
  },

  'process-complexity': {
    standard: 'Bouygues Telecom Governance / KISS Principle',
    badge: 'Gouvernance & Clarté',
    explanation: 'Un diagramme de processus ne doit pas dépasser 35 à 40 nœuds dans un même scope. Au-delà, la complexité cyclomatique devient ingérable et le modèle doit être découpé en sous-processus modulaires (Call Activities).',
    badDesc: 'Processus spaghetti contenant plus de 50 tâches, passerelles et événements entremêlés.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Monolithe géant de 80 éléments -->`,
    goodDesc: 'Découpage modulaire : Processus chapeau + Sous-processus d\'étape.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Processus d'orchestration concis -->`,
    impact: '🟡 Risque élevé d\'erreurs de modélisation, tests difficiles et maintenance complexe.',
    autoFixable: false
  },

  'process-id-kebab': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Convention ID',
    explanation: 'L\'identifiant technique du processus (<bpmn:process id="...">) doit être rédigé en kebab-case strict (minuscules et tirets, ex: process-facturation-client). Cela garantit la compatibilité multi-plateformes et l\'uniformité des URLs de déploiement.',
    badDesc: 'ID avec majuscules, espaces, underscores ou caractères accentués (ex: Process_Facturation Client).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : PascalCase ou snake_case -->
<bpmn:process id="Process_FacturationClient" ... />`,
    goodDesc: 'Identifiant en kebab-case propre et descriptif.',
    goodSnippet: `<!-- ✅ Bonne Pratique : kebab-case strict -->
<bpmn:process id="process-facturation-client" ... />`,
    impact: '🟠 Problèmes d\'interopérabilité d\'URLs dans les pipelines CI/CD.',
    autoFixable: true
  },

  'process-name-capital': {
    standard: 'Charte Éditoriale Bouygues Telecom',
    badge: 'Sémantique Nommage',
    explanation: 'Le nom affiché du processus (attribut name) doit débuter par une lettre majuscule pour assurer une présentation soignée dans Camunda Operate, Tasklist et les dashboards.',
    badDesc: 'Nom commençant par une minuscule (ex: "gestion des abonnements").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Minuscule initiale -->
<bpmn:process name="gestion des abonnements" ... />`,
    goodDesc: 'Majuscule initiale et libellé soigné.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Majuscule initiale -->
<bpmn:process name="Gestion des abonnements" ... />`,
    impact: '🟡 Image dégradée dans les interfaces utilisateurs et rapports.',
    autoFixable: true
  },

  'empty-name': {
    standard: 'OMG BPMN 2.0 & Bonnes Pratiques',
    badge: 'Documentation Éléments',
    explanation: 'Toutes les tâches (Service Task, User Task, Send Task, Call Activity) et événements métier doivent posséder un libellé textuel (attribut name) non vide.',
    badDesc: 'Tâche sans attribut name.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche anonyme -->
<bpmn:serviceTask id="Task_1" />`,
    goodDesc: 'Nom fonctionnel précis.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Nom fonctionnel présent -->
<bpmn:serviceTask id="Task_1" name="Notifier le client par SMS" />`,
    impact: '🟡 Modèle incompréhensible en supervision dans Operate.',
    autoFixable: false
  },

  'task-imperative': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Tâche',
    explanation: 'Le libellé d\'une tâche doit obligatoirement être formulé avec un Verbe à l\'infinitif suivi d\'un Complément d\'objet direct (ex: "Valider le panier", "Envoyer la facture", "Calculer l\'éligibilité").',
    badDesc: 'Nom sous forme de nom commun isolé ou participe (ex: "Validation panier", "Facture envoyée").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Nommage non infinitif -->
<bpmn:userTask name="Validation du dossier" />`,
    goodDesc: 'Verbe d\'action à l\'infinitif + complément.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Verbe à l'infinitif + Complément -->
<bpmn:userTask name="Valider le dossier client" />`,
    impact: '🟡 Confusion entre tâche d\'action et événement d\'état.',
    autoFixable: false
  },

  'subprocess-noun-phrase': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Sous-processus',
    explanation: 'Un sous-processus ou une Call Activity doit être nommé sous la forme d\'un groupe nominal décrivant l\'activité globale (ex: "Gestion des réclamations", "Traitement de la commande").',
    badDesc: 'Sous-processus nommé avec un verbe direct d\'action simple.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Verbe simple pour un sous-processus complet -->
<bpmn:subProcess name="Traiter" />`,
    goodDesc: 'Phrase nominale descriptive.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Phrase nominale -->
<bpmn:subProcess name="Traitement des litiges de facturation" />`,
    impact: '🟡 Lisibilité globale de l\'architecture.',
    autoFixable: false
  },

  'gateway-question': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Décision',
    explanation: 'Les passerelles exclusives (XOR) et inclusives (OR) doivent obligatoirement être formulées sous forme d\'une Question se terminant par un point d\'interrogation « ? » (ex: "Client éligible ?", "Montant supérieur à 500 € ?").',
    badDesc: 'Passerelle nommée sans point d\'interrogation ou avec un verbe d\'action.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Nom d'action sans point d'interrogation -->
<bpmn:exclusiveGateway name="Vérifier éligibilité" />`,
    goodDesc: 'Question fermée ou explicite avec « ? ».',
    goodSnippet: `<!-- ✅ Bonne Pratique : Question avec point d'interrogation -->
<bpmn:exclusiveGateway name="Client éligible ?" />`,
    impact: '🟠 Ambiguïté sur les critères de décision.',
    autoFixable: true
  },

  'gateway-parallel-no-question': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Passerelle AND',
    explanation: 'Une passerelle parallèle (AND) exécute simultanément toutes les branches sans poser de question. Elle ne doit donc JAMAIS comporter de point d\'interrogation dans son libellé.',
    badDesc: 'Passerelle AND avec un point d\'interrogation (ex: "Exécuter en parallèle ?").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : '?' sur une passerelle parallèle -->
<bpmn:parallelGateway name="Traiter les deux flux ?" />`,
    goodDesc: 'Nom descriptif d\'action simultanée sans « ? ».',
    goodSnippet: `<!-- ✅ Bonne Pratique : Libellé informatif sans point d'interrogation -->
<bpmn:parallelGateway name="Traitement parallèle des pièces" />`,
    impact: '🟡 Confusion sémantique entre aiguillage décisionnel et parallélisme.',
    autoFixable: true
  },

  'event-start-past-participle': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Début',
    explanation: 'Un événement de début marque la survenance d\'un fait déclencheur. Il doit être nommé sous la forme "Objet + Participe passé" (ex: "Dossier reçu", "Demande soumise", "Abonnement résilié").',
    badDesc: 'Événement de début nommé avec un verbe à l\'infinitif (ex: "Recevoir la commande").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Verbe infinitif sur un début -->
<bpmn:startEvent name="Recevoir la commande" />`,
    goodDesc: 'Fait accompli au participe passé.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Fait déclencheur au participe passé -->
<bpmn:startEvent name="Commande reçue" />`,
    impact: '🟡 Confusion visuelle avec une tâche.',
    autoFixable: false
  },

  'event-end-state': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Fin',
    explanation: 'Un événement de fin représente l\'état métier final atteint par le processus. Il doit être formulé comme un état accompli (ex: "Commande expédiée", "Dossier refusé").',
    badDesc: 'Événement de fin nommé comme une action (ex: "Expédier la commande").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Action sur un événement de fin -->
<bpmn:endEvent name="Expédier la commande" />`,
    goodDesc: 'État métier final.',
    goodSnippet: `<!-- ✅ Bonne Pratique : État final accompli -->
<bpmn:endEvent name="Commande expédiée" />`,
    impact: '🟡 Lisibilité du cycle de vie des instances.',
    autoFixable: false
  },

  'event-catch-waiting': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Attente',
    explanation: 'Un événement intermédiaire d\'attente (Catch) doit décrire l\'élément ou la durée attendue (ex: "Attente confirmation client", "Délai 48h écoulé").',
    badDesc: 'Événement intermédiaire avec un libellé vague ou vide.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Nom vague -->
<bpmn:intermediateCatchEvent name="Event_1" />`,
    goodDesc: 'Description précise de l\'attente.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Description claire -->
<bpmn:intermediateCatchEvent name="Paiement bancaire reçu" />`,
    impact: '🟡 Compréhension du temps d\'attente dans Operate.',
    autoFixable: false
  },

  'event-boundary-exception': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Sémantique Exception',
    explanation: 'Un événement de bordure (Boundary) doit nommer explicitement la nature de l\'erreur ou de l\'incident intercepté (ex: "Erreur 500 API", "Timeout 15 min").',
    badDesc: 'Boundary anonyme ou générique.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Boundary anonyme -->
<bpmn:boundaryEvent name="" />`,
    goodDesc: 'Nom explicite de l\'exception.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Incident explicite -->
<bpmn:boundaryEvent name="Échec authentification client" />`,
    impact: '🟡 Traçabilité des exceptions dans les logs.',
    autoFixable: false
  },

  'message-pascal-suffix': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Convention Message',
    explanation: 'Les noms de messages BPMN doivent être écrits en PascalCase et obligatoirement se terminer par le suffixe "Message" (ex: DemandeCreationCompteMessage).',
    badDesc: 'Nom de message en minuscules sans suffixe (ex: "nouveau-compte").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Pas de suffixe Message ni de PascalCase -->
<bpmn:message id="Msg_1" name="nouveau_client" />`,
    goodDesc: 'PascalCase + Suffixe "Message".',
    goodSnippet: `<!-- ✅ Bonne Pratique : Format normalisé -->
<bpmn:message id="Msg_1" name="NouveauClientMessage" />`,
    impact: '🟠 Incohérences de corrélation de messages inter-systèmes.',
    autoFixable: false
  },

  'signal-pascal-suffix': {
    standard: 'Bouygues Telecom Naming Convention v4.2',
    badge: 'Convention Signal',
    explanation: 'Les signaux BPMN doivent être écrits en PascalCase et se terminer par le suffixe "Signal" (ex: CoupureReseauSignal).',
    badDesc: 'Nom de signal non normalisé (ex: "incident_fibre").',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Signal non formaté -->
<bpmn:signal id="Sig_1" name="incident_fibre" />`,
    goodDesc: 'PascalCase + Suffixe "Signal".',
    goodSnippet: `<!-- ✅ Bonne Pratique : Format normalisé -->
<bpmn:signal id="Sig_1" name="IncidentFibreSignal" />`,
    impact: '🟠 Risque de collision d\'événements diffusés.',
    autoFixable: false
  },

  'variable-naming': {
    standard: 'Bouygues Telecom Variable Governance',
    badge: 'Nommage Variables',
    explanation: 'Toutes les variables de processus doivent être écrites en camelCase strict (ex: identifiantClient, montantTotalTtc, codePostal). Les underscores, tirets et majuscules initiales sont interdits.',
    badDesc: 'Variables en snake_case ou kebab-case (ex: id_client, montant-total).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Variable non camelCase -->
<zeebe:input source="= ID_CLIENT" target="ID_CLIENT" />`,
    goodDesc: 'Variable en camelCase propre.',
    goodSnippet: `<!-- ✅ Bonne Pratique : camelCase strict -->
<zeebe:input source="= idClient" target="idClient" />`,
    impact: '🟠 Problèmes d\'interopérabilité FEEL et mapping DMN.',
    autoFixable: false
  },

  'variable-reserved': {
    standard: 'Camunda FEEL ISO 19510 Spec',
    badge: 'Mots Réservés FEEL',
    explanation: 'Les noms de variables ne doivent pas utiliser les mots réservés du langage d\'expression FEEL (ex: true, false, null, and, or, not, if, then, else, for, return, date, time).',
    badDesc: 'Variable nommée avec un mot réservé FEEL (ex: date, return, if).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Nom réservé FEEL -->
<zeebe:output source="= resultat" target="date" />`,
    goodDesc: 'Nom de variable contextuel non réservé.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Variable contextualisée -->
<zeebe:output source="= resultat" target="dateSignatureContrat" />`,
    impact: '🚨 Erreur de syntaxe d\'évaluation FEEL et plantage des conditions.',
    autoFixable: false
  },

  'variable-collection-plural': {
    standard: 'Bouygues Telecom Best Practice',
    badge: 'Convention Listes',
    explanation: 'Les variables contenant des listes ou collections d\'objets doivent porter un nom au pluriel ou se terminer par List ou Items (ex: contratsList, adresses, equipements).',
    badDesc: 'Variable de type liste au singulier (ex: contrat).',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Liste au singulier -->
<zeebe:output source="= listeContrats" target="contrat" />`,
    goodDesc: 'Nom de collection explicite.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Pluriel explicite -->
<zeebe:output source="= listeContrats" target="contratsList" />`,
    impact: '🟡 Confusion de typage lors de la modélisation.',
    autoFixable: false
  },

  'process-name': {
    standard: 'Documentation Bouygues Telecom',
    badge: 'Documentation',
    explanation: 'Le processus doit obligatoirement comporter un libellé métier clair via l\'attribut name sur la balise <bpmn:process>.',
    badDesc: 'Attribut name manquant sur le processus.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Processus sans nom lisible -->
<bpmn:process id="process-commande-fibre" isExecutable="true">`,
    goodDesc: 'Nom métier documenté.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Nom métier complet -->
<bpmn:process id="process-commande-fibre" name="Traitement de la commande Fibre B2C" isExecutable="true">`,
    impact: '🟡 Affichage technique brut dans les consoles de supervision.',
    autoFixable: false
  },

  'process-executable': {
    standard: 'OMG BPMN 2.0 §10.1 & Camunda Engine',
    badge: 'Exécutabilité',
    explanation: 'Pour être déployé et instancié par le moteur d\'orchestration Camunda / Zeebe, le processus doit posséder l\'attribut isExecutable="true".',
    badDesc: 'isExecutable="false" ou attribut omis.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Processus non marqué exécutable -->
<bpmn:process id="process-1" isExecutable="false">`,
    goodDesc: 'isExecutable="true" explicite.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Processus exécutable -->
<bpmn:process id="process-1" isExecutable="true">`,
    impact: '🚨 Le moteur refuse d\'exécuter le processus après déploiement.',
    autoFixable: true
  },

  'service-implementation': {
    standard: 'Camunda 8 Zeebe Specification',
    badge: 'Service Task',
    explanation: 'Une tâche de service (bpmn:serviceTask ou bpmn:sendTask) doit comporter une définition d\'exécution valide : balise <zeebe:taskDefinition type="..." /> pour un Job Worker Zeebe ou un Connecteur.',
    badDesc: 'ServiceTask vide sans type de Job Worker configuré.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Service Task sans worker type -->
<bpmn:serviceTask id="Task_appel_api" name="Appeler API CRM" />`,
    goodDesc: 'Type de tâche Job Worker spécifié.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Type de worker défini -->
<bpmn:serviceTask id="Task_appel_api" name="Appeler API CRM">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="crm-client-worker" retries="3" />
  </bpmn:extensionElements>
</bpmn:serviceTask>`,
    impact: '🚨 Incident immédiat au runtime : Aucun worker ne peut dépiler la tâche.',
    autoFixable: false
  },

  'business-rule-implementation': {
    standard: 'Camunda 8 DMN & Worker Spec',
    badge: 'Business Rule Task',
    explanation: 'Une tâche de règle métier (bpmn:businessRuleTask) doit comporter soit une référence de table de décision DMN (<zeebe:calledDecision decisionId="..." />), soit une définition de Job Worker (<zeebe:taskDefinition type="..." />).',
    badDesc: 'BusinessRuleTask sans DMN appelée ni Worker.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche de règle métier sans DMN -->
<bpmn:businessRuleTask id="Task_decision" name="Calculer tarif" />`,
    goodDesc: 'Appel DMN configuré avec gestion des variables de résultat.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Appel DMN Zeebe conforme -->
<bpmn:businessRuleTask id="Task_decision" name="Calculer tarif">
  <bpmn:extensionElements>
    <zeebe:calledDecision decisionId="decision-calcul-tarif" resultVariable="tarifCalcule" />
  </bpmn:extensionElements>
</bpmn:businessRuleTask>`,
    impact: '🚨 Incident bloquant Zeebe : règle métier non exécutable.',
    autoFixable: false
  },

  'user-assignment': {
    standard: 'Camunda Tasklist & Gouvernance',
    badge: 'User Task',
    explanation: 'Une tâche utilisateur (bpmn:userTask) doit comporter des règles d\'affectation (Candidate Groups ou Assignee). Une tâche sans affectation ne sera visible dans la bannette d\'aucun opérateur.',
    badDesc: 'UserTask sans aucun groupe candidat ni affectation.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : UserTask orpheline sans destinataire -->
<bpmn:userTask id="Task_validation" name="Valider le justificatif" />`,
    goodDesc: 'Candidate Groups renseignés pour le routage d\'équipe.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Affectation par groupe de compétences -->
<bpmn:userTask id="Task_validation" name="Valider le justificatif">
  <bpmn:extensionElements>
    <zeebe:assignmentDefinition candidateGroups="ROLE_GESTIONNAIRE_N1" />
  </bpmn:extensionElements>
</bpmn:userTask>`,
    impact: '🟠 Tâche bloquée en attente sans destinataire dans Tasklist.',
    autoFixable: false
  },

  'user-task-candidate-groups-only': {
    standard: 'Bouygues Telecom Governance Standard v4.2',
    badge: 'Règle Gouvernance',
    explanation: 'Pour garantir la continuité de service en cas d\'absence d\'un collaborateur, les User Tasks doivent obligatoirement utiliser des GROUPES CANDIDATS (candidateGroups). L\'assignation nominative directe (assignee="nom.prenom") est strictement interdite.',
    badDesc: 'UserTask avec un collaborateur nominatif en dur.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Affectation nominative directe en dur -->
<bpmn:userTask id="Task_approbation" name="Approuver le devis">
  <bpmn:extensionElements>
    <zeebe:assignmentDefinition assignee="jean.dupont@bouyguestelecom.fr" />
  </bpmn:extensionElements>
</bpmn:userTask>`,
    goodDesc: 'Affectation via groupe de rôles (Candidate Groups).',
    goodSnippet: `<!-- ✅ Bonne Pratique : Affectation collective par rôle -->
<bpmn:userTask id="Task_approbation" name="Approuver le devis">
  <bpmn:extensionElements>
    <zeebe:assignmentDefinition candidateGroups="EQUIPE_VALIDATION_DEVIS" />
  </bpmn:extensionElements>
</bpmn:userTask>`,
    impact: '🚨 Blocage des dossiers en production en cas de congés ou départ d\'un collaborateur.',
    autoFixable: false
  },

  'user-task-camunda-implementation': {
    standard: 'Camunda 8.5+ Architecture Standard',
    badge: 'Type Implémentation',
    explanation: 'Sur Camunda 8, les tâches humaines doivent utiliser le type natif "Camunda User Task" (géré par Tasklist Zeebe) plutôt qu\'un Job Worker technique custom.',
    badDesc: 'UserTask configurée comme Job Worker externe.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : User Task exécutée via Job Worker externe -->
<bpmn:userTask id="Task_1">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="human-worker" />
  </bpmn:extensionElements>
</bpmn:userTask>`,
    goodDesc: 'User Task native Camunda.',
    goodSnippet: `<!-- ✅ Bonne Pratique : User Task standard Camunda 8 -->
<bpmn:userTask id="Task_1" name="Contrôler les pièces justificatives">
  <bpmn:extensionElements>
    <zeebe:assignmentDefinition candidateGroups="EQUIPE_CONFORMITE" />
  </bpmn:extensionElements>
</bpmn:userTask>`,
    impact: '🟠 Incompatibilité avec les fonctionnalités avancées de Camunda Tasklist.',
    autoFixable: true
  },

  'timer-definition': {
    standard: 'OMG BPMN 2.0 §10.4.4 & ISO 8601',
    badge: 'Définition Minuteur',
    explanation: 'Un événement Timer doit obligatoirement comporter une expression valide de durée (timeDuration, ex: PT1H), de date fixe (timeDate, ex: 2026-12-31T23:59:59Z) ou de cycle (timeCycle, ex: R/PT15M).',
    badDesc: 'bpmn:timerEventDefinition vide sans expression temporelle.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Timer sans définition -->
<bpmn:intermediateCatchEvent id="Timer_1">
  <bpmn:timerEventDefinition />
</bpmn:intermediateCatchEvent>`,
    goodDesc: 'Durée ISO 8601 conforme ou expression FEEL valide.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Durée ISO 8601 déclarée -->
<bpmn:intermediateCatchEvent id="Timer_1" name="Attente 2 heures">
  <bpmn:timerEventDefinition>
    <bpmn:timeDuration>PT2H</bpmn:timeDuration>
  </bpmn:timerEventDefinition>
</bpmn:intermediateCatchEvent>`,
    impact: '🚨 Échec d\'évaluation temporelle et incident moteur Zeebe.',
    autoFixable: false
  },

  'error-definition': {
    standard: 'OMG BPMN 2.0 §10.4.6',
    badge: 'Gestion Erreurs',
    explanation: 'Un événement d\'erreur (bpmn:errorEventDefinition) doit référencer une erreur déclarée (errorRef) ou un code d\'erreur métier (errorCode) pour permettre un rattrapage ciblé.',
    badDesc: 'Error event definition sans code d\'erreur.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Erreur anonyme non typée -->
<bpmn:endEvent id="End_Error">
  <bpmn:errorEventDefinition />
</bpmn:endEvent>`,
    goodDesc: 'Erreur typée avec code précis réutilisable.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Code d'erreur explicite -->
<bpmn:error id="Err_Stock" name="STOCK_EPUISE" errorCode="ERR_STOCK_001" />
...
<bpmn:endEvent id="End_Error" name="Erreur stock épuisé">
  <bpmn:errorEventDefinition errorRef="Err_Stock" />
</bpmn:endEvent>`,
    impact: '🟠 Impossibilité de capturer sélectivement l\'erreur en amont.',
    autoFixable: false
  },

  'escalation-definition': {
    standard: 'OMG BPMN 2.0 §10.4.7',
    badge: 'Escalade',
    explanation: 'Un événement d\'escalade doit définir une référence d\'escalade (escalationRef) ou un code d\'escalade.',
    badDesc: 'EscalationEventDefinition sans code d\'escalade.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Escalade non typée -->
<bpmn:intermediateThrowEvent id="Esc_1">
  <bpmn:escalationEventDefinition />
</bpmn:intermediateThrowEvent>`,
    goodDesc: 'Référence d\'escalade configurée.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Code d'escalade défini -->
<bpmn:escalation id="Esc_Delai" name="DELAI_DEPASSE" escalationCode="ESC_TIMEOUT" />
...
<bpmn:intermediateThrowEvent id="Esc_1" name="Escalade délai">
  <bpmn:escalationEventDefinition escalationRef="Esc_Delai" />
</bpmn:intermediateThrowEvent>`,
    impact: '🟠 Escalade ignorée par les récepteurs de bordure.',
    autoFixable: false
  },

  'message-definition': {
    standard: 'OMG BPMN 2.0 §10.4.8 & Zeebe Correlation',
    badge: 'Corrélation Message',
    explanation: 'Un événement Message ou une Receive Task doit obligatoirement référencer une définition de message (messageRef) et comporter une clé de corrélation (correlationKey) pour être dépilé.',
    badDesc: 'Receive Task sans messageRef ni clé de corrélation.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Message sans clé de corrélation -->
<bpmn:receiveTask id="Receive_Paiement" />`,
    goodDesc: 'MessageRef avec subscription Zeebe et correlationKey FEEL.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Clé de corrélation déclarée -->
<bpmn:message id="Msg_Paiement" name="PaiementConfirmeMessage">
  <bpmn:extensionElements>
    <zeebe:subscription correlationKey="= numCommande" />
  </bpmn:extensionElements>
</bpmn:message>
<bpmn:receiveTask id="Receive_Paiement" messageRef="Msg_Paiement" />`,
    impact: '🚨 Incident critique Zeebe : Corrélation de message impossible.',
    autoFixable: false
  },

  'signal-definition': {
    standard: 'OMG BPMN 2.0 §10.4.9',
    badge: 'Signal Broadcast',
    explanation: 'Un événement Signal doit référencer un signalRef valide présent dans la section <definitions>.',
    badDesc: 'Signal event sans balise signalRef.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Signal sans référence -->
<bpmn:intermediateCatchEvent id="Sig_Catch">
  <bpmn:signalEventDefinition />
</bpmn:intermediateCatchEvent>`,
    goodDesc: 'Signal global référencé par son ID.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Signal global référencé -->
<bpmn:signal id="Sig_Arret" name="ArretUrgenceSignal" />
...
<bpmn:intermediateCatchEvent id="Sig_Catch" name="Arrêt d'urgence reçu">
  <bpmn:signalEventDefinition signalRef="Sig_Arret" />
</bpmn:intermediateCatchEvent>`,
    impact: '🚨 Échec d\'interception du signal diffusé.',
    autoFixable: false
  },

  'lane-assignment': {
    standard: 'OMG BPMN 2.0 §10.2.3',
    badge: 'Organisation',
    explanation: 'Si le diagramme utilise des couloirs de responsabilité (Lanes), chaque activité du processus doit être affectée à une Lane pour clarifier qui réalise l\'action.',
    badDesc: 'Tâche flottante hors couloir dans un processus subdivisé en Lanes.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Tâche orpheline non assignée à un couloir -->`,
    goodDesc: 'Toutes les activités sont rattachées via <flowNodeRef> à leur Lane respective.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Affectation claire aux départements -->
<bpmn:lane id="Lane_ServiceClient" name="Service Client">
  <bpmn:flowNodeRef>Task_accueil</bpmn:flowNodeRef>
</bpmn:lane>`,
    impact: '🔵 Diagramme moins lisible au niveau organisationnel.',
    autoFixable: false
  },

  'diagram-layout': {
    standard: 'OMG BPMN 2.0 Diagram Interchange (DI)',
    badge: 'Mise en Page DI',
    explanation: 'Le fichier BPMN doit contenir les métadonnées graphiques BPMNDiagram / BPMNShape / BPMNEdge pour s\'afficher correctement dans Camunda Modeler et les visualiseurs Web.',
    badDesc: 'Fichier XML pur sans balise <bpmndi:BPMNDiagram>.',
    badSnippet: `<!-- ❌ Mauvaise Pratique : Aucune coordonnée graphique (DI) -->`,
    goodDesc: 'Section <bpmndi:BPMNDiagram> complète avec positions x, y, width, height.',
    goodSnippet: `<!-- ✅ Bonne Pratique : Métadonnées DI conformes -->
<bpmndi:BPMNDiagram id="BPMNDiagram_1">
  <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="process-1">
    <bpmndi:BPMNShape id="_BPMNShape_Start" bpmnElement="StartEvent_1">
      <dc:Bounds x="179" y="99" width="36" height="36" />
    </bpmndi:BPMNShape>
  </bpmndi:BPMNPlane>
</bpmndi:BPMNDiagram>`,
    impact: '🔵 Éléments empilés à l\'origine (0,0) ou écran blanc dans le visualiseur.',
    autoFixable: false
  }
};

console.log("Knowledge items generated:", Object.keys(BPMN_LINT_RULE_KNOWLEDGE).length);
module.exports = BPMN_LINT_RULE_KNOWLEDGE;
