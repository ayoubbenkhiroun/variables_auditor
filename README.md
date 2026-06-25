# Camunda FlowAudit Pro 🚀

**Camunda FlowAudit Pro** est une application web monopage (SPA) moderne et performante, développée entièrement côté client (HTML5, CSS3, JavaScript Vanilla). Elle est conçue pour aider les équipes de développement et de gouvernance à auditer, valider et standardiser les conventions de nommage des variables, les structures de sous-processus (*Call Activities*) ainsi que la cartographie et gouvernance des activités au sein des modèles BPMN et FEEL de Camunda.

---

## 🌟 Fonctionnalités Clés

### 1. Module d'Audit des Variables Camunda
*   **Import multi-format** : Chargement de fichiers Excel (`.xlsx`, `.xls`), CSV, ou fichiers de processus BPMN (`.bpmn`, `.xml`).
*   **Saisie manuelle** : Zone de saisie rapide pour auditer des listes de variables à la volée.
*   **Mappage dynamique** : Assistant permettant d'associer les colonnes de votre fichier importé (Nom de variable, Processus parent, Processus appelant).
*   **Correction automatisée** : Suggestions intelligentes de conversion au format standard `camelCase`.
*   **Gouvernance & Sécurité** : Assignation de niveaux de sensibilité (Public, Interne, Confidentiel, Critique) et d'équipes responsables (RH, Finance, Relation Client, etc.) directement sur la grille des résultats.

### 2. Module d'Analyse des Sous-processus (Call Activities)
*   **Mappage des relations** : Import des hiérarchies de processus (Relation Parent-Enfant).
*   **Détection des boucles circulaires** : Identification immédiate des appels récursifs ou boucles infinies de sous-processus qui risquent de bloquer le moteur d'exécution Camunda.
*   **Analyse d'impact** : Visualisation du nombre de parents appelants et du degré de dépendance pour chaque sous-processus.

### 3. Module PMG (Process Matrix Governance)
*   **Cartographie automatique** : Analyse des fichiers BPMN pour extraire l'intégralité des tâches (User Tasks, Service Tasks, Manual Tasks, Script Tasks, etc.) et Call Activities, en les associant automatiquement à leurs pools et lanes.
*   **Matrice interactive de gouvernance** : Saisie et persistance locale (LocalStorage) des conditions d'applicabilité et des commentaires d'implémentation directement pour chaque activité.
*   **KPIs & Diagnostic d'Aide à la Décision** :
    *   Taux de complétude documentaire du processus.
    *   Indicateur de complexité (Faible, Moyenne, Élevée, Critique) basé sur le volume d'activités et de variables.
    *   Génération d'alertes intelligentes (tâches non documentées, absence d'assignation à des Lanes, tâches de service ou sous-processus sans paramètres d'E/S, processus transverses complexes).
*   **Glossaire & Lignage des Variables** : Identification automatique des rôles des variables (entrées/payload, sorties/résultats, internes) avec la liste des tâches productrices et consommatrices, permettant de documenter le dictionnaire de données du processus.
*   **Documentation technique automatisée** : Génération instantanée d'un guide technique complet contenant les métadonnées du processus, la matrice de gouvernance, le glossaire de données et un guide d'intégration (*Onboarding Checklist*) pour les nouveaux arrivants. Exportable en Markdown ou imprimable en PDF.

### 4. Intégration BPMN Intelligente (Lecture & Écriture)
*   **Extraction automatique** : Analyse en profondeur des fichiers BPMN/XML pour y détecter toutes les variables déclarées dans les :
    *   Propriétés de tâches (`property`)
    *   Mappages d'entrées/sorties (`input`, `output`, `inputParameter`, `outputParameter`)
    *   Champs de formulaires (`formField`)
    *   Expressions de conditions de transition (`conditionExpression`)
*   **Téléchargement corrigé** : Une fois les corrections appliquées sur l'interface, vous pouvez générer et télécharger instantanément le fichier BPMN modifié (`_corrected.bpmn`) avec toutes les variables renommées, y compris au sein des expressions complexes.

