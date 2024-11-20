const openGoogleTranslatorAPIModel = ((jQuery) => {
    const init = () => {
        this.translateStatus = false;
        this.completedTranslateIndex = 0;
        jQuery(document).on("click", "#atlt_chromeAI_btn", openStringsModal);
    };

    const openStringsModal = (e) => {
        const defaultLangCode = locoConf.conf.locale.lang || null;
        this.defaultLang = mapLanguageCode(defaultLangCode);

        const modelContainer = jQuery('div#chrome-ai-translator-model.chrome-ai-translator-container');
        modelContainer.find(".atlt_actions > .atlt_save_strings").prop("disabled", true);
        modelContainer.find(".atlt_stats").hide();
        localStorage.setItem("lang", this.defaultLang);

        if (!isLanguageSupported(this.defaultLang)) {
            showUnsupportedLanguageMessage(modelContainer);
        } else {
            jQuery("#atlt-dialog").dialog("close");
            modelContainer.fadeIn("slow");
        }

        this.translateBtn = jQuery(".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn");
        this.translateBtn.off("click"); // Clear previous click handlers
        this.translateBtn.prop("disabled", false);

        if (!this.translateStatus) {
            this.translateBtn.on("click", startTranslationProcess);
        } else {
            this.translateBtn.text("Continue Translation").on("click", () => {
                translateStringCall(this.completedTranslateIndex + 1);
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
        jQuery("#atlt-dialog").dialog("close");
        modelContainer.find(".notice-container")
            .addClass('notice inline notice-warning')
            .html("Chrome AI Translator does not support this language.");
        modelContainer.find(".atlt_string_container, .choose-lang, .atlt_save_strings, #ytWidget, .translator-widget, .notice-info, .is-dismissible").hide();
        modelContainer.fadeIn("slow");
    };

    const startTranslationProcess = async () => {
        const langCode = this.defaultLang;

        if (!('translation' in self && 'createTranslator' in self.translation)) {
            console.error("The Translator API is not supported.");
            return;
        }

        const languageSupport = await translation.canTranslate({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if (languageSupport === 'readily') {
            await translateStrings();
        }
    };

    const translateStrings = async () => {
        const langCode = this.defaultLang;
        this.translateStatus = true;
        this.translateStringEle = jQuery("#chrome-ai-translator-model .chrome-ai-translator-body table tbody tr td.target.translate");
        this.stringContainer = jQuery("#chrome-ai-translator-model .modal-content .atlt_string_container");

        this.translator = await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if (this.translateStringEle.length > 0) {
            await translateStringCall(this.completedTranslateIndex);
        }
    };

    const scrollStringContainer = (position) => {
        this.stringContainer.scrollTop(position);
    };

    const translateStringCall = async (index) => {
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
            jQuery("#chrome-ai-translator-model .atlt_translate_progress").fadeIn("slow");
            await translateStringCall(this.completedTranslateIndex + 1);
        } else {
            this.translateBtn.prop("disabled", true);
            jQuery("#chrome-ai-translator-model .atlt_save_strings").prop("disabled", false);
            jQuery("#chrome-ai-translator-model .atlt_translate_progress").fadeOut("slow");
        }
    };

    jQuery(document).ready(init);
})(jQuery);
