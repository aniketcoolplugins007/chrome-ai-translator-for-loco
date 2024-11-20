((window, $) => {
    // Get Loco Translate global object and plugin configuration object.
    const { locoConf } = window;
    const { ajax_url: ajaxUrl, nonce, ATLT_URL, extra_class: rtlClass } = window.extradata;

    const initialize = async () => {
        const langSupported = await checkChromeAILangStatus();

        console.log(langSupported);
        if(langSupported === "readily") {
            onLoad();
        }
        setupEventListeners();
    };

    const checkChromeAILangStatus = async () => {
        if(locoConf && locoConf.conf) {
            const { locale } = locoConf.conf;
            const canTranslate = await translation.canTranslate({
                sourceLanguage: 'en',
                targetLanguage: locale.lang,
            });
            
            return canTranslate;
        }

        return false;
    };

    const onLoad = () => {
        if (locoConf && locoConf.conf) {
            const { conf } = locoConf;
            const allStrings = locoConf.conf.podata;
            allStrings.shift();
            const { locale, project } = conf;
            const projectId = generateProjectId(project, locale);
            checkChromeAILangStatus();
            createStringsModal(projectId, 'chrome-ai-translator');
            addStringsInModal(allStrings);
            stringModalEvents();
        }
    };

    const setupEventListeners = () => {
        if ($("#loco-editor nav").find("#cool-auto-translate-btn").length === 0) {
            addAutoTranslationBtn();
        }
        settingsModel();
        $("#cool-auto-translate-btn").on("click", openSettingsModel);
        $("button.icon-robot[data-loco='auto']").on("click", onAutoTranslateClick);
        $(".atlt_save_strings").on("click", onSaveClick);
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
            $(".atlt_string_container, .choose-lang, .translator-widget, .notice-info, .is-dismissible").hide();
        }
    };

    const generateProjectId = (project, locale) => {
        const { domain } = project || {};
        const { lang, region } = locale;
        return project ? `${domain}-${lang}-${region}` : `temp-${lang}-${region}`;
    };

    const onSaveClick = function () {
        const translatedObj = [];
        const rpl = {
            '"% s"': '"%s"', '"% d"': '"%d"', '"% S"': '"%s"', '"% D"': '"%d"',
            '% s': ' %s ', '% S': ' %s ', '% d': ' %d ', '% D': ' %d ',
            '٪ s': ' %s ', '٪ S': ' %s ', '٪ d': ' %d ', '٪ D': ' %d ',
            '٪ س': ' %s ', '%S': ' %s ', '%D': ' %d ', '% %': '%%'
        };
        const regex = /(\%\s*\d+\s*\$?\s*[a-z0-9])/gi;

        $(".atlt_strings_table tbody tr").each(function () {
            const source = $(this).find("td.source").text();
            const target = $(this).find("td.target").text();
            const improvedTarget = strtr(target, rpl).replace(regex, match => match.replace(/\s/g, '').toLowerCase());
            const improvedSource = strtr(source, rpl).replace(regex, match => match.replace(/\s/g, '').toLowerCase());

            translatedObj.push({ source: improvedSource, target: improvedTarget });
        });

        const projectId = $(this).parents(".atlt_custom_model").find("#project_id").val();
        saveTranslatedStrings(translatedObj, projectId);
        $(".atlt_custom_model").fadeOut("slow");
        $("html").addClass("merge-translations");
        updateLocoModel();
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

    const updateLocoModel = () => {
        const checkModal = setInterval(() => {
            const locoModel = $('.loco-modal');
            const locoModelApisBatch = $('.loco-modal #loco-apis-batch');
            if (locoModel.length && locoModel.attr("style").indexOf("none") <= -1 && locoModel.find('#loco-job-progress').length) {
                $("html").removeClass("merge-translations");
                locoModelApisBatch.find("a.icon-help, a.icon-group, #loco-job-progress").hide();
                locoModelApisBatch.find("select#auto-api").hide();
                const currentState = $("select#auto-api option[value='loco_auto']").prop("selected", "selected");
                locoModelApisBatch.find("select#auto-api").val(currentState.val());
                locoModel.find(".ui-dialog-titlebar .ui-dialog-title").html("Step 3 - Add Translations into Editor and Save");
                locoModelApisBatch.find("button.button-primary span").html("Start Adding Process").on("click", function () {
                    $(this).find('span').html("Adding...");
                });
                locoModel.addClass("addtranslations");
                $('.noapiadded').remove();
                locoModelApisBatch.find("form").show().removeClass("loco-alert");
                clearInterval(checkModal);
            }
        }, 200);
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

    const strtr = (...args) => {
        return !!args[0] && {
            2: function () {
                for (var i in args[1]) {
                    args[0] = strtr(args[0], i, args[1][i]);
                }
                return args[0];
            },
            3: function () {
                return args[0].replace(RegExp(args[1], 'g'), args[2]);
            },
            0: function () {
                return;
            }
        }[args.length]();
    };

    const saveTranslatedStrings = (translatedStrings, projectId) => {
        if (translatedStrings && translatedStrings.length > 0) {
            const batchSize = 2500;
            for (let i = 0; i < translatedStrings.length; i += batchSize) {
                const batch = translatedStrings.slice(i, i + batchSize);
                const part = `-part-${Math.ceil(i / batchSize)}`;
                sendBatchRequest(batch, projectId, part);
            }
        }
    };

    const sendBatchRequest = (stringData, projectId, part) => {
        const data = {
            action: 'save_all_translations',
            data: JSON.stringify(stringData),
            part,
            'project-id': projectId,
            wpnonce: nonce
        };

        jQuery.post(ajaxUrl, data, () => {
            $('#loco-editor nav').find('button').each(function () {
                const id = this.getAttribute('data-loco');
                if (id === "auto" && !$(this).hasClass('model-opened')) {
                    $(this).addClass('model-opened').trigger("click");
                }
            });
        });
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
        $("#atlt-dialog").dialog({
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
            if (!event.target.closest(".modal-content") && !event.target.closest("#atlt-dialog")) {
                $(".atlt_custom_model").hide();
            }
        });

    
        $(".atlt_custom_model").find(".close").on("click", () => {
            $(".atlt_custom_model").fadeOut("slow");
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
            $(".atlt_stats").each(function () {
                $(this).find(".totalChars").html(totalTChars);
            });
        }

        $(".atlt_strings_table > tbody.atlt_strings_body").html(html);
    };

    const settingsModel = () => {
        const gtPreviewImg = `${ATLT_URL}assets/images/${window.extradata['gt_preview']}`;
       
        const modelHTML = `
            <div id="atlt-dialog" title="Step 1 - Select Translation Provider" style="display:none;">
                <div class="atlt-settings">
                     <strong class="atlt-heading">Translate Using Chrome AI Translator</strong>
                    <div class="inputGroup">
                       <button id="atlt_chromeAI_btn" class="button button-primary">Chrome AI Translator</button>
                        <br/><a href="https://translate.google.com/" target="_blank"><img src="${gtPreviewImg}" alt="powered by Chrome AI Translator"></a>
                    </div>
                </div>
            </div>
        `;

        $("body").append(modelHTML);
    };

    const createStringsModal = (projectId, widgetType) => {
        const { wrapperCls, headerCls, bodyCls, footerCls, wrapperId } = getWidgetClasses(widgetType);
        const modelHTML = `
            <div id="${wrapperId}" class="modal atlt_custom_model ${wrapperCls}${rtlClass ? ` ${rtlClass}` : ''}">
                <div class="modal-content">
                    <input type="hidden" id="project_id" value="${projectId}"> 
                    ${modelHeaderHTML(widgetType, headerCls)}   
                    ${modelBodyHTML(widgetType, bodyCls)}   
                    ${modelFooterHTML(widgetType, footerCls)}   
                </div>
            </div>`;

        $("body").append(modelHTML);
    };

    const getWidgetClasses = (widgetType) => ({
        wrapperCls: `${widgetType}-container`,
        headerCls: `${widgetType}-header`,
        bodyCls: `${widgetType}-body`,
        footerCls: `${widgetType}-footer`,
        wrapperId: `${widgetType}-model`
    });

    const modelBodyHTML = (widgetType, bodyCls) => `
        <div class="modal-body ${bodyCls}">
            <div class="atlt_translate_progress">
                Automatic translation is in progress....<br/>
                It will take a few minutes, enjoy ☕ coffee in this time!<br/><br/>
                Please do not leave this window or browser tab while the translation is in progress...
            </div>
            ${translatorWidget(widgetType)}
            <div class="atlt_string_container">
                <table class="scrolldown atlt_strings_table">
                    <thead>
                        <th>S.No</th>
                        <th>Source Text</th>
                        <th>Translation</th>
                    </thead>
                    <tbody class="atlt_strings_body"></tbody>
                </table>
            </div>
            <div class="notice-container"></div>
        </div>`;

    const modelHeaderHTML = (widgetType, headerCls) => `
        <div class="modal-header ${headerCls}">
            <span class="close">&times;</span>
            <h2>Step 2 - Start Automatic Translation Process</h2>
            <div class="atlt_actions">
                <button class="atlt_save_strings button button-primary" disabled="true">Merge Translation</button>
            </div>
            <div style="display:none" class="atlt_stats hidden">
                Wahooo! You have saved your valuable time via auto translating 
                <strong class="totalChars"></strong> characters using 
                <strong>
                    <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                        Loco Automatic Translate Addon
                    </a>
                </strong>
            </div>
        </div>
        <div class="notice inline notice-info is-dismissible">
            Plugin will not translate any strings with HTML or special characters because Chrome AI Translator currently does not support HTML and special characters translations.
                        You can edit translated strings inside Loco Translate Editor after merging the translations. Only special characters (%s, %d) fixed at the time of merging of the translations.
        </div>
        <div class="notice inline notice-info is-dismissible">
            Machine translations are not 100% correct.
            Please verify strings before using on the production website.
        </div>`;

    const modelFooterHTML = (widgetType, footerCls) => `
        <div class="modal-footer ${footerCls}">
            <div class="atlt_actions">
                <button class="atlt_save_strings button button-primary" disabled="true">Merge Translation</button>
            </div>
            <div style="display:none" class="atlt_stats">
                Wahooo! You have saved your valuable time via auto translating 
                <strong class="totalChars"></strong> characters using 
                <strong>
                    <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                        Loco Automatic Translate Addon
                    </a>
                </strong>
            </div>
        </div>`;

    const translatorWidget = (widgetType) => {
        if (widgetType === "chrome-ai-translator") {
            return `
                <div class="translator-widget ${widgetType}">
                    <h3 class="choose-lang">Translate Using Chrome AI Translator <span class="dashicons-before dashicons-translation"></span></h3>
                    <div id="chrome_ai_translator_element"><button id="chrome_ai_translator_btn">Translate to ${locoConf.conf.locale.label}</button></div>
                </div>`;
        }
        return '';
    };

    // Initialize on load
    $(document).ready(initialize);
})(window, jQuery);