<?php
/**
 * Admin settings page for BPMN Subprocesses Analyzer
 */

if (!defined('ABSPATH')) {
    exit;
}

// Ajouter le menu d'administration WordPress
add_action('admin_menu', 'bpmn_sub_add_admin_menu');
function bpmn_sub_add_admin_menu() {
    add_menu_page(
        'BPMN Subprocesses',
        'BPMN Subprocesses',
        'manage_options',
        'bpmn-sub-settings',
        'bpmn_sub_render_settings_page',
        'dashicons-networking',
        81
    );
}

// Rendre la page de configuration de l'administration
function bpmn_sub_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    // Sauvegarder les modifications
    if (isset($_POST['bpmn_sub_save_settings']) && check_admin_referer('bpmn_sub_settings_verify')) {
        $access_type = sanitize_text_field($_POST['bpmn_sub_access_type']);
        $passcode = sanitize_text_field($_POST['bpmn_sub_passcode']);
        $roles = isset($_POST['bpmn_sub_roles']) ? array_map('sanitize_text_field', $_POST['bpmn_sub_roles']) : array();

        update_option('bpmn_sub_access_type', $access_type);
        update_option('bpmn_sub_passcode', $passcode);
        update_option('bpmn_sub_authorized_roles', $roles);

        echo '<div class="updated"><p>Réglages mis à jour avec succès.</p></div>';
    }

    // Charger les options courantes
    $access_type = get_option('bpmn_sub_access_type', 'passcode');
    $passcode = get_option('bpmn_sub_passcode', 'pdacamunda');
    $selected_roles = get_option('bpmn_sub_authorized_roles', array('administrator', 'editor'));

    // Liste de tous les rôles éligibles
    global $wp_roles;
    $all_roles = $wp_roles->get_names();
    ?>
    <div class="wrap" style="max-width: 800px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h1 style="font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <span class="dashicons dashicons-networking" style="font-size: 28px; width: 28px; height: 28px;"></span>
            Configuration de BPMN Subprocesses Analyzer
        </h1>
        
        <form method="post" action="">
            <?php wp_nonce_field('bpmn_sub_settings_verify'); ?>
            
            <div class="card" style="padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: #fff; margin-bottom: 20px;">
                <h2 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Sécurité & Restriction d'accès</h2>
                
                <table class="form-table" role="presentation">
                    <tbody>
                        <tr>
                            <th scope="row"><label for="bpmn_sub_access_type">Type d'accès autorisé</label></th>
                            <td>
                                <select id="bpmn_sub_access_type" name="bpmn_sub_access_type" style="min-width: 250px;" onchange="toggleSubAuthSettings(this.value)">
                                    <option value="public" <?php selected($access_type, 'public'); ?>>Public (Aucune authentification)</option>
                                    <option value="logged_in" <?php selected($access_type, 'logged_in'); ?>>Utilisateurs connectés à WordPress</option>
                                    <option value="roles" <?php selected($access_type, 'roles'); ?>>Rôles spécifiques d'utilisateurs</option>
                                    <option value="passcode" <?php selected($access_type, 'passcode'); ?>>Code d'accès personnalisé (Passcode)</option>
                                </select>
                                <p class="description">Définissez qui peut utiliser l'outil d'analyse des sous-processus sur la partie publique de votre site.</p>
                            </td>
                        </tr>

                        <tr id="sub_passcode_row" style="<?php echo ($access_type === 'passcode') ? '' : 'display: none;'; ?>">
                            <th scope="row"><label for="bpmn_sub_passcode">Code d'accès secret</label></th>
                            <td>
                                <input name="bpmn_sub_passcode" type="text" id="bpmn_sub_passcode" value="<?php echo esc_attr($passcode); ?>" class="regular-text">
                                <p class="description">Ce mot de passe sera demandé sur le frontend pour déverrouiller le module d'analyse.</p>
                            </td>
                        </tr>

                        <tr id="sub_roles_row" style="<?php echo ($access_type === 'roles') ? '' : 'display: none;'; ?>">
                            <th scope="row">Rôles autorisés</th>
                            <td>
                                <fieldset style="background: #fdfdfd; border: 1px solid #e0e0e0; padding: 12px; border-radius: 4px; max-height: 180px; overflow-y: auto;">
                                    <?php foreach ($all_roles as $role_key => $role_name) : ?>
                                        <label style="display: block; margin-bottom: 6px; cursor: pointer;">
                                            <input name="bpmn_sub_roles[]" type="checkbox" value="<?php echo esc_attr($role_key); ?>" <?php checked(in_array($role_key, $selected_roles)); ?>>
                                            <?php echo esc_html($role_name); ?>
                                        </label>
                                    <?php endforeach; ?>
                                </fieldset>
                                <p class="description">Cochez les rôles d'utilisateurs WordPress qui auront le droit de charger et d'analyser les processus.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p class="submit">
                <input type="submit" name="bpmn_sub_save_settings" id="submit" class="button button-primary button-large" value="Enregistrer les réglages" style="background: #ff7520; border-color: #ff7520; text-shadow: none;">
            </p>
        </form>
    </div>

    <script>
        function toggleSubAuthSettings(val) {
            document.getElementById('sub_passcode_row').style.display = (val === 'passcode') ? '' : 'none';
            document.getElementById('sub_roles_row').style.display = (val === 'roles') ? '' : 'none';
        }
    </script>
    <?php
}
