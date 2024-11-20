const openGoogleTranslaterAPIModel = ((jQuery) => {

    init=()=>{
        this.conf = locoConf.conf;
        this.locale = locoConf.conf.locale;
        this.project = locoConf.conf.project;
        this.scrollContainerCallback;
        this.scrollContainerPosition=0;

        jQuery("#atlt_chromeAI_btn").on("click", openStringsModal);
    }

    openStringsModal=(e)=>{
        console.log("hello world");
        var defaultcode = this.locale.lang ? this.locale.lang : null;
        switch (defaultcode) {
            case 'bel':
                this.defaultLang = 'be';
                break;
            case 'he':
                this.defaultLang = 'iw';
                break;
            case 'snd':
                this.defaultLang = 'sd';
                break;
            case 'jv':
                this.defaultLang = 'jw';
                break;
            case 'nb':
                this.defaultLang = 'no';
                break;

            case 'nn':
                this.defaultLang = 'no';
                break;
            default:
                this.defaultLang = defaultcode;
                break;
        }
        var arr = ['en', 'zh', 'no', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'nl', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'tr', 'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'];

        let modelContainer = jQuery('div#chrome-ai-translator-model.chrome-ai-translator-container');

        modelContainer.find(".atlt_actions > .atlt_save_strings").prop("disabled", true);
        modelContainer.find(".atlt_stats").hide();

        localStorage.setItem("lang", this.defaultLang);

        const supportedLanguages = ['af', 'jv', 'no', 'am', 'ar', 'az', 'ba', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'cs', 'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gd', 'gl', 'gu', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mhr', 'mi', 'mk', 'ml', 'mn', 'mr', 'mrj', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'pa', 'pap', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tl', 'tr', 'tt', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'zh'];

        if (!supportedLanguages.includes(this.defaultLang)) {
            jQuery("#atlt-dialog").dialog("close");
            modelContainer.find(".notice-container")
                .addClass('notice inline notice-warning')
                .html("Chrome AI Translator Does not support this language.");
            modelContainer.find(".atlt_string_container, .choose-lang, .atlt_save_strings, #ytWidget, .translator-widget, .notice-info, .is-dismissible").hide();
            modelContainer.fadeIn("slow");
        } else {
            jQuery("#atlt-dialog").dialog("close");
            modelContainer.fadeIn("slow");
        }

        const translateBtn=jQuery(".chrome-ai-translator #chrome_ai_translator_element #chrome_ai_translator_btn");

        translateBtn.on("click", startTranslationProcess);
    }

    startTranslationProcess=async ()=>{
        const langCode=this.defaultLang;

        if (!('translation' in self && 'createTranslator' in self.translation)) {
            console.log("The Translator API is not supported.");
            return;
        }

        const languageSupport=await translation.canTranslate({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        if('readily' === languageSupport){
            translateStrings();
        }
    }

    translateStrings=async ()=>{
        const langCode=this.defaultLang;
        
        const translateStringEle=jQuery("#chrome-ai-translator-model .chrome-ai-translator-body table tbody tr td.target.translate");
        const stringContainer=jQuery("#chrome-ai-translator-model .modal-content .atlt_string_container");

        const stringContainerPosition=stringContainer[0].getBoundingClientRect();

        const translator=await self.translation.createTranslator({
            sourceLanguage: 'en',
            targetLanguage: langCode,
        });

        const scrollStringContainer=()=>{
            stringContainer.scrollTop(this.scrollContainerPosition);
        }

        // const stringContainerPosition=stringContainer[0].getBoundingClientRect();

        // Define an asynchronous function to translate strings at a given index
        const translateStringCall=async (index)=>{

            // if(index > 400) return;

            // Get the current element to translate based on the index
            const ele=translateStringEle[index];

            // Get the position of the current element
            const currentPosition=ele.getBoundingClientRect();

            // Get the current position of the string container
            const containerScrollTop=stringContainer.scrollTop();

            // Get the height of the string container
            const containerHeight=stringContainer.height();

            const conatinerYAxis=containerHeight + containerScrollTop + stringContainerPosition.y;
            const updatedPosition=((currentPosition.y - containerHeight) - stringContainerPosition.y);
            
            if((currentPosition.y - containerHeight) > stringContainerPosition.y && updatedPosition > this.scrollContainerPosition){
                // console.log(containerHeight);
                this.scrollContainerPosition=updatedPosition;
                clearTimeout(this.scrollContainerCallback);
                this.scrollContainerCallback=setTimeout(()=>{
                   scrollStringContainer();
                }, 20);
            }

            // Store the original string from the element's inner text
            const orignalString=ele.innerText;

            // Await the translation of the original string using the translator
            const translatedString=await translator.translate(orignalString);
            
            // Update the element's inner text with the translated string
            ele.innerText=translatedString;
            
            // If there are more elements to translate, call the function recursively for the next index
            if(translateStringEle.length > index + 1) translateStringCall(index + 1);
            else jQuery("#chrome-ai-translator-model").find(".atlt_save_strings").prop("disabled", false);

            // End the function
            return;
        }

        // If there are elements to translate, start the translation process from index 0
        translateStringEle.length > 0 && translateStringCall(0);
    }

    jQuery(document).ready(function () {
        init();
    });
})(jQuery);
