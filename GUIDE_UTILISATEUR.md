# Guide Utilisateur - Paprika AuditFlow Pro

**Version :** 2.0 Pro  
**Application :** Paprika AuditFlow Pro — Audit, Gouvernance, Suivi & Documentation BPMN / Camunda  
**Accès :** Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).

---

## 1. Authentification

| Champ | Valeur d'accès |
|-------|-------------------|
| Identifiant | `paprika`, `admin` ou `pdacamunda` |
| Mot de passe | `paprika`, `admin` ou `pdacamunda` |

La connexion est locale et sécurisée (côté navigateur). Après validation, l'espace d'audit principal s'affiche.

---

## 2. Navigation Générale

### Structure de l'interface

- **Barre latérale gauche** : Navigation hiérarchique avec modules repliables (Variables, Sous-processus, Nommage BPMN, PMG, ROI).
- **En-tête supérieur** : Titre de la page active, actions rapides ("Charger démo", "Réinitialiser"), logo officiel Paprika AuditFlow Pro.
- **Zone centrale** : Espace d'audit, de cartographie et de documentation complet.
- **Pied de sidebar** : Profil utilisateur connecté, déconnexion, logo Paprika.

### Modules disponibles

- **Audit des Variables** : Import, configuration, résultats, dashboard, graphe relationnel, classement, historique.
- **Sous-processus** : Analyse des Call Activities, détection de boucles circulaires, cartographie.
- **Audit & Santé BPMN** : Module unifié d'analyse statique et conformité (contrôles structurels, conventions de nommage, dépendances inter-processus, score de readiness, visualiseur graphique interactif et génération de BPMN corrigé).
- **Module PMG** (Process Matrix Governance) : Cartographie des activités, matrice de gouvernance, glossaire des variables, documentation technique automatisée.

---

## 3. Module : Audit des Variables

### 3.1 Import des données

**Formats supportés :** `.xlsx`, `.xls`, `.csv`, `.bpmn`, `.xml`

**Méthodes d'import :**

1. **Glisser-déposer** un fichier dans la zone de dépôt.
2. **Cliquer** sur la zone pour ouvrir le sélecteur de fichier.
3. **Saisie manuelle** : Saisir une variable par ligne dans le champ de texte.
4. **Charger démo** : Bouton dans l'en-tête pour charger 10 variables simulées.

Après l'import d'un fichier Excel/CSV :
- La section de **mappage** apparaît pour associer les colonnes (Variable, Processus Parent, Processus Appelant).
- Un **aperçu** des données détectées s'affiche en temps réel.

### 3.2 Configuration des règles

L'onglet **Configuration** permet d'activer/désactiver chaque règle d'audit :

| Règle | Type | Description |
|-------|------|-------------|
| camelCase obligatoire | Erreur | Première lettre minuscule, majuscule pour chaque mot suivant |
| Pas d'espaces | Erreur | Les espaces ne sont pas tolérés |
| Pas de caractères spéciaux | Erreur | Seuls lettres, chiffres et `_` autorisés |
| Ne commence pas par un chiffre | Erreur | Le nom doit débuter par une lettre |
| Pas d'accents | Erreur | Caractères non-ASCII interdits |
| Mots réservés FEEL/BPMN | Erreur | Évite les conflits avec le moteur FEEL |
| Longueur max 255 | Erreur | Limite technique Camunda 8 |
| Pas de snake_case | Avertissement | Préférer camelCase |
| Pas d'underscore en bordure | Avertissement | Pas de `_` en début ou fin |
| Pas de double underscore | Avertissement | `__` interdit |
| Pas de tiret ou point | Erreur | Caractères `-` et `.` interdits |
| Nom non vide | Erreur | Variable sans nom |

**Options complémentaires :**
- **Mots réservés personnalisés** : Ajouter vos propres mots-clés exclus.
- **Niveaux de sensibilité** : Définir les niveaux (ex: Public, Interne, Confidentiel, Critique).
- **Équipes propriétaires** : Définir les tags métier (ex: RH, Finance, Technique).

### 3.3 Analyse

Cliquez sur **Analyser** pour lancer l'audit.

Une barre de progression s'affiche pendant l'analyse (3 secondes).  
Les onglets Résultats, Tableau de bord, Schéma Relations et Classement deviennent accessibles.

### 3.4 Résultats

