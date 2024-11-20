<?php
/*
Plugin Name: Local AI Translator for Loco Translate
Description: Local AI Translator for Loco Translate to translate your website content into any language.
Version: 2.4.5
License: GPL2
Text Domain: loco-ai-translator-for-loco-translate
Domain Path: languages
Author: Cool Plugins
Author URI: https://coolplugins.net/
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

define( 'LATLT_FILE', __FILE__ );
define( 'LATLT_URL', plugin_dir_url( LATLT_FILE ) );
define( 'LATLT_PATH', plugin_dir_path( LATLT_FILE ) );
define( 'LATLT_VERSION', '2.4.5' );

/**
 * @package Chrome AI Translator for Loco Translate
 * @version 2.4
 */

if ( ! class_exists( 'ChromeAITranslatorForLoco' ) ) {

	/** Singleton ************************************/
	final class ChromeAITranslatorForLoco {

		/**
		 * The unique instance of the plugin.
		 *
		 * @var ChromeAITranslatorForLoco
		 */
		private static $instance;

		/**
		 * Gets an instance of plugin.
		 */
		public static function get_instance() {
			if ( null === self::$instance ) {
				self::$instance = new self();

				// register all hooks
				self::$instance->register();
			}

			return self::$instance;
		}

		/**
		 * Registers our plugin with WordPress.
		 */
		public static function register() {
			$thisPlugin = self::$instance;
			register_activation_hook( LATLT_FILE, array( $thisPlugin, 'latlt_activate' ) );
			register_deactivation_hook( LATLT_FILE, array( $thisPlugin, 'latlt_deactivate' ) );

			// run actions and filter only at admin end.
			if ( is_admin() ) {
				add_action( 'plugins_loaded', array( $thisPlugin, 'latlt_check_required_loco_plugin' ) );
				// add notice to use latest loco translate addon
				add_action( 'init', array( $thisPlugin, 'latlt_verify_loco_version' ) );

				add_action( 'admin_enqueue_scripts', array( $thisPlugin, 'latlt_enqueue_scripts' ) );

				/* since version 2.1 */
				add_filter( 'loco_api_providers', array( $thisPlugin, 'latlt_register_api' ), 10, 1 );
				add_action( 'loco_api_ajax', array( $thisPlugin, 'latlt_ajax_init' ), 0, 0 );
				add_action( 'wp_ajax_save_all_translations', array( $thisPlugin, 'save_translations_handler' ) );
			}
		}

		/*
		|----------------------------------------------------------------------
		| Register API Manager inside Loco Translate Plugin
		|----------------------------------------------------------------------
		*/
		function latlt_register_api( array $apis ) {
			$apis[] = array(
				'id'   => 'loco_auto',
				'key'  => '122343',
				'url'  => 'https://locoaddon.com/',
				'name' => 'Automatic Translate Addon',
			);
			return $apis;
		}

		/*
		|----------------------------------------------------------------------
		| Auto Translate Request handler
		|----------------------------------------------------------------------
		*/
		function latlt_ajax_init() {
			 add_filter( 'loco_api_translate_loco_auto', array( self::$instance, 'loco_auto_translator_process_batch' ), 0, 3 );
		}

		/**
		 * Hook fired as a filter for the "loco_auto" translation api
		 *
		 * @param string[] input strings
		 * @param Loco_Locale target locale for translations
		 * @param array our own api configuration
		 * @return string[] output strings
		 */
		function loco_auto_translator_process_batch( array $sources, Loco_Locale $Locale, array $config ) {
			$targets = array();
			// Extract domain from the referrer URL
			$url_data   = self::$instance->latlt_parse_query( $_SERVER['HTTP_REFERER'] );
			$domain     = isset( $url_data['domain'] ) && ! empty( $url_data['domain'] ) ? sanitize_text_field( $url_data['domain'] ) : 'temp';
			$lang       = sanitize_text_field( $Locale->lang );
			$region     = sanitize_text_field( $Locale->region );
			$project_id = $domain . '-' . $lang . '-' . $region;

			// Combine transient parts if available
			$allString = array();
			for ( $i = 0; $i <= 4; $i++ ) {
				$transient_part = get_transient( $project_id . '-part-' . $i );

				if ( ! empty( $transient_part ) ) {
					$allString = array_merge( $allString, $transient_part );
				}
			}
			if ( ! empty( $allString ) ) {
				foreach ( $sources as $i => $source ) {
					// Find the index of the source string in the cached strings
					$index = array_search( $source, array_column( $allString, 'source' ) );

					if ( is_numeric( $index ) && isset( $allString[ $index ]['target'] ) ) {
						$targets[ $i ] = sanitize_text_field( $allString[ $index ]['target'] );
					} else {
						$targets[ $i ] = '';
					}
				}
				return $targets;
			} else {
				throw new Loco_error_Exception( 'Please translate strings using the Auto Translate addon button first.' );
			}
		}

		function latlt_parse_query( $var ) {
			/**
			 *  Use this function to parse out the query array element from
			 *  the output of parse_url().
			 */

			$var = parse_url( $var, PHP_URL_QUERY );
			$var = html_entity_decode( $var );
			$var = explode( '&', $var );
			$arr = array();

			foreach ( $var as $val ) {
				$x            = explode( '=', $val );
				if ( isset( $x[1] ) ) {
					$arr[ sanitize_text_field( $x[0] ) ] = sanitize_text_field( $x[1] );
				}
			}
			unset( $val, $x, $var );
			return $arr;
		}

		/*
		|----------------------------------------------------------------------
		| Save string translation inside cache for later use
		|----------------------------------------------------------------------
		*/
		// save translations inside transient cache for later use
		function save_translations_handler() {

			check_ajax_referer( 'loco-addon-nonces', 'wpnonce' );

			if ( isset( $_POST['data'] ) && ! empty( $_POST['data'] ) && isset( $_POST['part'] ) ) {

				$allStrings = json_decode( stripslashes( $_POST['data'] ), true );
				if ( empty( $allStrings ) ) {
					echo json_encode(
						array(
							'success' => false,
							'error'   => 'No data found in the request. Unable to save translations.',
						)
					);
					wp_die();
				}

				// Determine the project ID based on the loop value
				$projectId = $_POST['project-id'] . $_POST['part'];
				// Save the strings in transient with appropriate part value
				$rs = set_transient( $projectId, $allStrings, 5 * MINUTE_IN_SECONDS );
				echo json_encode(
					array(
						'success'  => true,
						'message'  => 'Translations successfully stored in the cache.',
						'response' => $rs == true ? 'saved' : 'cache already exists',
					)
				);

			} else {
				// Security check failed or missing parameters
				echo json_encode( array( 'error' => 'Invalid request. Missing required parameters.' ) );
			}
			wp_die();
		}

		/*
		|----------------------------------------------------------------------
		| check if required "Loco Translate" plugin is active
		| also register the plugin text domain
		|----------------------------------------------------------------------
		*/
		public function latlt_check_required_loco_plugin() {
			if ( ! function_exists( 'loco_plugin_self' ) ) {
				add_action( 'admin_notices', array( self::$instance, 'latlt_plugin_required_admin_notice' ) );
			}
			// load language files
			load_plugin_textdomain( 'chrome-ai-translator-for-loco', false, basename( dirname( __FILE__ ) ) . '/languages/' );
		}
		/*
		|----------------------------------------------------------------------
		| Notice to 'Admin' if "Loco Translate" is not active
		|----------------------------------------------------------------------
		*/
		public function latlt_plugin_required_admin_notice() {
			if ( current_user_can( 'activate_plugins' ) ) {
				$url         = 'plugin-install.php?tab=plugin-information&plugin=loco-translate&TB_iframe=true';
				$title       = 'Loco Translate';
				$plugin_info = get_plugin_data( __FILE__, true, true );
				echo '<div class="error"><p>' .
				sprintf(
					__(
						'In order to use <strong>%1$s</strong> plugin, please install and activate the latest version  of <a href="%2$s" class="thickbox" title="%3$s">%4$s</a>',
						'loco-ai-translator-for-loco-translate'
					),
					esc_attr( $plugin_info['Name'] ),
					esc_url( $url ),
					esc_attr( $title ),
					esc_attr( $title )
				) . '.</p></div>';

				 deactivate_plugins( __FILE__ );
			}
		}

		/*
		|----------------------------------------------------------------------
		| check User Status
		|----------------------------------------------------------------------
		*/
		public function latlt_verify_loco_version() {
			if ( function_exists( 'loco_plugin_version' ) ) {
				$locoV = loco_plugin_version();
				if ( version_compare( $locoV, '2.4.0', '<' ) ) {
					add_action( 'admin_notices', array( self::$instance, 'use_loco_latest_version_notice' ) );
				}
			}
		}
		/*
		|----------------------------------------------------------------------
		| Notice to use latest version of Loco Translate plugin
		|----------------------------------------------------------------------
		*/
		public function use_loco_latest_version_notice() {
			if ( current_user_can( 'activate_plugins' ) ) {
				$url         = 'plugin-install.php?tab=plugin-information&plugin=loco-translate&TB_iframe=true';
				$title       = 'Loco Translate';
				$plugin_info = get_plugin_data( __FILE__, true, true );
				echo '<div class="error"><p>' .
				sprintf(
					__(
						'In order to use <strong>%1$s</strong> (version <strong>%2$s</strong>), Please update <a href="%3$s" class="thickbox" title="%4$s">%5$s</a> official plugin to a latest version (2.4.0 or upper)',
						'loco-ai-translator-for-loco-translate'
					),
					esc_attr( $plugin_info['Name'] ),
					esc_attr( $plugin_info['Version'] ),
					esc_url( $url ),
					esc_attr( $title ),
					esc_attr( $title )
				) . '.</p></div>';
			}
		}


		/*
		|------------------------------------------------------------------------
		|  Enqueue required JS file
		|------------------------------------------------------------------------
		*/
		function latlt_enqueue_scripts( $hook ) {
			// load assets only on editor page
			if ( isset( $_REQUEST['action'] ) && $_REQUEST['action'] == 'file-edit' ) {
				wp_register_script( 'loco-addon-custom', LATLT_URL . 'assets/js/common.min.js', array( 'loco-translate-admin' ), LATLT_VERSION, true );
				wp_register_script( 'chrome-ai-translator-for-loco', LATLT_URL . 'assets/js/chrome-ai-translator.min.js', array( 'loco-addon-custom' ), LATLT_VERSION, true );
				wp_register_style(
					'loco-addon-custom-css',
					LATLT_URL . 'assets/css/custom.min.css',
					null,
					LATLT_VERSION,
					'all'
				);

				wp_enqueue_script( 'loco-addon-custom' );
				wp_enqueue_script( 'chrome-ai-translator-for-loco' );
				wp_enqueue_style( 'loco-addon-custom-css' );

				$extraData['ajax_url']        = admin_url( 'admin-ajax.php' );
				$extraData['nonce']           = wp_create_nonce( 'loco-addon-nonces' );
				$extraData['LATLT_URL']        = LATLT_URL;
				$extraData['preloader_path']  = 'preloader.gif';
				$extraData['chrome_ai_preview']      = 'chrome-ai-translator.png';
				$extraData['extra_class']     = is_rtl() ? 'latlt-rtl' : '';

				$extraData['loco_settings_url'] = admin_url( 'admin.php?page=loco-config&action=apis' );

				wp_localize_script( 'loco-addon-custom', 'extradata', $extraData );
				// copy object
				wp_add_inline_script(
					'loco-translate-admin',
					'
            var returnedTarget = JSON.parse(JSON.stringify(window.loco));
            window.locoConf=returnedTarget;'
		            );

			}
		}

		public function latlt_pro_already_active_notice() {
			echo '<div class="error loco-pro-missing" style="border:2px solid;border-color:#dc3232;"><p><strong>Loco Automatic Translate Addon Pro</strong> is already active so no need to activate free anymore.</p> </div>';
		}

		public function latlt_use_pro_latest_version() {
			echo '<div class="error loco-pro-missing" style="border:2px solid;border-color:#dc3232;"><p><strong>Please use <strong>Loco Automatic Translate Addon Pro</strong> latest version 1.4 or higher to use auto translate premium features.</p> </div>';
		}

		/*
		|------------------------------------------------------
		|    Plugin activation
		|------------------------------------------------------
		*/
		public function latlt_activate() {
			update_option( 'latlt-version', LATLT_VERSION );
			update_option( 'latlt-installDate', gmdate( 'Y-m-d h:i:s' ) );
			update_option( 'latlt-already-rated', 'no' );
			update_option( 'latlt-type', 'free' );
		}

		/*
		|-------------------------------------------------------
		|    Plugin deactivation
		|-------------------------------------------------------
		*/
		public function latlt_deactivate() {
			delete_option( 'latlt-version' );
			delete_option( 'latlt-installDate' );
			delete_option( 'latlt-already-rated' );
			delete_option( 'latlt-type' );
		}

		/**
		 * Throw error on object clone.
		 *
		 * The whole idea of the singleton design pattern is that there is a single
		 * object therefore, we don't want the object to be cloned.
		 */
		public function __clone() {
			// Cloning instances of the class is forbidden.
			_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?', 'loco-ai-translator-for-loco-translate' ), '2.3' );
		}

		/**
		 * Disable unserializing of the class.
		 */
		public function __wakeup() {
			// Unserializing instances of the class is forbidden.
			_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?', 'loco-ai-translator-for-loco-translate' ), '2.3' );
		}

	}

	function LATLT() {
		return ChromeAITranslatorForLoco::get_instance();
	}
	LATLT();
}
