<?php
/**
 * Plugin Name: BPMN Subprocesses Analyzer
 * Plugin URI: https://example.com/bpmn-subprocesses-analyzer
 * Description: Analyseur de sous-processus et Call Activities BPMN sous forme d'extension WordPress. Détecte les boucles circulaires et cartographie les hiérarchies de processus.
 * Version: 1.0.0
 * Author: Camunda FlowAudit Team
 * Author URI: https://example.com
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Définir les constantes du plugin
define('BPMN_SUB_VERSION', '1.0.0');
define('BPMN_SUB_DIR', plugin_dir_path(__FILE__));
define('BPMN_SUB_URL', plugin_dir_url(__FILE__));

// Inclure les fichiers requis
require_once BPMN_SUB_DIR . 'includes/admin-settings.php';
require_once BPMN_SUB_DIR . 'includes/shortcode.php';

// Hook d'activation : Définir les réglages d'accès par défaut
register_activation_hook(__FILE__, 'bpmn_sub_activate');
function bpmn_sub_activate() {
    if (get_option('bpmn_sub_access_type') === false) {
        update_option('bpmn_sub_access_type', 'passcode');
    }
    if (get_option('bpmn_sub_passcode') === false) {
        update_option('bpmn_sub_passcode', 'pdacamunda');
    }
    if (get_option('bpmn_sub_authorized_roles') === false) {
        update_option('bpmn_sub_authorized_roles', array('administrator', 'editor'));
    }
}

// Enregistrement et enqueuing des scripts et styles
add_action('wp_enqueue_scripts', 'bpmn_sub_register_assets');
function bpmn_sub_register_assets() {
    // Enregistrer les bibliothèques tierces (CDN)
    wp_register_script('xlsx', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', array(), '0.18.5', true);
    wp_register_script('vis-network', 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js', array(), '9.1.2', true);

    // Enregistrer les feuilles de styles locales
    wp_register_style('bpmn-sub-frontend', BPMN_SUB_URL . 'assets/css/style.css', array(), BPMN_SUB_VERSION);

    // Enregistrer le script applicatif
    wp_register_script('bpmn-sub-frontend-js', BPMN_SUB_URL . 'assets/js/subprocesses-frontend.js', array('jquery'), BPMN_SUB_VERSION, true);

    // Localiser les paramètres pour le script JS
    wp_localize_script('bpmn-sub-frontend-js', 'bpmnSubConfig', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('bpmn_sub_nonce')
    ));
}
