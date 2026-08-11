<?php
/**
 * Plugin Name: PMG Process Matrix Auditor Pro
 * Plugin URI: https://github.com/ayoubbenkhiroun/variables_auditor
 * Description: Extension WordPress d'audit de cartographie de processus, de matrice PMG (Process Matrix Governance) avec Wizard 5 étapes, arborescence interactive, saisie manuelle et export Excel stylisé.
 * Version: 2.4.0
 * Author: Ayoub BENKHIROUN
 * Text Domain: pmg-auditor
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class PMG_Auditor_Plugin {

    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('pmg_auditor', array($this, 'render_pmg_shortcode'));
        add_shortcode('pmg_matrix_auditor', array($this, 'render_pmg_shortcode'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
    }

    public function enqueue_assets() {
        $plugin_url = plugin_dir_url(__FILE__);
        
        // Enqueue XLSX library
        wp_enqueue_script('xlsx-lib', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', array(), '0.18.5', true);
        
        // Enqueue PMG Stylesheet & JavaScript
        wp_enqueue_style('pmg-auditor-style', $plugin_url . 'assets/css/pmg-style.css', array(), '2.4.0');
        wp_enqueue_script('pmg-auditor-js', $plugin_url . 'assets/js/pmg-plugin.js', array('jquery', 'xlsx-lib'), '2.4.0', true);
    }

    public function add_admin_menu() {
        add_options_page(
            'Matrice PMG - Réglages',
            'Matrice PMG',
            'manage_options',
            'pmg-auditor',
            array($this, 'render_admin_page')
        );
    }

    public function render_admin_page() {
        ?>
        <div class="wrap">
            <h1>⚙️ Extension PMG Process Matrix Auditor Pro</h1>
            <p>Utilisez le shortcode ci-dessous pour intégrer l'auditeur de Matrice PMG sur n'importe quelle page ou article de votre site WordPress :</p>
            <div style="background: #fff; padding: 15px; border-left: 4px solid #2271b1; font-family: monospace; font-size: 14px;">
                [pmg_auditor]
            </div>
            <hr style="margin: 20px 0;">
            <h3>Aperçu direct de l'outil dans l'administration :</h3>
            <?php echo $this->render_pmg_shortcode(); ?>
        </div>
        <?php
    }

    public function render_pmg_shortcode($atts = array()) {
        ob_start();
        ?>
        <div id="pmg-wp-app-wrapper" class="pmg-theme-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #002060; color: #fff; padding: 12px 20px; border-radius: 8px 8px 0 0;">
                <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    📊 Module PMG — Process Matrix Governance
                </h3>
                <div id="pmgAutoSaveBadge" style="font-size: 11px; color: #A9D08E; font-weight: 500;">
                    💾 Auto-sauvegarde locale active
                </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <!-- PMG Stepper Container -->
                <div class="pmg-stepper" style="position: relative; display: flex; justify-content: space-between; margin-bottom: 25px; padding: 0 10px;">
                    <div style="position: absolute; top: 15px; left: 8%; right: 8%; height: 2px; background: #e2e8f0; z-index: 1;"></div>
                    <div id="pmgStepperProgress" style="position: absolute; top: 15px; left: 8%; width: 0%; height: 2px; background: #002060; z-index: 1; transition: width 0.3s;"></div>

                    <div class="step-node active" id="step-node-1" style="z-index: 2; text-align: center;">
                        <span class="step-num" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #002060; color: #fff; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">1</span>
                        <div class="step-text" style="font-size: 11px; margin-top: 4px; font-weight: 600;">1. Métadonnées</div>
                    </div>
                    <div class="step-node disabled" id="step-node-2" style="z-index: 2; text-align: center;">
                        <span class="step-num" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #cbd5e1; color: #fff; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">2</span>
                        <div class="step-text" style="font-size: 11px; margin-top: 4px; color: #64748b;">2. Activités</div>
                    </div>
                    <div class="step-node disabled" id="step-node-3" style="z-index: 2; text-align: center;">
                        <span class="step-num" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #cbd5e1; color: #fff; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">3</span>
                        <div class="step-text" style="font-size: 11px; margin-top: 4px; color: #64748b;">3. Entités & Groupes</div>
                    </div>
                    <div class="step-node disabled" id="step-node-4" style="z-index: 2; text-align: center;">
                        <span class="step-num" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #cbd5e1; color: #fff; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">4</span>
                        <div class="step-text" style="font-size: 11px; margin-top: 4px; color: #64748b;">4. Variables (I/O)</div>
                    </div>
                    <div class="step-node disabled" id="step-node-5" style="z-index: 2; text-align: center;">
                        <span class="step-num" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #cbd5e1; color: #fff; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">5</span>
                        <div class="step-text" style="font-size: 11px; margin-top: 4px; color: #64748b;">5. Modes & Export</div>
                    </div>
                </div>

                <!-- Panels -->
                <!-- Step 1 -->
                <div class="step-panel active" id="pmg-step-panel-1">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 600;">Étape 1 : Informations Générales &amp; Métadonnées du Processus</h4>
                        <button type="button" class="button button-secondary" onclick="loadPmgDemoData()" style="border-color: #002060; color: #002060;">
                            ✨ Charger les Données de Démonstration (Exemple)
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Nom du Processus *</label>
                            <input type="text" id="pmgProcessNameStep" value="Lancement projet" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">ID Technique *</label>
                            <input type="text" id="pmgProcessIdStep" value="lancement-projet" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Propriétaire Métier</label>
                            <input type="text" id="pmgProcessOwnerStep" value="Direction Métier" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Modélisateur / Réalisateur</label>
                            <input type="text" id="pmgExporterStep" value="Équipe PMG" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Version</label>
                            <input type="text" id="pmgProcessVersionStep" value="v1.0.0" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Badges d'en-tête Excel</label>
                            <input type="text" id="pmgProjectBadgesStep" value="CDD / CPE / SGP / SP0 / DMN" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Processus Fille par défaut</label>
                            <input type="text" id="pmgDefaultProcessFilleStep" value="NA" style="width: 100%;" oninput="syncPmgStep1Metadata()">
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Description &amp; Objectif</label>
                        <input type="text" id="pmgProcessDescStep" value="Cartographie d'activités et gouvernance PMG." style="width: 100%;" oninput="syncPmgStep1Metadata()">
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button type="button" class="button" onclick="clearPmgStateLocalStorage()" style="color: #d63638;">🔄 Réinitialiser la session</button>
                        <button type="button" class="button button-primary" onclick="validatePmgStep1Metadata()">Valider et passer à l'étape 2 (Activités) →</button>
                    </div>
                </div>

                <!-- Step 2 -->
                <div class="step-panel" id="pmg-step-panel-2" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; font-size: 15px; font-weight: 600;">Étape 2 : Importer la Liste des Activités &amp; Hiérarchie Parent</h4>
                        <button type="button" class="button button-secondary" onclick="exportPmgStepTemplate(1)">📥 Modèle Activités (.csv)</button>
                    </div>

                    <div style="border: 2px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 6px; margin-bottom: 15px; background: #f8fafc;">
                        <input type="file" id="fileInputPmgStep1" accept=".xlsx,.xls,.csv" onchange="handlePmgStepFile(1, this.files[0])">
                        <p style="margin-top: 8px; font-size: 12px; color: #64748b;">Glissez ou sélectionnez un fichier Excel (.xlsx) ou CSV</p>
                    </div>

                    <div id="mappingSectionPmgStep1" style="display: none; margin-top: 15px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 15px;">
                            <div>
                                <label style="font-size: 11px; font-weight: 600;">ID Activité</label>
                                <select id="colPmgSubId" onchange="updatePmgStepPreview(1)" style="width:100%;"></select>
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 600;">Nom Activité *</label>
                                <select id="colPmgSubName" onchange="updatePmgStepPreview(1)" style="width:100%;"></select>
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 600;">Parent (Processus englobant)</label>
                                <select id="colPmgSubParent" onchange="updatePmgStepPreview(1)" style="width:100%;"></select>
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 600;">Type d'Activité</label>
                                <select id="colPmgActivityType" onchange="updatePmgStepPreview(1)" style="width:100%;"></select>
                            </div>
                        </div>

                        <div id="pmgVisualTreeContainer" style="margin-top: 15px;">
                            <h5 style="margin-bottom: 8px;">🌳 Arborescence Visuelle (Tree View)</h5>
                            <div id="pmgVisualTreeBox" style="border: 1px solid #e2e8f0; padding: 12px; max-height: 250px; overflow-y: auto; background: #fff;"></div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <button type="button" class="button" onclick="pmgStepGoBack(1)">← Retour</button>
                        <button type="button" class="button button-primary" id="btnPmgStep1Next" onclick="validatePmgStep2Activities()" disabled>Valider et passer à l'étape 3 →</button>
                    </div>
                </div>

                <!-- Step 3 -->
                <div class="step-panel" id="pmg-step-panel-3" style="display: none;">
                    <h4 style="margin: 0 0 15px 0;">Étape 3 : Définir les Entités &amp; Groupes Utilisateurs</h4>
                    <div style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 4px;">
                        <label style="margin-right: 15px;"><input type="radio" name="pmgStep2AssignMode" value="excel" checked onchange="onChangePmgStep2AssignMode()"> 📁 Import Excel/CSV</label>
                        <label><input type="radio" name="pmgStep2AssignMode" value="manual" onchange="onChangePmgStep2AssignMode()"> ✍️ Saisie Manuelle dans Tableau</label>
                    </div>

                    <div id="pmgStep2ExcelContainer">
                        <div id="dropZonePmgStep2" style="border: 2px dashed #cbd5e1; padding: 15px; text-align: center; display: none;">
                            <input type="file" id="fileInputPmgStep2" accept=".xlsx,.xls,.csv" onchange="handlePmgStepFile(2, this.files[0])">
                        </div>
                        <div class="mapping-section" id="mappingSectionPmgStep2" style="display: none; margin-top: 10px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                                <div><label style="font-size:11px;">Association ID/Nom</label><select id="colPmgStakeholderSubId" onchange="updatePmgStepPreview(2)" style="width:100%;"></select></div>
                                <div><label style="font-size:11px;">Entité / Rôle *</label><select id="colPmgStakeholderName" onchange="updatePmgStepPreview(2)" style="width:100%;"></select></div>
                                <div><label style="font-size:11px;">Groupe Utilisateurs</label><select id="colPmgStakeholderGroup" onchange="updatePmgStepPreview(2)" style="width:100%;"></select></div>
                            </div>
                        </div>
                    </div>

                    <div id="pmgStep2ManualContainer" style="display: none; margin-top: 10px;">
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0;">
                            <table style="width:100%; font-size:12px;">
                                <thead><tr style="background:#f1f5f9;"><th>Activité</th><th>Entité Réalisatrice</th><th>Groupe d'utilisateurs</th></tr></thead>
                                <tbody id="pmgStep2ManualTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <button type="button" class="button" onclick="pmgStepGoBack(2)">← Retour</button>
                        <button type="button" class="button button-primary" onclick="validatePmgStep3Entities()">Valider et passer à l'étape 4 →</button>
                    </div>
                </div>

                <!-- Step 4 -->
                <div class="step-panel" id="pmg-step-panel-4" style="display: none;">
                    <h4 style="margin: 0 0 15px 0;">Étape 4 : Définir les Variables (Inputs &amp; Outputs)</h4>
                    <div style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 4px;">
                        <label style="margin-right: 15px;"><input type="radio" name="pmgStep3AssignMode" value="excel" checked onchange="onChangePmgStep3AssignMode()"> 📁 Import Excel/CSV</label>
                        <label><input type="radio" name="pmgStep3AssignMode" value="manual" onchange="onChangePmgStep3AssignMode()"> ✍️ Saisie Manuelle (Entrées / Sorties)</label>
                    </div>

                    <div id="pmgStep3ExcelContainer">
                        <div id="mappingSectionPmgStep3" style="display: none; margin-top: 10px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                                <div><label style="font-size:11px;">ID/Nom Activité</label><select id="colPmgVarSubIdSep" onchange="updatePmgStepPreview(3)" style="width:100%;"></select></div>
                                <div><label style="font-size:11px;">Variables d'Entrées</label><select id="colPmgVarInputs" onchange="updatePmgStepPreview(3)" style="width:100%;"></select></div>
                                <div><label style="font-size:11px;">Variables de Sorties</label><select id="colPmgVarOutputs" onchange="updatePmgStepPreview(3)" style="width:100%;"></select></div>
                            </div>
                        </div>
                    </div>

                    <div id="pmgStep3ManualContainer" style="display: none; margin-top: 10px;">
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0;">
                            <table style="width:100%; font-size:12px;">
                                <thead><tr style="background:#f1f5f9;"><th>Activité</th><th>Inputs (Entrées)</th><th>Outputs (Sorties)</th></tr></thead>
                                <tbody id="pmgStep3ManualTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <button type="button" class="button" onclick="pmgStepGoBack(3)">← Retour</button>
                        <button type="button" class="button button-primary" onclick="validatePmgStep4Variables()">Valider et passer à l'étape 5 →</button>
                    </div>
                </div>

                <!-- Step 5 -->
                <div class="step-panel" id="pmg-step-panel-5" style="display: none;">
                    <h4 style="margin: 0 0 15px 0;">Étape 5 : Mode de Réalisation, Cas d'application &amp; Génération</h4>
                    <div style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 4px;">
                        <label style="margin-right: 15px;"><input type="radio" name="pmgStep4AssignMode" value="excel" checked onchange="onChangePmgStep4AssignMode()"> 📁 Import Fichier</label>
                        <label><input type="radio" name="pmgStep4AssignMode" value="manual" onchange="onChangePmgStep4AssignMode()"> ✍️ Compléter Manuellement</label>
                    </div>

                    <div id="pmgStep4ManualContainer" style="display: none; margin-top: 10px;">
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0;">
                            <table style="width:100%; font-size:12px;">
                                <thead><tr style="background:#f1f5f9;"><th>Activité</th><th>Mode de Réalisation</th><th>Cas d'application</th><th>Commentaire</th></tr></thead>
                                <tbody id="pmgStep4ManualTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 20px; flex-wrap: wrap; gap: 10px;">
                        <button type="button" class="button" onclick="pmgStepGoBack(4)">← Retour</button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="button button-secondary" style="border-color: #46b450; color: #46b450;" onclick="validatePmgStep5AndFinish(); setTimeout(exportPmgExcel, 300);">
                                📊 Exporter Rapport PMG (Excel)
                            </button>
                            <button type="button" class="button button-primary" onclick="validatePmgStep5AndFinish()">
                                Générer la Matrice PMG
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

new PMG_Auditor_Plugin();

