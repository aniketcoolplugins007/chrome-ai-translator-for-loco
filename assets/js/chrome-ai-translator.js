const openGoogleTranslatorAPIModel = ((jQuery) => {
    const init = () => {
        this.conf = locoConf.conf;
        this.locale = locoConf.conf.locale;
        this.project = locoConf.conf.project;
        this.translateBtn = jQuery(".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn");
        jQuery("#atlt_chromeAI_btn").on("click", openStringsModal);
    };

    const openStringsModal = (e) => {
        const defaultLangCode = this.locale.lang || null;
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

        
        this.translateBtn.on("click", startTranslationProcess);
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
        const supportedLanguages = ['af', 'jv', 'no', 'am', 'ar', 'az', 'ba', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'cs', 'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gd', 'gl', 'gu', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mhr', 'mi', 'mk', 'ml', 'mn', 'mr', 'mrj', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'pa', 'pap', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tl', 'tr', 'tt', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'zh'];
        return supportedLanguages.includes(lang);
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
            console.log("The Translator API is not supported.");
            return;
        }

        const languageSupport = await translation.canTranslate({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if (languageSupport === 'readily') {
            translateStrings();
        }
    };

    const translateStrings = async () => {
        const langCode = this.defaultLang;
        const translateStringEle = jQuery("#chrome-ai-translator-model .chrome-ai-translator-body table tbody tr td.target.translate");
        const stringContainer = jQuery("#chrome-ai-translator-model .modal-content .atlt_string_container");
        const stringContainerPosition = stringContainer[0].getBoundingClientRect();

        const translator = await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        const scrollStringContainer = (position) => {
            stringContainer.scrollTop(position);
        };

        const translateStringCall = async (index) => {
            const ele = translateStringEle[index];
            const eleTopPosition = ele.closest("tr").offsetTop;
            const containerHeight = stringContainer.height();

            if (eleTopPosition > (containerHeight + stringContainerPosition.y)) {
                scrollStringContainer(eleTopPosition - containerHeight + ele.offsetHeight);
            }

            const originalString = ele.innerText;
            const translatedString = await translator.translate(originalString);
            ele.innerText = translatedString;

            if (translateStringEle.length > index + 1 && stringContainer[0].scrollHeight > 100) {
                translateStringCall(index + 1);
                jQuery("#chrome-ai-translator-model .atlt_translate_progress").fadeIn("slow");
            } else {
                this.translateBtn.prop("disabled", true);
                jQuery("#chrome-ai-translator-model .atlt_save_strings").prop("disabled", false);
                jQuery("#chrome-ai-translator-model .atlt_translate_progress").fadeOut("slow");
            }
        };

        if (translateStringEle.length > 0) {
            translateStringCall(0);
        }
    };

    jQuery(document).ready(init);
})(jQuery);
