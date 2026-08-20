<?php
/**
 * Frontend shortcode logic for BPMN Subprocesses Analyzer
 */

if (!defined('ABSPATH')) {
    exit;
}

add_shortcode('bpmn_subprocesses_analyzer', 'bpmn_sub_shortcode_handler');
function bpmn_sub_shortcode_handler($atts) {
    // 1. Récupérer les politiques d'accès depuis les réglages admin
    $access_type = get_option('bpmn_sub_access_type', 'passcode');
    $configured_passcode = get_option('bpmn_sub_passcode', 'pdacamunda');
    $authorized_roles = get_option('bpmn_sub_authorized_roles', array('administrator', 'editor'));

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
            foreach ($user->roles as $role) {
                if (in_array($role, $authorized_roles)) {
                    $authorized = true;
                    break;
                }
            }
            if (!$authorized) {
                $error_msg = "Votre rôle utilisateur ne vous permet pas d'accéder à cet outil.";
            }
        }
    } elseif ($access_type === 'passcode') {
        $cookie_name = 'bpmn_sub_passcode_auth_' . COOKIEHASH;
        
        // Gérer la soumission du formulaire de passcode
        if (isset($_POST['bpmn_sub_submit_passcode'])) {
            $input_passcode = isset($_POST['bpmn_sub_passcode_input']) ? sanitize_text_field($_POST['bpmn_sub_passcode_input']) : '';
            if ($input_passcode === $configured_passcode) {
                setcookie($cookie_name, md5($configured_passcode), 0, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE[$cookie_name] = md5($configured_passcode);
                $authorized = true;
            } else {
                $error_msg = "Code d'accès incorrect. Veuillez réessayer.";
            }
        } else {
            // Vérifier si le cookie existe déjà
            if (isset($_COOKIE[$cookie_name]) && $_COOKIE[$cookie_name] === md5($configured_passcode)) {
                $authorized = true;
            }
        }
    }

    ob_start();

    // Si non autorisé, afficher l'interface d'authentification en mode clair
    if (!$authorized) {
        bpmn_sub_render_auth_form($access_type, $error_msg);
        return ob_get_clean();
    }

    // Sinon, enfiler les styles et scripts
    wp_enqueue_style('bpmn-sub-frontend');
    wp_enqueue_script('xlsx');
    wp_enqueue_script('vis-network');
    wp_enqueue_script('bpmn-sub-frontend-js');

    // Rendre l'application principale
    bpmn_sub_render_app_interface();
    return ob_get_clean();
}

/**
 * Affiche le formulaire d'authentification en mode clair
 */
