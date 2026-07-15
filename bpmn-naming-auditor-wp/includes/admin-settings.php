<?php
// Si ce fichier est appelé directement, on arrête tout.
if (!defined('ABSPATH')) {
    exit;
}

// Ajouter le menu d'administration
function bpmn_auditor_add_admin_menu() {
    add_menu_page(
        'BPMN Auditor Config',
        'BPMN Auditor',
        'manage_options',
        'bpmn-auditor-settings',
        'bpmn_auditor_render_settings_page',
        'dashicons-forms',
        80
    );
}
add_action('admin_menu', 'bpmn_auditor_add_admin_menu');

/**
 * Affiche la page de configuration avec onglets
 */
function bpmn_auditor_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    // Gérer l'enregistrement des formulaires
    $message = '';
    $status = 'success';

    if (isset($_POST['bpmn_save_settings_nonce']) && wp_verify_nonce($_POST['bpmn_save_settings_nonce'], 'bpmn_save_settings')) {
        if (isset($_POST['bpmn_save_access_settings'])) {
            // Sauvegarder les paramètres d'accès
            $access_type = sanitize_text_field($_POST['bpmn_access_type']);
            $passcode = sanitize_text_field($_POST['bpmn_passcode']);
            $allowed_roles = isset($_POST['bpmn_allowed_roles']) ? array_map('sanitize_text_field', $_POST['bpmn_allowed_roles']) : array();

            update_option('bpmn_auditor_access_type', $access_type);
            update_option('bpmn_auditor_passcode', $passcode);
            update_option('bpmn_auditor_allowed_roles', $allowed_roles);

            $message = 'Paramètres d\'accès mis à jour avec succès.';
        } elseif (isset($_POST['bpmn_save_rules'])) {
            // Sauvegarder les règles
            $rules = get_option('bpmn_auditor_rules', array());
            
            // Mettre à jour l'activation et les valeurs
            foreach ($rules as $key => $rule) {
                $rules[$key]['enabled'] = isset($_POST['rule_enabled_' . $rule['id']]);
                if (isset($_POST['rule_pattern_' . $rule['id']])) {
                    $rules[$key]['pattern'] = sanitize_text_field($_POST['rule_pattern_' . $rule['id']]);
                }
                if (isset($_POST['rule_err_msg_' . $rule['id']])) {
                    $rules[$key]['errorMessage'] = sanitize_text_field($_POST['rule_err_msg_' . $rule['id']]);
                }
                if (isset($_POST['rule_severity_' . $rule['id']])) {
                    $rules[$key]['severity'] = sanitize_text_field($_POST['rule_severity_' . $rule['id']]);
                }
            }

            update_option('bpmn_auditor_rules', $rules);
            $message = 'Règles de nommage BPMN mises à jour.';
        } elseif (isset($_POST['bpmn_reset_rules'])) {
            // Réinitialiser les règles
            delete_option('bpmn_auditor_rules');
            bpmn_auditor_activate(); // Réinitialise les valeurs par défaut
            $message = 'Les règles ont été réinitialisées aux valeurs par défaut.';
        } elseif (isset($_POST['bpmn_add_rule'])) {
            // Ajouter une nouvelle règle
            $rules = get_option('bpmn_auditor_rules', array());
            $new_rule_id = 'custom-' . sanitize_title($_POST['new_rule_label']) . '-' . rand(100, 999);
            
            $new_rule = array(
                'id' => $new_rule_id,
                'label' => sanitize_text_field($_POST['new_rule_label']),
                'desc' => sanitize_text_field($_POST['new_rule_desc']),
                'target' => sanitize_text_field($_POST['new_rule_target']),
                'type' => sanitize_text_field($_POST['new_rule_type']),
                'pattern' => sanitize_text_field($_POST['new_rule_pattern']),
                'severity' => sanitize_text_field($_POST['new_rule_severity']),
                'enabled' => true,
                'errorMessage' => sanitize_text_field($_POST['new_rule_error'])
            );

            $rules[] = $new_rule;
            update_option('bpmn_auditor_rules', $rules);
            $message = 'Nouvelle règle ajoutée avec succès.';
        } elseif (isset($_POST['bpmn_delete_rule_id'])) {
            // Supprimer une règle personnalisée
            $rule_id_to_delete = sanitize_text_field($_POST['bpmn_delete_rule_id']);
            $rules = get_option('bpmn_auditor_rules', array());
            $filtered_rules = array();

            foreach ($rules as $rule) {
                if ($rule['id'] !== $rule_id_to_delete) {
                    $filtered_rules[] = $rule;
                }
            }

            update_option('bpmn_auditor_rules', $filtered_rules);
            $message = 'Règle supprimée.';
        }
    }

    // Récupérer les options courantes
    $access_type = get_option('bpmn_auditor_access_type', 'public');
    $passcode = get_option('bpmn_auditor_passcode', '');
    $allowed_roles = get_option('bpmn_auditor_allowed_roles', array());
    $rules = get_option('bpmn_auditor_rules', array());

    // Déterminer l'onglet actif
    $active_tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : 'access';
    ?>
    <div class="wrap">
        <h1>Configuration de BPMN Naming Auditor</h1>

        <?php if ($message) : ?>
            <div class="notice notice-<?php echo esc_attr($status); ?> is-dismissible">
                <p><strong><?php echo esc_html($message); ?></strong></p>
            </div>
        <?php endif; ?>

        <h2 class="nav-tab-wrapper">
            <a href="?page=bpmn-auditor-settings&tab=access" class="nav-tab <?php echo $active_tab === 'access' ? 'nav-tab-active' : ''; ?>">Contrôle d'accès & Sécurité</a>
            <a href="?page=bpmn-auditor-settings&tab=rules" class="nav-tab <?php echo $active_tab === 'rules' ? 'nav-tab-active' : ''; ?>">Règles de Nommage</a>
        </h2>

        <?php if ($active_tab === 'access') : ?>
            <!-- Formulaire de contrôle d'accès -->
            <form method="post" action="" style="background:#fff; padding:20px; border:1px solid #ccd0d4; margin-top:15px; max-width:800px;">
                <?php wp_nonce_field('bpmn_save_settings', 'bpmn_save_settings_nonce'); ?>
                
                <table class="form-table" role="presentation">
                    <tbody>
                        <tr>
                            <th scope="row"><label for="bpmn_access_type">Type de restriction d'accès</label></th>
                            <td>
                                <select name="bpmn_access_type" id="bpmn_access_type" onchange="bpmnToggleAccessFields(this.value)">
                                    <option value="public" <?php selected($access_type, 'public'); ?>>Public (Aucune restriction)</option>
                                    <option value="logged_in" <?php selected($access_type, 'logged_in'); ?>>Utilisateurs connectés uniquement</option>
                                    <option value="roles" <?php selected($access_type, 'roles'); ?>>Rôles WordPress spécifiques</option>
                                    <option value="passcode" <?php selected($access_type, 'passcode'); ?>>Code d'accès personnalisé (Passcode)</option>
                                </select>
                                <p class="description">Détermine qui est autorisé à afficher et utiliser le validateur BPMN sur le frontend.</p>
                            </td>
                        </tr>

                        <!-- Section Rôles -->
                        <tr class="bpmn-access-field-row access-roles" style="<?php echo $access_type === 'roles' ? '' : 'display:none;'; ?>">
                            <th scope="row">Rôles autorisés</th>
                            <td>
                                <?php
                                $wp_roles = wp_roles()->get_names();
                                foreach ($wp_roles as $role_key => $role_name) {
                                    $checked = in_array($role_key, $allowed_roles) ? 'checked' : '';
                                    echo '<label style="display:inline-block; width:180px; margin-bottom:5px;">';
                                    echo '<input type="checkbox" name="bpmn_allowed_roles[]" value="' . esc_attr($role_key) . '" ' . $checked . '> ' . esc_html($role_name);
                                    echo '</label>';
                                }
                                ?>
                            </td>
                        </tr>

                        <!-- Section Passcode -->
                        <tr class="bpmn-access-field-row access-passcode" style="<?php echo $access_type === 'passcode' ? '' : 'display:none;'; ?>">
                            <th scope="row"><label for="bpmn_passcode">Code d'accès (Passcode)</label></th>
                            <td>
                                <input name="bpmn_passcode" type="text" id="bpmn_passcode" value="<?php echo esc_attr($passcode); ?>" class="regular-text">
                                <p class="description">Code requis sur le frontend pour déverrouiller l'outil. Mémorisé temporairement par session.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p class="submit">
                    <input type="submit" name="bpmn_save_access_settings" id="submit" class="button button-primary" value="Enregistrer les paramètres d'accès">
                </p>
            </form>

            <script>
                function bpmnToggleAccessFields(val) {
                    document.querySelectorAll('.bpmn-access-field-row').forEach(function(row) {
                        row.style.display = 'none';
                    });
                    if (val === 'roles') {
                        document.querySelector('.access-roles').style.display = '';
                    } else if (val === 'passcode') {
                        document.querySelector('.access-passcode').style.display = '';
                    }
                }
            </script>

        <?php elseif ($active_tab === 'rules') : ?>
            <!-- Gestionnaire de Règles BPMN -->
            <div style="margin-top:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3>Liste des règles d'audit de nommage BPMN</h3>
                    <form method="post" action="" onsubmit="return confirm('Voulez-vous vraiment restaurer les règles par défaut ? Toutes vos modifications et règles personnalisées seront supprimées.');">
                        <?php wp_nonce_field('bpmn_save_settings', 'bpmn_save_settings_nonce'); ?>
                        <input type="submit" name="bpmn_reset_rules" class="button button-secondary" value="Restaurer les règles par défaut">
                    </form>
                </div>

                <form method="post" action="">
                    <?php wp_nonce_field('bpmn_save_settings', 'bpmn_save_settings_nonce'); ?>
                    
                    <table class="wp-list-table widefat fixed striped" style="background:#fff;">
                        <thead>
                            <tr>
                                <th style="width: 5%; text-align:center;">Actif</th>
                                <th style="width: 20%;">Règle</th>
                                <th style="width: 15%;">Élément cible</th>
                                <th style="width: 15%;">Sévérité</th>
                                <th style="width: 25%;">Motif Regex / Type</th>
                                <th style="width: 20%;">Message d'erreur</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($rules)) : ?>
                                <tr><td colspan="6">Aucune règle configurée.</td></tr>
                            <?php else : ?>
                                <?php foreach ($rules as $rule) : ?>
                                    <tr>
                                        <td style="text-align:center; vertical-align:middle;">
                                            <input type="checkbox" name="rule_enabled_<?php echo esc_attr($rule['id']); ?>" value="1" <?php checked($rule['enabled'], true); ?>>
                                        </td>
                                        <td>
                                            <strong><?php echo esc_html($rule['label']); ?></strong>
                                            <br><span style="font-size:11px; color:#666;"><?php echo esc_html($rule['desc']); ?></span>
                                            
                                            <?php if (strpos($rule['id'], 'custom-') === 0) : ?>
                                                <div style="margin-top:5px;">
                                                    <button type="submit" name="bpmn_delete_rule_id" value="<?php echo esc_attr($rule['id']); ?>" class="button button-link-delete" style="color:#a00; font-size:11px; padding:0; height:auto; line-height:1;" onclick="return confirm('Supprimer cette règle personnalisée ?');">Supprimer</button>
                                                </div>
                                            <?php endif; ?>
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <code><?php echo esc_html($rule['target']); ?></code>
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <select name="rule_severity_<?php echo esc_attr($rule['id']); ?>" style="width:90%">
                                                <option value="err" <?php selected($rule['severity'], 'err'); ?>>Erreur (Critique)</option>
                                                <option value="warn" <?php selected($rule['severity'], 'warn'); ?>>Avertissement</option>
                                            </select>
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <?php if ($rule['type'] === 'regex') : ?>
                                                <input type="text" name="rule_pattern_<?php echo esc_attr($rule['id']); ?>" value="<?php echo esc_attr($rule['pattern']); ?>" class="large-text" style="font-family:monospace; font-size:12px;">
                                            <?php else : ?>
                                                <span class="badge" style="background:#e0e0e0; padding:2px 6px; border-radius:3px; font-size:11px;">Algorithme système</span>
                                                <input type="hidden" name="rule_pattern_<?php echo esc_attr($rule['id']); ?>" value="">
                                            <?php endif; ?>
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <input type="text" name="rule_err_msg_<?php echo esc_attr($rule['id']); ?>" value="<?php echo esc_attr($rule['errorMessage']); ?>" class="large-text">
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>

                    <p class="submit">
                        <input type="submit" name="bpmn_save_rules" class="button button-primary" value="Enregistrer les modifications de règles">
                    </p>
                </form>

                <!-- Formulaire d'ajout d'une nouvelle règle -->
                <div style="background:#fff; border:1px solid #ccd0d4; padding:20px; margin-top:30px; max-width:800px;">
                    <h3>Ajouter une règle de nommage personnalisée</h3>
                    <form method="post" action="">
                        <?php wp_nonce_field('bpmn_save_settings', 'bpmn_save_settings_nonce'); ?>
                        
                        <table class="form-table" role="presentation">
                            <tbody>
                                <tr>
                                    <th scope="row"><label for="new_rule_label">Nom de la règle</label></th>
                                    <td>
                                        <input name="new_rule_label" type="text" id="new_rule_label" required placeholder="Ex: Tâches en majuscule" class="regular-text">
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="new_rule_desc">Description / Justification</label></th>
                                    <td>
                                        <input name="new_rule_desc" type="text" id="new_rule_desc" placeholder="Ex: Lisibilité globale du modèle" class="regular-text">
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="new_rule_target">Élément BPMN ciblé</label></th>
                                    <td>
                                        <select name="new_rule_target" id="new_rule_target">
                                            <option value="process-id">Process ID (Clé technique)</option>
                                            <option value="process-name">Nom de processus (Affichage)</option>
                                            <option value="task">Activité / Tâche</option>
                                            <option value="subprocess">Sous-processus</option>
                                            <option value="gateway-divergent">Passerelle Divergente</option>
                                            <option value="gateway-parallel">Passerelle Parallèle (AND)</option>
                                            <option value="sequence-flow">Flux de séquence (Transition)</option>
                                            <option value="event-start">Événement de début (Start)</option>
                                            <option value="event-catch">Événement d'attente (Intermediate)</option>
                                            <option value="event-end">Événement de fin (End)</option>
                                            <option value="event-boundary">Événement de bordure (Boundary)</option>
                                            <option value="message">Message</option>
                                            <option value="signal">Signal</option>
                                            <option value="variable">Variable de processus</option>
                                            <option value="variable-collection">Variable de collection</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="new_rule_severity">Sévérité</label></th>
                                    <td>
                                        <select name="new_rule_severity" id="new_rule_severity">
                                            <option value="err">Erreur (Critique)</option>
                                            <option value="warn">Avertissement (Mineur)</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="new_rule_type">Type de validation</label></th>
                                    <td>
                                        <select name="new_rule_type" id="new_rule_type" onchange="document.getElementById('pattern_field_row').style.display = (this.value === 'regex') ? '' : 'none';">
                                            <option value="regex">Expression Régulière (Regex)</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr id="pattern_field_row">
                                    <th scope="row"><label for="new_rule_pattern">Motif Regex</label></th>
                                    <td>
                                        <input name="new_rule_pattern" type="text" id="new_rule_pattern" placeholder="Ex: ^[A-Z]+$" class="regular-text" style="font-family:monospace;">
                                        <p class="description">Expression régulière de validation (ex: <code>^[a-z]+$</code>)</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="new_rule_error">Message d'erreur</label></th>
                                    <td>
                                        <input name="new_rule_error" type="text" id="new_rule_error" required placeholder="Ex: L'élément doit être rédigé en majuscule." class="regular-text">
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <p class="submit">
                            <input type="submit" name="bpmn_add_rule" class="button button-secondary" value="Ajouter cette règle">
                        </p>
                    </form>
                </div>
            </div>
        <?php endif; ?>
    </div>
    <?php
}
