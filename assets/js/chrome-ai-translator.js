const openGoogleTranslatorAPIModel = ((jQuery) => {
    const init = async () => {
        const languageSupported = await langStatus();

        if(languageSupported === "after-download") {
            const link = jQuery('<br><span>Install the language pack. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>');
            jQuery("#catl_chromeAI_btn").after(link);
        }

        if(languageSupported !== 'readily') {
            jQuery("#catl_chromeAI_btn").attr("disabled", true);
            return;
        }

        this.translateStatus = false;
        this.completedTranslateIndex = 0;
        jQuery(document).on("click", "#catl_chromeAI_btn", openStringsModal);
    };

    const langStatus = async () => {
        if (!('translation' in self && 'createTranslator' in self.translation)) {
            console.error("The Translator API is not supported.");
            return false;
        }

        const defaultLangCode = locoConf.conf.locale.lang || null;
        this.defaultLang = mapLanguageCode(defaultLangCode);

        return await translation.canTranslate({
            sourceLanguage: 'en',
            targetLanguage:  this.defaultLang,
        });
    }

    const openStringsModal = (e) => {
        const modelContainer = jQuery('div#chrome-ai-translator-model.chrome-ai-translator-container');
        modelContainer.find(".catl_actions > .catl_save_strings").prop("disabled", true);
        modelContainer.find(".catl_stats").hide();
        localStorage.setItem("lang", this.defaultLang);

        if (!isLanguageSupported(this.defaultLang)) {
            showUnsupportedLanguageMessage(modelContainer);
        } else {
            jQuery("#catl-dialog").dialog("close");
            modelContainer.fadeIn("slow");
        }

        this.translateBtn = jQuery(".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn");
        this.translateBtn.off("click"); // Clear previous click handlers
        this.translateBtn.prop("disabled", false);

        if (!this.translateStatus) {
            this.translateBtn.on("click", startTranslationProcess);
        } else {
            this.translateBtn.text("Continue Translation").on("click", () => {
                stringTranslation(this.completedTranslateIndex + 1);
            });
        }
    };

    const mapLanguageCode = (code) => {
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

    const isLanguageSupported = (lang) => {
        const supportedLanguages = new Set([
            'af', 'jv', 'no', 'am', 'ar', 'az', 'ba', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'cs', 'cy', 
            'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gd', 'gl', 'gu', 
            'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 
            'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mhr', 'mi', 'mk', 'ml', 'mn', 'mr', 
            'mrj', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'pa', 'pap', 'pl', 'pt', 'ro', 'ru', 'si', 
            'sk', 'sl', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tl', 'tr', 'tt', 
            'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'zh'
        ]);
        return supportedLanguages.has(lang);
    };

    const showUnsupportedLanguageMessage = (modelContainer) => {
        jQuery("#catl-dialog").dialog("close");
        modelContainer.find(".notice-container")
            .addClass('notice inline notice-warning')
            .html("Chrome AI Translator does not support this language.");
        modelContainer.find(".catl_string_container, .choose-lang, .catl_save_strings, #ytWidget, .translator-widget, .notice-info, .is-dismissible").hide();
        modelContainer.fadeIn("slow");
    };

    const startTranslationProcess = async () => {
        const langCode = this.defaultLang;
        this.translateStatus = true;
        this.translateStringEle = jQuery("#chrome-ai-translator-model .chrome-ai-translator-body table tbody tr td.target.translate");
        this.stringContainer = jQuery("#chrome-ai-translator-model .modal-content .catl_string_container");

        this.translator = await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if (this.translateStringEle.length > 0) {
            await stringTranslation(this.completedTranslateIndex);
        }
    };

    const scrollStringContainer = (position) => {
        this.stringContainer.scrollTop(position);
    };

    const stringTranslation = async (index) => {
        const stringContainer = this.stringContainer;
        const stringContainerPosition = stringContainer[0].getBoundingClientRect();
        this.completedTranslateIndex = index;

        const ele = this.translateStringEle[index];
        const eleTopPosition = ele.closest("tr").offsetTop;
        const containerHeight = stringContainer.height();

        if (eleTopPosition > (containerHeight + stringContainerPosition.y)) {
            scrollStringContainer(eleTopPosition - containerHeight + ele.offsetHeight);
        }

        const originalString = ele.innerText;
        const translatedString = await this.translator.translate(originalString);
        ele.innerText = translatedString;

        if (this.translateStringEle.length > index + 1 && stringContainer[0].scrollHeight > 100) {
            jQuery("#chrome-ai-translator-model .catl_translate_progress").fadeIn("slow");
            await stringTranslation(this.completedTranslateIndex + 1);
        } else {
            this.translateBtn.prop("disabled", true);
            jQuery("#chrome-ai-translator-model .catl_save_strings").prop("disabled", false);
            jQuery("#chrome-ai-translator-model .catl_translate_progress").fadeOut("slow");
            jQuery("#chrome-ai-translator-model .catl_stats").fadeIn("slow");
        }
    };

    jQuery(document).ready(init);
})(jQuery);