Le tableau des résultats affiche pour chaque variable :
- **Nom original** en police monospace
- **Statut** : Conforme (vert), Attention (jaune), Non conforme (rouge)
- **Problèmes** : Liste détaillée des violations
- **Suggestion** : Proposition de correction en camelCase (éditable)
- **Sécurité & Tags** : Sélecteurs de sensibilité et d'équipe propriétaire
- **Processus Parent / Appelant** : Contexte extrait du fichier
- **Actions** : Bouton Copier pour chaque suggestion

**Outils de filtrage :**
- Pills : Tous / Conformes / Non conformes / Avertissements
- Recherche plein texte
- Tri par statut, nom ou nombre de problèmes
- Pagination (10, 20, 50 ou 100 lignes par page)

**Actions globales :**
- **Appliquer toutes les suggestions** : Copie toutes les corrections dans le presse-papier
- **Exporter CSV / Excel** : Export du rapport d'audit
- **Télécharger le BPMN corrigé** (si source BPMN) : Génère un fichier `.bpmn` avec les variables renommées

### 3.5 Tableau de bord

**Filtres :** Par processus, équipe propriétaire, niveau de sensibilité.

**KPIs :**
- Score de conformité (%)
- Couverture de gouvernance (%)
- Longueur moyenne des noms

**Graphiques :**
- Répartition des statuts (donut)
- Problèmes les plus fréquents (barres horizontales)
- Distribution par longueur de nom (courbe)
- Tendance historique du score (courbe)
- Gouvernance - Sensibilité (donut)
- Gouvernance - Répartition par équipe (barres)

### 3.6 Schéma des relations (Processus → Variables)

Graphe interactif (bibliothèque Vis.js) montrant les liens entre processus et variables.

**Fonctionnalités :**
- Filtres par processus et par variable (listes à cocher avec recherche)
- Option "Afficher uniquement les variables non conformes"
- Mode plein écran
- Légende : Processus (bleu), Var. Conforme (vert), Var. Non conforme (rouge), Appelant (tiretés)

### 3.7 Classement

Classement des variables par fréquence d'utilisation.

**Statistiques :** Variables uniques, variable la plus utilisée, fréquence moyenne, part du top 1.  
**Graphique :** Top 10 des variables les plus utilisées (barres horizontales).  
**Filtres :** Recherche, statut, tri (fréquence / nom / nombre de processus), limite d'affichage.  
**Export :** Export CSV du classement.

### 3.8 Historique

Chaque analyse est automatiquement sauvegardée dans **IndexedDB** (base de données locale du navigateur).

**Actions :**
- **Ouvrir** une analyse précédente (restaure tous les résultats, suggestions et gouvernance)
- **Supprimer** une entrée
- **Effacer tout l'historique**
- **Sauvegarder l'historique complet** (fichier JSON)
- Possibilité d'importer un historique JSON ultérieurement

---

## 4. Module : Sous-processus (Call Activities)

### 4.1 Import

Mêmes méthodes que le module Variables (fichier Excel/CSV ou BPMN, saisie manuelle).  
**Format manuel :** `processus_parent;sous_processus` (une relation par ligne).

Le mappage attend les colonnes : Processus Parent, Sous-processus Appelé, ID d'Élément (optionnel).

### 4.2 Analyse d'impact

Cliquez sur **Analyser l'Impact**.

**KPIs affichés :**
- Relations totales
- Processus parents uniques
- Sous-processus uniques
- Boucles circulaires détectées

**Détection de boucles circulaires :** L'application utilise un algorithme DFS (Depth-First Search) pour identifier les dépendances cycliques.

