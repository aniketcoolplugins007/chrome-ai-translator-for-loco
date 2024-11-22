class ChromeAiTranslator {
    static Object = (options) => {
        const selfObject = new this(options);
        return selfObject.extraData();
    };

    constructor(options) {
        this.btnSelector = options.btnSelector;
        this.stringSelector = options.stringSelector;
        this.progressBarSelector = options.progressBarSelector;
        this.onStartTranslationProcess = options.onStartTranslationProcess || (() => { });
        this.onComplete = options.onComplete || (() => { });
        this.onLanguageError = options.onLanguageError || (() => { });
        this.onTranslateRunning = options.onTranslateRunning || (() => { });
        this.sourceLanguage = options.sourceLanguage || "en";
        this.targetLanguage = options.targetLanguage || "hi";
        this.targetLanguageLabel = options.targetLanguageLabel || "Hindi";
    }

    extraData = async () => {
        const languageSupported = await this.langStatus();

        if (languageSupported === "after-download") {
            const link = jQuery(`<br><span>Install the <strong>${this.targetLanguageLabel}(${this.targetLanguage})</strong> language pack. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>`);
            jQuery("#chrome-ai-translator_settings_btn").after
            this.onLanguageError(link);
            return {};
        }

        if (languageSupported !== 'readily') {
            const message = jQuery(`<br><span style="color: red; margin-top: .5rem; display: inline-block;">Please confirm that the <strong>${this.targetLanguageLabel}(${this.targetLanguage})</strong> language pack is installed in your browser and included in your browser\'s preferred language settings. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>`);
            this.onLanguageError(message);
            return {};
        }  

        return { continueTranslation: this.continueTranslation, stopTranslation: this.stopTranslation, startTranslation: this.startTranslation, reInit: this.reInit, init: this.init };
    }

    init = async () => {
        this.translationStart = false;
        this.completedTranslateIndex = 0;
        this.completedCharacterCount = 0;
        this.translateBtnEvents();
        this.addProgressBar();
    };

    langStatus = async () => {
        if (!('translation' in self && 'createTranslator' in self.translation)) {
            console.error("The Translator API is not supported.");
            return false;
        }

        const defaultLangCode = this.targetLanguage || null;
        this.defaultLang = this.mapLanguageCode(defaultLangCode);

        return await translation.canTranslate({
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.defaultLang,
        });
    }

    translateBtnEvents = (e) => {
        this.translateStatus = true;
        this.translateBtn = jQuery(this.btnSelector);
        this.translateBtn.off("click"); // Clear previous click handlers
        this.translateBtn.prop("disabled", false);

        if (!this.translationStart) {
            this.translateBtn.on("click", this.startTranslationProcess);
        } else if (this.translateStringEle.length > (this.completedTranslateIndex + 1)) {
            this.translateBtn.on("click", () => {
                this.onStartTranslationProcess();
                this.stringTranslation(this.completedTranslateIndex + 1);
            });
        } else {
            this.onComplete();
            this.translateBtn.prop("disabled", true);
        }
    };

    mapLanguageCode = (code) => {
        const languageMap = {
            'bel': 'be',
            'he': 'iw',
            'snd': 'sd',
            'jv': 'jw',
            'nb': 'no',
            'nn': 'no'
        };
        return languageMap[code] || code;
    };

    startTranslationProcess = async () => {
        this.onStartTranslationProcess();
        const langCode = this.defaultLang;

        this.translationStart = true;
        this.translateStringEle = jQuery(this.stringSelector);

        this.totalStringCount = Array.from(this.translateStringEle).map(ele => ele.innerText.length).reduce((a, b) => a + b, 0);

        this.translator = await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if (this.translateStringEle.length > 0) {
            await this.stringTranslation(this.completedTranslateIndex);
        }
    };

    stringTranslation = async (index) => {
        if (!this.translateStatus) return;
        const ele = this.translateStringEle[index];
        this.onTranslateRunning(ele);

        const originalString = ele.innerText;
        const translatedString = await this.translator.translate(originalString);
        if (translatedString && '' !== translatedString) {
            this.completedCharacterCount += originalString.length;
            ele.innerText = translatedString;
        }
        this.completedTranslateIndex = index;

        this.updateProgressBar();

        if (this.translateStringEle.length > index + 1) {
            await this.stringTranslation(this.completedTranslateIndex + 1);
        }

        if (index === this.translateStringEle.length - 1) {
            this.translateBtn.prop("disabled", true);
            this.onComplete();
        }
    };

    addProgressBar = () => {
        if (!document.querySelector("#chrome-ai-translator-modal .chrome-ai-translator_progress_bar")) {
            const progressBar = jQuery('<div class="chrome-ai-translator_progress_bar" style="background-color: #f3f3f3;border-radius: 10px;overflow: hidden;margin: 1.5rem auto; width: 50%;">' +
                '<div class="chrome-ai-translator_progress" style="overflow: hidden;transition: width .5s ease-in-out; border-radius: 10px;text-align: center;width: 0%;height: 20px;box-sizing: border-box;background-color: #4caf50; color: #fff; font-weight: 600;"></div>' +
                '</div>');
            jQuery(this.progressBarSelector).append(progressBar);
        }
    };

    updateProgressBar = () => {
        const progress = ((this.completedCharacterCount / this.totalStringCount) * 1000) / 10;
        let decimalValue = progress.toString().split('.')[1] || '';
        decimalValue = decimalValue.length > 0 && decimalValue[0] !== '0' ? decimalValue[0] : '';
        const formattedProgress = parseInt(progress) + `${decimalValue !== '' ? '.' + decimalValue : ''}`;
        jQuery(".chrome-ai-translator_progress").css({ "width": `${formattedProgress}%` }).text(`${formattedProgress}%`);
    };

    stopTranslation = () => {
        this.translateStatus = false;
    }

    reInit = () => {
        this.translateBtnEvents();
    }

    startTranslation = () => {
        this.translateStatus = true;
        this.startTranslationProcess(this.completedTranslateIndex + 1);
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
                mainWrapperSelector: ".chrome-ai-translator",
                btnSelector: ".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn",
                stringSelector: ".chrome-ai-translator-body table tbody tr td.target.translate",
                progressBarSelector: ".latlt_progress_container",
                sourceLanguage: "en",
                targetLanguage: locoConf.conf.locale.lang,
                targetLanguageLabel: locoConf.conf.locale.label,
                onStartTranslationProcess: startTransaltion,
                onComplete: completeTranslation,
                onLanguageError: languageError,
                onTranslateRunning: translationRunning
            }
        );

        jQuery(document).on("click", "#chrome-ai-translator_settings_btn", function () {
            if (!transalationInitialize && typeof TranslatorObject.init === 'function') {
                transalationInitialize = true;
                TranslatorObject.init();
            } else if (typeof TranslatorObject.reInit === 'function') {
                TranslatorObject.reInit();
            }
        });

        jQuery(window).on("click", (event) => {
            if (jQuery("#chrome-ai-translator-modal").length > 0 && !event.target.closest(".modal-content") && !event.target.closest("#latlt-dialog") && jQuery("#chrome-ai-translator-modal").css("display") !== "none") {
                TranslatorObject.stopTranslation();
            }
        });

        jQuery(document).on("click", ".chrome-ai-translator-header .close", () => {
            TranslatorObject.stopTranslation();
        });
    });

    const startTransaltion = () => {
        const stringContainer = jQuery("#chrome-ai-translator-modal .modal-content .latlt_string_container");
        if (stringContainer[0].scrollHeight > 100) {
            jQuery("#chrome-ai-translator-modal .latlt_translate_progress").fadeIn("slow");
        }
    }
    
    const translationRunning = (ele) => {
        const stringContainer = jQuery("#chrome-ai-translator-modal .modal-content .latlt_string_container");
    
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
            jQuery("#chrome-ai-translator-modal .latlt_save_strings").prop("disabled", false);
            jQuery("#chrome-ai-translator-modal .latlt_translate_progress").fadeOut("slow");
            jQuery("#chrome-ai-translator-modal .latlt_stats").fadeIn("slow");
        }, 600);
    }
    
    const languageError = (message) => {
        jQuery("#chrome-ai-translator_settings_btn").after(message);
        jQuery("#chrome-ai-translator_settings_btn").attr("disabled", true);
    }

})(jQuery);