### 5. Tableaux de Bord & Visualisations
*   **Indicateurs clés (KPI)** : Score global de conformité, taux de couverture de la gouvernance, longueur moyenne des variables.
*   **Graphiques dynamiques (Chart.js)** :
    *   Répartition des statuts de conformité (Conforme, Attention, Non conforme).
    *   Top 7 des erreurs de nommage les plus fréquentes.
    *   Distribution de la longueur des noms de variables.
    *   Tendance historique du score de conformité.
    *   Répartition par niveau de sensibilité et équipe propriétaire.
*   **Schémas Relationnels Interactifs (Vis.js)** :
    *   Cartographie réseau connectant les processus aux variables associées.
    *   Visualisation hiérarchique des Call Activities avec marquage rouge distinctif pour les boucles circulaires.
    *   Filtres avancés avec recherche plein texte.

### 6. Persistance & Historique local
*   **IndexedDB** : Utilisation d'une base de données locale dans le navigateur pour stocker l'historique complet des audits réalisés (sans envoi de données vers un serveur externe).
*   **Export/Import** : Possibilité de sauvegarder et télécharger l'historique complet sous format JSON.

---

## 🛠️ Structure du Projet

Voici l'organisation des principaux fichiers du projet :

*   [Variable_Auditor_Pro.html](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/Variable_Auditor_Pro.html) : La structure HTML de l'application avec l'ensemble des écrans (login, modules d'importation, configuration, résultats d'audit, dashboards, graphes relationnels, classement et historique).
*   [js/app.js](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/app.js) : Le moteur logique principal de l'application (routage des onglets, chargement des fichiers, parsing BPMN, rendu des graphiques, gestion du cycle de vie et des états, filtrage, tri, correction BPMN).
*   [js/pmg.js](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/pmg.js) : La logique du module PMG (Process Matrix Governance) : extraction des activités, mappage des lanes, détection des variables E/S, dictionnaire de données, alertes de gouvernance et génération de documentation.
*   [js/rules.js](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/rules.js) : Définition des règles d'audit syntaxiques globales (mots-clés FEEL réservés, regex de validation) et fonctions utilitaires comme la conversion en camelCase.
*   [js/bpmn_rules.js](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/bpmn_rules.js) : Définition des règles d'audit structurelles et de nommage spécifiques aux fichiers de modélisation BPMN (format des IDs, conventions de nommage des tâches et passerelles).
*   [js/db.js](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/js/db.js) : Initialisation et requêtes d'IndexedDB pour la gestion persistante de l'historique des audits.
*   [css/style.css](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/css/style.css) : Le design premium de l'application, supportant le responsive et 4 thèmes graphiques complets.
*   [test_process.bpmn](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/test_process.bpmn) : Fichier BPMN d'exemple pour tester la fonction d'importation et de correction automatique.

---

## 📋 Règles de Nommage Syntaxiques (Modifiables)

L'audit analyse chaque variable à l'aide des règles suivantes :

| Identifiant | Règle de validation | Type | Description |
| :--- | :--- | :--- | :--- |
| `camelCase` | Format camelCase obligatoire | Erreur | Première lettre en minuscule, majuscule pour chaque mot suivant (ex: `customerName`). |
| `noSpace` | Pas d'espaces | Erreur | Les espaces ne sont pas tolérés dans les noms de variables. |
| `noSpecial` | Pas de caractères spéciaux | Erreur | Seuls les lettres non accentuées, les chiffres et le caractère `_` sont autorisés. |
| `noStartDigit`| Ne commence pas par un chiffre | Erreur | Le nom doit obligatoirement débuter par une lettre. |
| `noAccent` | Pas d'accents | Erreur | Interdiction des caractères spéciaux non-ASCII. |
| `noReserved` | Mots réservés FEEL/BPMN | Erreur | Évite les conflits de syntaxe avec les mots-clés réservés par le moteur FEEL (ex: `if`, `else`, `date`, `duration`). |
| `noDash` | Pas de tiret ou point | Erreur | Les caractères `-` et `.` sont interdits. |
| `noEmpty` | Nom non vide | Erreur | Détecte les variables sans nom. |
| `maxLen` | Longueur max 255 | Erreur | Longueur de chaîne maximale autorisée (limite technique Camunda 8). |
| `noSnake` | Pas de snake_case | Avertissement | Préférer le standard camelCase à l'utilisation d'underscores (ex: `customer_name` -> `customerName`). |
| `noUnderscoreEdge` | Pas d'underscore en bordure | Avertissement | Interdiction de commencer ou finir le nom par un `_`. |
| `noDoubleUnderscore` | Pas de double underscore | Avertissement | La présence de `__` est signalée. |

