<?php
/**
 * Plugin Name: BPMN Naming Auditor
 * Plugin URI: https://github.com/camunda-flowaudit-pro
 * Description: Extension WordPress frontend permettant d'auditer et de corriger les conventions de nommage des éléments de processus BPMN et variables.
 * Version: 1.0.0
 * Author: Antigravity
 * Text Domain: bpmn-naming-auditor
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

// Si ce fichier est appelé directement, on arrête tout.
if (!defined('ABSPATH')) {
    exit;
}

// Définition des constantes globales du plugin
define('BPMN_AUDITOR_VERSION', '1.0.0');
define('BPMN_AUDITOR_PATH', plugin_dir_path(__FILE__));
define('BPMN_AUDITOR_URL', plugin_dir_url(__FILE__));

// Chargement des fichiers requis
require_once BPMN_AUDITOR_PATH . 'includes/admin-settings.php';
require_once BPMN_AUDITOR_PATH . 'includes/shortcode.php';

/**
 * Fonction d'activation du plugin.
 * Initialise les règles de nommage par défaut et les options d'accès.
 */
function bpmn_auditor_activate() {
    // 1. Définir les options d'accès par défaut
    if (get_option('bpmn_auditor_access_type') === false) {
        update_option('bpmn_auditor_access_type', 'public');
    }
    if (get_option('bpmn_auditor_passcode') === false) {
        update_option('bpmn_auditor_passcode', '123456'); // Code par défaut sécurisé
    }
    if (get_option('bpmn_auditor_allowed_roles') === false) {
        update_option('bpmn_auditor_allowed_roles', array('administrator', 'editor'));
    }

    // 2. Définir les règles de nommage par défaut (dupliqué de bpmn_rules.js)
    if (get_option('bpmn_auditor_rules') === false) {
        $default_rules = array(
            array(
                'id' => 'process-id-kebab',
                'label' => 'PROCESS ID en kebab-case',
                'desc' => 'L\'identifiant technique du processus doit être en kebab-case (ex: mon-processus-metier).',
                'target' => 'process-id',
                'type' => 'regex',
                'pattern' => '^[a-z0-9]+(-[a-z0-9]+)*$',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'L\'ID du processus doit être en kebab-case (minuscules, chiffres et tirets uniquement).'
            ),
            array(
                'id' => 'process-name-capital',
                'label' => 'Nom de processus : Majuscule',
                'desc' => 'Le nom d\'affichage du processus doit commencer par une majuscule.',
                'target' => 'process-name',
                'type' => 'regex',
                'pattern' => '^[A-ZÀ-ÖØ-ß].*$',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'Le nom d\'affichage du processus doit commencer par une lettre majuscule.'
            ),
            array(
                'id' => 'variable-camel',
                'label' => 'Variables : camelCase strict',
                'desc' => 'Les variables de processus doivent être en camelCase strict, sans accents ni caractères spéciaux.',
                'target' => 'variable',
                'type' => 'regex',
                'pattern' => '^[a-z][a-zA-Z0-9]*$',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'Le nom de la variable doit débuter par une minuscule et ne contenir que des lettres et chiffres.'
            ),
            array(
                'id' => 'variable-reserved',
                'label' => 'Variables : Mots réservés',
                'desc' => 'Les variables ne doivent pas porter de mots réservés FEEL ou Zeebe (ex: date, time, duration).',
                'target' => 'variable',
                'type' => 'custom',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'La variable utilise un mot clé réservé par FEEL ou le moteur Zeebe.'
            ),
            array(
                'id' => 'variable-collection-plural',
                'label' => 'Variables : Collection au pluriel',
                'desc' => 'Les variables de type liste/collection doivent être au pluriel (ex: productItems, emails).',
                'target' => 'variable-collection',
                'type' => 'regex',
                'pattern' => '.*(s|List|Items|Collection|Set|Array)$',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'Les variables de collection/liste doivent se terminer par un pluriel ou un terme explicite.'
            ),
            array(
                'id' => 'task-verb-infinitive',
                'label' => 'Tâches : Verbe Infinitif + Complément',
                'desc' => 'Le nom de l\'activité doit commencer par un verbe d\'action à l\'infinitif (ex: Calculer la TVA).',
                'target' => 'task',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'Le libellé de l\'activité doit commencer par un verbe à l\'infinitif suivi d\'un complément (2 mots min).'
            ),
            array(
                'id' => 'subprocess-noun-phrase',
                'label' => 'Sous-processus : Phrase nominale',
                'desc' => 'Un sous-processus doit être nommé par une phrase nominale (ex: Gestion des réclamations).',
                'target' => 'subprocess',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'Le sous-processus doit être nommé par une phrase nominale (sans verbe à l\'infinitif au début).'
            ),
            array(
                'id' => 'gateway-divergent-question',
                'label' => 'Gateways divergentes : Question ?',
                'desc' => 'Une passerelle divergente (ex: Exclusive, Inclusive) doit poser une question claire se terminant par un "?".',
                'target' => 'gateway-divergent',
                'type' => 'regex',
                'pattern' => '^.*\\?\\s*$',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'Le libellé de la passerelle divergente doit se terminer par un point d\'interrogation (?).'
            ),
            array(
                'id' => 'gateway-parallel-no-question',
                'label' => 'Gateways AND : Pas de question',
                'desc' => 'Une passerelle parallèle ne doit pas porter de question (pas de point d\'interrogation).',
                'target' => 'gateway-parallel',
                'type' => 'regex',
                'pattern' => '^[^?]*$',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'Une passerelle parallèle (AND) ne doit pas comporter de point d\'interrogation.'
            ),
            array(
                'id' => 'sequence-flow-labeled',
                'label' => 'Flux de transition : Réponse attendue',
                'desc' => 'Chaque flux sortant d\'une passerelle divergente doit porter un libellé (réponse à la question).',
                'target' => 'sequence-flow',
                'type' => 'custom',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'Le flux de transition doit porter un libellé représentant la réponse à la question de la passerelle.'
            ),
            array(
                'id' => 'event-start-noun-pastpart',
                'label' => 'Événement Début : Objet + Participe Passé',
                'desc' => 'Un événement de début doit être qualifié par un Objet suivi d\'un Participe Passé (ex: Commande reçue).',
                'target' => 'event-start',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'L\'événement de début doit être nommé au format "Objet + Participe Passé" (ex: Dossier reçu).'
            ),
            array(
                'id' => 'event-catch-waiting',
                'label' => 'Événement Attente : Description précise',
                'desc' => 'Un événement intermédiaire d\'attente doit décrire ce qui est intercepté pour continuer.',
                'target' => 'event-catch',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'L\'événement d\'attente doit décrire ce qui déclenche la suite du processus (ex: Paiement reçu).'
            ),
            array(
                'id' => 'event-end-state',
                'label' => 'Événement Fin : État métier final',
                'desc' => 'Un événement de fin doit qualifier l\'état métier final du chemin de processus (ex: Commande expédiée).',
                'target' => 'event-end',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'L\'événement de fin doit qualifier l\'état métier de réussite ou d\'échec (ex: Contrat signé).'
            ),
            array(
                'id' => 'event-boundary-exception',
                'label' => 'Événement Bordure : Exception ou Alerte',
                'desc' => 'Un événement de bordure doit qualifier l\'exception, l\'alerte ou le minuteur (ex: Délai expiré).',
                'target' => 'event-boundary',
                'type' => 'custom',
                'severity' => 'warn',
                'enabled' => true,
                'errorMessage' => 'L\'événement de bordure doit qualifier l\'alerte ou le minuteur rattaché.'
            ),
            array(
                'id' => 'message-pascal-suffix',
                'label' => 'Messages : PascalCase + Message',
                'desc' => 'Les définitions de messages doivent être en PascalCase et finir par "Message" (ex: PaymentReceivedMessage).',
                'target' => 'message',
                'type' => 'regex',
                'pattern' => '^[A-Z][a-zA-Z0-9]*Message$',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'Le nom du message doit être en PascalCase et finir par le mot "Message".'
            ),
            array(
                'id' => 'signal-pascal-suffix',
                'label' => 'Signaux : PascalCase + Signal',
                'desc' => 'Les signaux doivent être en PascalCase et finir par le mot "Signal" (ex: GlobalAlertSignal).',
                'target' => 'signal',
                'type' => 'regex',
                'pattern' => '^[A-Z][a-zA-Z0-9]*(Signal|Signak)$',
                'severity' => 'err',
                'enabled' => true,
                'errorMessage' => 'Le nom du signal doit être en PascalCase et finir par "Signal".'
            )
        );
        update_option('bpmn_auditor_rules', $default_rules);
    }
}
register_activation_hook(__FILE__, 'bpmn_auditor_activate');

/**
 * Enregistre les scripts et styles du plugin pour le frontend.
 */
function bpmn_auditor_enqueue_assets() {
    // Enregistrer CSS
    wp_register_style('bpmn-auditor-frontend', BPMN_AUDITOR_URL . 'assets/css/style.css', array(), BPMN_AUDITOR_VERSION);

    // Enregistrer les scripts externes (Chart.js et XLSX/SheetJS)
    wp_register_script('xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', array(), '0.18.5', true);
    wp_register_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js', array(), '3.9.1', true);

    // Enregistrer le script applicatif
    wp_register_script('bpmn-auditor-frontend-js', BPMN_AUDITOR_URL . 'assets/js/auditor-frontend.js', array('jquery'), BPMN_AUDITOR_VERSION, true);

    // Localiser les données de configuration (comme les règles de nommage configurées en PHP) pour le JS
    $rules = get_option('bpmn_auditor_rules', array());
    wp_localize_script('bpmn-auditor-frontend-js', 'bpmnAuditorSettings', array(
        'rules' => $rules,
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('bpmn_auditor_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'bpmn_auditor_enqueue_assets');
