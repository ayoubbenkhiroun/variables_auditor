/**
 * PAPRIKA ACADEMY - Base de Connaissances & Référentiel des Bonnes Pratiques BPMN 2.0
 * Conforme aux standards OMG BPMN 2.0, moteurs Camunda 8 / Zeebe, Camunda 7 et gouvernance Bouygues Telecom.
 */

window.ACADEMY_DATA = {
  categories: [
    { id: 'all', label: 'Toutes les thématiques', icon: '🌟' },
    { id: 'structure', label: 'Structure & Intégrité OMG', icon: '🏛️' },
    { id: 'architecture', label: 'Architecture & Call Activities', icon: '🧱' },
    { id: 'gateways', label: 'Passerelles & Décisions', icon: '🔀' },
    { id: 'events_delays', label: 'Événements & Minuteurs', icon: '⏱️' },
    { id: 'bpmn_naming', label: 'Nommage & Sémantique', icon: '✍️' },
    { id: 'deployment', label: 'Déploiement Camunda 8 / Zeebe', icon: '⚙️' },
    { id: 'governance', label: 'Gouvernance & Sécurité', icon: '🛡️' }
  ],

  levels: [
    { id: 'starter', label: 'Niveau 1 · Découverte (Fondamentaux)', color: '#10B981' },
    { id: 'intermediate', label: 'Niveau 2 · Modélisateur Confirmé', color: '#009CD7' },
    { id: 'advanced', label: 'Niveau 3 · Développeur Camunda / Zeebe', color: '#EA5B0C' },
    { id: 'expert', label: 'Niveau 4 · Architecte & Référent Qualité', color: '#8B5CF6' }
  ],

  // =========================================================================
  // 1. ARTICLES & GUIDES DE RÉFÉRENCE MÉTIER ET TECHNIQUE
  // =========================================================================
  articles: [
    {
      id: 'art_naming_rules',
      title: 'Charte de Nommage BPMN 2.0 : Tâches, Événements et Passerelles',
      category: 'bpmn_naming',
      level: 'starter',
      readTime: '5 min',
      author: 'Centre d\'Excellence BPMN & Métier',
      summary: 'Les règles d\'or indispensables pour que votre diagramme soit immédiatement compréhensible par toutes les équipes métier, de recette et dans Camunda Operate.',
      content: `
### 1. Pourquoi la charte de nommage est-elle cruciale ?
Un diagramme de processus est avant tout un **langage universel de communication**. S'il est mal nommé, il crée des ambiguïtés, ralentit les validations et induit en erreur les opérateurs lors du suivi dans **Camunda Operate**.

---

### 2. Comment nommer vos Tâches (Tasks & User Tasks) ?
Le nom d'une tâche doit décrire une **action concrète** réalisée par un acteur ou par le système.

* **Format obligatoire** : \`[Verbe d'action à l'infinitif] + [Complément d'objet direct (COD)] + [Précision métier optionnelle]\`
* ✅ **Exemples parfaits** :
  * *« Vérifier l'éligibilité Fibre du client »*
  * *« Éditer le contrat d'abonnement »*
  * *« Notifier le client par SMS »*
  * *« Valider la demande de résiliation »*
* ❌ **À proscrire absolument** :
  * *« Éligibilité »* *(Pas de verbe)*
  * *« Traitement en cours »* *(État passif)*
  * *« Vérification »* *(Nom au lieu d'une action)*
  * *« Étape 3 »* *(Aucun sens fonctionnel)*

---

### 3. Comment nommer vos Événements (Start, Catch & End Events) ?
Un événement représente **quelque chose qui est survenu** dans le monde réel (un déclencheur ou un résultat obtenu).

* **Format obligatoire** : \`[Objet métier] + [Participe passé / État atteint]\`
* 🟢 **Événements de début (Start Events)** :
  * *« Demande de souscription Bbox reçue »*
  * *« Réclamation client déposée »*
* 🟡 **Événements intermédiaires (Catch / Timer / Message)** :
  * *« Accusé de réception signé »*
  * *« Délai de rétractation de 14 jours écoulé »*
  * *« Justificatif de domicile réceptionné »*
* 🔴 **Événements de fin (End Events)** :
  * *« Commande validée et activée »*
  * *« Dossier rejeté pour insolvabilité »*
  * *« Souscription résiliée »*

---

### 4. Comment nommer vos Passerelles et Flux Conditionnels ?
* **Passerelle de décision (Split XOR / OR)** : Doit toujours formuler une **Question fermée se terminant par un point d'interrogation ?** (ex: *« Client déjà abonné ? »*, *« Montant > 500 € ? »*).
* **Branches sortantes (Sequence Flows)** : Doivent formuler la **Réponse / Condition claire** (ex: *« Oui »*, *« Non »*, *« Offre Fibre »*, *« Offre 4G/5G »*).
* **Passerelle de synchronisation (Join)** : Ne pas surcharger le schéma, la laisser sans texte ou indiquer *« Synchronisation »*.
      `
    },
    {
      id: 'art_call_activity_isolation',
      title: 'Call Activities & Isolation des Variables : Pourquoi Input/Output Propagation = Off',
      category: 'architecture',
      level: 'expert',
      readTime: '6 min',
      author: 'Architecture Camunda 8 & Gouvernance',
      summary: 'Comprendre pourquoi la propagation implicite des variables est le premier facteur de fuites de mémoire et de conflits inter-processus dans Zeebe.',
      content: `
### 1. Le problème de la propagation globale (Propagation = On)
Par défaut dans Camunda, lorsqu'une Call Activity s'exécute avec la propagation activée, l'intégralité du contexte parent est copié dans le sous-processus, et réciproquement toutes les variables du sous-processus écrasent les variables du parent à la fin.

* **Risque majeur 1 : Écrasement accidentel (Variable Shadowing)**
  Si le processus parent a une variable \`status = "VALIDATED"\` et que le sous-processus manipule son propre statut technique \`status = "ERROR_SMS"\`, à la complétion, le statut parent devient \`"ERROR_SMS"\` !
* **Risque majeur 2 : Explosion du payload Zeebe & RocksDB**
  Des méga-objets JSON inutiles transitent en boucle dans chaque appel, saturant les partitions Zeebe et ralentissant les sauvegardes Elasticsearch / OpenSearch.

---

### 2. Le standard d'architecture Bouygues Telecom
Pour chaque **Call Activity**, vous devez **explicitement désactiver la propagation automatique** et définir uniquement un contrat de mapping d'entrée/sortie strict :

\`\`\`xml
<bpmn:callActivity id="Call_KYC" name="Vérifier la conformité KYC" calledElement="process-kyc-client">
  <bpmn:extensionElements>
    <!-- Déclarer explicitement le mapping sans propagation globale -->
    <zeebe:calledElement propagateAllChildVariables="false" propagateAllParentVariables="false" />
    <zeebe:ioMapping>
      <zeebe:input source="= idClient" target="clientId" />
      <zeebe:input source="= piecesJustificatives" target="documents" />
      <zeebe:output source="= kycConforme" target="isKycValid" />
    </zeebe:ioMapping>
  </bpmn:extensionElements>
</bpmn:callActivity>
\`\`\`

---

### 3. Bénéfices immédiats
1. **Encapsulation stricte** : Chaque sous-processus est une boîte noire autonome testable unitairement.
2. **Performance optimale** : Seules les variables utiles sont répliquées.
3. **Sécurité des données** : Pas de fuite de variables sensibles (cartes bancaires, mots de passe) vers des sous-processus tiers.
      `
    },
    {
      id: 'art_gateways_mastery',
      title: 'Maîtriser les Passerelles BPMN : XOR, AND, OR et le Flux par Défaut Obligatoire',
      category: 'gateways',
      level: 'intermediate',
      readTime: '7 min',
      author: 'Centre d\'Excellence BPMN',
      summary: 'Comprendre précisément comment se divisent et se rejoignent les chemins de décision pour éviter les blocages de dossiers et deadlocks.',
      content: `
### 1. Passerelle Exclusive (XOR Gateway - Symbole X ou vide)
* **Comportement** : Une seule et unique branche sortante est empruntée en fonction d'une condition.
* ⚠️ **Règle absolue** : Vous DEVEZ TOUJOURS désigner une branche comme **Flux par défaut (Default Flow)** (marquée de la petite barre oblique \`⑊\`).
* **Pourquoi ?** Si aucune des conditions métier n'est remplie (ex: dossier atypique ou données imprévues), le dossier empruntera automatiquement le flux par défaut au lieu de lever une exception bloquante dans le moteur.

---

### 2. Passerelle Parallèle (AND Gateway - Symbole +)
* **Comportement (Divergence)** : Active TOUTES les branches sortantes simultanément sans évaluer aucune condition.
* **Comportement (Convergence)** : La passerelle de fermeture **attend que TOUTES les branches soient terminées** avant de laisser passer le jeton vers la suite.
* ❌ **Erreurs fréquentes** :
  1. Mettre des conditions textuelles sur les branches d'un AND.
  2. Définir un flux par défaut sur un AND.
  3. Rejoindre un AND avec des branches issues d'un XOR (provoque un **Deadlock permanent** car le AND attend un second jeton qui n'arrivera jamais !).

---

### 3. Passerelle Basée sur les Événements (Event-Based Gateway)
* **Comportement** : Le processus se met en attente de **plusieurs événements concurrents** (ex: *Réponse du client par email* OU *Expiration d'un délai de 7 jours*).
* Le premier événement qui survient gagne la course et annule immédiatement les autres branches d'attente.
      `
    },
    {
      id: 'art_loops_protection',
      title: 'Sécurisation des Boucles & Cycles : Double Barrière (Compteur Max + Timer)',
      category: 'events_delays',
      level: 'advanced',
      readTime: '6 min',
      author: 'Gouvernance & Fiabilité Opérationnelle',
      summary: 'Comment modéliser des boucles de retry sans jamais risquer de bloquer le broker Zeebe ou d\'inonder un système tiers.',
      content: `
### 1. Le danger des boucles directes infinies
Dans un orchestrateur de processus, une boucle fermée sans temporisation ni compteur maximal peut s'exécuter **des dizaines de milliers de fois par seconde**, provoquant un déni de service (OOM / CPU 100%) et la saturation de la base de données.

---

### 2. Le Pattern Boucle Sécurisée (Double Protection)
Chaque retour arrière ou boucle de traitement doit **obligatoirement** comporter deux mécanismes de sécurité :

1. **Un Compteur Maximal d'Itérations** :
   * Définir une variable d'incrément (ex: \`tentative = tentative + 1\`).
   * Passerelle XOR : si \`tentative >= 3\`, router vers une fin d'escalade ou une intervention manuelle.
2. **Une Temporisation Minimale (Timer Intermediate Catch Event)** :
   * Insérer un Minuteur intermédiaire d'au moins 1 minute (\`PT1M\`, \`PT5M\`, \`PT1H\`) pour espacer les tentatives.

---

### 3. Exemple BPMN Conforme
\`\`\`text
[Échec de l'appel API] ──► [Incrémenter retryCount] ──► {retryCount < 3 ?}
                                                            │ (Oui)
                                                            ▼
                                                [Minuteur 5 min : PT5M]
                                                            │
                                                            ▼
                                                [Relancer l'appel API]
\`\`\`
      `
    }
  ],

  // =========================================================================
  // 2. RÉFÉRENTIEL DES BONNES PRATIQUES & RÈGLES DE MODÉLISATION (50+ RÈGLES)
  // =========================================================================
  dosAndDonts: [
    // ------------------ 1. STRUCTURE & INTÉGRITÉ OMG ------------------
    {
      id: 'dd_definitions_root',
      ruleId: 'definitions-root',
      title: 'Racine XML Conforme (bpmn:definitions)',
      category: 'Structure & Intégrité OMG',
      severity: 'blocker',
      standard: 'OMG BPMN 2.0 §8.2',
      raci: 'Modélisateur / Dev',
      autoFixable: false,
      badDesc: 'Fichier XML sans élément racine <bpmn:definitions> ou XML corrompu.',
      badSnippet: `<!-- ❌ XML sans racine BPMN 2.0 valide -->\n<definitions id="Definitions_1">\n  <process id="my_proc" />\n</definitions>`,
      badImpact: 'Rejet immédiat par Camunda Modeler, Zeebe et tout moteur BPMN compatible OMG.',
      goodDesc: 'Utiliser une balise racine <bpmn:definitions> avec les déclarations de namespaces standards.',
      goodSnippet: `<!-- ✅ Racine BPMN 2.0 standard -->\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"\n                  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"\n                  id="Definitions_Souscription" targetNamespace="http://bpmn.io/schema/bpmn">\n  <bpmn:process id="process-souscription" isExecutable="true">\n    ...\n  </bpmn:process>\n</bpmn:definitions>`,
      goodBenefit: 'Compatibilité universelle, rendu visuel parfait et import sans erreur dans tous les outils.'
    },
    {
      id: 'dd_process_id',
      ruleId: 'process-id',
      title: 'Identifiant Technique de Processus (Process ID)',
      category: 'Structure & Intégrité OMG',
      severity: 'blocker',
      standard: 'OMG BPMN 2.0 §10.1',
      raci: 'Modélisateur / Dev',
      autoFixable: true,
      badDesc: 'Balise <bpmn:process> dépourvue de l\'attribut obligatoire "id".',
      badSnippet: `<!-- ❌ Absence d'attribut id -->\n<bpmn:process name="Gestion des Commandes" isExecutable="true">\n  ...\n</bpmn:process>`,
      badImpact: 'Impossible de déployer le workflow ou d\'instancier le processus via les APIs Zeebe.',
      goodDesc: 'Attribuer un ID technique unique et explicite sur chaque processus.',
      goodSnippet: `<!-- ✅ Process ID explicite -->\n<bpmn:process id="process-gestion-commandes" name="Gestion des Commandes" isExecutable="true">\n  ...\n</bpmn:process>`,
      goodBenefit: 'Routage clair des instances, versioning propre et traçabilité dans Operate.'
    },
    {
      id: 'dd_duplicate_id',
      ruleId: 'duplicate-id',
      title: 'Unicité Stricte des Identifiants XML',
      category: 'Structure & Intégrité OMG',
      severity: 'blocker',
      standard: 'W3C XML Schema & OMG BPMN 2.0',
      raci: 'Dev / Modélisateur',
      autoFixable: false,
      badDesc: 'Plusieurs tâches ou passerelles partagent exactement le même identifiant technique (ex: deux tâches nommées "Activity_1").',
      badSnippet: `<!-- ❌ Conflit d'identifiants identiques -->\n<bpmn:userTask id="Task_Validation" name="Valider le dossier" />\n<bpmn:serviceTask id="Task_Validation" name="Envoyer l'email" />`,
      badImpact: 'Corruption de l\'arbre DOM XML, comportement imprévisible du moteur et crash au déploiement.',
      goodDesc: 'Garantir que chaque élément graphique et technique possède un ID XML unique dans le document.',
      goodSnippet: `<!-- ✅ Identifiants uniques et distincts -->\n<bpmn:userTask id="Task_ValiderDossier" name="Valider le dossier" />\n<bpmn:serviceTask id="Task_EnvoyerEmailValidation" name="Envoyer l'email de confirmation" />`,
      goodBenefit: 'Ciblage précis des incidents, historique Operate sans confusion et mapping déterministe.'
    },
    {
      id: 'dd_flow_references',
      ruleId: 'flow-references',
      title: 'Résolution des Références de Flux (sourceRef & targetRef)',
      category: 'Structure & Intégrité OMG',
      severity: 'blocker',
      standard: 'OMG BPMN 2.0 §8.3.2',
      raci: 'Modélisateur',
      autoFixable: false,
      badDesc: 'Flux de séquence reliant un élément inexistant ou supprimé (flèche orpheline).',
      badSnippet: `<!-- ❌ sourceRef cible un nœud qui n'existe plus -->\n<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_Deleted" targetRef="End_1" />`,
      badImpact: 'Jeton BPMN perdu dans le vide, exception moteur au chargement du diagramme.',
      goodDesc: 'Tous les flux de séquence doivent pointer vers des IDs d\'éléments existants et valides.',
      goodSnippet: `<!-- ✅ Flux reliant deux nœuds valides -->\n<bpmn:sequenceFlow id="Flow_1" sourceRef="Task_Eligibilite" targetRef="Gateway_Decision" />`,
      goodBenefit: 'Graphe de navigation connexe et exécution fluide de bout en bout.'
    },
    {
      id: 'dd_sequence_cross_pool',
      ruleId: 'sequence-flow-cross-pool',
      title: 'Flux de Séquence Intra-Pool Uniquement',
      category: 'Structure & Intégrité OMG',
      severity: 'blocker',
      standard: 'OMG BPMN 2.0 §7.2',
      raci: 'Architecte / Modélisateur',
      autoFixable: false,
      badDesc: 'Tracer une flèche de séquence continue (Sequence Flow) traversant la frontière entre deux Pools distinctes.',
      badSnippet: `<!-- ❌ Flux de séquence reliant deux pools distinctes -->\n<!-- Pool Client vers Pool Bouygues Telecom avec Sequence Flow -->`,
      badImpact: 'Violation majeure de la norme BPMN 2.0 ; les pools représentent des processus déconnectés sur le plan temporel.',
      goodDesc: 'Utiliser exclusivement des Flux de Messages (Message Flows en pointillés) pour communiquer entre deux piscines distinctes.',
      goodSnippet: `<!-- ✅ Communication inter-pools via Message Flow -->\n<bpmn:messageFlow id="MsgFlow_1" sourceRef="Participant_Client" targetRef="Event_StartMessage" />`,
      goodBenefit: 'Modélisation rigoureuse des échanges asynchrones B2B et respect strict du standard.'
    },
    {
      id: 'dd_start_event',
      ruleId: 'start-event',
      title: 'Événement de Début Obligatoire',
      category: 'Structure & Intégrité OMG',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.4.2',
      raci: 'Modélisateur',
      autoFixable: false,
      badDesc: 'Processus sans aucun événement de début (le premier élément est une tâche isolée).',
      badSnippet: `<!-- ❌ Processus sans déclencheur initial -->\n<bpmn:process id="proc-sans-debut">\n  <bpmn:userTask id="Task_1" name="Traiter la commande" />\n</bpmn:process>`,
      badImpact: 'Le moteur ne sait pas comment instancier le processus ; impossible de démarrer le workflow.',
      goodDesc: 'Chaque processus exécutable doit comporter un événement de début clair et typé.',
      goodSnippet: `<!-- ✅ Événement de début explicite -->\n<bpmn:startEvent id="Start_Souscription" name="Demande de souscription Bbox reçue">\n  <bpmn:outgoing>Flow_1</bpmn:outgoing>\n</bpmn:startEvent>`,
      goodBenefit: 'Point d\'entrée unique, lisibilité pour le métier et déclenchement maîtrisé.'
    },
    {
      id: 'dd_end_event',
      ruleId: 'end-event',
      title: 'Événement de Fin Obligatoire',
      category: 'Structure & Intégrité OMG',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.4.3',
      raci: 'Modélisateur',
      autoFixable: false,
      badDesc: 'Chemin se terminant sur une tâche sans événement de fin.',
      badSnippet: `<!-- ❌ Tâche finale sans End Event -->\n<bpmn:serviceTask id="Task_Cloture" name="Clôturer le dossier">\n  <!-- Aucun flux sortant vers une fin -->\n</bpmn:serviceTask>`,
      badImpact: 'L\'instance de processus reste ouverte à l\'état actif indéfiniment dans Camunda Operate.',
      goodDesc: 'Relier toutes les branches terminales à des événements de fin explicites.',
      goodSnippet: `<!-- ✅ Événement de fin explicite -->\n<bpmn:endEvent id="End_Succes" name="Ligne Bbox activée avec succès">\n  <bpmn:incoming>Flow_Fin</bpmn:incoming>\n</bpmn:endEvent>`,
      goodBenefit: 'Fermeture propre de l\'instance, libération de la mémoire et KPIs de complétion exacts.'
    },
    {
      id: 'dd_boundary_attached',
      ruleId: 'boundary-reference',
      title: 'Rattachement Valide des Événements de Bordure (attachedToRef)',
      category: 'Structure & Intégrité OMG',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.4.12',
      raci: 'Modélisateur',
      autoFixable: false,
      badDesc: 'Événement de frontière posé sur le canevas sans être rattaché à une activité hôte.',
      badSnippet: `<!-- ❌ Boundary event orphelin -->\n<bpmn:boundaryEvent id="Boundary_1" />`,
      badImpact: 'Erreur fatale au déploiement Zeebe.',
      goodDesc: 'Définir explicitement l\'attribut "attachedToRef" pointant vers la tâche surveillée.',
      goodSnippet: `<!-- ✅ Boundary event rattaché à sa tâche -->\n<bpmn:boundaryEvent id="Boundary_Timer_48h" name="Délai 48h dépassé" attachedToRef="Task_ValidationClient">\n  <bpmn:timerEventDefinition>\n    <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT48H</bpmn:timeDuration>\n  </bpmn:timerEventDefinition>\n</bpmn:boundaryEvent>`,
      goodBenefit: 'Surveillance automatique des délais SLA et gestion irréprochable des relances.'
    },

    // ------------------ 2. ARCHITECTURE & CALL ACTIVITIES ------------------
    {
      id: 'dd_call_input_propagation',
      ruleId: 'call-activity-input-propagation-off',
      title: 'Call Activity : Désactiver la Propagation des Variables Parentes (Input = Off)',
      category: 'Architecture & Call Activities',
      severity: 'error',
      standard: 'Camunda 8 Architecture Standard',
      raci: 'Architecte Solution / Dev Zeebe',
      autoFixable: false,
      badDesc: 'Laisser "propagateAllParentVariables=true" sur une Call Activity.',
      badSnippet: `<!-- ❌ Propagation parent non contrôlée -->\n<bpmn:callActivity id="Call_Paiement" calledElement="process-paiement">\n  <bpmn:extensionElements>\n    <zeebe:calledElement propagateAllParentVariables="true" />\n  </bpmn:extensionElements>\n</bpmn:callActivity>`,
      badImpact: 'Fuites de données confidentielles vers le sous-processus et surcharge de la mémoire du broker.',
      goodDesc: 'Définir "propagateAllParentVariables=false" et mapper uniquement les variables requises dans ioMapping.',
      goodSnippet: `<!-- ✅ Isolation stricte des variables entrantes -->\n<bpmn:callActivity id="Call_Paiement" calledElement="process-paiement">\n  <bpmn:extensionElements>\n    <zeebe:calledElement propagateAllParentVariables="false" />\n    <zeebe:ioMapping>\n      <zeebe:input source="= montantTtc" target="amount" />\n      <zeebe:input source="= refCommande" target="orderId" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>`,
      goodBenefit: 'Sous-processus 100% découplé, réutilisable par toute l\'entreprise et payload maîtrisé.'
    },
    {
      id: 'dd_call_output_propagation',
      ruleId: 'call-activity-output-propagation-off',
      title: 'Call Activity : Désactiver la Propagation des Variables Filles (Output = Off)',
      category: 'Architecture & Call Activities',
      severity: 'error',
      standard: 'Camunda 8 Architecture Standard',
      raci: 'Architecte Solution / Dev Zeebe',
      autoFixable: false,
      badDesc: 'Laisser "propagateAllChildVariables=true", écrasant silencieusement les variables du parent.',
      badSnippet: `<!-- ❌ Propagation fille polluante -->\n<bpmn:callActivity id="Call_Notification" calledElement="process-notif">\n  <bpmn:extensionElements>\n    <zeebe:calledElement propagateAllChildVariables="true" />\n  </bpmn:extensionElements>\n</bpmn:callActivity>`,
      badImpact: 'Écrasement imprévu de variables parents critiques (ex: statut, code erreur) et bugs invisibles.',
      goodDesc: 'Définir "propagateAllChildVariables=false" et spécifier les outputs explicitement.',
      goodSnippet: `<!-- ✅ Isolation stricte des variables sortantes -->\n<bpmn:callActivity id="Call_Notification" calledElement="process-notif">\n  <bpmn:extensionElements>\n    <zeebe:calledElement propagateAllChildVariables="false" />\n    <zeebe:ioMapping>\n      <zeebe:output source="= notificationSent" target="isClientNotified" />\n    </zeebe:ioMapping>\n  </bpmn:extensionElements>\n</bpmn:callActivity>`,
      goodBenefit: 'Contrat d\'interface étanche entre équipes et processus parents protégés.'
    },
    {
      id: 'dd_call_target',
      ruleId: 'call-target',
      title: 'Cible de Call Activity Renseignée (calledElement)',
      category: 'Architecture & Call Activities',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.3',
      raci: 'Dev Zeebe / Modélisateur',
      autoFixable: false,
      badDesc: 'Call Activity sans attribut "calledElement" ou avec une cible vide.',
      badSnippet: `<!-- ❌ Call Activity sans cible -->\n<bpmn:callActivity id="Call_Sub" name="Vérifier KYC" />`,
      badImpact: 'Incident immédiat lors de l\'exécution du jeton : le moteur ne trouve aucun processus à lancer.',
      goodDesc: 'Toujours renseigner l\'ID technique du processus cible à instancier.',
      goodSnippet: `<!-- ✅ Call Activity avec cible valide -->\n<bpmn:callActivity id="Call_Sub" name="Vérifier KYC" calledElement="process-kyc-national" />`,
      goodBenefit: 'Exécution déterministe et navigation fluide dans l\'arborescence de processus.'
    },
    {
      id: 'dd_call_cycle',
      ruleId: 'call-cycle',
      title: 'Absence de Cycle Récursif entre Call Activities',
      category: 'Architecture & Call Activities',
      severity: 'error',
      standard: 'Gouvernance d\'Architecture BPMN',
      raci: 'Architecte Solution',
      autoFixable: false,
      badDesc: 'Processus A appelle Processus B qui rappelle récursivement Processus A.',
      badSnippet: `<!-- ❌ Cycle d'appels récursifs infini A -> B -> A -->`,
      badImpact: 'Empilement infini d\'instances enfants jusqu\'au crash complet de Zeebe par dépassement de quota.',
      goodDesc: 'Structurer les processus selon une hiérarchie pyramidale stricte sans rétroaction directe.',
      goodSnippet: `<!-- ✅ Architecture en cascade sans cycle : Parent -> Enfant -> Fin -->`,
      goodBenefit: 'Stabilité architecturale et maîtrise garantie de la profondeur d\'appel.'
    },

    // ------------------ 3. MODÉLISATION & PASSERELLES ------------------
    {
      id: 'dd_xor_default_flow',
      ruleId: 'exclusive-gateway-default',
      title: 'Passerelle Exclusive (XOR) : Flux par Défaut Obligatoire (⑊)',
      category: 'Passerelles & Décisions',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.5.2 & Camunda Best Practice',
      raci: 'Modélisateur Métier',
      autoFixable: true,
      badDesc: 'Passerelle XOR où toutes les branches ont des conditions, sans branche de repli par défaut.',
      badSnippet: `<!-- ❌ XOR sans Default Flow -->\n<bpmn:exclusiveGateway id="Gateway_Type" name="Type de contrat ?">\n  <bpmn:outgoing>Flow_Fibre</bpmn:outgoing>\n  <bpmn:outgoing>Flow_ADSL</bpmn:outgoing>\n</bpmn:exclusiveGateway>`,
      badImpact: 'Si le client a une offre hybride 4G/5G, aucune condition n\'est vraie : le dossier est bloqué.',
      goodDesc: 'Désigner une branche comme "default" (marquée d\'une barre oblique ⑊).',
      goodSnippet: `<!-- ✅ XOR avec Default Flow sécurisé -->\n<bpmn:exclusiveGateway id="Gateway_Type" name="Type de contrat ?" default="Flow_Autre">\n  <bpmn:outgoing>Flow_Fibre</bpmn:outgoing>\n  <bpmn:outgoing>Flow_ADSL</bpmn:outgoing>\n  <bpmn:outgoing>Flow_Autre</bpmn:outgoing>\n</bpmn:exclusiveGateway>`,
      goodBenefit: 'Résilience opérationnelle totale : 100% des cas atypiques sont routés sans incident.'
    },
    {
      id: 'dd_parallel_no_condition',
      ruleId: 'parallel-gateway-condition',
      title: 'Passerelle Parallèle (AND) : Interdiction des Conditions',
      category: 'Passerelles & Décisions',
      severity: 'error',
      standard: 'OMG BPMN 2.0 §10.5.3',
      raci: 'Modélisateur Métier',
      autoFixable: true,
      badDesc: 'Placer une expression conditionnelle sur une branche sortant d\'un AND.',
      badSnippet: `<!-- ❌ Condition sur passerelle AND -->\n<bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_AND">\n  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">= montant > 100</bpmn:conditionExpression>\n</bpmn:sequenceFlow>`,
      badImpact: 'Violation de la norme : une passerelle AND ignore les conditions et active tout sans distinction.',
      goodDesc: 'Laisser les branches d\'un AND sans condition (pour des conditions, utiliser un XOR ou un OR).',
      goodSnippet: `<!-- ✅ AND pur sans condition -->\n<bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_AND" targetRef="Task_PreparerColis" />\n<bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_AND" targetRef="Task_GenererFacture" />`,
      goodBenefit: 'Comportement d\'exécution limpide et conforme aux spécifications OMG.'
    },
    {
      id: 'dd_loop_protection',
      ruleId: 'loop-max-counter-timer',
      title: 'Boucles & Cycles : Double Protection Compteur Max + Minuteur (Timer)',
      category: 'Passerelles & Décisions',
      severity: 'error',
      standard: 'Gouvernance Bouygues Telecom',
      raci: 'Dev Zeebe / Concepteur',
      autoFixable: false,
      badDesc: 'Faire remonter un flux vers l\'amont sans condition de sortie maximale ni temporisation.',
      badSnippet: `<!-- ❌ Boucle infinie directe sans timer -->\n[Erreur API] ──(boucle immédiate)──► [Relancer API]`,
      badImpact: 'Tempête de requêtes (DDoS interne), CPU 100% sur Zeebe et incident majeur de production.',
      goodDesc: 'Intégrer une vérification \`retryCount < 3\` et un minuteur d\'au moins 1 minute.',
      goodSnippet: `<!-- ✅ Boucle espacée et bornée -->\n[Erreur API] ──► [retryCount = retryCount + 1] ──► {retryCount < 3 ?}\n                                                      │ (Oui)\n                                                      ▼\n                                            [Timer 5 min : PT5M]\n                                                      │\n                                                      ▼\n                                            [Relancer API]`,
      goodBenefit: 'Protection des systèmes tiers, résilience aux pannes réseau et reprise maîtrisée.'
    },
    {
      id: 'dd_gateway_branches',
      ruleId: 'gateway-branches',
      title: 'Passerelles avec Branches Suffisantes (Split ≥ 2 ou Join ≥ 2)',
      category: 'Passerelles & Décisions',
      severity: 'warning',
      standard: 'OMG BPMN 2.0 §10.5',
      raci: 'Modélisateur Métier',
      autoFixable: false,
      badDesc: 'Passerelle avec une seule branche entrante et une seule branche sortante (élément inutile).',
      badSnippet: `<!-- ❌ Passerelle inutile 1 vers 1 -->\n<bpmn:exclusiveGateway id="GW_Inutile">\n  <bpmn:incoming>F1</bpmn:incoming>\n  <bpmn:outgoing>F2</bpmn:outgoing>\n</bpmn:exclusiveGateway>`,
      badImpact: 'Surcharge visuelle du diagramme sans aucune valeur fonctionnelle.',
      goodDesc: 'Supprimer la passerelle inutile et relier directement les tâches.',
      goodSnippet: `<!-- ✅ Flux direct sans nœud superflu -->\n<bpmn:sequenceFlow id="F1" sourceRef="Task_A" targetRef="Task_B" />`,
      goodBenefit: 'Diagramme allégé, lisible et économie de tokens d\'exécution.'
    },

    // ------------------ 4. CONVENTIONS DE NOMMAGE ------------------
    {
      id: 'dd_task_imperative',
      ruleId: 'task-imperative',
      title: 'Nommage des Tâches : Verbe à l\'Infinitif + COD',
      category: 'Nommage & Sémantique',
      severity: 'warning',
      standard: 'Charte de Gouvernance Bouygues Telecom',
      raci: 'Concepteur Métier / BA',
      autoFixable: true,
      badDesc: 'Nommer une tâche avec un nom commun sans action (ex: "Facturation", "Étape 2", "Vérif").',
      badSnippet: `<!-- ❌ Nom passif ou statique -->\n<bpmn:userTask id="Task_1" name="Facturation" />`,
      badImpact: 'Incompréhension des responsabilités ; les opérateurs ne savent pas quelle action effectuer.',
      goodDesc: 'Formuler l\'action concrète avec un verbe d\'action à l\'infinitif.',
      goodSnippet: `<!-- ✅ Action explicite et vivante -->\n<bpmn:userTask id="Task_1" name="Éditer la facture mensuelle du client" />`,
      goodBenefit: 'Clarté opérationnelle immédiate dans Tasklist et guide de travail autonome.'
    },
    {
      id: 'dd_gateway_question',
      ruleId: 'gateway-question',
      title: 'Passerelles de Décision : Formulation en Question (?)',
      category: 'Nommage & Sémantique',
      severity: 'error',
      standard: 'Charte de Gouvernance Bouygues Telecom',
      raci: 'Concepteur Métier',
      autoFixable: true,
      badDesc: 'Passerelle XOR sans point d\'interrogation ou avec un nom d\'action (ex: "Vérifier le client").',
      badSnippet: `<!-- ❌ Passerelle décisionnelle sans question -->\n<bpmn:exclusiveGateway id="GW_1" name="Eligibilité" />`,
      badImpact: 'Confusion entre une tâche qui s\'exécute et une décision qui oriente le flux.',
      goodDesc: 'Formuler une question fermée se terminant par un point d\'interrogation.',
      goodSnippet: `<!-- ✅ Question fermée claire -->\n<bpmn:exclusiveGateway id="GW_1" name="Le client est-il éligible à la Fibre ?" />`,
      goodBenefit: 'Lecture naturelle : Question sur la passerelle, Réponses ("Oui" / "Non") sur les flèches.'
    },
    {
      id: 'dd_event_start_participle',
      ruleId: 'event-start-past-participle',
      title: 'Événements de Début : Objet + Participe Passé',
      category: 'Nommage & Sémantique',
      severity: 'warning',
      standard: 'OMG BPMN 2.0 & Charte Métier',
      raci: 'Concepteur Métier',
      autoFixable: true,
      badDesc: 'Événement de début nommé avec un verbe d\'action (ex: "Démarrer la commande").',
      badSnippet: `<!-- ❌ Début nommé comme une tâche -->\n<bpmn:startEvent id="Start_1" name="Créer un compte" />`,
      badImpact: 'Les événements représentent un état survenu dans le monde réel, pas une action à réaliser.',
      goodDesc: 'Nommer l\'événement avec un participe passé indiquant le déclencheur initial.',
      goodSnippet: `<!-- ✅ Déclencheur survenu dans le monde réel -->\n<bpmn:startEvent id="Start_1" name="Demande de création de compte reçue" />`,
      goodBenefit: 'Distinction limpide entre déclencheurs passifs et tâches actives.'
    },
    {
      id: 'dd_event_end_state',
      ruleId: 'event-end-state',
      title: 'Événements de Fin : État Métier Final Atteint',
      category: 'Nommage & Sémantique',
      severity: 'warning',
      standard: 'Charte de Gouvernance Bouygues Telecom',
      raci: 'Concepteur Métier',
      autoFixable: true,
      badDesc: 'Événement de fin générique (ex: "Fin", "Terminé", "End").',
      badSnippet: `<!-- ❌ Fin générique sans contexte -->\n<bpmn:endEvent id="End_1" name="Fin" />`,
      badImpact: 'Impossibilité d\'analyser les causes de succès ou d\'échec dans les tableaux de bord Operate.',
      goodDesc: 'Préciser le résultat métier exact atteint par le dossier.',
      goodSnippet: `<!-- ✅ État métier final explicite -->\n<bpmn:endEvent id="End_1" name="Contrat Bbox signé et activé" />\n<bpmn:endEvent id="End_2" name="Dossier rejeté pour impayé" />`,
      goodBenefit: 'KPIs décisionnels précis et suivi statistique fin des motifs de clôture.'
    },
    {
      id: 'dd_process_id_kebab',
      ruleId: 'process-id-kebab',
      title: 'Process ID : Format kebab-case Strict',
      category: 'Nommage & Sémantique',
      severity: 'error',
      standard: 'Conventions de Nommage Camunda',
      raci: 'Dev Zeebe / Architecte',
      autoFixable: true,
      badDesc: 'Process ID avec des espaces, majuscules ou caractères spéciaux (ex: "Processus Commande v1").',
      badSnippet: `<!-- ❌ ID technique mal formaté -->\n<bpmn:process id="Processus Commande Client_v1" />`,
      badImpact: 'Erreurs dans les URLs REST, incompatibilités Kubernetes et scripts CI/CD cassés.',
      goodDesc: 'Adopter la convention kebab-case en minuscules avec tirets.',
      goodSnippet: `<!-- ✅ ID technique kebab-case standard -->\n<bpmn:process id="process-commande-client" />`,
      goodBenefit: 'Intégration CI/CD sans accroc, URLs REST propres et standardisation de flotte.'
    },
    {
      id: 'dd_variable_camelcase',
      ruleId: 'variable-naming',
      title: 'Variables : Convention camelCase Stricte',
      category: 'Nommage & Sémantique',
      severity: 'error',
      standard: 'Camunda 8 / FEEL Standard',
      raci: 'Développeur Zeebe',
      autoFixable: true,
      badDesc: 'Variables nommées avec des espaces, accents ou PascalCase (ex: "Nom Client", "Montant_TTC").',
      badSnippet: `<!-- ❌ Variables mal formatées -->\n<zeebe:input source="= Nom Client" target="Nom Client" />`,
      badImpact: 'Erreurs d\'évaluation dans les expressions FEEL et crashs lors des sérialisations JSON.',
      goodDesc: 'Utiliser la notation camelCase en minuscules avec majuscule sur les mots suivants.',
      goodSnippet: `<!-- ✅ Variable camelCase standard -->\n<zeebe:input source="= nomClient" target="nomClient" />\n<zeebe:input source="= montantTtc" target="montantTtc" />`,
      goodBenefit: 'Compatibilité totale avec FEEL, DMN, Java, Node.js et OpenAPI.'
    },

    // ------------------ 5. DÉPLOIEMENT & ZEEBE / CAMUNDA 8 ------------------
    {
      id: 'dd_process_executable',
      ruleId: 'process-executable',
      title: 'Processus Exécutable (isExecutable="true")',
      category: 'Déploiement Camunda 8 / Zeebe',
      severity: 'warning',
      standard: 'OMG BPMN 2.0 §10.1',
      raci: 'Dev Zeebe / Modélisateur',
      autoFixable: true,
      badDesc: 'Processus marqué avec isExecutable="false" ou attribut absent.',
      badSnippet: `<!-- ❌ Processus non exécutable -->\n<bpmn:process id="mon-process" isExecutable="false" />`,
      badImpact: 'Le moteur Zeebe refuse d\'instancier le processus (considéré comme un simple dessin documentaire).',
      goodDesc: 'Activer la case "Executable" (isExecutable="true") dans les propriétés du processus.',
      goodSnippet: `<!-- ✅ Processus prêt pour l\'exécution -->\n<bpmn:process id="process-souscription" isExecutable="true" />`,
      goodBenefit: 'Déploiement direct en production et exécution automatisée sans manipulation manuelle.'
    },
    {
      id: 'dd_service_impl',
      ruleId: 'service-implementation',
      title: 'Service Tasks : Job Type Zeebe Défini',
      category: 'Déploiement Camunda 8 / Zeebe',
      severity: 'warning',
      standard: 'Camunda 8 Worker Protocol',
      raci: 'Développeur Zeebe',
      autoFixable: false,
      badDesc: 'Service Task sans définition de tâche worker (Job Type vide).',
      badSnippet: `<!-- ❌ Service Task sans worker -->\n<bpmn:serviceTask id="Task_Api" name="Appeler API Facturation" />`,
      badImpact: 'Le jeton se bloque indéfiniment sur la tâche car aucun worker ne sait la consommer.',
      goodDesc: 'Définir un job type clair et versionné dans l\'extension Zeebe.',
      goodSnippet: `<!-- ✅ Service Task avec Job Worker configuré -->\n<bpmn:serviceTask id="Task_Api" name="Appeler API Facturation">\n  <bpmn:extensionElements>\n    <zeebe:taskDefinition type="billing-invoice-create" retries="3" />\n  </bpmn:extensionElements>\n</bpmn:serviceTask>`,
      goodBenefit: 'Consommation immédiate par les microservices et politique de retries automatique.'
    },
    {
      id: 'dd_user_task_impl',
      ruleId: 'user-task-camunda-implementation',
      title: 'User Tasks : Type « Camunda User Task » Obligatoire',
      category: 'Déploiement Camunda 8 / Zeebe',
      severity: 'error',
      standard: 'Gouvernance Bouygues Telecom',
      raci: 'Dev Zeebe / Concepteur',
      autoFixable: true,
      badDesc: 'User Task configurée comme Job Worker technique au lieu du standard Camunda Tasklist.',
      badSnippet: `<!-- ❌ User Task implémentée comme Job Worker -->\n<bpmn:userTask id="Task_1" name="Valider le dossier">\n  <bpmn:extensionElements>\n    <zeebe:taskDefinition type="human-validation" />\n  </bpmn:extensionElements>\n</bpmn:userTask>`,
      badImpact: 'Invisibilité dans Camunda Tasklist et rupture du cycle de vie des formulaires utilisateurs.',
      goodDesc: 'Utiliser l\'implémentation native Camunda User Task avec assignation de groupes.',
      goodSnippet: `<!-- ✅ Camunda User Task standard -->\n<bpmn:userTask id="Task_1" name="Valider le dossier">\n  <bpmn:extensionElements>\n    <zeebe:assignmentDefinition candidateGroups="EQUIPE_BACKOFFICE_FIBRE" />\n    <zeebe:formDefinition formId="form-validation-dossier" />\n  </bpmn:extensionElements>\n</bpmn:userTask>`,
      goodBenefit: 'Affichage natif dans Camunda Tasklist et gestion centralisée des formulaires.'
    },
    {
      id: 'dd_candidate_groups_only',
      ruleId: 'user-task-candidate-groups-only',
      title: 'User Tasks : Candidate Groups Obligatoire (Interdiction Assignation Nominative)',
      category: 'Gouvernance & Sécurité',
      severity: 'error',
      standard: 'Charte d\'Exploitation & Continuité de Service',
      raci: 'Chef de Projet / Concepteur',
      autoFixable: false,
      badDesc: 'Assigner une User Task directement à une personne nominative (ex: "jean.dupont").',
      badSnippet: `<!-- ❌ Assignation nominative directe -->\n<zeebe:assignmentDefinition assignee="jean.dupont" />`,
      badImpact: 'En cas de congés ou départ du collaborateur, les dossiers clients restent bloqués en production.',
      goodDesc: 'Toujours assigner à un groupe de compétences (Candidate Group) pour permettre la prise en charge collective.',
      goodSnippet: `<!-- ✅ Assignation à une file d'attente d'équipe -->\n<zeebe:assignmentDefinition candidateGroups="POLE_RECLAMATIONS_NIV2" />`,
      goodBenefit: 'Continuité d\'activité garantie 100%, charge équilibrée et conformité RH.'
    },
    {
      id: 'dd_timer_format',
      ruleId: 'timer-definition',
      title: 'Minuteurs : Définition Temporelle Valide (Format ISO 8601)',
      category: 'Déploiement Camunda 8 / Zeebe',
      severity: 'error',
      standard: 'ISO 8601 & Camunda Engine',
      raci: 'Développeur Zeebe',
      autoFixable: false,
      badDesc: 'Minuteur avec une valeur textuelle non standard (ex: "2 jours", "demain", "10 min").',
      badSnippet: `<!-- ❌ Format timer invalide -->\n<bpmn:timeDuration>2 jours</bpmn:timeDuration>`,
      badImpact: 'Crash de l\'instance au moment où le timer s\'active dans le moteur.',
      goodDesc: 'Utiliser la norme ISO 8601 (ex: PT15M pour 15 min, P2D pour 2 jours, R3/PT1H pour 3 répétitions).',
      goodSnippet: `<!-- ✅ Format ISO 8601 standard -->\n<bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT48H</bpmn:timeDuration>`,
      goodBenefit: 'Précision à la milliseconde et calcul prédictif exact dans Camunda Operate.'
    }
  ],

  // =========================================================================
  // 3. PARCOURS DE FORMATION MÉTIER & CYCLES D'APPRENTISSAGE
  // =========================================================================
  learningTracks: [
    {
      id: 'track_1',
      title: 'Parcours 1 : Fondamentaux BPMN 2.0 & Conventions Métier',
      level: 'starter',
      targetAudience: 'Product Owners, Business Analysts, Concepteurs Métier, Managers',
      duration: '3h 00m',
      icon: '🌱',
      color: '#10B981',
      description: 'Acquérir les bases indispensables pour dessiner des processus clairs, standardisés et conformes aux règles de l\'art BPMN 2.0.',
      modules: [
        {
          id: 'mod_1_1',
          title: 'Module 1 : Vocabulaire, Symboles et Anatomie d\'un Processus',
          lessons: [
            'Différence entre Processus, Procédure et Mode Opératoire',
            'Les 3 grandes familles d\'éléments : Événements, Tâches, Passerelles',
            'Règle d\'or du nommage : Verbe à l\'infinitif + Complément'
          ]
        },
        {
          id: 'mod_1_2',
          title: 'Module 2 : Prises de Décision et Passerelles',
          lessons: [
            'Passerelle Exclusive (XOR) : Choisir une seule route',
            'Passerelle Parallèle (AND) : Lancer plusieurs actions ensemble',
            'Pourquoi le flux par défaut est obligatoire pour sécuriser vos dossiers'
          ]
        },
        {
          id: 'mod_1_3',
          title: 'Module 3 : Organisation par Acteurs (Couloirs & Rôles)',
          lessons: [
            'Organiser son schéma avec les Couloirs (Lanes)',
            'Distinguer les acteurs internes et les partenaires externes',
            'Bonnes pratiques d\'aération et d\'alignement visuel'
          ]
        }
      ]
    },
    {
      id: 'track_2',
      title: 'Parcours 2 : Modélisateur Confirmé Camunda Modeler',
      level: 'intermediate',
      targetAudience: 'Concepteurs Fonctionnels, Référents Processus, Chefs de Projet',
      duration: '4h 15m',
      icon: '🎨',
      color: '#009CD7',
      description: 'Maîtriser l\'outil Camunda Modeler, concevoir des formulaires utilisateur et structurer des processus modulaires.',
      modules: [
        {
          id: 'mod_2_1',
          title: 'Module 1 : Prise en main experte de Camunda Modeler',
          lessons: [
            'Raccourcis clavier indispensables (E, S, H, Ctrl+Z)',
            'Utilisation de la palette contextuelle pour modéliser 3x plus vite',
            'Ajout de couleurs, annotations et documentation sur les éléments'
          ]
        },
        {
          id: 'mod_2_2',
          title: 'Module 2 : Délais, Minuteurs et Événements de Frontière',
          lessons: [
            'Modéliser une relance sans annuler la tâche (Minuteur Non-Interrompant)',
            'Modéliser une annulation automatique sur timeout (Minuteur Interrompant)',
            'Syntaxe simplifiée des durées (ex: PT24H pour 24 heures)'
          ]
        },
        {
          id: 'mod_2_3',
          title: 'Module 3 : Découpage Modulaire & Call Activities',
          lessons: [
            'Quand créer un Sous-Processus embarqué ?',
            'Créer une Activité d\'Appel (Call Activity) pour réutiliser une brique métier',
            'Vérification de la conformité avec l\'Audit Paprika'
          ]
        }
      ]
    },
    {
      id: 'track_3',
      title: 'Parcours 3 : Architecture & Déploiement Camunda 8 / Zeebe',
      level: 'expert',
      targetAudience: 'Architectes Solution, Développeurs Zeebe, Tech Leads',
      duration: '5h 30m',
      icon: '⚡',
      color: '#8B5CF6',
      description: 'Maîtriser l\'orchestration microservices, l\'isolation des variables, la gestion des erreurs et la résilience.',
      modules: [
        {
          id: 'mod_3_1',
          title: 'Module 1 : Isolation des Variables & Call Activities',
          lessons: [
            'Pourquoi désactiver Input & Output propagation sur les Call Activities',
            'Mapping déclaratif avec expressions FEEL',
            'Gestion fine du payload et performances Zeebe'
          ]
        },
        {
          id: 'mod_3_2',
          title: 'Module 2 : Gestion des Erreurs Métier vs Incidents Techniques',
          lessons: [
            'Différence entre Error Event (BPMN Error) et Retries techniques',
            'Escalade et notifications asynchrones',
            'Pattern Double Barrière pour sécuriser les boucles et cycles'
          ]
        }
      ]
    }
  ],

  // =========================================================================
  // 4. TEMPLATES & MODÈLES PRÊTS À L'EMPLOI (TÉLÉCHARGEABLES)
  // =========================================================================
  templates: [
    {
      id: 'tpl_standard_subscription',
      name: 'Processus Standard de Souscription (Conforme 100%)',
      category: 'Vente & Souscription',
      description: 'Modèle de référence respectant la charte de nommage, avec passerelle exclusive sécurisée (flux par défaut) et couloirs de responsabilités.',
      xmlFilename: 'template_souscription_standard.bpmn',
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process-souscription-standard" name="Souscription Standard" isExecutable="true">
    <bpmn:startEvent id="Start_1" name="Demande de souscription reçue">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Vérifier la complétude du dossier client">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_1" name="Le dossier est-il complet ?" default="Flow_Def">
      <bpmn:incoming>F2</bpmn:incoming>
      <bpmn:outgoing>Flow_OK</bpmn:outgoing>
      <bpmn:outgoing>Flow_Def</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_2" name="Activer la ligne de communication">
      <bpmn:incoming>Flow_OK</bpmn:incoming>
      <bpmn:outgoing>F3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_Relance" name="Demander les pièces complémentaires">
      <bpmn:incoming>Flow_Def</bpmn:incoming>
      <bpmn:outgoing>F_Relance_Fin</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_OK" name="Ligne activée avec succès">
      <bpmn:incoming>F3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Attente" name="Dossier en attente de pièces">
      <bpmn:incoming>F_Relance_Fin</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="F2" sourceRef="Task_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_OK" name="Oui (Complet)" sourceRef="Gateway_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_Def" name="Non / Autre (Par défaut)" sourceRef="Gateway_1" targetRef="Task_Relance" />
    <bpmn:sequenceFlow id="F3" sourceRef="Task_2" targetRef="End_OK" />
    <bpmn:sequenceFlow id="F_Relance_Fin" sourceRef="Task_Relance" targetRef="End_Attente" />
  </bpmn:process>
</bpmn:definitions>`
    },
    {
      id: 'tpl_call_activity_isolated',
      name: 'Architecture Modulaire avec Call Activity Isolée',
      category: 'Architecture Modulaire',
      description: 'Pattern d\'appel d\'un sous-processus transverse (KYC / Paiement) avec propagation des variables désactivée et mapping strict.',
      xmlFilename: 'template_call_activity_isolee.bpmn',
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" id="Definitions_CallAct" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process-souscription-modulaire" name="Souscription avec Activité d'Appel" isExecutable="true">
    <bpmn:startEvent id="Start_Sousc" name="Souscription initiée">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:callActivity id="Call_KYC" name="Vérifier la conformité KYC" calledElement="process-kyc-national">
      <bpmn:extensionElements>
        <zeebe:calledElement propagateAllChildVariables="false" propagateAllParentVariables="false" />
        <zeebe:ioMapping>
          <zeebe:input source="= clientId" target="customerId" />
          <zeebe:output source="= isVerified" target="isKycOk" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:callActivity>
    <bpmn:serviceTask id="Task_ActiverLigne" name="Activer les services de communication">
      <bpmn:incoming>F2</bpmn:incoming>
      <bpmn:outgoing>F3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Sousc_OK" name="Souscription validée et active">
      <bpmn:incoming>F3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_Sousc" targetRef="Call_KYC" />
    <bpmn:sequenceFlow id="F2" sourceRef="Call_KYC" targetRef="Task_ActiverLigne" />
    <bpmn:sequenceFlow id="F3" sourceRef="Task_ActiverLigne" targetRef="End_Sousc_OK" />
  </bpmn:process>
</bpmn:definitions>`
    }
  ],

  // =========================================================================
  // 5. QUIZ INTERACTIF DE CERTIFICATION PRO (10 QUESTIONS COMPLÈTES)
  // =========================================================================
  quizQuestions: [
    {
      id: 'q1',
      question: 'Selon la charte de nommage BPMN 2.0, quel est le nom correct pour une Tâche (User/Service Task) ?',
      options: [
        'Facturation Client',
        'Générer la facture mensuelle du client (Verbe infinitif + COD)',
        'En cours de facturation',
        'Étape 3 : Facture'
      ],
      correct: 1,
      explanation: 'Une tâche représente une action concrète à réaliser. Elle doit toujours comporter un verbe d\'action à l\'infinitif suivi de son complément d\'objet direct.'
    },
    {
      id: 'q2',
      question: 'Pourquoi est-il crucial de désactiver la propagation automatique des variables (Input/Output Propagation = Off) sur une Call Activity ?',
      options: [
        'C\'est juste une option graphique pour Camunda Modeler',
        'Pour éviter que les variables du sous-processus n\'écrasent accidentellement les variables du parent et pour maîtriser la mémoire',
        'Pour que le diagramme s\'affiche plus vite dans Google Chrome',
        'La propagation est toujours obligatoire dans BPMN 2.0'
      ],
      correct: 1,
      explanation: 'La désactivation de la propagation garantit l\'étanchéité des données entre processus parents et enfants, évitant le variable shadowing et la saturation du broker Zeebe.'
    },
    {
      id: 'q3',
      question: 'Pourquoi est-il obligatoire de définir une branche « Flux par Défaut » (Default Flow ⑊) sur une passerelle XOR ?',
      options: [
        'Pour colorer le diagramme en vert',
        'Pour que le dossier ne reste jamais bloqué si aucune des conditions spécifiques n\'est vérifiée',
        'C\'est une contrainte purement décorative',
        'Pour empêcher les opérateurs de fermer la fenêtre'
      ],
      correct: 1,
      explanation: 'Si un dossier client ne remplit aucune des conditions définies et qu\'il n\'y a pas de flux par défaut, le moteur lève une anomalie de routage et bloque le dossier.'
    },
    {
      id: 'q4',
      question: 'Comment nommer correctement une Passerelle Exclusive (XOR) de décision ?',
      options: [
        'Vérifier l\'éligibilité',
        'Passerelle_1',
        'Le client est-il éligible à la Fibre ? (Question fermée se terminant par ?)',
        'Decision_XOR'
      ],
      correct: 2,
      explanation: 'Une passerelle décisionnelle formule une question fermée avec point d\'interrogation, et chaque branche sortante formule la réponse (ex: « Oui », « Non »).'
    },
    {
      id: 'q5',
      question: 'Quelle est la différence entre un Minuteur Interrompant (trait plein double) et Non-Interrompant (pointillés) sur une tâche ?',
      options: [
        'Aucune différence fonctionnelle',
        'Le minuteur interrompant annule la tâche principale quand le délai expire, tandis que le non-interrompant laisse la tâche active et déclenche une relance en parallèle',
        'Le non-interrompant ne fonctionne pas sur Camunda 8',
        'Le minuteur interrompant supprime définitivement le dossier de la base'
      ],
      correct: 1,
      explanation: 'Un minuteur non-interrompant (en pointillés) est idéal pour envoyer un SMS de relance sans interrompre le travail de l\'opérateur.'
    },
    {
      id: 'q6',
      question: 'Quelle est la règle obligatoire pour assigner une User Task en production selon la gouvernance Bouygues Telecom ?',
      options: [
        'Assigner directement au nom du développeur (ex: jean.dupont)',
        'Assigner obligatoirement à un groupe de compétences via Candidate Groups (ex: EQUIPE_SUPPORT)',
        'Laisser le champ assignee totalement vide sans aucun groupe',
        'Assigner à l\'adresse IP de l\'ordinateur'
      ],
      correct: 1,
      explanation: 'L\'assignation nominative directe est interdite car elle bloque les dossiers en cas d\'absence. L\'assignation par groupe garantit la continuité de service.'
    },
    {
      id: 'q7',
      question: 'Quelle convention de casse doit être strictement appliquée pour les noms de variables dans Camunda / FEEL ?',
      options: [
        'kebab-case (ex: id-client)',
        'camelCase (ex: idClientBbox)',
        'SNAKE_CASE_MAJUSCULE',
        'Texte libre avec des espaces'
      ],
      correct: 1,
      explanation: 'Les variables doivent toujours utiliser la convention camelCase pour être compatibles avec le moteur d\'expressions FEEL, DMN et les APIs JSON.'
    },
    {
      id: 'q8',
      question: 'Quelle double protection est obligatoire lors de la modélisation d\'une boucle de retry dans un processus ?',
      options: [
        'Deux passerelles AND consécutives',
        'Un Compteur maximal d\'itérations (max 3) et un Minuteur d\'espacement (Timer ≥ 1 min)',
        'Un fichier PDF explicatif',
        'Aucune protection n\'est nécessaire'
      ],
      correct: 1,
      explanation: 'Le pattern Double Barrière (Compteur + Timer) protège l\'orchestrateur contre les boucles infinies et les tempêtes de requêtes destructrices.'
    },
    {
      id: 'q9',
      question: 'Comment nommer un Événement de Fin (End Event) selon les bonnes pratiques ?',
      options: [
        'Fin du traitement',
        'Commande expédiée et facture acquittée (Objet métier + État final atteint)',
        'Terminer la commande',
        'Sortie'
      ],
      correct: 1,
      explanation: 'Les événements représentent un état de fait atteint dans le monde réel, ils se nomment toujours au participe passé en précisant le résultat.'
    },
    {
      id: 'q10',
      question: 'Pourquoi est-il interdit de placer des conditions sur les branches sortant d\'une passerelle Parallèle (AND) ?',
      options: [
        'Parce que le AND active automatiquement toutes ses branches en parallèle sans jamais évaluer de condition',
        'Parce que cela ralentit la souris dans Camunda Modeler',
        'Parce que Camunda n\'aime pas les conditions',
        'C\'est autorisé le week-end uniquement'
      ],
      correct: 0,
      explanation: 'Par définition dans la norme OMG BPMN 2.0, la passerelle parallèle déclenche inconditionnellement toutes ses branches en parallèle.'
    }
  ]
};
