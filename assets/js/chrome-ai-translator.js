class ChromeAiTranslator {
    // Static method to create an instance of ChromeAiTranslator and return extra data
    static Object = (options) => {
        const selfObject = new this(options);
        return selfObject.extraData();
    };

    // Constructor to initialize the translator with options
    constructor(options) {
        this.btnSelector = options.btnSelector || false; // Selector for the button that triggers translation
        this.stringSelector = options.stringSelector || false; // Selector for the elements containing strings to translate
        this.progressBarSelector = options.progressBarSelector || false; // Selector for the progress bar element
        this.onStartTranslationProcess = options.onStartTranslationProcess || (() => { }); // Callback for when translation starts
        this.onComplete = options.onComplete || (() => { }); // Callback for when translation completes
        this.onLanguageError = options.onLanguageError || (() => { }); // Callback for language errors
        this.onBeforeTranslate = options.onBeforeTranslate || (() => { }); // Callback for before translation
        this.onAfterTranslate = options.onAfterTranslate || (() => { }); // Callback for after translation
        this.sourceLanguage = options.sourceLanguage || "en"; // Default source language
        this.targetLanguage = options.targetLanguage || "hi"; // Default target language
        this.targetLanguageLabel = options.targetLanguageLabel || "Hindi"; // Label for the target language
    }

    // Method to check language support and return relevant data
    extraData = async () => {
        const languageSupported = await this.langStatus(); // Check if the language is supported

        // Handle unsupported language
        if (languageSupported === "language-not-supported") {
            await new Promise(resolve => setTimeout(resolve, 500));
            const message = jQuery(`<br><span style="color: #ff4646; margin-top: .5rem; display: inline-block;">Unfortunately, the <strong>${this.targetLanguageLabel} (${this.targetLanguage})</strong> language is currently not supported by the Local Translator AI modal. Please check and read the docs which languages are currently supported by <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">clicking here</a>.</span>`);
            jQuery("#chrome-ai-translator_settings_btn");
            this.onLanguageError(message);
            return {};
        }

        // Handle API disabled case
        if (languageSupported === "api-disabled") {
            await new Promise(resolve => setTimeout(resolve, 500));
            const message = jQuery(`<br><span style="color: #ff4646; margin-top: .5rem; display: inline-block;">The Translator AI modal is currently not supported or disabled in your browser. Please enable it. For detailed instructions on how to enable the Translator AI modal in your Chrome browser, <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">click here</a>.</span>`);
            jQuery("#chrome-ai-translator_settings_btn");
            this.onLanguageError(message);
            return {};
        }

        // Handle case for language pack after download
        if (languageSupported === "after-download") {
            const message = jQuery(`<br><span style="color: #ff4646; margin-top: .5rem; display: inline-block;">Please install the <strong>${this.targetLanguageLabel} (${this.targetLanguage})</strong> language pack to proceed. For detailed instructions, please refer to the <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">documentation here</a>.</span>`);
            jQuery("#chrome-ai-translator_settings_btn");
            this.onLanguageError(message);
            return {};
        }

        // Handle case for language pack not readily available
        if (languageSupported !== 'readily') {
            const message = jQuery(`<br><span style="color: #ff4646; margin-top: .5rem; display: inline-block;">Please confirm that the <strong>${this.targetLanguageLabel}(${this.targetLanguage})</strong> language pack is installed in your browser and included in your browser's preferred language settings. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>`);
            this.onLanguageError(message);
            return {};
        }  

        // Return methods for translation control
        return { 
            continueTranslation: this.continueTranslation, 
            stopTranslation: this.stopTranslation, 
            startTranslation: this.startTranslation, 
            reInit: this.reInit, 
            init: this.init 
        };
    }

    // Method to initialize the translation process
    init = async () => {
        this.translationStart = false; // Flag to indicate if translation has started
        this.completedTranslateIndex = 0; // Index of the last completed translation
        this.completedCharacterCount = 0; // Count of characters translated
        this.translateBtnEvents(); // Set up button events
        if(this.progressBarSelector) {
            this.addProgressBar(); // Add progress bar to the UI
        }
    };

    // Method to check the status of the language support
    langStatus = async () => {
        const supportedLanguages = ['es', 'ja', 'ar', 'bn', 'de', 'fr', 'hi', 'it', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'vi', 'zh', 'zh-hant', 'bg', 'cs', 'da', 'el', 'fi', 'hr', 'hu', 'id', 'iw', 'lt', 'no', 'ro', 'sk', 'sl', 'sv', 'uk', 'en-zh'].map(lang => lang.toLowerCase());

        // Check if the translation API is available
        if (!('translation' in self && 'createTranslator' in self.translation)) {
            return 'api-disabled';
        }

        // Check if the target language is supported
        if (!supportedLanguages.includes(this.targetLanguage.toLowerCase())) {
            return 'language-not-supported';
        }

        const defaultLangCode = this.targetLanguage || null; // Get the default language code
        this.defaultLang = this.mapLanguageCode(defaultLangCode); // Map the language code

        // Check if translation can be performed
        return await translation.canTranslate({
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.defaultLang,
        });
    }

    // Method to set up button events for translation
    translateBtnEvents = (e) => {
        if (!this.btnSelector || jQuery(this.btnSelector).length === 0) return this.onLanguageError("The button selector is missing. Please provide a valid selector for the button.");
        if (!this.stringSelector || jQuery(this.stringSelector).length === 0) return this.onLanguageError("The string selector is missing. Please provide a valid selector for the strings to be translated.");

        this.translateStatus = true; // Set translation status to true
        this.translateBtn = jQuery(this.btnSelector); // Get the translation button
        this.translateBtn.off("click"); // Clear previous click handlers
        this.translateBtn.prop("disabled", false); // Enable the button

        // Set up click event for starting translation
        if (!this.translationStart) {
            this.translateBtn.on("click", this.startTranslationProcess);
        } else if (this.translateStringEle.length > (this.completedTranslateIndex + 1)) {
            this.translateBtn.on("click", () => {
                this.onStartTranslationProcess(); // Call the start translation callback
                this.stringTranslation(this.completedTranslateIndex + 1); // Start translating the next string
            });
        } else {
            this.onComplete(); // Call the complete callback
            this.translateBtn.prop("disabled", true); // Disable the button
        }
    };

    // Method to map language codes to their respective codes
    mapLanguageCode = (code) => {
        const languageMap = {
            'bel': 'be',
            'he': 'iw',
            'snd': 'sd',
            'jv': 'jw',
            'nb': 'no',
            'nn': 'no'
        };
        return languageMap[code] || code; // Return mapped code or original code
    };

    // Method to start the translation process
    startTranslationProcess = async () => {
        this.onStartTranslationProcess(); // Call the start translation callback
        const langCode = this.defaultLang; // Get the default language code

        this.translationStart = true; // Set translation start flag
        this.translateStringEle = jQuery(this.stringSelector); // Get the elements to translate

        // Calculate total character count for progress tracking
        this.totalStringCount = Array.from(this.translateStringEle).map(ele => ele.innerText.length).reduce((a, b) => a + b, 0);

        // Create a translator instance
        this.translator = await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        // Start translating if there are strings to translate
        if (this.translateStringEle.length > 0) {
            await this.stringTranslation(this.completedTranslateIndex);
        }
    };

    // Method to translate a specific string at the given index
    stringTranslation = async (index) => {
        if (!this.translateStatus) return; // Exit if translation is stopped
        const ele = this.translateStringEle[index]; // Get the element to translate
        this.onBeforeTranslate(ele); // Call the before translation callback

        const originalString = ele.innerText; // Get the original string
        const translatedString = await this.translator.translate(originalString); // Translate the string
        if (translatedString && '' !== translatedString) {
            this.completedCharacterCount += originalString.length; // Update character count
            ele.innerText = translatedString; // Set the translated string
        }
        this.completedTranslateIndex = index; // Update completed index
        if(this.progressBarSelector) {
            this.updateProgressBar(); // Update the progress bar
        }
        this.onAfterTranslate(ele); // Call the after translation callback

        // Continue translating the next string if available
        if (this.translateStringEle.length > index + 1) {
            await this.stringTranslation(this.completedTranslateIndex + 1);
        }

        // If all strings are translated, complete the process
        if (index === this.translateStringEle.length - 1) {
            this.translateBtn.prop("disabled", true); // Disable the button
            this.onComplete(); // Call the complete callback
            jQuery(this.progressBarSelector).find(".chrome-ai-translator-strings-count").show().find(".totalChars").html(this.completedCharacterCount);
        }
    };

    // Method to add a progress bar to the UI
    addProgressBar = () => {
        if (!document.querySelector("#chrome-ai-translator-modal .chrome-ai-translator_progress_bar")) {
            const progressBar = jQuery(`
                <div class="chrome-ai-translator_progress_bar" style="background-color: #f3f3f3;border-radius: 10px;overflow: hidden;margin: 1.5rem auto; width: 50%;">
                <div class="chrome-ai-translator_progress" style="overflow: hidden;transition: width .5s ease-in-out; border-radius: 10px;text-align: center;width: 0%;height: 20px;box-sizing: border-box;background-color: #4caf50; color: #fff; font-weight: 600;"></div>
                </div>
                <div style="display:none; color: #ffff9f;" class="chrome-ai-translator-strings-count hidden">
                    Wahooo! You have saved your valuable time via auto translating 
                    <strong class="totalChars">0</strong> characters using 
                    <strong>
                        Local AI Translator
                    </strong>
                </div>
            `);
            jQuery(this.progressBarSelector).append(progressBar); // Append the progress bar to the specified selector
        }
    };

    // Method to update the progress bar based on translation progress
    updateProgressBar = () => {
        const progress = ((this.completedCharacterCount / this.totalStringCount) * 1000) / 10; // Calculate progress percentage
        let decimalValue = progress.toString().split('.')[1] || ''; // Get decimal part of the progress
        decimalValue = decimalValue.length > 0 && decimalValue[0] !== '0' ? decimalValue[0] : ''; // Format decimal value
        const formattedProgress = parseInt(progress) + `${decimalValue !== '' ? '.' + decimalValue : ''}`; // Format progress for display
        jQuery(".chrome-ai-translator_progress").css({ "width": `${formattedProgress}%` }).text(`${formattedProgress}%`); // Update progress bar width and text
    };

    // Method to stop the translation process
    stopTranslation = () => {
        this.translateStatus = false; // Set translation status to false
    }

    // Method to reinitialize button events
    reInit = () => {
        this.translateBtnEvents(); // Re-setup button events
    }

    // Method to start translation from the current index
    startTranslation = () => {
        this.translateStatus = true; // Set translation status to true
        this.startTranslationProcess(this.completedTranslateIndex + 1); // Start translation process
    }
}

