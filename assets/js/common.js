((window, $) => {
    // Get Loco Translate global object and plugin configuration object.
    const { locoConf } = window;
    const { extra_class: rtlClass } = window.aitwpData;

    const initialize = () => {
        onLoad();
    };
    
    const onLoad = async () => {
        if (locoConf && locoConf.conf) {
            const { conf } = locoConf;
            const allStrings = locoConf.conf.podata;
            allStrings.shift();
            const { locale, project } = conf;
            const projectId = generateProjectId(project, locale);

            createStringsModal(projectId, 'chrome-ai-translator');
            
            addStringsInModal(allStrings);
            stringModalEvents();
            
            setupEventListeners();

            jQuery('.aitwp_settings_btn').on('click', (e) => {
                const widgetId=e.currentTarget.dataset.widgetType;
                
                showModalBox(widgetId);
            });
        }
    };

    const showModalBox = (widgetId) => {
        const modelContainer = jQuery(`#${widgetId}`);

        modelContainer.find(".aitwp_actions > .aitwp_save_strings").prop("disabled", true);
        localStorage.setItem("lang", this.defaultLang);


        jQuery("#aitwp-dialog").dialog("close");
        modelContainer.fadeIn("slow");
        jQuery(".aitwp_custom_model .aitwp_translate_progress").hide();
    };

    const setupEventListeners = () => {
        if ($("#loco-editor nav").find("#cool-auto-translate-btn").length === 0) {
            addAutoTranslationBtn();
        }
        settingsModel(['chrome-ai-translator']);
        $("#cool-auto-translate-btn").on("click", openSettingsModel);
        $("button.icon-robot[data-loco='auto']").on("click", onAutoTranslateClick);
        // $(".aitwp_save_strings").on("click", onSaveClick);
    };

    const addStringsInModal = (allStrings) => {
        const plainStrArr = filterRawObject(allStrings, "plain");
        if (plainStrArr.length > 0) {
            printStringsInPopup(plainStrArr);
        } else {
            $("#ytWidget").hide();
            $(".notice-container")
                .addClass('notice inline notice-warning')
                .html("There is no plain string available for translations.");
            $(".aitwp_string_container, .choose-lang, .translator-widget, .notice-info, .is-dismissible").hide();
        }
    };

    const generateProjectId = (project, locale) => {
        const { domain } = project || {};
        const { lang, region } = locale;
        return project ? `${domain}-${lang}-${region}` : `temp-${lang}-${region}`;
    };

    const onAutoTranslateClick = (e) => {
        if (e.originalEvent) {
            const checkModal = setInterval(() => {
                const locoModal = $(".loco-modal");
                const locoBatch = locoModal.find("#loco-apis-batch");
                const locoTitle = locoModal.find(".ui-dialog-titlebar .ui-dialog-title");

                if (locoBatch.length && !locoModal.is(":hidden")) {
                    locoModal.removeClass("addtranslations");
                    locoBatch.find("select#auto-api").show();
                    locoBatch.find("a.icon-help, a.icon-group").show();
                    locoBatch.find("#loco-job-progress").show();
                    locoTitle.html("Auto-translate this file");
                    locoBatch.find("button.button-primary span").html("Translate");

                    if (locoBatch.find("select#auto-api option").length === 1) {
                        locoBatch.find(".noapiadded").remove();
                        locoBatch.removeClass("loco-alert").find("form").hide().addClass("loco-alert");
                        locoTitle.html("No translation APIs configured");
                        locoBatch.append(`
                            <div class='noapiadded'>
                                <p>Add automatic translation services in the plugin settings.<br>or<br>Use <strong>Auto Translate</strong> addon button.</p>
                                <nav>
                                    <a href='http://locotranslate.local/wp-admin/admin.php?page=loco-config&amp;action=apis' class='button button-link has-icon icon-cog'>Settings</a>
                                    <a href='https://localise.biz/wordpress/plugin/manual/providers' class='button button-link has-icon icon-help' target='_blank'>Help</a>
                                    <a href='https://localise.biz/wordpress/translation?l=de-DE' class='button button-link has-icon icon-group' target='_blank'>Need a human?</a>
                                </nav>
                            </div>`);
                    }
                    clearInterval(checkModal);
                }
            }, 100);
        }
    };

    const filterRawObject = (rawArray, filterType) => {
        return rawArray.filter(item => {
            if (item.source && !item.target) {
                return !ValidURL(item.source) && !isHTML(item.source) && !isSpecialChars(item.source) && !isEmoji(item.source) && !item.source.includes('#') || isPlacehodersChars(item.source);
            }
            return false;
        });
    };

    const ValidURL = (str) => {
        const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        return pattern.test(str);
    };

    const isHTML = (str) => {
        const rgex = /<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i;
        return rgex.test(str);
    };

    const isSpecialChars = (str) => {
        const rgex = /[@^{}|<>]/g;
        return rgex.test(str);
    };

    const isEmoji = (str) => {
        const ranges = [
            '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])'
        ];
        return str.match(ranges.join('|'));
    };

    const isPlacehodersChars = (str) => {
        const rgex = /%s|%d/g;
        return rgex.test(str);
    };

    const addAutoTranslationBtn = () => {
        const existingBtn = $("#loco-editor nav").find("#cool-auto-translate-btn");
        if (existingBtn.length > 0) {
            existingBtn.remove();
        }
        const locoActions = $("#loco-editor nav").find("#loco-actions");
        const autoTranslateBtn = $('<fieldset><button id="cool-auto-translate-btn" class="button has-icon icon-translate">Auto Translate</button></fieldset>');
        locoActions.append(autoTranslateBtn);
    };

    const openSettingsModel = () => {
        $("#aitwp-dialog").dialog({
            dialogClass: rtlClass,
            resizable: false,
            height: "auto",
            width: 400,
            modal: true,
            buttons: {
                Cancel: function () {
                    $(this).dialog("close");
                }
            }
        });
    };

    const stringModalEvents = () => {
        $(window).on("click", (event) => {
            if (!event.target.closest(".modal-content") && !event.target.closest("#aitwp-dialog")) {
                $(".aitwp_custom_model").hide();
            }
        });
    
        $(".aitwp_custom_model").find(".close").on("click", () => {
            $(".aitwp_custom_model").fadeOut("slow");
        });
    };

    const encodeHtmlEntity = (str) => {
        var buf = [];
        for (var i = str.length - 1; i >= 0; i--) {
            buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
        }
        return buf.join('');
    }

    const printStringsInPopup = (jsonObj) => {
        let html = '';
        let totalTChars = 0;
        let index = 1;

        if (jsonObj) {
            for (const key in jsonObj) {
                if (jsonObj.hasOwnProperty(key)) {
                    const sourceText = jsonObj[key].source.trim();
                    if (sourceText) {
                        html += `<tr id="${key}"><td>${index}</td><td class="source">${encodeHtmlEntity(sourceText)}</td>`;
                        html += `<td class="target translate">${encodeHtmlEntity(sourceText)}</td></tr>`;
                        index++;
                        totalTChars += sourceText.length;
                    }
                }
            }
        }

        $(".aitwp_strings_table > tbody.aitwp_strings_body").html(html);
    };

    const settingsModel = (widgetTypes = []) => {
        const modelHTML = widgetTypes.reduce((html, widgetType) => {
            if (widgetType === 'chrome-ai-translator') {
                return html + `
                <div id="aitwp-dialog" title="Step 1 - Select Translation Provider" style="display:none;">
                    <div class="aitwp-settings">
                        <strong class="aitwp-heading">Translate Using Local AI Translator</strong>
                        <div class="inputGroup">
                            <button id="${widgetType}_settings_btn" class="button button-primary aitwp_settings_btn" data-widget-type="${widgetType}-modal">Local AI Translator</button>
                            <br/><a href="https://developer.chrome.com/docs/ai/translator-api" target="_blank">Powered by  AI Translate API</a>
                        </div>
                    </div>
                </div>`;
            }
            return html;
        }, '');

        $("body").append(modelHTML);
    };

    const createStringsModal = (projectId, widgetType) => {
        const { wrapperCls, headerCls, bodyCls, footerCls, wrapperId } = getWidgetClasses(widgetType);
        const modelHTML = `
            <div id="${wrapperId}" class="modal aitwp_custom_model ${wrapperCls}${rtlClass ? ` ${rtlClass}` : ''}">
                <div class="modal-content">
                    <input type="hidden" id="project_id" value="${projectId}"> 
                    ${modelHeaderHTML(headerCls)}   
                    ${modelBodyHTML(widgetType, bodyCls)}   
                    ${modelFooterHTML(footerCls)}   
                </div>
            </div>`;

        $("body").append(modelHTML);
    };

    const getWidgetClasses = (widgetType) => ({
        wrapperCls: `${widgetType}-container`,
        headerCls: `${widgetType}-header`,
        bodyCls: `${widgetType}-body`,
        footerCls: `${widgetType}-footer`,
        wrapperId: `${widgetType}-modal`
    });

    const modelBodyHTML = (widgetType, bodyCls) => `
        <div class="modal-body ${bodyCls}">
            <div class="aitwp_translate_progress">
                <div class="aitwp_progress_container">
                    Automatic translation is in progress....<br/>
                    It will take a few minutes, enjoy ☕ coffee in this time!<br/><br/>
                    Please do not leave this window or browser tab while the translation is in progress...
                </div>
            </div>
            ${translatorWidget(widgetType)}
            <div class="aitwp_string_container">
                <table class="scrolldown aitwp_strings_table">
                    <thead>
                        <th>S.No</th>
                        <th>Source Text</th>
                        <th>Translation</th>
                    </thead>
                    <tbody class="aitwp_strings_body"></tbody>
                </table>
            </div>
            <div class="notice-container"></div>
        </div>`;

    const modelHeaderHTML = (headerCls) => `
        <div class="modal-header ${headerCls}">
            <span class="close">&times;</span>
            <h2>Step 2 - Start Automatic Translation Process</h2>
            <div class="aitwp_actions">
                <button class="aitwp_save_strings button button-primary" disabled="true">Merge Translation</button>
            </div>
            <div style="display:none" class="aitwp_stats hidden">
                Wahooo! You have saved your valuable time via auto translating 
                <strong class="totalChars"></strong> characters  using 
                <strong>
                    Chrome AI Translator
                </strong>
            </div>
        </div>
        <div class="notice inline notice-info is-dismissible">
            Plugin will not translate any strings with HTML or special characters because Chrome In Translator currently does not support HTML and special characters translations.
                        You can edit translated strings inside Loco Translate Editor after merging the translations. Only special characters (%s, %d) fixed at the time of merging of the translations.
        </div>
        <div class="notice inline notice-info is-dismissible">
            Machine translations are not 100% correct.
            Please verify strings before using on the production website.
        </div>`;    

    const modelFooterHTML = (footerCls) => `
        <div class="modal-footer ${footerCls}">
            <div class="aitwp_actions">
                <button class="aitwp_save_strings button button-primary" disabled="true">Merge Translation</button>
            </div>
            <div style="display:none" class="aitwp_stats">
            Wahooo! You have saved your valuable time via auto translating 
            <strong class="totalChars"></strong> characters  using 
            <strong>
                Chrome AI Translator for Loco Translate
            </strong>
        </div>
        </div>`;

    const translatorWidget = (widgetType) => {
        if (widgetType === "chrome-ai-translator") {
            return `
                <div class="translator-widget ${widgetType}">
                    <h3 class="choose-lang">Translate with Chrome Bulit-in AI <span class="dashicons-before dashicons-translation"></span></h3>
                    <div id="chrome_ai_translator_element" Id="chrome_ai_translator_btn"></div>
                </div>`;
        }
        return '';
    };

    // Initialize on load
    $(document).ready(initialize);
})(window, jQuery);

// var chromeAiTranslator=new ChromeAiTranslator();