---

## 🚀 Démarrage Rapide

### 1. Installation
L'application ne nécessite aucun serveur web d'application ni processus d'installation complexe (pas de Node.js requis pour l'exécution).
1.  Téléchargez ou clonez le projet sur votre machine.
2.  Double-cliquez sur le fichier [Variable_Auditor_Pro.html](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/Variable_Auditor_Pro.html) pour l'ouvrir directement dans votre navigateur web préféré (Chrome, Firefox, Edge, Safari).

### 2. Authentification
À l'ouverture, l'application présente un écran de connexion. Les identifiants d'accès locaux par défaut sont :
*   **Identifiant** : `pdacamunda`
*   **Mot de passe** : `pdacamunda`

### 3. Utilisation type
1.  **Importer vos données** : Sur l'onglet **Import**, glissez-déposez le fichier [test_process.bpmn](file:///c:/Users/ayoub.benkhiroun_ama/Documents/workspace/variables_auditor/test_process.bpmn) ou cliquez sur **Charger démo** pour charger instantanément un jeu de données simulé.
2.  **Analyser** : Cliquez sur le bouton **Analyser**. L'application exécute l'audit de manière asynchrone (un indicateur visuel de chargement s'affiche).
3.  **Consulter les résultats** : L'onglet **Résultats** affiche le tableau des variables avec les problèmes détectés. Vous pouvez éditer les suggestions de correction ou copier le résultat corrigé en un clic.
4.  **Corriger un BPMN** : Si vous avez importé un fichier BPMN, cliquez sur **Télécharger le BPMN corrigé** en bas à droite pour exporter votre fichier XML d'origine entièrement mis à jour avec les nouveaux noms conformes.
5.  **Naviguer** :
    *   Utilisez le **Tableau de bord** pour obtenir des métriques visuelles de conformité et de gouvernance.
    *   Visualisez l'onglet **Schéma Relations** pour voir les interactions physiques entre vos processus et vos variables.
    *   Consultez le **Classement** pour identifier les variables les plus utilisées et partagées du projet.
    *   Basculez de module via le sélecteur à gauche pour analyser la hiérarchie et l'impact de vos **Sous-processus** (Call Activities).
    *   Basculez sur le **Module PMG** pour importer un BPMN, générer la matrice d'activités, cartographier vos flux d'entrées/sorties, documenter le glossaire des variables, et exporter le guide de gouvernance technique du processus (Markdown/PDF/Excel).

---

## 🎨 Design & Personnalisation

L'application intègre un système de thèmes visuels haut de gamme sélectionnables depuis le menu supérieur droit :
*   **Theme Sombre** (par défaut) : Une interface moderne et douce pour travailler de nuit.
*   **Deep Night** : Un contraste ultra-profond pour les longues sessions de revue de code.
*   **Thème Clair** : Une interface épurée et lumineuse pour un usage en plein jour.
*   **Cyberpunk** : Un look néon rétro-futuriste dynamique.

---

## 📦 Bibliothèques Externes Embarquées (via CDN)
*   **SheetJS (XLSX)** : Pour la lecture des formats Excel et l'exportation des grilles.
*   **Chart.js** : Pour la génération de graphiques analytiques.
*   **Vis.js (Vis-Network)** : Pour le rendu interactif des graphes de dépendances.
