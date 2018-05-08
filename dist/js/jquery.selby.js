/*! 
 * Selby v1.0.0
 * https://github.com/derekcavaliero/selby
 * 
 * Copyright (c) 2018 Derek Cavaliero @ WebMechanix
 * 
 * Date: 2018-04-01 13:48:42 EDT 
 */
!function($, window, document, undefined) {
    function Selby(element, options) {
        this.element = $(element), this.options = $.extend(!0, {}, defaults, $.fn[pluginName].defaults, options), 
        this._defaults = defaults, this._fields = this.options.fields, this._questions = this.options.questions, 
        this._name = pluginName, this._tpl = tpl, this._storage = {}, this.init(), console.timeEnd("selby"), 
        console.log(this.options);
    }
    console.time("selby");
    var pluginName = "selby", defaults = {
        botName: "Selby",
        conversationName: "Selby",
        messages: {
            missingFields: "<strong>Sorry {{firstname}}</strong> It looks like I am missing some required information to process your request. Can you please provide the following information?"
        },
        fields: {
            name: {
                type: "text",
                placeholder: "First and last name"
            }
        },
        questions: {
            start: {
                bot: "<strong>Uh oh!</strong> it appears that my creator forgot to configure me. I'm rather dumb without proper configuration settings unfortunately."
            }
        },
        onStepReady: null,
        onComplete: null
    }, tpl = {
        bot: Handlebars.compile('<div class="bubble bubble--bot"><div class="bubble__inner">{{{smartString bot userInput}}}</div></div>'),
        user: Handlebars.compile('<form class="bubble bubble--user"><div class="bubble__inner">{{{ smartString prompt userInput }}}{{{fields}}}<input type="hidden" name="step" value="{{stepKey}}"></div></form>')
    };
    Selby.prototype = {
        init: function() {
            var parent = this;
            Handlebars.registerHelper("smartString", function(text, userInput) {
                for (var field in userInput) userInput.hasOwnProperty(field) && (text = text.replace("{{" + field + "}}", "<mark>" + userInput[field] + "</mark>"));
                return text = text.replace("{{botName}}", parent.options.botName), new Handlebars.SafeString(text);
            }), this.element.addClass("selby"), this.setupListeners(), this.processStep("start");
        },
        setupListeners: function() {
            var parent = this;
            this.element.on("submit", ".bubble--user", function(e) {
                e.preventDefault();
                var $this = $(this), userInput = parent.serializeObject($this);
                if (parent._storage = $.extend({}, parent._storage, parent.transformInput(userInput)), 
                $this.find(".bubble__input").prop("disabled", !0), $this.find(".bubble__button").hide(), 
                parent._questions[userInput.step]) {
                    var nextStepKey = parent.determineNextStep(parent._questions[userInput.step]);
                    parent.processStep(nextStepKey);
                }
            }), this.element.on("change", ".bubble__input--select, .bubble__input--radio", function(e) {
                var $this = $(this);
                if ($this.data("proceed-on-change")) {
                    var $form = $this.parents("form");
                    $this.prop("disabled") ? e.preventDefault() : $form.submit();
                }
            });
        },
        processStep: function(stepKey) {
            if (stepKey) {
                var step = this._questions[stepKey];
                if (step.hasOwnProperty("bot") && this.element.append(tpl.bot({
                    bot: step.bot,
                    userInput: this._storage
                })), step.hasOwnProperty("prompt")) {
                    var userData = {
                        prompt: step.prompt,
                        stepKey: stepKey,
                        userInput: this._storage
                    };
                    step.fields && (userData.fields = this.renderFields(step.fields, stepKey));
                    var userPrompt = $(tpl.user(userData)).appendTo(this.element);
                }
                this.options.onStepReady.constructor === Function && step.prompt && this.options.onStepReady(userPrompt);
            }
            "start" !== stepKey && this.scrollToLastBotMsg();
        },
        renderFields: function(fieldKeys, stepKey) {
            var parent = this, output = "", fieldCount = fieldKeys.length, outputButton = !1, needsButtonTypes = [ "text", "tel", "email", "number", "textarea", "checkbox" ], fieldDataAttr = ' data-proceed-on-change="' + (1 === fieldCount ? "true" : "false") + '"';
            return fieldKeys.forEach(function(key) {
                output += '<div class="bubble__field">';
                var field = parent._fields[key], fieldClasses = "bubble__input bubble__input--" + field.type, fieldAttr = ' name="' + key + '" class="' + fieldClasses + '" required ';
                switch (field.label && (output += '<label class="bubble__input-label" for="' + key + 'Field">' + field.label + "</label>"), 
                field.type) {
                  case "text":
                  case "email":
                  case "number":
                  case "tel":
                    output += "<input" + fieldAttr + ' type="' + field.type + '" placeholder="' + field.placeholder + '" id="' + key + 'Field">';
                    break;

                  case "select":
                    output += "<select" + fieldAttr + fieldDataAttr + ' id="' + key + 'Field">';
                    for (var item in field.options) field.options.hasOwnProperty(item) && (output += '<option value="' + item + '">' + field.options[item] + "</option>");
                    output += "</select>";
                    break;

                  case "radio":
                    output += '<div class="bubble__radios">';
                    for (var item in field.options) field.options.hasOwnProperty(item) && (output += '<input type="radio"' + fieldAttr + fieldDataAttr + 'autocomplete="off" value="' + item + '" id="' + key + "--" + item + '"><label for="' + key + "--" + item + '">' + field.options[item] + "</label>");
                    output += "</div>";
                    break;

                  case "textarea":
                    output += "<textarea" + fieldAttr + ' placeholder="' + field.placeholder + '" id="' + key + 'Field"></textarea>';
                    break;

                  default:
                    output += "Selby does not currently support " + field.type + " as a valid field type.";
                }
                output += "</div>", (fieldCount > 1 || needsButtonTypes.indexOf(field.type) !== -1) && (outputButton = !0);
            }), outputButton && (output += '<button type="submit" class="bubble__button">Continue</button>'), 
            output;
        },
        determineNextStep: function(step) {
            var nextStepKey = !1;
            if (nextStepKey = step.next && step.next.constructor === Function ? step.next(this._storage) : step.next, 
            step.sendData || this._questions[nextStepKey].sendData) {
                var endpointKey = step.sendData ? step.sendData : this._questions[nextStepKey].sendData;
                return this.processData(endpointKey), !1;
            }
            return nextStepKey;
        },
        checkRequiredFields: function() {
            var parent = this, missingFields = [];
            return this.options.requiredFields.forEach(function(key) {
                parent._storage[key] || missingFields.push(key);
            }), missingFields;
        },
        processData: function(endpointKey) {
            var parent = this, endpoint = this.options.endpoints[endpointKey], payload = this._storage;
            delete payload.step, endpoint.dataFilter && endpoint.dataFilter.constructor === Function && (payload = endpoint.dataFilter(payload)), 
            $.ajax({
                url: endpoint.url,
                method: "POST",
                type: "json",
                data: payload,
                success: function(data) {
                    parent.element.append(tpl.bot({
                        bot: "<strong>Thanks {{firstname}}, you're all set!</strong> Please give us some time to process your request. You can generally expect a response within a day or two.",
                        userInput: parent._storage
                    })), parent.scrollToLastBotMsg(), window.dataLayer ? window.dataLayer.push({
                        event: "Send Event",
                        event_category: "Conversions",
                        event_action: "Conversation Complete",
                        event_label: parent.options.conversationName
                    }) : window.GoogleAnalyticsObject && window[window.GoogleAnalyticsObject]("send", {
                        hitType: "event",
                        eventCategory: "Conversions",
                        eventAction: "Conversation Complete",
                        eventLabel: parent.options.conversationName
                    });
                },
                error: function(jqXHR, textStatus, errorThrown) {},
                beforeSend: function(xhr, opts) {
                    parent.element.append(tpl.bot({
                        bot: "<strong>Hang tight!</strong> I'm processing your information. This should only take a moment.",
                        userInput: parent._storage
                    })), parent.scrollToLastBotMsg();
                    var missingFieldKeys = parent.checkRequiredFields();
                    if (missingFieldKeys.length > 0) {
                        xhr.abort();
                        var messages = parent.options.messages;
                        setTimeout(function() {
                            var botData = {
                                userInput: parent._storage
                            };
                            messages.missingFields && messages.missingFields.constructor == Function ? botData.bot = messages.missingFields(parent._storage, missingFieldKeys, parent._defaults.messages.missingFields) : botData.bot = messages.missingFields, 
                            console.log(botData), parent.element.append(tpl.bot(botData)), parent.element.append(tpl.user({
                                prompt: "Sure thing! Here's the remaining information:",
                                userInput: parent._storage,
                                stepKey: "end",
                                fields: parent.renderFields(missingFieldKeys, "end")
                            })), parent.scrollToLastBotMsg();
                        }, 2500);
                    }
                }
            });
        },
        ucFirst: function(str) {
            return str.replace(/^./, str.substring(0, 1).toUpperCase());
        },
        scrollToLastBotMsg: function() {
            var $lastBotMsg = this.element.find(".bubble--bot:last");
            $("html, body").animate({
                scrollTop: $lastBotMsg.offset().top
            }, 500);
        },
        serializeObject: function(form) {
            var o = {}, a = form.serializeArray();
            return $.each(a, function() {
                o[this.name] ? (o[this.name].push || (o[this.name] = [ o[this.name] ]), o[this.name].push(this.value || "")) : o[this.name] = this.value || "";
            }), o;
        },
        transformInput: function(inputObj) {
            for (var field in inputObj) if (inputObj.hasOwnProperty(field)) {
                var value = inputObj[field].trim();
                if ("name" == field) {
                    var nameParts = value.split(" ");
                    inputObj.firstname = this.ucFirst(nameParts[0]), nameParts[1] && (inputObj.lastname = this.ucFirst(nameParts[1])), 
                    delete inputObj[field];
                }
            }
            return inputObj;
        }
    }, $.fn[pluginName] = function(options) {
        return this.each(function() {
            $.data(this, "plugin_" + pluginName) || $.data(this, "plugin_" + pluginName, new Selby(this, options));
        });
    }, $.fn[pluginName].defaults = {};
}(jQuery, window, document);