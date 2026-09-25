# 🌶️ Paprika AuditFlow Pro — Support de Présentation (Slides)

**Plateforme Unifiée d'Audit, de Cartographie Hiérarchique Multi-BPMN & de Gouvernance des Processus Camunda 7 & 8 (Zeebe)**  
*Bouygues Telecom — Direction des Systèmes d'Information & PDA Camunda*

---

## 📑 Sommaire des Diapositives

1. **Slide 1 : Titre & Introduction**
2. **Slide 2 : Contexte & Problématique Métier / Technique**
3. **Slide 3 : Vision & Architecture Zero-Backend**
4. **Slide 4 : Vue d'ensemble des 6 Modules Clés**
5. **Slide 5 : Focus Module 1 — Audit des Variables & Moteur Multi-BPMN**
6. **Slide 6 : Focus Module 2 — Sous-processus & Cartographie Hiérarchique**
7. **Slide 7 : Focus Module 3 — Audit des Conventions de Nommage BPMN**
8. **Slide 8 : Focus Module 4 — Matrice PMG & Documentation Automatisée**
9. **Slide 9 : Focus Modules 5 & 6 — Diff Engine & Simulateur de ROI**
10. **Slide 10 : Expérience Utilisateur & Fonctionnalités Pro**
11. **Slide 11 : Bénéfices Clés & Retour sur Investissement**
12. **Slide 12 : Démonstration Live & Session Q&R**

---

---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #090d16
color: #f8fafc
---

# 🌶️ Paprika AuditFlow Pro
### Suite Complète d'Audit, de Cartographie & de Gouvernance Camunda 7 & 8 (Zeebe)

**Bouygues Telecom** — Direction des Systèmes d'Information  
*100% Client-Side | Zéro-Backend | Sécurité & Confidentialité Totales*

---

## 🎯 1. Contexte & Enjeux

### Les défis de l'orchestration de processus à l'échelle :
- **Prolifération des variables :** Risques de variables orphelines, de typage incohérent ou de variables fantômes (*Ghost variables*).
- **Dépendances complexes :** Arborescences de `Call Activities` imbriquées difficiles à tracer et risques de boucles infinies.
- **Déficit de standardisation :** Incohérences de nommage des tâches, des gateways et des identifiants techniques.
- **Dette documentaire :** Effort manuel lourd pour maintenir à jour les matrices de gouvernance et les dossiers techniques.

---

## 🛡️ 2. Vision & Architecture : 100% Client-Side

### Une sécurité sans compromis et une performance instantanée
- **Zéro transfert réseau :** Le parsing XML, l'exécution des règles, la génération de graphes et d'exports s'opèrent à 100% dans le navigateur de l'utilisateur.
- **Confidentialité absolue :** Vos diagrammes métier ne transitent par aucun serveur externe.
- **Support Camunda unifié :**
  - **Camunda 7 :** Attributs `camunda:inputOutput`, `camunda:in/out`, expressions JUEL `${maVar}`.
  - **Camunda 8 (Zeebe) :** Extensions `zeebe:ioMapping`, `zeebe:calledElement`, expressions FEEL `= maVar`.
- **Persistance locale & PWA :** Sauvegarde automatique dans IndexedDB et fonctionnement hors-ligne.

---

## 🧭 3. Les 6 Modules de la Suite Paprika

1. **Audit des Variables & Multi-BPMN :** Traçabilité du cycle de vie des variables (Read/Write/Ghost/In-Out) sur 1 à $n$ fichiers.
2. **Analyse des Sous-processus :** Détection algorithmique des boucles circulaires et cartographie des dépendances.
3. **Audit de Nommage BPMN :** Contrôle des conventions d'ingénierie logicielle (verbe + complément, gateways interrogatives).
4. **Gouvernance PMG :** Matrice d'activités, glossaire de données et documentation technique automatisée.
5. **Simulateur de ROI :** Modélisation des gains de temps et de rentabilité financière (€/h, ETP).
6. **Comparateur de Versions (Diff) :** Analyse différentielle visuelle entre deux versions d'un BPMN.

---

## 🔍 4. Module 1 : Variables & Moteur Multi-BPMN

### Maîtrise intégrale des flux de données :
- **File Batch Queue Manager :** Importation simultanée d'un lot complet de fichiers BPMN racines et sous-processus.
- **Qualification fine du cycle de vie (Data Lineage) :**
  - 🟢 **Producteur (Write)** : Initialisation dans tâche, formField ou output.
  - 🔵 **Consommateur (Read)** : Lecture dans conditions FEEL/JUEL ou input.
  - 🟣 **Flux In/Out** : Transmission inter-processus via `callActivity`.
  - 👻 **Variable Fantôme (Ghost)** : Écrite mais jamais exploitée en aval.
  - ⚠️ **Variable Orpheline** : Lue sans déclaration préalable.
