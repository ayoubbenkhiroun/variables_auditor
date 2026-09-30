/**
 * PAPRIKA ACADEMY - Base de Connaissances BPMN 2.0, Camunda Modeler & Camunda Operate
 * 100% Métier, Concepteurs Fonctionnels, Business Analysts et Gestionnaires Opérationnels.
 */

window.ACADEMY_DATA = {
  categories: [
    { id: 'all', label: 'Toutes les thématiques', icon: '🌟' },
    { id: 'bpmn_naming', label: 'Nommage & Lisibilité', icon: '✍️' },
    { id: 'bpmn_design', label: 'Design & Bonnes Pratiques', icon: '📐' },
    { id: 'gateways', label: 'Passerelles & Décisions', icon: '🔀' },
    { id: 'events_delays', label: 'Événements & Délais Métier', icon: '⏱️' },
    { id: 'modeler_tips', label: 'Camunda Modeler (Astuces)', icon: '🛠️' },
    { id: 'operate_monitoring', label: 'Suivi dans Camunda Operate', icon: '🎯' }
  ],

  levels: [
    { id: 'starter', label: 'Débutant (Découverte BPMN)', color: '#10B981' },
    { id: 'intermediate', label: 'Intermédiaire (Modélisateur)', color: '#009CD7' },
    { id: 'advanced', label: 'Avancé (Pilote de Processus)', color: '#EA5B0C' },
    { id: 'expert', label: 'Référent (Gouvernance & Qualité)', color: '#8B5CF6' }
  ],

  // =========================================================================
  // 1. ARTICLES ET GUIDES MÉTIER COMPLETS (ZÉRO CODE / 100% FONCTIONNEL)
  // =========================================================================
  articles: [
    {
      id: 'art_naming_rules',
      title: 'Charte de Nommage BPMN 2.0 : Tâches, Événements et Passerelles',
      category: 'bpmn_naming',
      level: 'starter',
      readTime: '5 min',
      author: 'Centre d\'Excellence BPMN & Métier',
      summary: 'Les règles d\'or indispensables pour que votre diagramme soit immédiatement compréhensible par toutes les équipes métier et de direction.',
      content: `
### 1. Pourquoi la charte de nommage est-elle cruciale ?
Un diagramme de processus est avant tout un **langage universel de communication**. S'il est mal nommé, il crée des ambiguïtés, ralentit les validations et induit en erreur les opérateurs dans **Camunda Operate**.

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
* **Passerelle de décision (Split XOR / OR)** : Doit toujours formuler une **Question fermée** (ex: *« Client déjà abonné ? »*, *« Montant > 500 € ? »*).
* **Branches sortantes (Sequence Flows)** : Doivent formuler la **Réponse / Condition claire** (ex: *« Oui »*, *« Non »*, *« Offre Fibre »*, *« Offre 4G/5G »*).
* **Passerelle de synchronisation (Join)** : Ne pas surcharger le schéma, la laisser sans texte ou indiquer *« Synchronisation »*.
      `
    },
    {
      id: 'art_bpmn_layout_clarity',
      title: 'Clarté Visuelle & Règle des 7±2 : Éviter les Diagrammes Spaghettis',
      category: 'bpmn_design',
      level: 'starter',
      readTime: '6 min',
      author: 'Direction de la Transformation Métier',
      summary: 'Comment structurer visuellement un modèle BPMN pour une lisibilité instantanée et un confort d\'audit optimal.',
      content: `
### 1. La règle d'or d'orientation : De Gauche à Droite
Le cerveau humain lit naturellement le temps qui s'écoule de gauche à droite.

* **Flux principal (Happy Path)** : Doit toujours cheminer horizontalement de **Gauche à Droite** sur une ligne directrice claire.
* **Branches d'exception ou alternatives** : Doivent descendre vers le bas (**De Haut en Bas**) puis se rejoindre ou aboutir à une fin dédiée.
* ❌ **Interdit** : Ne jamais faire remonter un flux vers la gauche sauf dans le cas d'une boucle de relance / reprise clairement modélisée.

---

### 2. La règle cognitive des 7 ± 2 éléments
Un schéma contenant 40 tâches sur une seule page devient illisible et impossible à maintenir pour les équipes métier.

* **Bonne pratique** : Un niveau de processus doit comporter idéalement entre **5 et 9 activités majeures**.
* Si le processus est plus complexe, il est **obligatoire de le découper** en sous-processus logiques (ex: *Sous-processus « Validation des pièces justificatives »*).

---

### 3. Les croisements de flèches (Sequence Flows)
* Les flèches qui se croisent créent de la confusion et augmentent le risque d'erreur d'interprétation.
* Utilisez l'outil d'alignement de **Camunda Modeler** et espacez les éléments d'au moins **40 à 60 pixels** pour maintenir un schéma aéré.
* Utilisez des **Annotations Textuelles** (icône crochet \`[\`) pour apporter des précisions métier sans alourdir le nom des activités.
      `
    },
    {
      id: 'art_gateways_mastery',
      title: 'Maîtriser les Passerelles BPMN : XOR, AND, OR et l\'indispensable Flux par Défaut',
      category: 'gateways',
      level: 'intermediate',
      readTime: '7 min',
      author: 'Centre d\'Excellence BPMN',
      summary: 'Comprendre précisément comment se divisent et se rejoignent les chemins de décision pour éviter les blocages de dossiers.',
      content: `
### 1. Passerelle Exclusive (XOR Gateway - Symbole X ou vide)
* **Comportement** : Une seule et unique branche sortante est empruntée en fonction d'une condition.
* ⚠️ **Règle absolue** : Vous DEVEZ TOUJOURS désigner une branche comme **Flux par défaut (Default Flow)** (marquée d'une petite barre oblique \`⑊\`).
* **Pourquoi ?** Si aucune des conditions métier n'est remplie (ex: dossier atypique), le dossier empruntera automatiquement le flux par défaut au lieu de rester bloqué indéfiniment.

---

### 2. Passerelle Parallèle (AND Gateway - Symbole +)
* **Comportement (Divergence)** : Active TOUTES les branches sortantes simultanément.
* **Comportement (Convergence)** : La passerelle de fermeture **attend que TOUTES les branches soient terminées** avant de laisser passer le jeton vers la suite.
* ❌ **Erreur fréquente** : Mettre des conditions textuelles sur les branches d'un AND (un AND n'évalue aucune condition, il déclenche tout !).

---

### 3. Passerelle Inclusive (OR Gateway - Symbole O)
* **Comportement** : Peut activer 1, 2 ou toutes les branches si leurs conditions respectives sont vraies.
* **Exemple métier** : Souscription d'options lors d'une commande (le client peut choisir l'option TV, l'option Débit Max, les deux ou aucune).

---

### 4. Passerelle Basée sur les Événements (Event-Based Gateway)
* **Comportement** : Le processus se met en attente de **plusieurs événements concurrents** (ex: *Réponse du client par email* OU *Expiration d'un délai de 7 jours*).
* Le premier événement qui survient gagne la course et annule l'autre branche.
      `
    },
    {
      id: 'art_boundary_events_sla',
      title: 'Gestion des Délais & Relances : Minuteurs (Timer) et Événements de Frontière',
      category: 'events_delays',
      level: 'intermediate',
      readTime: '6 min',
      author: 'Support & Qualité Processus',
      summary: 'Comment modéliser les relances clients, les délais d\'attente SLA et les escalades sans rendre le schéma illisible.',
      content: `
### 1. Qu'est-ce qu'un Événement de Frontière (Boundary Event) ?
C'est un événement « accroché » directement sur le bord d'une tâche (ex: sur une tâche utilisateur de validation de dossier). Il surveille ce qui se passe pendant que la tâche est en cours.

---

### 2. Événement Interrompant vs Non-Interrompant
Dans **Camunda Modeler**, vous pouvez choisir le style de l'événement :

* ⭕ **Interrompant (Trait plein double)** :
  * Si le délai expire, **la tâche en cours est immédiatement annulée**.
  * Le processus part définitivement dans la branche de secours (ex: *« Annuler la commande pour absence de réponse »*).
* 🔘 **Non-Interrompant (Trait en pointillés)** :
  * Si le délai expire, **la tâche principale RESTE ACTIVE**.
  * Une branche parallèle d'alerte ou de relance est déclenchée (ex: *« Envoyer un SMS de rappel au client »*).

---

### 3. Définition des Délais (Format ISO 8601 compréhensible)
* Pour définir un délai de 48 heures : \`PT48H\` ou \`P2D\`
* Pour une relance toutes les 24 heures (jusqu'à 3 fois) : \`R3/P1D\`
* Pour une échéance à date fixe : \`2026-10-15T18:00:00Z\`
      `
    },
    {
      id: 'art_subprocesses_call_activities',
      title: 'Découpage Modulaire : Sous-processus Embarqués vs Activités d\'Appel (Call Activities)',
      category: 'bpmn_design',
      level: 'intermediate',
      readTime: '7 min',
      author: 'Architecture Métier & Référentiel',
      summary: 'Quand faut-il créer un sous-processus intégré et quand faut-il réutiliser un processus autonome via une Call Activity ?',
      content: `
### 1. Sous-processus Embarqué (Embedded Subprocess - Cadre Fin)
* **Définition** : Un bloc rectangulaire présent directement dans le même fichier BPMN.
* **Usage recommandé** :
  * Pour regrouper 3 ou 4 étapes très liées entre elles.
  * Pour appliquer un gestionnaire d'erreur ou un minuteur commun à l'ensemble du groupe.
* ⚠️ **Attention** : Ce sous-processus n'est pas réutilisable en dehors de ce diagramme spécifique.

---

### 2. Activité d'Appel (Call Activity - Cadre Épais)
* **Définition** : Un rectangle entouré d'une **bordure très épaisse**. Il fait référence à un diagramme BPMN totalement distinct et autonome.
* **Usage recommandé** :
  * Pour les briques réutilisables transverses à plusieurs tribus (ex: *« Vérification KYC / Identité »*, *« Envoi de notification multi-canal »*, *« Encaissement Carte Bancaire »*).
  * Permet à chaque équipe métier d'être propriétaire et responsable de son propre sous-processus.
* 🎯 **Dans Camunda Operate** : Vous pouvez cliquer sur la Call Activity pour « plonger » directement dans l'instance du sous-processus et suivre son exécution étape par étape !
      `
    },
    {
      id: 'art_lanes_pools_responsibilities',
      title: 'Couloirs (Lanes) & Piscines (Pools) : Clarifier les Responsabilités Métier',
      category: 'bpmn_design',
      level: 'starter',
      readTime: '5 min',
      author: 'Gouvernance des Processus Bouygues Telecom',
      summary: 'Distinguer les acteurs internes d\'un processus et les entités externes pour une organisation sans faille.',
      content: `
### 1. Pool (Piscine) : Une Entité Organisationnelle Indépendante
* Une Pool représente un système ou un organisme distinct (ex: *« Bouygues Telecom »*, *« Le Client »*, *« Le Partenaire Bancaire »*).
* Entre deux Pools distinctes, on utilise des **Flux de Messages (Message Flows en pointillés)** et JAMAIS de flux de séquence direct.
* Pour les processus internes exécutables, on place tout le workflow dans une seule Pool principale (Piscine Blanche).

---

### 2. Lanes (Couloirs) : Les Rôles et Équipes Métier
À l'intérieur de votre piscine, découpez l'espace en couloirs horizontaux représentant les acteurs :
* 🏢 *Couloir 1 : Conseiller Clientèle (Boutique / CRC)*
* 🔍 *Couloir 2 : Service Back-Office / Fraude*
* 📦 *Couloir 3 : Équipe Logistique & Expédition*
* 🤖 *Couloir 4 : Système Automatisé (SI Provisioning)*

---

### 3. Avantages pour le management et l'audit
* En un coup d'œil, chacun sait exactement **qui est responsable de quelle tâche**.
* Permet de mesurer facilement les temps de traitement par équipe et de détecter où se situent les goulots d'étranglement.
      `
    },
    {
      id: 'art_modeler_productivity',
      title: 'Camunda Modeler : 10 Astuces & Raccourcis pour les Modélisateurs Métier',
      category: 'modeler_tips',
      level: 'starter',
      readTime: '5 min',
      author: 'Équipe Support Outillage',
      summary: 'Gagnez du temps au quotidien lors de la conception de vos diagrammes grâce aux meilleures fonctionnalités du Modeler.',
      content: `
### 1. Les raccourcis clavier incontournables
* \`E\` : Active l'outil **Lasso** pour sélectionner et déplacer plusieurs éléments d'un coup.
* \`S\` : Active l'outil **Space Tool** pour insérer ou supprimer de l'espace horizontal/vertical sans casser vos liaisons.
* \`H\` : Active l'outil **Hand (Main)** pour naviguer facilement dans les grands diagrammes.
* \`Ctrl + Z\` / \`Ctrl + Y\` : Annuler / Rétablir.
* \`Ctrl + C\` / \`Ctrl + V\` : Dupliquer un bloc complet avec ses propriétés.

---

### 2. Le menu contextuel rapide (Context Pad)
Lorsque vous cliquez sur un élément, une palette d'icônes apparaît autour de lui :
* Cliquez sur la flèche pour **créer immédiatement la tâche suivante** déjà reliée !
* Cliquez sur la clé à molette 🔧 pour **changer le type d'élément** (ex: transformer une Tâche générique en User Task ou Service Task) sans devoir recréer l'élément.

---

### 3. Utiliser les Couleurs pour la clarté
* Utilisez la palette de couleurs intégrée pour distinguer les étapes :
  * 🟢 **Vert** : Début et étapes de succès.
  * 🟡 **Jaune / Orange** : Étapes nécessitant une action manuelle humaine.
  * 🔴 **Rouge** : Fins d'échec ou d'annulation.
  * 🔵 **Bleu** : Tâches automatisées système.
      `
    },
    {
      id: 'art_operate_for_business',
      title: 'Camunda Operate pour le Métier : Suivre ses Dossiers et Détecter les Blocages',
      category: 'operate_monitoring',
      level: 'advanced',
      readTime: '8 min',
      author: 'Support Opérationnel & Supervision',
      summary: 'Le guide complet pour les gestionnaires métier afin de retrouver une commande, comprendre où est le jeton et agir sur les incidents.',
      content: `
### 1. Qu'est-ce qu'un Jeton (Token) dans Operate ?
Lorsqu'un processus démarre pour un client, Camunda crée une **Instance de processus**.
* Le **Jeton (Token)** est le marqueur visuel (représenté par un badge numéroté bleu) qui indique **où se trouve actuellement le dossier** sur le schéma BPMN.
* Si le jeton est sur *« Attente retour signature client »*, vous savez immédiatement que le dossier n'est pas bloqué côté Bouygues Telecom mais en attente du client.

---

### 2. Retrouver un dossier spécifique en 2 secondes
Dans la barre de recherche et filtres de Camunda Operate :
* Filtrez par **Variable Métier** : \`idClientBbox = "CLI-98234"\` ou \`msisdn = "0612345678"\`.
* Filtrez par **Date de création** : Retrouvez toutes les commandes passées aujourd'hui.
* Filtrez par **État** : *Active* (en cours), *Completed* (terminée avec succès), ou *Incidents* (en anomalie).

---

### 3. Comprendre un Incident Rouge (Badge d'alerte)
Lorsqu'un badge rouge apparaît sur une tâche dans Operate :
* Cela signifie qu'un problème a empêché la tâche de se terminer (ex: indisponibilité temporaire d'un serveur partenaire ou donnée invalide).
* Cliquez sur l'incident pour lire le **message d'erreur explicite**.
* Une fois le problème résolu, l'opérateur ou le support peut cliquer sur **« Retry »** pour relancer immédiatement le dossier sans devoir tout ressaisir !
      `
    }
  ],

  // =========================================================================
  // 2. GALERIE DO'S & DON'TS (ANTI-PATTERNS VS BONNES PRATIQUES MÉTIER)
  // =========================================================================
  dosAndDonts: [
    {
      id: 'dd_1',
      title: 'Nommage des Tâches et Activités',
      category: 'Nommage',
      severity: 'high',
      badDesc: 'Nommer les tâches avec un simple nom d\'objet ou un statut (ex: « Commande », « Éligibilité », « En cours », « Étape 2 »).',
      badImpact: 'Incompréhension totale entre le métier et la technique ; impossibilité de savoir qui fait quoi lors de l\'audit dans Camunda Operate.',
      goodDesc: 'Toujours utiliser la formule : [Verbe d\'action à l\'infinitif] + [Complément d\'objet direct] (ex: « Vérifier l\'éligibilité Fibre du client »).',
      goodBenefit: 'Schéma lisible par tous, autonome et transformable directement en procédure de travail.'
    },
    {
      id: 'dd_2',
      title: 'Passerelle Exclusive (XOR) sans Flux par Défaut',
      category: 'Passerelles',
      severity: 'critical',
      badDesc: 'Créer une passerelle exclusive où toutes les branches sortantes ont des conditions strictes, sans désigner de branche par défaut.',
      badImpact: 'Si un dossier client ne remplit aucune des conditions prévues, l\'instance se bloque irrémédiablement avec une erreur de routage.',
      goodDesc: 'Toujours définir explicitement une branche de secours comme « Flux par défaut » (marquée de la barre oblique ⑊).',
      goodBenefit: 'Garantie absolue qu\'aucun dossier client ne sera perdu ou bloqué en cours de route.'
    },
    {
      id: 'dd_3',
      title: 'Flux Croisés et Schéma Spaghetti',
      category: 'Lisibilité & Disposition',
      severity: 'medium',
      badDesc: 'Faire reculer des flux vers la gauche ou croiser des dizaines de flèches dans tous les sens sur une seule page.',
      badImpact: 'Diagramme illisible, source d\'erreurs lors de la conception et refus fréquent lors des comités de validation d\'architecture.',
      goodDesc: 'Respecter l\'orientation stricte de Gauche à Droite pour le flux nominal, faire descendre les exceptions vers le bas, et découper en sous-processus.',
      goodBenefit: 'Lecture intuitive et fluide, revue de processus rapide et sereine avec les parties prenantes.'
    },
    {
      id: 'dd_4',
      title: 'Usage abusif de Piscines au lieu de Couloirs (Lanes)',
      category: 'Organisation & Acteurs',
      severity: 'high',
      badDesc: 'Créer plusieurs boîtes rectangulaires (Pools) indépendantes pour des services d\'une même entreprise qui travaillent sur le même dossier.',
      badImpact: 'Oblige à créer des flux de messages complexes et empêche la vision d\'ensemble du cycle de vie du dossier.',
      goodDesc: 'Utiliser une seule Piscine principale (Processus Métier) découpée en Couloirs (Lanes) pour chaque rôle ou service interne.',
      goodBenefit: 'Clarté limpide des responsabilités et synchronisation naturelle des étapes.'
    },
    {
      id: 'dd_5',
      title: 'Gestion des Délais & Relances en Texte Libre',
      category: 'Événements & Délais',
      severity: 'high',
      badDesc: 'Écrire « Relancer au bout de 48h » dans un simple commentaire texte à côté de la tâche.',
      badImpact: 'Le moteur Camunda ne peut pas exécuter du texte libre ; le délai ne sera jamais surveillé et le dossier sera oublié.',
      goodDesc: 'Attacher un Événement de Frontière Minuteur (Boundary Timer Event) directement sur la tâche avec la durée souhaitée (ex: PT48H).',
      goodBenefit: 'Le système surveille le délai automatiquement et déclenche la relance sans intervention humaine.'
    },
    {
      id: 'dd_6',
      title: 'Processus Monolithique de plus de 20 Tâches',
      category: 'Architecture Métier',
      severity: 'medium',
      badDesc: 'Dessiner l\'intégralité d\'un processus de bout-en-bout (de la commande à la facturation) sur un diagramme géant de 60 éléments.',
      badImpact: 'Impossible à imprimer, impossible à maintenir, et surcharge cognitive pour les équipes.',
      goodDesc: 'Appliquer la règle des 7±2 et encapsuler les sous-étapes dans des Activités d\'Appel (Call Activities réutilisables).',
      goodBenefit: 'Modularité, réutilisation des briques par d\'autres équipes et maintenance facilitée.'
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
      title: 'Parcours 3 : Suivi Opérationnel & Pilotage dans Camunda Operate',
      level: 'advanced',
      targetAudience: 'Gestionnaires Métier, Responsables d\'Exploitation, Support N2 Métier',
      duration: '3h 45m',
      icon: '🎯',
      color: '#EA5B0C',
      description: 'Apprendre à naviguer dans Camunda Operate, suivre l\'avancement des dossiers clients et comprendre les points de blocage.',
      modules: [
        {
          id: 'mod_3_1',
          title: 'Module 1 : Comprendre les Jetons et l\'État d\'une Instance',
          lessons: [
            'Qu\'est-ce qu\'un jeton (Token) et comment lire son emplacement ?',
            'Différencier une instance Active, Terminée (Completed) ou en Incident',
            'Historique complet du parcours d\'un dossier'
          ]
        },
        {
          id: 'mod_3_2',
          title: 'Module 2 : Recherche Avancée et Suivi des Commandes',
          lessons: [
            'Rechercher par identifiant client (idClient, msisdn, imsi)',
            'Filtrer par date, statut ou type d\'offre commerciale',
            'Exporter des listes de dossiers pour reporting'
          ]
        },
        {
          id: 'mod_3_3',
          title: 'Module 3 : Gestion des Alertes et Résolution d\'Incidents',
          lessons: [
            'Comment lire le message d\'anomalie sur une tâche bloquée',
            'Quand utiliser la fonction « Retry » pour relancer un dossier ?',
            'Collaboration efficace avec les équipes techniques de support'
          ]
        }
      ]
    },
    {
      id: 'track_4',
      title: 'Parcours 4 : Référent Qualité & Gouvernance des Processus',
      level: 'expert',
      targetAudience: 'Pilotes de Processus, Responsables Qualité, Auditeurs BPMN',
      duration: '5h 00m',
      icon: '🏆',
      color: '#8B5CF6',
      description: 'Mettre en place une gouvernance d\'entreprise, animer les revues de modélisation et auditer la conformité avec Paprika.',
      modules: [
        {
          id: 'mod_4_1',
          title: 'Module 1 : La Grille d\'Audit Qualité BPMN 2.0',
          lessons: [
            'Contrôle automatique du respect de la charte de nommage',
            'Détection des variables orphelines et non déclarées',
            'Calcul du Score de Santé et d\'Architecture Paprika'
          ]
        },
        {
          id: 'mod_4_2',
          title: 'Module 2 : Cycle de Vie et Versioning des Modèles',
          lessons: [
            'Gestion des versions de diagrammes dans Camunda Modeler & Operate',
            'Gérer l\'impact d\'une modification de processus sur les dossiers en cours',
            'Comparaison de versions avec le Comparateur Visuel Paprika'
          ]
        },
        {
          id: 'mod_4_3',
          title: 'Module 3 : Animation de la Communauté des Modélisateurs',
          lessons: [
            'Organiser des revues de pairs (Peer Review) efficaces',
            'Maintenir le Catalogue de Données d\'Entreprise partagé',
            'Mesurer l\'adoption et la maturité BPMN des équipes'
          ]
        }
      ]
    }
  ],

  // =========================================================================
  // 4. TEMPLATES BPMN FONCTIONNELS PRÊTS À L'EMPLOI (TÉLÉCHARGEABLES)
  // =========================================================================
  templates: [
    {
      id: 'tpl_validation_sla',
      name: 'Validation de Dossier avec Relance & Escalade SLA',
      category: 'Parcours Métier',
      description: 'Modèle fonctionnel complet comprenant une tâche utilisateur avec minuterie de relance à 24h et clôture automatique à 72h.',
      xmlFilename: 'template_validation_dossier_sla.bpmn',
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Validation" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Validation_Dossier_SLA" name="Validation de Dossier avec Relance SLA" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Dossier de souscription reçu">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_ValiderDossier" name="Vérifier et valider les pièces justificatives">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="Timer_Relance" name="Rappel à 24h" cancelActivity="false" attachedToRef="Task_ValiderDossier">
      <bpmn:outgoing>Flow_Relance</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerDef_1">
        <bpmn:timeDuration>PT24H</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="Timer_Timeout" name="Délai max 72h expiré" cancelActivity="true" attachedToRef="Task_ValiderDossier">
      <bpmn:outgoing>Flow_Timeout</bpmn:outgoing>
      <bpmn:timerEventDefinition id="TimerDef_2">
        <bpmn:timeDuration>PT72H</bpmn:timeDuration>
      </bpmn:timerEventDefinition>
    </bpmn:boundaryEvent>
    <bpmn:serviceTask id="Task_EnvoyerRappel" name="Envoyer SMS de relance au client">
      <bpmn:incoming>Flow_Relance</bpmn:incoming>
      <bpmn:outgoing>Flow_Relance_Fin</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Relance" name="Rappel transmis">
      <bpmn:incoming>Flow_Relance_Fin</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Timeout" name="Dossier annulé pour délai dépassé">
      <bpmn:incoming>Flow_Timeout</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Valide" name="Dossier validé avec succès">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_ValiderDossier" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ValiderDossier" targetRef="End_Valide" />
    <bpmn:sequenceFlow id="Flow_Relance" sourceRef="Timer_Relance" targetRef="Task_EnvoyerRappel" />
    <bpmn:sequenceFlow id="Flow_Relance_Fin" sourceRef="Task_EnvoyerRappel" targetRef="End_Relance" />
    <bpmn:sequenceFlow id="Flow_Timeout" sourceRef="Timer_Timeout" targetRef="End_Timeout" />
  </bpmn:process>
</bpmn:definitions>`
    },
    {
      id: 'tpl_sav_multichannel',
      name: 'Traitement SAV Multi-Canal avec Passerelle XOR Sécurisée',
      category: 'Support Client',
      description: 'Structure type pour le routage de réclamations client selon l\'offre (Bbox Fibre vs Forfait Mobile) avec flux par défaut.',
      xmlFilename: 'template_sav_multicanal.bpmn',
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_SAV" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_SAV_Multicanal" name="Traitement de Réclamation SAV Multi-Canal" isExecutable="true">
    <bpmn:startEvent id="Start_SAV" name="Réclamation SAV déclarée">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:exclusiveGateway id="Gateway_TypeOffre" name="Type d'offre client ?" default="Flow_Default">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>Flow_Fibre</bpmn:outgoing>
      <bpmn:outgoing>Flow_Mobile</bpmn:outgoing>
      <bpmn:outgoing>Flow_Default</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_SupportFibre" name="Diagnostiquer la ligne Bbox Fibre">
      <bpmn:incoming>Flow_Fibre</bpmn:incoming>
      <bpmn:outgoing>F_Fibre_OK</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_SupportMobile" name="Diagnostiquer la carte SIM / Réseau Mobile">
      <bpmn:incoming>Flow_Mobile</bpmn:incoming>
      <bpmn:outgoing>F_Mobile_OK</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_SupportGeneral" name="Prendre en charge la demande générale (Conseiller Polyvalent)">
      <bpmn:incoming>Flow_Default</bpmn:incoming>
      <bpmn:outgoing>F_General_OK</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_SAV_Cloture" name="Ticket SAV résolu et clôturé">
      <bpmn:incoming>F_Fibre_OK</bpmn:incoming>
      <bpmn:incoming>F_Mobile_OK</bpmn:incoming>
      <bpmn:incoming>F_General_OK</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="F1" sourceRef="Start_SAV" targetRef="Gateway_TypeOffre" />
    <bpmn:sequenceFlow id="Flow_Fibre" name="Offre Bbox" sourceRef="Gateway_TypeOffre" targetRef="Task_SupportFibre" />
    <bpmn:sequenceFlow id="Flow_Mobile" name="Offre Mobile" sourceRef="Gateway_TypeOffre" targetRef="Task_SupportMobile" />
    <bpmn:sequenceFlow id="Flow_Default" name="Autre / Inconnu (Par défaut)" sourceRef="Gateway_TypeOffre" targetRef="Task_SupportGeneral" />
    <bpmn:sequenceFlow id="F_Fibre_OK" sourceRef="Task_SupportFibre" targetRef="End_SAV_Cloture" />
    <bpmn:sequenceFlow id="F_Mobile_OK" sourceRef="Task_SupportMobile" targetRef="End_SAV_Cloture" />
    <bpmn:sequenceFlow id="F_General_OK" sourceRef="Task_SupportGeneral" targetRef="End_SAV_Cloture" />
  </bpmn:process>
</bpmn:definitions>`
    },
    {
      id: 'tpl_call_activity_subproc',
      name: 'Processus Modulaire avec Activité d\'Appel (Call Activity)',
      category: 'Architecture Modulaire',
      description: 'Modèle recommandé montrant l\'appel d\'un sous-processus transverse réutilisable (ex: Vérification KYC / Identité).',
      xmlFilename: 'template_call_activity_kyc.bpmn',
      xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_CallAct" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Souscription_Modulaire" name="Souscription avec Activité d'Appel" isExecutable="true">
    <bpmn:startEvent id="Start_Sousc" name="Souscription initiée">
      <bpmn:outgoing>F1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:callActivity id="Call_KYC" name="Vérifier la conformité de l'identité (KYC)" calledElement="Process_KYC_National">
      <bpmn:incoming>F1</bpmn:incoming>
      <bpmn:outgoing>F2</bpmn:outgoing>
    </bpmn:callActivity>
    <bpmn:serviceTask id="Task_ActiverLigne" name="Activer la ligne de communication">
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
  // 5. QUIZ INTERACTIF D'AUTO-ÉVALUATION (100% MÉTIER, NOMMAGE & OPERATE)
  // =========================================================================
  quizQuestions: [
    {
      id: 'q1',
      question: 'Selon la charte de nommage BPMN 2.0, quel est le nom correct pour une Tâche ?',
      options: [
        'Facturation Client',
        'Générer la facture mensuelle du client',
        'En cours de facturation',
        'Étape 3 : Facture'
      ],
      correct: 1,
      explanation: 'Une tâche doit toujours comporter un verbe d\'action à l\'infinitif suivi de son complément d\'objet direct (ex: « Générer la facture mensuelle du client »).'
    },
    {
      id: 'q2',
      question: 'Comment doit être formulé le nom d\'une Passerelle Exclusive (XOR) de décision ?',
      options: [
        'Souscription',
        'Vérifier le contrat',
        'Le client est-il éligible à la Fibre ? (Une question fermée claire)',
        'Passerelle_1'
      ],
      correct: 2,
      explanation: 'Une passerelle décisionnelle formule une question fermée, et chaque branche sortante formule la réponse (ex: « Oui », « Non »).'
    },
    {
      id: 'q3',
      question: 'Pourquoi est-il crucial de définir une branche « Flux par Défaut » (Default Flow ⑊) sur une passerelle XOR ?',
      options: [
        'Pour accélérer l\'affichage dans Camunda Modeler',
        'Pour que le dossier ne reste jamais bloqué si aucune des conditions spécifiques n\'est vérifiée',
        'Pour colorer le diagramme en vert',
        'C\'est une option décorative sans impact fonctionnel'
      ],
      correct: 1,
      explanation: 'Si un dossier client ne remplit aucune des conditions définies et qu\'il n\'y a pas de flux par défaut, le moteur ne sait pas où diriger le dossier et lève une anomalie de blocage.'
    },
    {
      id: 'q4',
      question: 'Quelle est la différence entre un Minuteur Interrompant (trait plein double) et Non-Interrompant (pointillés) sur une tâche ?',
      options: [
        'Aucune différence, c\'est juste un choix graphique',
        'Le minuteur interrompant annule la tâche principale quand le délai expire, tandis que le non-interrompant laisse la tâche active et déclenche une relance en parallèle',
        'Le minuteur interrompant supprime l\'historique du dossier',
        'Le non-interrompant ne fonctionne que sur les ordinateurs portables'
      ],
      correct: 1,
      explanation: 'Un minuteur non-interrompant (en pointillés) est idéal pour envoyer un rappel par SMS sans annuler le travail en cours de l\'opérateur.'
    },
    {
      id: 'q5',
      question: 'Comment nommer correctement un Événement de Fin (End Event) selon les bonnes pratiques ?',
      options: [
        'Terminer la commande',
        'Commande validée et expédiée (Objet + État atteint / Participe passé)',
        'Fin du traitement',
        'Sortie'
      ],
      correct: 1,
      explanation: 'Les événements représentent un état de fait atteint dans le monde réel, ils se nomment toujours au participe passé (ex: « Commande validée et expédiée »).'
    },
    {
      id: 'q6',
      question: 'Dans Camunda Operate, que représente un petit badge numéroté (Jeton / Token) positionné sur une activité ?',
      options: [
        'Le nombre de fois où le diagramme a été modifié',
        'L\'étape exacte où se trouve actuellement le dossier du client dans son cycle de vie',
        'Le numéro de version du logiciel',
        'Le coût financier de l\'étape'
      ],
      correct: 1,
      explanation: 'Le jeton (Token) matérialise l\'avancement en temps réel de l\'instance de processus. Il permet aux équipes métier de voir immédiatement où attend le dossier.'
    },
    {
      id: 'q7',
      question: 'Quelle est la règle d\'orientation visuelle fondamentale préconisée pour la lecture d\'un diagramme BPMN ?',
      options: [
        'De Droite à Gauche en spirale',
        'De Gauche à Droite pour le flux principal, avec les exceptions descendant vers le bas',
        'De Bas en Haut uniquement',
        'Peu importe tant que toutes les flèches sont connectées'
      ],
      correct: 1,
      explanation: 'L\'orientation stricte de Gauche à Droite correspond au sens naturel de lecture de la ligne temporelle et rend le schéma accessible au premier coup d\'œil.'
    },
    {
      id: 'q8',
      question: 'Dans un modèle BPMN, quelle est la fonction principale des Couloirs (Lanes) ?',
      options: [
        'Remplacer les passerelles de décision',
        'Représenter clairement les rôles, services ou équipes internes responsables de chaque activité',
        'Ajouter des animations lors de la simulation',
        'Séparer les fichiers informatiques'
      ],
      correct: 1,
      explanation: 'Les couloirs (Lanes) permettent de clarifier immédiatement « qui fait quoi » au sein de l\'organisation (ex: Conseiller Boutique, Back-Office, Système Automatique).'
    }
  ]
};
