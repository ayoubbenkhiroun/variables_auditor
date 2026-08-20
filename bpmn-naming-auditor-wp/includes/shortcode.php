<?php
// Si ce fichier est appelé directement, on arrête tout.
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enregistre le shortcode [bpmn_naming_auditor]
 */
function bpmn_auditor_register_shortcodes() {
    add_shortcode('bpmn_naming_auditor', 'bpmn_auditor_shortcode_handler');
}
add_action('init', 'bpmn_auditor_register_shortcodes');

/**
 * Gère le rendu du shortcode
 */
function bpmn_auditor_shortcode_handler($atts) {
    // 1. Déterminer si l'utilisateur est autorisé
    $access_type = get_option('bpmn_auditor_access_type', 'public');
    $authorized = false;
    $error_msg = '';

    if ($access_type === 'public') {
        $authorized = true;
    } elseif ($access_type === 'logged_in') {
        if (is_user_logged_in()) {
            $authorized = true;
        }
    } elseif ($access_type === 'roles') {
        if (is_user_logged_in()) {
            $user = wp_get_current_user();
            $allowed_roles = get_option('bpmn_auditor_allowed_roles', array());
            foreach ($allowed_roles as $role) {
                if (in_array($role, (array) $user->roles)) {
                    $authorized = true;
                    break;
                }
            }
            if (!$authorized) {
                $error_msg = "Votre compte ne possède pas le rôle requis pour accéder à cet outil.";
            }
        }
    } elseif ($access_type === 'passcode') {
        $cookie_name = 'bpmn_auditor_passcode_token';
        $configured_passcode = get_option('bpmn_auditor_passcode', '');

        // Gérer la soumission du passcode
        if (isset($_POST['bpmn_submit_passcode'])) {
            $input_passcode = isset($_POST['bpmn_passcode_input']) ? sanitize_text_field($_POST['bpmn_passcode_input']) : '';
            if ($input_passcode === $configured_passcode) {
                // Poser le cookie (valide pour la session courante du navigateur)
                setcookie($cookie_name, md5($configured_passcode), 0, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE[$cookie_name] = md5($configured_passcode); // Mettre à jour immédiatement pour la page en cours
                $authorized = true;
            } else {
                $error_msg = "Code d'accès incorrect. Veuillez réessayer.";
            }
        } else {
            // Vérifier le cookie existant
            if (isset($_COOKIE[$cookie_name]) && $_COOKIE[$cookie_name] === md5($configured_passcode)) {
                $authorized = true;
            }
        }
    }

    // Activer l'envoi de buffers pour capturer le HTML propre
    ob_start();

    // 2. Si non autorisé, afficher l'interface d'authentification appropriée
    if (!$authorized) {
        bpmn_auditor_render_auth_form($access_type, $error_msg);
        return ob_get_clean();
    }

    // Enclenche le chargement des scripts et styles enregistrés
    wp_enqueue_style('bpmn-auditor-frontend');
    wp_enqueue_script('xlsx');
    wp_enqueue_script('chartjs');
    wp_enqueue_script('bpmn-auditor-frontend-js');

    // 3. Si autorisé, afficher l'application BPMN Naming Auditor
    bpmn_auditor_render_app_interface();

    return ob_get_clean();
}

/**
 * Rendu de l'écran d'authentification ou d'erreur
 */
function bpmn_auditor_render_auth_form($access_type, $error_msg) {
    // Inclure des styles basiques de secours pour le formulaire de connexion
    ?>
    <style>
        .bpmn-auth-container {
            max-width: 480px;
            margin: 40px auto;
            padding: 30px;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            text-align: center;
            font-family: 'Outfit', 'Inter', sans-serif;
            color: #0f172a;
        }
        .bpmn-auth-icon {
            font-size: 40px;
            color: #ff7520;
            margin-bottom: 20px;
        }
        .bpmn-auth-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #0f172a;
        }
        .bpmn-auth-desc {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .bpmn-tool-desc-box {
            text-align: left;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .bpmn-tool-desc-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        .bpmn-tool-desc-text {
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
            margin: 0;
        }
        .bpmn-auth-input {
            width: 100%;
            padding: 12px 16px;
            background: #f8fafc;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 8px;
            color: #0f172a;
            font-size: 16px;
            margin-bottom: 16px;
            box-sizing: border-box;
            transition: border-color 0.2s;
        }
        .bpmn-auth-input:focus {
            border-color: #ff7520;
            outline: none;
            background: #ffffff;
        }
        .bpmn-auth-button {
            width: 100%;
            padding: 12px 24px;
            background: #ff7520;
            border: none;
            border-radius: 8px;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            font-size: 15px;
            transition: background 0.2s ease;
        }
        .bpmn-auth-button:hover {
            background: #ff5a00;
        }
        .bpmn-auth-error {
            background: rgba(244, 63, 94, 0.08);
            border: 1px solid rgba(244, 63, 94, 0.2);
            color: #e11d48;
            padding: 10px;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 16px;
            text-align: left;
        }
        .bpmn-wp-login-btn {
            display: inline-block;
            width: 100%;
            box-sizing: border-box;
            padding: 12px 24px;
            background: #ff7520;
            color: #fff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s ease;
        }
        .bpmn-wp-login-btn:hover {
            background: #ff5a00;
            color: #fff;
        }
    </style>

    <div class="bpmn-auth-container">
        <div class="bpmn-auth-icon">🔒</div>
        
        <div class="bpmn-tool-desc-box">
            <div class="bpmn-tool-desc-title">À propos de cet outil</div>
            <p class="bpmn-tool-desc-text">
                BPMN Naming Auditor est un outil de gouvernance technique permettant d'analyser vos fichiers de processus BPMN (.bpmn ou .xml). Il audite instantanément les conventions de nommage de vos tâches, passerelles, événements, variables et structures de processus selon les directives Camunda 8 (Zeebe & FEEL), suggère des corrections intelligentes, et génère le fichier corrigé prêt au téléchargement.
            </p>
        </div>

        <?php if ($access_type === 'logged_in' || $access_type === 'roles') : ?>
            <h3 class="bpmn-auth-title">Accès réservé</h3>
            <p class="bpmn-auth-desc">
                Veuillez vous connecter à votre espace membre WordPress pour accéder à l'outil d'audit BPMN.
            </p>
            <?php if ($error_msg) : ?>
                <div class="bpmn-auth-error"><?php echo esc_html($error_msg); ?></div>
            <?php endif; ?>
            
            <a href="<?php echo esc_url(wp_login_url(get_permalink())); ?>" class="bpmn-wp-login-btn">
                Se connecter avec WordPress
            </a>

        <?php elseif ($access_type === 'passcode') : ?>
            <h3 class="bpmn-auth-title">Outil protégé</h3>
            <p class="bpmn-auth-desc">
                Saisissez le code d'accès défini par l'administrateur pour déverrouiller le validateur BPMN.
            </p>
            
            <?php if ($error_msg) : ?>
                <div class="bpmn-auth-error"><?php echo esc_html($error_msg); ?></div>
            <?php endif; ?>

            <form method="post" action="">
                <input type="password" name="bpmn_passcode_input" placeholder="Entrez le code d'accès..." class="bpmn-auth-input" required>
                <button type="submit" name="bpmn_submit_passcode" class="bpmn-auth-button">Déverrouiller l'outil</button>
            </form>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * Affiche l'application d'audit BPMN
 */
function bpmn_auditor_render_app_interface() {
    ?>
    <div class="bpmn-naming-container theme-claire">
        <!-- En-tête de l'application -->
        <header class="bpmn-auditor-header">
            <div class="bpmn-header-left">
                <h2>Camunda FlowAudit - Nommage BPMN</h2>
                <p>Auditeur syntaxique de conformité pour fichiers de modélisation Camunda / Zeebe</p>
            </div>
            
            <!-- Sélecteur d'onglets local -->
            <div class="bpmn-tab-navigation">
                <button class="bpmn-auditor-tab active" id="tab-bpmn-naming-import" onclick="switchBpmnTab('bpmn-naming-import')">
                    📁 Importation
                </button>
                <button class="bpmn-auditor-tab" id="tab-bpmn-naming-results" onclick="switchBpmnTab('bpmn-naming-results')" style="display:none;">
                    📊 Rapport d'Audit
                </button>
            </div>
        </header>

        <!-- Overlay de Chargement (Spinner) -->
        <div class="loader-overlay" id="bpmnLoaderOverlay" style="display:none;">
            <div class="loader-card">
                <div class="spinner"></div>
                <div class="loader-title" id="bpmnLoaderTitle">Analyse en cours...</div>
                <div class="loader-sub" id="bpmnLoaderSub">Audit syntaxique des identifiants et des libellés BPMN</div>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" id="bpmnProgressBar"></div>
                </div>
            </div>
        </div>

        <!-- ONGLET 1 : IMPORTATION -->
        <div class="bpmn-auditor-panel" id="panel-bpmn-naming-import">
            <div class="upload-zone" id="dropZoneBpmnNaming">
                <input type="file" id="fileInputBpmnNaming" accept=".bpmn,.xml">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div class="upload-title" id="uploadTitleBpmnNaming">Déposer un fichier BPMN</div>
                <div class="upload-sub" id="uploadSubBpmnNaming">Formats acceptés : .bpmn, .xml — glissez ou cliquez</div>
            </div>

            <!-- Résumé des éléments identifiés -->
            <div class="mapping-section" id="bpmnNamingSummarySection" style="display:none;">
                <div class="mapping-title">Éléments BPMN détectés</div>
                <div id="bpmnNamingElementSummary" class="bpmn-stats-summary-grid">
                    <!-- Rempli dynamiquement -->
                </div>
            </div>

            <div class="two-col" style="margin-top:20px;">
                <!-- Grille des règles à cocher/décocher -->
                <div>
                    <div class="conf-title" style="font-size:14px; font-weight:600; margin-bottom:12px; color:var(--text-primary)">
                        Règles de nommage à appliquer
                    </div>
                    <div id="bpmnNamingImportRulesGrid" class="bpmn-rules-selector-grid">
                        <!-- Rempli dynamiquement -->
                    </div>
                    <div class="tip" style="margin-top:8px;">Vous pouvez décocher les règles à exclure pour cette analyse locale.</div>
                </div>
                
                <!-- Aperçu technique rapide -->
                <div>
                    <div class="input-label" style="font-size:14px; font-weight:600; margin-bottom:12px;">Aperçu des éléments du fichier</div>
                    <div id="bpmnNamingPreviewBox" class="bpmn-preview-box">
                        <span style="color:var(--text-tertiary)">L'aperçu apparaîtra après le chargement du fichier...</span>
                    </div>
                </div>
            </div>
            
            <div class="btn-row" style="margin-top:25px;">
                <button class="btn-primary" id="analyzeBpmnNamingBtn" onclick="triggerBpmnNamingAudit()" disabled>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:6px;">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Lancer l'audit de nommage
                </button>
                <span style="font-size:12px;color:var(--text-tertiary); margin-left:12px;" id="bpmnNamingCountHint"></span>
            </div>
        </div>

        <!-- ONGLET 2 : RAPPORTS ET RESULTATS -->
        <div class="bpmn-auditor-panel" id="panel-bpmn-naming-results" style="display:none;">
            <!-- Cartes KPI -->
            <div class="kpi-grid">
                <div class="kpi-card info-card">
                    <div class="kpi-title">Total éléments audités</div>
                    <div class="kpi-value" id="kpi-bpmn-total">0</div>
                    <div class="kpi-status">Éléments analysés</div>
                </div>
                <div class="kpi-card ok-card">
                    <div class="kpi-title">Conformité Globale</div>
                    <div class="kpi-value" id="kpi-bpmn-score">0%</div>
                    <div class="kpi-status" id="kpi-bpmn-score-status">N/A</div>
                </div>
                <div class="kpi-card err-card">
                    <div class="kpi-title">Erreurs critiques</div>
                    <div class="kpi-value" id="kpi-bpmn-errors">0</div>
                    <div class="kpi-status">Non conformités</div>
                </div>
                <div class="kpi-card warn-card">
                    <div class="kpi-title">Avertissements</div>
                    <div class="kpi-value" id="kpi-bpmn-warnings">0</div>
                    <div class="kpi-status">Libellés perfectibles</div>
                </div>
            </div>

            <!-- Barre de progression de score -->
            <div class="score-bar" id="bpmnScoreBar">
                <!-- Rempli dynamiquement -->
            </div>

            <!-- Section Graphiques analytiques -->
            <div class="chart-grid">
                <div class="chart-card">
                    <div class="chart-title">Répartition des conformités</div>
                    <div class="chart-container">
                        <canvas id="bpmnDonutChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Violations par type d'élément</div>
                    <div class="chart-container">
                        <canvas id="bpmnBarChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Barre de filtres et recherche -->
            <div class="toolbar" id="bpmnToolbarEl">
                <!-- Rempli dynamiquement -->
            </div>

            <!-- Table des résultats d'audit -->
            <div class="tbl-wrap">
                <table class="bpmn-results-table">
                    <thead>
                        <tr>
                            <th style="width:12%; cursor:pointer;" onclick="sortBpmnResultsLocal('type')">Type <span id="sort-bpmn-type"></span></th>
                            <th style="width:15%; cursor:pointer;" onclick="sortBpmnResultsLocal('id')">ID technique <span id="sort-bpmn-id"></span></th>
                            <th style="width:20%; cursor:pointer;" onclick="sortBpmnResultsLocal('name')">Libellé actuel <span id="sort-bpmn-name"></span></th>
                            <th style="width:10%; cursor:pointer;" onclick="sortBpmnResultsLocal('status')">Statut <span id="sort-bpmn-status"></span></th>
                            <th style="width:25%">Conventions non respectées</th>
                            <th style="width:18%">Suggestion corrective</th>
                        </tr>
                    </thead>
                    <tbody id="bpmnTableBody">
                        <!-- Rempli dynamiquement -->
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="pagination-container" id="bpmnPaginationEl">
                <!-- Rempli dynamiquement -->
            </div>

            <!-- Ligne d'actions / téléchargement -->
            <div class="results-actions-row">
                <div class="actions-left">
                    <button class="btn-ghost" onclick="exportBpmnNamingToExcel()">
                        📥 Exporter le rapport (Excel)
                    </button>
                    <button class="btn-ghost" onclick="exportBpmnNamingToCSV()">
                        📄 Exporter en CSV
                    </button>
                </div>
                <button class="btn-primary" onclick="downloadCorrectedBpmnFile()">
                    💾 Télécharger le BPMN corrigé
                </button>
            </div>
        </div>
    </div>
    <?php
}
