=== PMG Process Matrix Auditor Pro ===
Contributors: ayoubbenkhiroun
Donate link: https://github.com/ayoubbenkhiroun/variables_auditor
Tags: pmg, bpmn, process-matrix, governance, workflow, auditor, excel-export
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 2.4.0
License: GPLv2 or later

Extension WordPress d'audit de cartographie de processus, de matrice PMG (Process Matrix Governance) avec Stepper 5 étapes, arborescence interactive, saisie manuelle et export Excel stylisé.

== Description ==

PMG Process Matrix Auditor Pro transforme votre site WordPress en une plateforme professionnelle de cartographie et de gouvernance des processus.

### 🌟 Fonctionnalités clés :
- **Persistence des données (Auto-Save)** : Sauvegarde automatique continue en LocalStorage pour ne JAMAIS perdre vos données lors du rafraîchissement de la page ou d'une fermeture accidentelle du navigateur.
- **Wizard 5 Étapes Séquentielles** :
  1. Informations & Métadonnées Générales du Processus.
  2. Importer / Structurer la Liste des Activités & Hiérarchie Parent (Arborescence N0 à N8+).
  3. Définir les Entités & Groupes Utilisateurs (Import Excel/CSV ou Saisie manuelle).
  4. Définir les Variables Entrées / Sorties (Inputs & Outputs).
  5. Saisir les Modes de réalisation (`SP0`, `Call Activity`, `Manuelle`, `Automatique`), Cas d'application et Commentaires.
- **Arborescence Visuelle Interactive (Tree View)** : Icônes adaptatives, recherche en temps réel et badges de niveau.
- **Jeu de données Démo instantané** : Bouton `✨ Charger les Données de Démonstration` pour alimenter instantanément le Wizard.
- **Exportation Excel (.xls) Clean & Stylisée** : Respect strict du modèle 13 colonnes avec en-tête bleu marine `#002060`, bannières KPI et fusion verticale `rowspan` pour les briques primaires.

== Installation ==

1. Compressez le dossier `wordpress_pmg_plugin` sous forme de fichier `.zip` (`pmg-auditor.zip`).
2. Rendez-vous dans votre administration WordPress -> **Extensions** -> **Ajouter**.
3. Cliquez sur **Téléverser une extension**, sélectionnez `pmg-auditor.zip` et cliquez sur **Installer maintenant**.
4. Activez l'extension.
5. Insérez le shortcode `[pmg_auditor]` dans n'importe quel article, page ou widget Elementor / Gutenberg.

== Shortcodes disponibles ==

- `[pmg_auditor]` : Affiche l'auditeur complet de Matrice PMG avec le Wizard 5 étapes et l'exportateur Excel.
- `[pmg_matrix_auditor]` : Shortcode alternatif.

== Changelog ==

= 2.4.0 =
- Version initiale autonome prête pour déploiement WordPress.
- Intégration du système de persistence localStorage anti-perte de données.
- Support complet de l'export Excel 13 colonnes et du Wizard multi-niveaux.