/*
 * Example Usage of the ChromeAiTranslator.init method.
 * This method initializes the translator with the following configuration options:
 * 
 * btnSelector: Selector for the button that triggers the translation process.
 * stringSelector: Selector for the elements containing the strings to be translated.
 * progressBarSelector: Selector for the progress bar element to show translation progress.
 * sourceLanguage: The language code for the language to translate from (e.g., "es" for Spanish).
 * targetLanguage: The language code for the language to translate to (e.g., "fr" for French).
 * onStartTranslationProcess: Callback function that executes when the translation process starts.
 * onBeforeTranslate: Callback function that executes before each translation.
 * onAfterTranslate: Callback function that executes after each translation.
 * onComplete: Callback function that executes when the translation process is completed.
 * onLanguageError: Callback function that executes when there is a language error.
 */
// const chromeAiTranslatorObject = ChromeAiTranslator.Object(
//     {
//         btnSelector: ".translator-container .translator-button", // Button Class, Id or Selector
//         stringSelector: ".translator-body .translation-item", // String Translate Element Class, Id or Selector
//         progressBarSelector: ".translator-progress-bar", // Progress Bar Class, Id or Selector
//         sourceLanguage: "es", // Source Language Code
//         targetLanguage: "fr", // Target Language Code
//         onStartTranslationProcess: () => { console.log("Translation process started."); }, // Callback function
//         onBeforeTranslate: () => { console.log("Before translation."); }, // Callback function
//         onAfterTranslate: () => { console.log("After translation."); }, // Callback function
//         onComplete: () => { console.log("Translation completed."); }, // Callback function
//         onLanguageError: () => { console.error("Language error occurred."); } // Callback function
//     }
// );
// chromeAiTranslatorObject.init();