**Tableau :**
- Sous-processus, Impact (nombre d'appels), Parents appelants, Statut/Problèmes

### 4.3 Cartographie des Call Activities

Graphe interactif (Vis.js) de l'arborescence des appels.  
**Couleurs :** Parent (bleu), Sous-processus (vert), Boucle circulaire (rouge).  
**Filtres :** Par parent, sous-processus, option "Afficher uniquement les boucles circulaires".

---

## 5. Module : Audit & Santé BPMN (Qualité, Lint & Nommage)

Ce module unifié combine l'ensemble des contrôles structurels BPMN 2.0, les conventions de nommage d'équipe, l'analyse des dépendances et les signaux de préparation au déploiement Camunda/Zeebe.

### 5.1 Importer un ou plusieurs fichiers BPMN

Ouvrir **Audit & Santé BPMN** puis déposer ou sélectionner un ou plusieurs fichiers `.bpmn` ou `.xml` (25 Mo max par fichier).  
L'application analyse le XML, identifie les processus et valide l'intégrité globale du lot.

### 5.2 Configurer les règles & conventions

L'onglet **Règles & Conventions** regroupe l'ensemble des contrôles activables et paramétrables par catégorie :
- **Structure & Intégrité (OMG BPMN 2.0)** : racine XML `bpmn:definitions`, namespaces OMG, unicité absolue des identifiants (`id`), intégrité des flux intra-pool, flux de messages inter-pools stricts, événements de début/fin conformes, flux entrants/sortants sur événements intermédiaires et de bordure (`boundaryEvent`), structure des sous-processus événementiels.
- **Dépendances & Inter-processus** : unicité des Process IDs sur l'ensemble du lot, résolution des cibles de Call Activity (`calledElement`), détection des cycles d'appels récursifs et graphe de dépendance.
- **Modélisation & Bonnes Pratiques** : détection des impasses (`dead-end`), branches sans issue terminale (`no-path-to-end`), nombre minimal de branches sur passerelles (Split ≥ 2, Join ≥ 2), interdiction de conditions et de branches par défaut sur passerelles parallèles (AND), obligation de condition sur branches non par défaut des passerelles exclusives (XOR), passerelles événementielles ciblant uniquement des événements ou Receive Tasks, séparation Join/Split (passerelles mixtes), limitation de la complexité cyclomatique et de la taille du processus (< 35 nœuds).
- **Nommage & Sémantique Métier** :
  - **Process ID** en kebab-case (`mon-processus-metier`)
  - **Nom de processus** avec majuscule initiale
  - **Tâches** formulées avec un verbe d'action à l'infinitif + complément (ex: `Traiter la commande`)
  - **Sous-processus** formulés en phrase nominale (ex: `Gestion des réclamations`)
  - **Passerelles de décision** formulées en question (`?`)
  - **Passerelles AND** sans point d'interrogation
  - **Événements** qualifiés (début en `Objet + Participe passé`, fin en état final résultant, multi-fins toutes documentées)
  - **Variables** en camelCase strict (`montantTtc`) et sans mot-clé réservé FEEL/Zeebe
  - **Messages & Signaux** en PascalCase avec suffixes explicites (`OrderReceivedMessage`, `StockAlertSignal`)
- **Déploiement Camunda / Zeebe** : processus exécutable (`isExecutable="true"`), implémentation des Service Tasks / Send Tasks (`zeebe:taskDefinition`, `topic`, `class`, `expression`), règles DMN sur Business Rule Tasks (`decisionRef`), affectation des User Tasks (`assignee`, groupes, formulaires), contenu des Script Tasks, définitions temporelles ISO 8601 des minuteurs (Timers), définitions d'erreurs (`errorCode`), d'escalades (`escalationCode`) et de signaux.
- **Gouvernance & Documentation** : documentation des noms métier, affectation des activités à des lanes, présence des métadonnées de mise en page graphique BPMNDI.

**Règles personnalisées & Import/Export :**
- Filtres rapides par catégorie pour naviguer facilement dans le catalogue de règles.
- Possibilité d'ajouter des règles d'équipe basées sur des expressions régulières (Regex).
- Export / Import de la politique de qualité au format JSON.

### 5.3 Lire le rapport, Visualiser et Télécharger les BPMN corrigés

1. **Tableau de bord & Score :**
   - Score global de conformité et de readiness (préparation à la production).
   - Verdict exécutif immédiat (Go Production, Go conditionnel avec réserves, Déploiement bloqué).
   - Matrice 2D Heatmap croisée (BPMN × Catégories de règles) pour identifier instantanément les zones à risque.

2. **Visualiseur BPMN interactif :**
   - Cliquez sur n'importe quel fichier ou constat pour afficher le diagramme BPMN avec zoom et surbrillance automatique de l'élément en anomalie.

3. **Corrections automatiques & Exports :**
   - **Nettoyer les libellés** : supprime les espaces superflus.
   - **Télécharger BPMN corrigé** : applique automatiquement les corrections recommandées (passerelles, IDs, etc.) et génère les fichiers `.bpmn` prêts à l'emploi (individuel ou ZIP complet).
   - **Exports exhaustifs** : Rapport complet disponible en HTML, Classeur Excel avec plan d'action RACI, CSV, JSON et format d'impression PDF.

### 5.4 Visualisation interactive du BPMN & Localisation des constats

En cliquant sur le nom d'un fichier (ou sur le bouton **👁️ Visualiser**) depuis le tableau d'import ou le rapport de synthèse, une visionneuse interactive BPMN 2.0 s'ouvre en plein écran :
- **Navigation et Zoom** : Déplacement à la souris, zoom avant/arrière (`+` / `-`) et ajustement automatique (`📐 Ajuster`).
- **Surlignage en direct des constats** : Les activités, passerelles ou événements en anomalie sont mis en surbrillance avec un badge d'avertissement ou d'erreur directement sur le diagramme.
- **Volet latéral des constats** : Liste toutes les anomalies du fichier. En cliquant sur une anomalie dans la liste ou dans le tableau du rapport, le canevas zoome et se centre automatiquement sur l'élément en question (`bpmnLintFocusElement`).

### 5.5 Corriger et exporter

**Nettoyer les libellés** retire les espaces superflus et **Télécharger BPMN corrigé** applique les conventions de nommage recommandées et exporte une copie ; les originaux restent inchangés.

Le rapport se configure depuis **Règles & Conventions** : choisir HTML, CSV, Excel, JSON ou impression/PDF, puis sélectionner les sections synthèse, matrice 2D, fichiers, anomalies et règles actives.

> Le score est calculé selon les règles activées. Un rapport conforme valide les bonnes pratiques avant déploiement sur les environnements cibles.

## 6. Module PMG (Process Matrix Governance)

### 7.1 Importation One-Shot BPMN (Parent & Sous-processus)

Déposez en une seule fois dans la zone de dépôt :
- Le **processus parent** (orchestrateur racine)
- L'ensemble des **sous-processus** appelés (`.bpmn`, `.xml`)

**Analyse et Pré-remplissage Automatique :**
1. **Résolution hiérarchique** : Identification automatique du processus parent et des sous-processus via les `Call Activities` (`calledElement`, `zeebe:calledElement`).
2. **Étape 1 (Métadonnées)** : Nom, ID technique, version, modélisateur, documentation et drapeau exécutable extraits automatiquement.
3. **Étape 2 (Activités & Arborescence)** : Extraction de l'ensemble des tâches (User Tasks, Service Tasks, Call Activities...) et construction immédiate du Tree View multi-niveaux.
4. **Étape 3 (Entités & Groupes)** : Extraction des Pools, Lanes et groupes utilisateurs candidats (`candidateGroups`, assignees).
5. **Étape 4 (Variables I/O)** : Extraction des flux de données Zeebe `ioMapping`, Camunda 7 `inputOutput`, `camunda:in`/`out`, formulaires et calcul du lignage de données.
6. **Étape 5 (Modes & Conditions)** : Déduction automatique des modes de réalisation (`Call Activity`, `Automatique`, `Manuelle`), conditions FEEL sur flux entrants et commentaires de documentation.

### 7.2 Génération de la Matrice (1-Clic ou Pas-à-Pas)

- **Génération Directe (1-Clic)** : Cliquez sur le bouton **⚡ Générer la Matrice PMG Directement** dans la carte de synthèse pour basculer instantanément sur le Dashboard d'Étude & Gouvernance et la Matrice.
- **Vérification Pas-à-Pas (Stepper)** : Vous pouvez naviguer librement dans les 5 étapes pré-remplies pour vérifier, ajuster ou enrichir les informations avant ou après génération.
- **✨ Démo Multi-BPMN** : Bouton d'accès rapide pour charger une suite complète de 4 processus interconnectés (Orchestration, Risque, Paiement, Expédition).

### 7.3 Informations techniques du processus

Toutes les informations extraites et ajustées sont automatiquement persistées en **LocalStorage** avec badge anti-perte de données.

### 7.4 Matrice de gouvernance

Tableau complet listant chaque activité avec :
- Type de composant (User Task, Service Task, Call Activity...)
- Entité réalisatrice (Pool/Lane)
- Inputs (Entrées) et Outputs (Sorties) extraits du BPMN
- Champ "Applicable dans quel cas ?" (éditable)
- Commentaire (éditable)

**Filtres :** Recherche, type de composant, entité réalisatrice.  
**Exports :** CSV, Excel, Impression/PDF.

### 7.5 Étude & Gouvernance (Dashboard PMG)

#### KPIs
- **Score de complétude** : Pourcentage d'activités documentées
- **Complexité globale** : Score basé sur (tâches + call activities × 2 + variables uniques)
- **Volume de données (I/O)** : Nombre de variables uniques échangées
- **Total activités** : Nombre d'éléments modélisés

#### Diagnostics & Aide à la Décision
Alertes automatiques :
- Documentation incomplète
- Tâches sans Lane (orphelines)
- Tâches de service sans I/O
- Sous-processus sans paramètres d'appel
- Opportunité d'automatisation
- Processus transverse complexe

#### Structure & Acteurs
- Répartition des composants par type
- Barres de progression par entité (Lane) montrant le taux de documentation

#### Glossaire Interactif & Lignage des Variables

Pour chaque variable extraite du BPMN :
- **Type de flux** : Entrée (Payload), Sortie (Résultat), Interne
- **Producteurs** : Tâches qui écrivent la variable
- **Consommateurs** : Tâches qui lisent la variable
- **Description** : Champ éditable pour documenter le rôle métier

Recherche plein texte sur le glossaire.

#### Guide de Cartographie & Documentation Technique

Document auto-généré contenant :
1. Métadonnées du processus
2. Indicateurs globaux & KPIs
3. Matrice de gouvernance des activités
4. Glossaire & lignage des variables de données
5. Guide de prise en main (Onboarding Checklist)

**Actions :**
- Copier le Markdown
- Télécharger le fichier `.md`
- Imprimer / Exporter en PDF

---

## 8. Personnalisation

### Thèmes visuels

| Thème | Usage |
|-------|-------|
| Sombre (défaut) | Interface moderne pour usage quotidien |
| Deep Night | Contraste profond pour longues sessions |
| Clair | Pour usage en plein jour |
| Cyberpunk | Look néon rétro-futuriste |

Le thème sélectionné est persisté en LocalStorage.

---

## 9. Données & Vie privée

- **Aucune donnée n'est envoyée à un serveur externe.**
- **IndexedDB** : Stockage local des historiques d'audit dans le navigateur.
- **LocalStorage** : Persistance du thème, des règles BPMN, des données PMG.
- Export/import possible des historiques au format JSON.

---

## 10. Raccourcis & Astuces

- **Charger démo** : Charge 10 variables simulées pour tester l'outil sans fichier.
- **Copie rapide** : Cliquez sur "Copier" dans la colonne Actions des résultats.
- **Appliquer toutes les suggestions** : Copie toutes les corrections en une fois.
- **Plein écran** : Les graphes (Relations, Cartographie) disposent d'un bouton plein écran.
- **Édition inline** : Les suggestions de correction sont éditables directement dans le tableau.
- **Gouvernance inline** : Les niveaux de sensibilité et équipes se changent directement dans les résultats.
- **Sauvegarde automatique** : Les modifications dans la matrice PMG sont persistées instantanément.

---

## 11. Formats de fichiers supportés

| Extension | Type | Module |
|-----------|------|--------|
| `.xlsx` / `.xls` | Excel | Variables, Sous-processus |
| `.csv` | CSV | Variables, Sous-processus |
| `.bpmn` / `.xml` | BPMN/XML | Variables, Sous-processus, Nommage BPMN, PMG |
| `.bpmn` / `.xml` | BPMN/XML | Audit Santé BPMN (multi-fichiers) |

---

## 12. Export disponibles

| Export | Modules concernés |
|--------|-------------------|
| CSV du rapport d'audit | Variables, Nommage BPMN |
| Excel du rapport d'audit | Variables, Nommage BPMN |
| BPMN corrigé | Variables (correction des variables), Nommage BPMN (correction des noms) |
| Classement CSV | Variables |
| Historique JSON | Variables |
| CSV Matrice PMG | PMG |
| Excel Matrice PMG | PMG |
| Impression / PDF Matrice | PMG |
| Guide technique Markdown | PMG |
| Guide technique PDF | PMG |
| Rapport de santé HTML / CSV / Excel / JSON / PDF | Audit Santé BPMN |

---

*Document généré par opencode — Juin 2026*