function bpmn_sub_render_auth_form($access_type, $error_msg) {
    ?>
    <style>
        .bpmn-sub-auth-container {
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
        .bpmn-sub-auth-icon {
            font-size: 40px;
            color: #ff7520;
            margin-bottom: 20px;
        }
        .bpmn-sub-auth-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #0f172a;
        }
        .bpmn-sub-auth-desc {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .bpmn-sub-tool-desc-box {
            text-align: left;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .bpmn-sub-tool-desc-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        .bpmn-sub-tool-desc-text {
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
            margin: 0;
        }
        .bpmn-sub-auth-input {
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
        .bpmn-sub-auth-input:focus {
            border-color: #ff7520;
            outline: none;
            background: #ffffff;
        }
        .bpmn-sub-auth-button {
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
        .bpmn-sub-auth-button:hover {
            background: #ff5a00;
        }
        .bpmn-sub-auth-error {
            background: rgba(244, 63, 94, 0.08);
            border: 1px solid rgba(244, 63, 94, 0.2);
            color: #e11d48;
            padding: 10px;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 16px;
            text-align: left;
        }
        .bpmn-sub-wp-login-btn {
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
        .bpmn-sub-wp-login-btn:hover {
            background: #ff5a00;
            color: #fff;
        }
    </style>

    <div class="bpmn-sub-auth-container">
        <div class="bpmn-sub-auth-icon">🔒</div>
        
        <div class="bpmn-sub-tool-desc-box">
            <div class="bpmn-sub-tool-desc-title">À propos de cet outil</div>
            <p class="bpmn-sub-tool-desc-text">
                BPMN Subprocesses Analyzer est une plateforme de diagnostic de relations d'appels entre modèles de processus Camunda (Call Activities). Il cartographie instantanément les dépendances parents-enfants à partir de fichiers XML, BPMN, Excel ou CSV, détecte les risques d'appels récursifs infinis (boucles circulaires), et évalue l'impact et la réutilisation de vos sous-processus.
            </p>
        </div>

        <?php if ($access_type === 'logged_in' || $access_type === 'roles') : ?>
            <h3 class="bpmn-sub-auth-title">Accès réservé</h3>
            <p class="bpmn-sub-auth-desc">
                Veuillez vous connecter à votre espace membre WordPress pour accéder à l'analyseur de sous-processus.
            </p>
            <?php if ($error_msg) : ?>
                <div class="bpmn-sub-auth-error"><?php echo esc_html($error_msg); ?></div>
            <?php endif; ?>
            
            <a href="<?php echo esc_url(wp_login_url(get_permalink())); ?>" class="bpmn-sub-wp-login-btn">
                Se connecter avec WordPress
            </a>

        <?php elseif ($access_type === 'passcode') : ?>
            <h3 class="bpmn-sub-auth-title">Outil protégé</h3>
            <p class="bpmn-sub-auth-desc">
                Saisissez le code d'accès défini par l'administrateur pour déverrouiller l'analyseur hiérarchique.
            </p>
            
            <?php if ($error_msg) : ?>
                <div class="bpmn-sub-auth-error"><?php echo esc_html($error_msg); ?></div>
            <?php endif; ?>

            <form method="post" action="">
                <input type="password" name="bpmn_sub_passcode_input" placeholder="Entrez le code d'accès..." class="bpmn-sub-auth-input" required>
                <button type="submit" name="bpmn_sub_submit_passcode" class="bpmn-sub-auth-button">Déverrouiller l'outil</button>
            </form>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * Affiche l'application d'analyse de sous-processus
 */
function bpmn_sub_render_app_interface() {
    ?>
    <div class="bpmn-sub-container theme-claire">
        <!-- En-tête de l'application -->
        <header class="bpmn-sub-header">
            <div class="bpmn-header-left">
                <h2>Camunda FlowAudit - Sous-processus</h2>
                <p>Détectez les boucles circulaires et auditez la réutilisation des Call Activities.</p>
            </div>
            <div class="bpmn-tab-navigation">
                <button class="bpmn-sub-tab active" id="btn-tab-bpmn-sub-import" onclick="window.switchSubTab('bpmn-sub-import')">📂 Importer & Saisir</button>
                <button class="bpmn-sub-tab" id="tab-bpmn-sub-analysis" style="display:none" onclick="window.switchSubTab('bpmn-sub-analysis')">📊 Impact & Diagnostic</button>
                <button class="bpmn-sub-tab" id="tab-bpmn-sub-map" style="display:none" onclick="window.switchSubTab('bpmn-sub-map')">⚯ Cartographie Réseau</button>
            </div>
        </header>

        <!-- 1. Onglet : Import & Saisie -->
        <div class="bpmn-sub-panel" id="panel-bpmn-sub-import">
            <div class="upload-zone" id="dropZoneSub">
                <input type="file" id="fileInputSub" accept=".xlsx,.xls,.csv,.bpmn,.xml">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div class="upload-title" id="uploadTitleSub">Déposer un fichier Excel, CSV ou BPMN</div>
                <div class="upload-sub" id="uploadSubSub">Relations de processus : parent et sous-processus — glissez ou cliquez</div>
            </div>

            <!-- Configuration du mappage de colonnes (caché par défaut) -->
            <div class="mapping-section" id="mappingSectionSub" style="display:none">
                <div class="mapping-title">Mappage des colonnes du fichier</div>
                <div class="mapping-grid">
                    <div class="mapping-col">
                        <label>Colonne Processus Parent *</label>
                        <select id="colSubParent" onchange="window.updateSubPreview()"></select>
                    </div>
                    <div class="mapping-col">
                        <label>Colonne Sous-processus Appelé *</label>
                        <select id="colSubChild" onchange="window.updateSubPreview()"></select>
                    </div>
                    <div class="mapping-col">
                        <label>ID d'Élément (Optionnel)</label>
                        <select id="colSubElementId" onchange="window.updateSubPreview()">
                            <option value="-1">-- Non défini --</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="two-col">
                <div>
                    <div class="input-label">Saisie manuelle (format : <code>processus_parent;sous_processus</code> par ligne)</div>
                    <textarea id="manualInputSub" style="height:120px" placeholder="processus_parent_1;sous_processus_A&#10;processus_parent_1;sous_processus_B&#10;sous_processus_A;sous_processus_B_nested"></textarea>
                    <div class="tip">Saisissez les relations hiérarchiques directement (séparateur point-virgule)</div>
                </div>
                <div>
                    <div class="input-label">Aperçu rapide des relations détectées</div>
                    <div id="previewBoxSub" style="border:1px solid var(--border-color);border-radius:var(--border-radius-md);padding:10px 12px;min-height:120px;font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);background:var(--bg-card);line-height:1.8">
                        <span style="color:var(--text-tertiary)">L'aperçu apparaîtra ici après import d'un fichier...</span>
                    </div>
                    <div class="tip" id="colHintSub"></div>
                </div>
            </div>

            <div class="btn-row" style="margin-top: 20px;">
                <button class="btn-primary" id="analyzeSubBtn" onclick="window.triggerSubprocessesAudit()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Analyser l'Impact
                </button>
                <span style="font-size:12px;color:var(--text-tertiary); margin-left:15px;" id="countHintSub"></span>
            </div>
        </div>

        <!-- 2. Onglet : Analyse d'Impact & KPI -->
        <div class="bpmn-sub-panel" id="panel-bpmn-sub-analysis" style="display:none">
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-title">Relations Totales</div>
                    <div class="kpi-value" id="kpi-sub-total">0</div>
                    <div class="kpi-status" id="kpi-sub-total-status">N/A</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Processus Parents</div>
                    <div class="kpi-value" id="kpi-sub-parents">0</div>
                    <div class="kpi-status" id="kpi-sub-parents-status">N/A</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Sous-processus uniques</div>
                    <div class="kpi-value" id="kpi-sub-children">0</div>
                    <div class="kpi-status" id="kpi-sub-children-status">N/A</div>
                </div>
                <div class="kpi-card err-card">
                    <div class="kpi-title" style="color:var(--err-dark);">Boucles Circulaires</div>
                    <div class="kpi-value" id="kpi-sub-loops" style="color:var(--err-dark);">0</div>
                    <div class="kpi-status" id="kpi-sub-loops-status">N/A</div>
                </div>
            </div>

            <!-- Filtres tableau -->
            <div class="toolbar">
                <input class="srch" placeholder="Rechercher un processus..." id="subSearchInput" oninput="window.onSubSearch()" style="max-width:260px">
                
                <select class="srt" id="subLoopFilter" onchange="window.onSubFilterChange()">
                    <option value="all">Toutes les relations</option>
                    <option value="loop">Dans une boucle circulaire</option>
                    <option value="noLoop">Sans boucle</option>
                </select>

                <select class="srt" id="subSortSel" onchange="window.onSubSortChange()">
                    <option value="impact">Trier par : Impact (Appels)</option>
                    <option value="name">Trier par : Nom de sous-processus</option>
                </select>
            </div>

            <!-- Tableau -->
            <div class="tbl-wrap">
                <table class="bpmn-sub-results-table">
                    <thead>
                        <tr>
                            <th style="width: 25%; cursor:pointer;" onclick="window.subSortBy('name')">Sous-processus</th>
                            <th style="width: 15%; cursor:pointer;" onclick="window.subSortBy('impact')">Impact (Appels)</th>
                            <th style="width: 40%">Processus Parents Appelants</th>
                            <th style="width: 20%">Statut / Problèmes</th>
                        </tr>
                    </thead>
                    <tbody id="subTableBody"></tbody>
                </table>
            </div>

            <div id="subEmptyMsg" class="empty-state" style="display:none">
                <div class="empty-icon">◎</div>
                Aucun sous-processus ne correspond aux filtres.
            </div>
        </div>

        <!-- 3. Onglet : Cartographie Réseau -->
        <div class="bpmn-sub-panel" id="panel-bpmn-sub-map" style="display:none">
            <div class="carto-fullscreen-container" id="subCartoContainer">
                <div class="carto-header">
                    <div>
                        <h3 style="font-size:15px;font-weight:600;color:var(--text-primary); margin:0;">Cartographie des Call Activities (Relations d'Appel)</h3>
                        <p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0 0">Visualisez l'arborescence des processus et sous-processus.</p>
                    </div>
                    <div style="display:flex;gap:12px;align-items:center;">
                        <button class="btn-ghost btn-fullscreen" onclick="window.toggleSubFullscreen('subCartoContainer')">
                            <svg class="fullscreen-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
                                <path class="path-enter" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                <path class="path-exit" style="display:none;" d="M3 8h3a2 2 0 0 0 2-2V3m13 3h-3a2 2 0 0 0-2 2v3m0 10v-3a2 2 0 0 1 2-2h3M8 21v-3a2 2 0 0 0-2-2H3" />
                            </svg>
                            <span class="fullscreen-text-enter">Plein écran</span>
                            <span class="fullscreen-text-exit" style="display:none;">Quitter</span>
                        </button>
                        <div style="display:flex;gap:15px;font-size:11px;align-items:center;background:var(--bg-card);padding:8px 12px;border-radius:var(--border-radius-md);border:1px solid var(--border-color);">
                            <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;background:#004f9f;border-radius:3px;display:inline-block"></span> Parent</span>
                            <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;background:#10b981;border-radius:3px;display:inline-block"></span> Sous-processus</span>
                            <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;background:#ef4444;border-radius:3px;display:inline-block"></span> Loop Circulaire</span>
                        </div>
                    </div>
                </div>

                <div class="carto-body">
                    <!-- Section Filtres Cartographie -->
                    <div class="carto-filters">
                        <div style="display:flex;flex-direction:column;gap:6px">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary)">Filtrer par Processus Parent :</label>
                            <div class="searchable-list">
                                <input type="text" class="searchable-list-input" id="searchSubParentInput" placeholder="Rechercher un parent..." onkeyup="window.filterSubCheckboxes('subParentList', this.value)">
                                <div class="searchable-list-items" id="subParentList"></div>
                            </div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:6px">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary)">Filtrer par Sous-processus :</label>
                            <div class="searchable-list">
                                <input type="text" class="searchable-list-input" id="searchSubChildInput" placeholder="Rechercher un sous-processus..." onkeyup="window.filterSubCheckboxes('subChildList', this.value)">
                                <div class="searchable-list-items" id="subChildList"></div>
                            </div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:12px;flex:1;min-width: 250px;">
                            <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;color:var(--text-primary);font-weight:500;">
                                <input type="checkbox" id="subGraphLoopsOnly" onchange="window.renderSubprocessMap()" style="width:16px;height:16px;accent-color:var(--err);cursor:pointer;">
                                Afficher uniquement les boucles circulaires
                            </label>
                            <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;color:var(--text-primary);font-weight:500;">
                                <input type="checkbox" id="subGraphCommonOnly" onchange="window.renderSubprocessMap()" style="width:16px;height:16px;accent-color:var(--brand-primary);cursor:pointer;">
                                Afficher uniquement les sous-processus partagés
                            </label>
                            <div style="display:flex;gap:8px;margin-top:auto;">
                                <button class="btn-primary" onclick="window.renderSubprocessMap()">Filtrer le réseau</button>
                                <button class="btn-ghost" onclick="window.resetSubGraphFilters()">Effacer les filtres</button>
                            </div>
                        </div>
                    </div>

                    <!-- Cartography KPIs -->
                    <div class="kpi-grid" id="subMapKpiGrid" style="grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 15px; display: none;">
                        <div class="kpi-card" style="border-left: 3px solid var(--brand-primary); padding: 12px 16px;">
                            <div class="kpi-title" style="font-size: 10px;">Parents Actifs</div>
                            <div class="kpi-value" id="kpi-sub-map-parents" style="font-size: 20px; margin: 4px 0;">0</div>
                            <div class="kpi-status" style="font-size: 10px;">Processus parent visible</div>
                        </div>
                        <div class="kpi-card" style="border-left: 3px solid var(--ok); padding: 12px 16px;">
                            <div class="kpi-title" style="font-size: 10px;">Sous-processus Actifs</div>
                            <div class="kpi-value" id="kpi-sub-map-children" style="font-size: 20px; margin: 4px 0;">0</div>
                            <div class="kpi-status" style="font-size: 10px;">Sous-processus unique visible</div>
                        </div>
                        <div class="kpi-card" style="border-left: 3px solid var(--info); padding: 12px 16px;">
                            <div class="kpi-title" style="font-size: 10px;">Taux de Réutilisation</div>
                            <div class="kpi-value" id="kpi-sub-map-reusability" style="font-size: 20px; margin: 4px 0;">0.0</div>
                            <div class="kpi-status" style="font-size: 10px;">Parents moyen par sous-processus</div>
                        </div>
                        <div class="kpi-card" style="border-left: 3px solid var(--warn); padding: 12px 16px;">
                            <div class="kpi-title" style="font-size: 10px;">Relations d'Appels</div>
                            <div class="kpi-value" id="kpi-sub-map-relations" style="font-size: 20px; margin: 4px 0;">0</div>
                            <div class="kpi-status" style="font-size: 10px;">Liaisons totales affichées</div>
                        </div>
                    </div>

                    <!-- Graph visualization + Sidebar -->
                    <div class="carto-graph-row">
                        <div class="carto-graph-wrapper">
                            <div id="subNetworkGraph"></div>
                        </div>
                        <div class="carto-sidebar">
                            <div class="sidebar-inner">
                                <h4><span>📊</span> Analyses & Diagnostics</h4>
                                <div id="subMapAnalysisContent">
                                    <p style="font-style: italic; color: var(--text-tertiary); margin:0;">Veuillez charger des données pour voir les analyses.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Spinner / Loader overlay -->
        <div class="loader-overlay" id="bpmnSubLoaderOverlay" style="display:none">
            <div class="loader-card">
                <div class="spinner"></div>
                <div class="loader-title" id="bpmnSubLoaderTitle">Chargement...</div>
                <div class="loader-sub" id="bpmnSubLoaderSub">Veuillez patienter pendant l'analyse</div>
                <div class="progress-bar-wrap">
                    <div class="progress-bar" id="bpmnSubProgressBar" style="width:0%"></div>
                </div>
            </div>
        </div>
    </div>
    <?php
}
