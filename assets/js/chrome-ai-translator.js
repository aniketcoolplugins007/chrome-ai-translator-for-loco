const openGoogleTranslatorAPIModel = ((jQuery) => {
    const init = async () => {
        const languageSupported = await langStatus();

        if(languageSupported === "after-download") {
            const link = jQuery('<br><span>Install the language pack. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>');
            jQuery("#latlt_chromeAI_btn").after(link);
        }

        if(languageSupported !== 'readily') {
            const message = jQuery('<br><span style="color: red; margin-top: .5rem; display: inline-block;">Please confirm that the language pack is installed in your browser and included in your browser\'s preferred language settings. <a href="https://developer.chrome.com/docs/ai/translator-api#bypass_language_restrictions_for_local_testing" target="_blank">Instructions here</a></span>');
            jQuery("#latlt_chromeAI_btn").after(message);
            jQuery("#latlt_chromeAI_btn").attr("disabled", true);
            return;
        }

        this.translationStart = false;
        this.completedTranslateIndex = 0;
        this.completedCharacterCount = 0;
        jQuery(document).on("click", "#latlt_chromeAI_btn", openStringsModal);
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
        modelContainer.find(".latlt_actions > .latlt_save_strings").prop("disabled", true);
        modelContainer.find(".latlt_stats").hide();
        localStorage.setItem("lang", this.defaultLang);

        addProgressBar();

        if (!isLanguageSupported(this.defaultLang)) {
            showUnsupportedLanguageMessage(modelContainer);
        } else {
            jQuery("#latlt-dialog").dialog("close");
            modelContainer.fadeIn("slow");
        }

        this.translateBtn = jQuery(".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn");
        this.translateBtn.off("click"); // Clear previous click handlers
        this.translateBtn.prop("disabled", false);

        if (!this.translationStart) {
            this.translateBtn.on("click", startTranslationProcess);
        } else if(this.translateStringEle.length > (this.completedTranslateIndex + 1)){
            this.translateBtn.text("Continue Translation").on("click", () => {
                stringTranslation(this.completedTranslateIndex + 1);
            });
        }else{
            this.translateBtn.prop("disabled", true);
            jQuery("#chrome-ai-translator-model .latlt_save_strings").prop("disabled", false);
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
        jQuery("#latlt-dialog").dialog("close");
        modelContainer.find(".notice-container")
            .addClass('notice inline notice-warning')
            .html("Chrome AI Translator does not support this language.");
        modelContainer.find(".latlt_string_container, .choose-lang, .latlt_save_strings, #ytWidget, .translator-widget, .notice-info, .is-dismissible").hide();
        modelContainer.fadeIn("slow");
    };

    const startTranslationProcess = async () => {
        const langCode = this.defaultLang;
        this.translationStart = true;
        this.translateStringEle = jQuery("#chrome-ai-translator-model .chrome-ai-translator-body table tbody tr td.target.translate");
        this.stringContainer = jQuery("#chrome-ai-translator-model .modal-content .latlt_string_container");

        this.totalStringCount=Array.from(this.translateStringEle).map(ele => ele.innerText.length).reduce((a, b) => a + b, 0);

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
        
        const ele = this.translateStringEle[index];
        const eleTopPosition = ele.closest("tr").offsetTop;
        const containerHeight = stringContainer.height();
        
        if (eleTopPosition > (containerHeight + stringContainerPosition.y)) {
            scrollStringContainer(eleTopPosition - containerHeight + ele.offsetHeight);
        }
        
        const originalString = ele.innerText;
        const translatedString = await this.translator.translate(originalString);
        this.completedCharacterCount += originalString.length;
        ele.innerText = translatedString;
        this.completedTranslateIndex = index;

        updateProgressBar();

        if (this.translateStringEle.length > index + 1 && stringContainer[0].scrollHeight > 100) {
            jQuery("#chrome-ai-translator-model .latlt_translate_progress").fadeIn("slow");
            await stringTranslation(this.completedTranslateIndex + 1);
        } else {
            setTimeout(() => {
                this.translateBtn.prop("disabled", true);
                jQuery("#chrome-ai-translator-model .latlt_save_strings").prop("disabled", false);
                jQuery("#chrome-ai-translator-model .latlt_translate_progress").fadeOut("slow");
                jQuery("#chrome-ai-translator-model .latlt_stats").fadeIn("slow");
            }, 600);
        }
    };

    const addProgressBar = (status) => {
        if(!document.querySelector("#chrome-ai-translator-model .latlt_progress_bar")) {
            const progressBar = jQuery('<div class="latlt_progress_bar" style="background-color: #f3f3f3;border-radius: 10px;overflow: hidden;margin: 1.5rem auto; width: 50%;">' +
                                  '<div class="latlt_progress" style="overflow: hidden;transition: width .5s ease-in-out; border-radius: 10px;text-align: center;width: 0%;height: 20px;box-sizing: border-box;background-color: #4caf50; color: #fff; font-weight: 600;"></div>' +
                                  '</div>');
            jQuery(".latlt_progress_container").append(progressBar);
        }
    };

    const updateProgressBar = () => {
        const progress = Math.round((this.completedCharacterCount / this.totalStringCount) * 1000) / 10;
        jQuery(".latlt_progress").css({"width": `${progress}%`}).text(`${progress}%`);
    };

    jQuery(document).ready(init);
})(jQuery);
