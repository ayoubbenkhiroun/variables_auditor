# Guide Utilisateur - Camunda FlowAudit Pro

**Version :** 1.0  
**Application :** Camunda FlowAudit Pro — Audit, Gouvernance & Conformité des variables Camunda BPMN/FEEL  
**Accès :** Ouvrir `Variable_Auditor_Pro.html` dans un navigateur moderne (Chrome, Firefox, Edge).

---

## 1. Authentification

| Champ | Valeur par défaut |
|-------|-------------------|
| Identifiant | `pdacamunda` ou `user` |
| Mot de passe | `pdacamunda` |

La connexion est locale (côté navigateur). Après validation, le tableau de bord principal s'affiche.

---

## 2. Navigation Générale

### Structure de l'interface

- **Barre latérale gauche** : 4 groupes de modules (Variables, Sous-processus, Nommage BPMN, PMG). Chaque groupe se déplie pour révéler les onglets.
- **En-tête supérieur** : Titre de la page active, sélecteur de thème (Sombre, Deep Night, Clair, Cyberpunk), bouton "Charger démo", bouton "Réinitialiser".
- **Zone centrale** : Contenu dynamique selon l'onglet actif.
- **Pied de sidebar** : Identifiant utilisateur, déconnexion, logo PDA Camunda.

### Modules disponibles

- **Audit des Variables** : Import, configuration, résultats, dashboard, graphe relationnel, classement, historique.
- **Sous-processus** : Analyse des Call Activities, détection de boucles circulaires, cartographie.
- **Nommage BPMN** : Audit des conventions de nommage des éléments BPMN (IDs, tâches, gateways, événements, messages, signaux).
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

## 5. Module : Nommage BPMN

### 5.1 Import

Déposer un fichier `.bpmn` ou `.xml`.  
L'application liste les éléments détectés (IDs, noms de processus, tâches, gateways, événements, messages, signaux, flux).

Avant l'analyse, vous pouvez (dé)sélectionner les règles de nommage à appliquer.

### 5.2 Configuration des règles

**Règles disponibles :**

| Règle | Cible | Sévérité |
|-------|-------|----------|
| Process ID en kebab-case | ID de processus | Erreur |
| Nom de processus : Majuscule | Nom de processus | Attention |
| Variables : camelCase strict | Variable | Erreur |
| Variables : Mots réservés | Variable | Erreur |
| Variables : Collection au pluriel | Variable de collection | Attention |
| Tâches : Verbe Infinitif + Complément | Tâche | Attention |
| Sous-processus : Phrase nominale | Sous-processus | Attention |
| Gateways divergentes : Question ? | Gateway divergente | Erreur |
| Gateways AND : Pas de question | Gateway parallèle | Attention |
| Flux de transition : Réponse attendue | Flux sortant | Erreur |
| Événement Début : Objet + Part. Passé | Événement début | Attention |
| Événement Attente : Description précise | Événement attente | Attention |
| Événement Fin : État métier final | Événement fin | Attention |
| Événement Bordure : Exception | Événement bordure | Attention |
| Messages : PascalCase + Message | Message | Erreur |
| Signaux : PascalCase + Signal | Signal | Erreur |

**Personnalisation :**
- Ajouter / Modifier / Supprimer des règles
- Créer des règles basées sur des expressions régulières
- Restaurer les valeurs par défaut

### 5.3 Résultats

**KPIs :** Total éléments audités, Conformité globale (%), Erreurs critiques, Avertissements.  
**Graphiques :** Répartition des conformités (donut), Violations par type d'élément (barres).  
**Tableau :** Type, ID technique, Libellé actuel, Statut, Conventions non respectées, Suggestion corrective.

Le champ de suggestion est éditable pour ajuster la correction proposée.

**Export :**
- **Télécharger le BPMN corrigé** : Génère un fichier `.bpmn` avec toutes les corrections de nommage appliquées.
- **Export CSV / Excel** du rapport d'audit.

---

## 6. Module PMG (Process Matrix Governance)

### 6.1 Import BPMN (PMG)

Déposer un fichier `.bpmn` ou `.xml`.  
L'application extrait : User Tasks, Service Tasks, Manual Tasks, Script Tasks, Call Activities, etc.  
Un résumé des éléments détectés s'affiche avant l'analyse.

### 6.2 Génération de la matrice

Cliquez sur **Générer la Matrice PMG**.  
Les onglets "Étude & Gouvernance" et "Matrice PMG" deviennent accessibles.

### 6.3 Informations techniques du processus

Dans la page **Matrice PMG**, renseignez :
- Nom du processus
- ID Technique
- Version
- Propriétaire Métier
- Modélisateur
- Exécutable (oui/non)
- Description / Objectif

Toutes ces informations sont persistées en **LocalStorage** et sauvegardées automatiquement.

### 6.4 Matrice de gouvernance

Tableau complet listant chaque activité avec :
- Type de composant (User Task, Service Task, Call Activity...)
- Entité réalisatrice (Pool/Lane)
- Inputs (Entrées) et Outputs (Sorties) extraits du BPMN
- Champ "Applicable dans quel cas ?" (éditable)
- Commentaire (éditable)

**Filtres :** Recherche, type de composant, entité réalisatrice.  
**Exports :** CSV, Excel, Impression/PDF.

### 6.5 Étude & Gouvernance (Dashboard PMG)

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

## 7. Personnalisation

### Thèmes visuels

| Thème | Usage |
|-------|-------|
| Sombre (défaut) | Interface moderne pour usage quotidien |
| Deep Night | Contraste profond pour longues sessions |
| Clair | Pour usage en plein jour |
| Cyberpunk | Look néon rétro-futuriste |

Le thème sélectionné est persisté en LocalStorage.

---

## 8. Données & Vie privée

- **Aucune donnée n'est envoyée à un serveur externe.**
- **IndexedDB** : Stockage local des historiques d'audit dans le navigateur.
- **LocalStorage** : Persistance du thème, des règles BPMN, des données PMG.
- Export/import possible des historiques au format JSON.

---

## 9. Raccourcis & Astuces

- **Charger démo** : Charge 10 variables simulées pour tester l'outil sans fichier.
- **Copie rapide** : Cliquez sur "Copier" dans la colonne Actions des résultats.
- **Appliquer toutes les suggestions** : Copie toutes les corrections en une fois.
- **Plein écran** : Les graphes (Relations, Cartographie) disposent d'un bouton plein écran.
- **Édition inline** : Les suggestions de correction sont éditables directement dans le tableau.
- **Gouvernance inline** : Les niveaux de sensibilité et équipes se changent directement dans les résultats.
- **Sauvegarde automatique** : Les modifications dans la matrice PMG sont persistées instantanément.

---

## 10. Formats de fichiers supportés

| Extension | Type | Module |
|-----------|------|--------|
| `.xlsx` / `.xls` | Excel | Variables, Sous-processus |
| `.csv` | CSV | Variables, Sous-processus |
| `.bpmn` / `.xml` | BPMN/XML | Variables, Sous-processus, Nommage BPMN, PMG |

---

## 11. Export disponibles

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

---

*Document généré par opencode — Juin 2026*