// Call ChromeAiTranslator Object and start translation
((jQuery) => {
    jQuery(document).ready(async () => {
        let transalationInitialize = false;
        const TranslatorObject = await ChromeAiTranslator.Object(
            {
                mainWrapperSelector: "#chrome-ai-translator-modal",
                btnSelector: "#chrome-ai-translator-modal #chrome_ai_translator_element #chrome_ai_translator_btn",
                stringSelector: ".chrome-ai-translator-body table tbody tr td.target.translate",
                progressBarSelector: ".tcbia_progress_container",
                sourceLanguage: "en",
                targetLanguage: locoConf.conf.locale.lang,
                targetLanguageLabel: locoConf.conf.locale.label,
                onStartTranslationProcess: startTransaltion,
                onComplete: completeTranslation,
                onLanguageError: languageError,
                onBeforeTranslate: beforeTranslate
            }
        );

        if(!TranslatorObject.hasOwnProperty("init")) {
            return;
        }

        jQuery(document).on("click", "#chrome-ai-translator_settings_btn", function () {
            if (!transalationInitialize && typeof TranslatorObject.init === 'function') {
                transalationInitialize = true;
                TranslatorObject.init();
            } else if (typeof TranslatorObject.reInit === 'function') {
                TranslatorObject.reInit();
            }
        });

        jQuery(window).on("click", (event) => {
            if (!event.target.closest(".modal-content") && !event.target.closest("#tcbia-dialog")) {
                TranslatorObject.stopTranslation();
            }
        });

        jQuery(document).on("click", ".chrome-ai-translator-header .close", () => {
            TranslatorObject.stopTranslation();
        });
    });

    const startTransaltion = () => {
        const stringContainer = jQuery("#chrome-ai-translator-modal .modal-content .tcbia_string_container");
        if (stringContainer[0].scrollHeight > 100) {
            jQuery("#chrome-ai-translator-modal .tcbia_translate_progress").fadeIn("slow");
        }
    }
    
    const beforeTranslate = (ele) => {
        const stringContainer = jQuery("#chrome-ai-translator-modal .modal-content .tcbia_string_container");
    
        const scrollStringContainer = (position) => {
            stringContainer.scrollTop(position);
        };
    
        const stringContainerPosition = stringContainer[0].getBoundingClientRect();
    
        const eleTopPosition = ele.closest("tr").offsetTop;
        const containerHeight = stringContainer.height();
    
        if (eleTopPosition > (containerHeight + stringContainerPosition.y)) {
            scrollStringContainer(eleTopPosition - containerHeight + ele.offsetHeight);
        }
    }
    
    const completeTranslation = () => {
        setTimeout(() => {
            jQuery("#chrome-ai-translator-modal .tcbia_save_strings").prop("disabled", false);
            jQuery("#chrome-ai-translator-modal .tcbia_translate_progress").fadeOut("slow");
        }, 2500);
    }
    
    const languageError = (message) => {
        jQuery("#chrome-ai-translator_settings_btn").after(message);
        jQuery("#chrome-ai-translator_settings_btn").attr("disabled", true);
    }

})(jQuery);