- **Auto-Fix 1-Clic :** Standardisation automatique en `camelCase` et export d'une archive `.zip` coordonnée.

---

## 🌳 5. Module 2 : Cartographie des Dépendances

### Clarté topologique et prévention des régressions :
- **Détection des boucles circulaires :** Algorithme de parcours en profondeur (DFS) pour interdire tout appel récursif infini.
- **Alerte de sous-processus manquants :** Détection automatique des `calledElement` requis mais absents du lot importé.
- **3 Vues commutables :**
  - 🌳 **Vue Arborescence (Tree)** : Hiérarchie logique parent/enfants.
  - 🕸️ **Vue Réseau (DAG Vis.js)** : Graphe topologique orienté et interactif.
  - 📋 **Vue Matrice CallActivity** : Tableau détaillé des flux d'E/S (I/O).

---

## ✍️ 6. Module 3 : Standards de Nommage BPMN

### Homogénéité et lisibilité pour le métier & la technique :
- **Tâches (User / Service / Script / Manual) :**  
  👉 Standard impératif : **Verbe à l'infinitif + Complément d'objet direct** (*ex: « Valider la commande client »*).
- **Passerelles conditionnelles (Exclusive / Inclusive Gateways) :**  
  👉 Standard interrogatif : **Question avec point d'interrogation** (*ex: « Client éligible fibre ? »*).
- **Événements (Start / Intermediate / End) :**  
  👉 Objet + participe passé ou état final (*ex: « Paiement confirmé »*, *« Erreur stock »*).
- **Auto-Correction & Export BPMN :** Application directe des suggestions dans le diagramme source.

---

## 📊 7. Module 4 : Matrice PMG & Documentation

### De la modélisation à la documentation technique en 1 clic :
- **Process Matrix Governance (PMG) :** Cartographie exhaustive des activités, des couloirs (Lanes/Pools) et des flux de données.
- **Glossaire & Lignage des Données :** Dictionnaire centralisé des variables avec rattachement aux tâches productrices et consommatrices.
- **Générateur de Dossier Technique :**
  - Export instantané au format **Markdown** (`.md`) pour vos wikis et dépôts Git.
  - Export et impression **PDF** pour l'onboarding et les revues d'architecture.

---

## 💡 8. Modules 5 & 6 : ROI & Comparateur Diff

### Démontrer la valeur & sécuriser les montées de version :
- **Simulateur de ROI & Rentabilité :**
  - Paramétrage du volume d'instances et des coûts horaires (€/h).
  - Calcul en temps réel des gains financiers nets, des heures économisées et du retour sur investissement (*Payback*).
  - Production de notes de cadrage pour les comités de direction.
- **Visual Diff Engine (Version A vs B) :**
  - Détection automatique des éléments **Ajoutés** 🟢, **Supprimés** 🔴 et **Modifiés** 🟡.

---

## ✨ 9. Expérience Utilisateur & Fonctionnalités Pro

- ⚡ **Palette de Commandes (`Ctrl + K`) :** Recherche globale instantanée et navigation éclair.
- 🔍 **Inspecteur Slide-Over Drawer :** Timeline chronologique du cycle de vie de chaque variable avec extraits XML en surbrillance.
- 📂 **Multi-Formats d'Export :**
  - Rapports Excel enrichis (5 feuilles de synthèse), CSV, JSON, Markdown, PDF, BPMN corrigés & Packages ZIP.
- 🎨 **Design & Confort :** Thèmes soignés clair et sombre, ergonomie réactive.

---

## 🚀 10. Bénéfices & Impact Mesuré

| Axe d'amélioration | Avant Paprika | Avec Paprika AuditFlow Pro |
| :--- | :--- | :--- |
| **Audit d'un lot BPMN** | 2 à 4 heures manuelles | **< 3 secondes** (Automatique) |
| **Bugs de variables en Prod** | Détection tardive à l'exécution | **0 incident** (Contrôle préventif) |
| **Documentation technique** | Rédaction manuelle fastidieuse | **1 clic** (Markdown / PDF) |
| **Refactoring & Renommage** | Risque élevé d'oubli | **Auto-Fix coordonné en lot (ZIP)** |

---

## 🎬 11. Démonstration & Conclusion

### 🌶️ Paprika AuditFlow Pro est immédiatement disponible :
- **Accès :** Ouvrir `index.html` dans Chrome / Edge / Firefox
- **Comptes Démo :** `paprika` / `paprika` (ou `admin` / `admin`)
- **Mode Démo :** Bouton « Charger démo » pour tester immédiatement sans fichier

---

# ❓ Questions & Réponses

*Merci pour votre écoute ! Lancement de la démonstration live.*
