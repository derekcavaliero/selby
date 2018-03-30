;(function ( $, window, document, undefined ) {

    console.time( 'selby' );

    var pluginName = 'selby';
    var defaults = {

            botName: 'Selby',
            conversationName: 'Selby',

            messages: {
                missingFields: '<strong>Sorry {{firstname}}</strong> It looks like I am missing some required information to process your request. Can you please provide the following information?'
            },

            fields: {
                name: {
                    type: 'text',
                    placeholder: 'First and last name'
                }
            },

            questions: {
                start: {
                    bot: '<strong>Uh oh!</strong> it appears that my creator forgot to configure me. I\'m rather dumb without proper configuration settings unfortunately.'
                }
            },

            // Global callbacks:
            onStepReady: null,         // function( $prompt ) {}
            onComplete: null           // @TODO: integrate these

        },
        tpl = {
            bot: Handlebars.compile(
                '<div class="bubble bubble--bot"><div class="bubble__inner">{{{smartString bot userInput}}}</div></div>'
            ),
            user: Handlebars.compile(
                '<form class="bubble bubble--user"><div class="bubble__inner">{{{ smartString prompt userInput }}}{{{fields}}}<input type="hidden" name="step" value="{{stepKey}}"></div></form>'
            )
        };

    function Selby( element, options ) {

        this.element = $( element );

        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend( true, {}, defaults, $.fn[pluginName].defaults, options );

        this._defaults = defaults;
        this._fields = this.options.fields;
        this._questions = this.options.questions;
        this._name = pluginName;
        this._tpl = tpl; // @TODO: Make the templates configurable inside options object
        this._storage = {};

        this.init();

        console.timeEnd( 'selby' );

        console.log( this.options );

    }


    Selby.prototype = {

        init: function () {

            // Place initialization logic here
            // You already have access to the DOM element and
            // the options via the instance, e.g. this.element
            // and this.options

            var parent = this;

            Handlebars.registerHelper( 'smartString', function( text, userInput ) {
                for ( var field in userInput ) {
                    if ( !userInput.hasOwnProperty( field ) ) continue;
                    text = text.replace( '{{' + field + '}}', '<mark>' + userInput[field] + '</mark>' );
                }
                text = text.replace( '{{botName}}', parent.options.botName );
                return new Handlebars.SafeString( text );
            });

            this.element.addClass( 'selby' );
            this.setupListeners();
            this.processStep( 'start' );

        },

        setupListeners: function() {

            var parent = this;

            this.element.on( 'submit', '.bubble--user', function( e ) {

                e.preventDefault();

                var $this = $(this);
                var userInput = parent.serializeObject( $this );

                parent._storage = $.extend( {}, parent._storage, parent.transformInput( userInput ) );
                //console.log( parent._storage );

                $this.find( '.bubble__input' ).prop( 'disabled', true );
                $this.find( '.bubble__button' ).hide();

                if ( parent._questions[userInput.step] ) {
                    var nextStepKey = parent.determineNextStep( parent._questions[userInput.step] );
                    parent.processStep( nextStepKey );
                }

            });

            this.element.on( 'change', '.bubble__input--select, .bubble__input--radio', function( e ) {

                var $this = $(this);
                if ( $this.data( 'proceed-on-change' ) ) {
                    var $form = $this.parents( 'form' );
                    if ( !$this.prop( 'disabled' ) ) {
                        $form.submit();
                    } else {
                        e.preventDefault();
                    }
                }

            });

        },

        processStep: function ( stepKey ) {

            if ( stepKey ) {

                var step = this._questions[stepKey];

                // @TODO: check step object fields array vs. storage to see if we're asking for data we either already have (remove the field keys if so)

                if ( step.hasOwnProperty( 'bot' ) ) {

                    this.element.append( tpl.bot({
                        bot: step.bot, // @ TODO: possibly add ability to filter the bot message string?
                        userInput : this._storage
                    }) );

                }

                if ( step.hasOwnProperty( 'prompt' ) ) {

                    var userData = {
                        prompt: step.prompt,
                        stepKey: stepKey,
                        userInput : this._storage
                    };

                    if ( step.fields )
                        userData.fields = this.renderFields( step.fields, stepKey );

                    var userPrompt = $( tpl.user( userData ) ).appendTo( this.element );

                }

                if ( this.options.onStepReady.constructor === Function && step.prompt )
                    this.options.onStepReady( userPrompt );

            }

            if ( stepKey !== 'start' ) {
                this.scrollToLastBotMsg();
            }

        },

        renderFields: function( fieldKeys, stepKey ) {

            var parent = this,
                output = '',
                fieldCount = fieldKeys.length,
                outputButton = false,
                needsButtonTypes = ['text', 'tel', 'email', 'number', 'textarea', 'checkbox'],
                fieldDataAttr = ' data-proceed-on-change="' + ( ( fieldCount === 1 ) ? 'true' : 'false' ) + '"';

            fieldKeys.forEach( function( key ) {

                output += '<div class="bubble__field">';

                var field = parent._fields[key],
                    fieldClasses = 'bubble__input bubble__input--' + field.type,
                    fieldAttr = ' name="' + key + '" class="' + fieldClasses + '" required ';

                if ( field.label )
                    output += '<label class="bubble__input-label" for="' + key + 'Field">' + field.label + '</label>';

                switch ( field.type ) {

                    case 'text':
                    case 'email':
                    case 'number':
                    case 'tel':

                        output += '<input' + fieldAttr + ' type="' + field.type + '" placeholder="' + field.placeholder + '" id="' + key + 'Field">';

                    break;

                    case 'select':

                        output += '<select' + fieldAttr + fieldDataAttr + ' id="' + key + 'Field">';

                            for ( var item in field.options ) {
                                if ( !field.options.hasOwnProperty( item ) ) continue;
                                output += '<option value="' + item + '">' + field.options[item] + '</option>';
                            }

                        output += '</select>';

                    break;

                    case 'radio':

                        output += '<div class="bubble__radios">';

                            for ( var item in field.options ) {
                                if ( !field.options.hasOwnProperty( item ) ) continue;
                                output += '<input type="radio"' + fieldAttr + fieldDataAttr + 'autocomplete="off" value="' + item + '" id="' + key + '--' + item + '"><label for="' + key + '--' + item + '">' + field.options[item] + '</label>';
                            }

                        output += '</div>';

                    break;

                    case 'textarea':

                        output += '<textarea' + fieldAttr + ' placeholder="' + field.placeholder + '" id="' + key + 'Field"></textarea>';

                    break;

                    default:

                        output += 'Selby does not currently support ' + field.type + ' as a valid field type.';

                    break;

                }

                output += '</div>';

                if ( ( fieldCount > 1 ) || ( needsButtonTypes.indexOf( field.type ) !== -1 ) ) // @TODO: Render button if single field is a text input type.
                    outputButton = true;

            });

            if ( outputButton )
                output += '<button type="submit" class="bubble__button">Continue</button>';

            return output;

        },

        determineNextStep: function( step ) {

            var nextStepKey = false;

            if ( step.next && step.next.constructor === Function ) {
                nextStepKey = step.next( this._storage );
            } else {
                nextStepKey = step.next;
            }

            if ( step.sendData || this._questions[nextStepKey].sendData ) {

                var endpointKey = ( step.sendData ) ? step.sendData : this._questions[nextStepKey].sendData;
                this.processData( endpointKey );

                return false;

            }

            return nextStepKey;

        },

        checkRequiredFields: function() {

            var parent = this;
            var missingFields = [];

            this.options.requiredFields.forEach( function( key ) {

                if ( !parent._storage[key] ) {
                    missingFields.push( key );
                }

            });

            return missingFields;

        },

        processData: function( endpointKey ) {

            var parent = this;

            var endpoint = this.options.endpoints[endpointKey];
            var payload = this._storage;

            delete payload.step;

            // @TODO: allow user to filter datapayload prior to sending to endpoint.
            if ( endpoint.dataFilter && endpoint.dataFilter.constructor === Function )
                payload = endpoint.dataFilter( payload );


            $.ajax({
    			url: endpoint.url,
                method: 'POST',
                type: 'json',
    			data: payload,
    			success: function( data ) {

                    parent.element.append( tpl.bot({
                        bot: '<strong>Thanks {{firstname}}, you\'re all set!</strong> Please give us some time to process your request. You can generally expect a response within a day or two.',
                        userInput : parent._storage
                    }) );

                    parent.scrollToLastBotMsg();

                    // @TODO: Add onProcessDataSuccess callback here.

                    // @TODO: Move this into utility function.
                    if ( window.dataLayer ) {

                        window.dataLayer.push({
                            'event': 'Send Event',
                            'event_category': 'Conversions',
                            'event_action': 'Conversation Complete',
                            'event_label': parent.options.conversationName
                        });

                    } else if ( window.GoogleAnalyticsObject ) {

                        window[window.GoogleAnalyticsObject]( 'send', {
                            hitType: 'event',
                            eventCategory: 'Conversions',
                            eventAction: 'Conversation Complete',
                            eventLabel: parent.options.conversationName
                        });

                    }

    			},
    			error: function( jqXHR, textStatus, errorThrown ) {
                    // @TODO: Add error tracking and or data callback here.
    			},
    			beforeSend: function( xhr, opts ) {

                    parent.element.append( tpl.bot({
                        bot: '<strong>Hang tight!</strong> I\'m processing your information. This should only take a moment.',
                        userInput : parent._storage
                    }) );

                    parent.scrollToLastBotMsg();

                    var missingFieldKeys = parent.checkRequiredFields();

                    //console.log( requiredFields );

                    if ( missingFieldKeys.length > 0 ) {

                        xhr.abort();

                        var messages = parent.options.messages;

                        setTimeout( function() {

                            var botData = {
                                userInput : parent._storage
                            };

                            if ( messages.missingFields && ( messages.missingFields.constructor == Function ) ) {
                                botData.bot = messages.missingFields( parent._storage, missingFieldKeys, parent._defaults.messages.missingFields );
                            } else {
                                botData.bot = messages.missingFields;
                            }

                            console.log( botData );

                            // @TODO: allow for overriding the bot message output here (in case we need to change the wording for a particular scenario)
                            parent.element.append( tpl.bot( botData ) );

                            parent.element.append( tpl.user({
                                prompt: 'Sure thing! Here\'s the remaining information:',
                                userInput : parent._storage,
                                stepKey: 'end',
                                fields: parent.renderFields( missingFieldKeys, 'end' )
                            }) );

                            parent.scrollToLastBotMsg();

                        }, 2500 );

                    }

                }
    		});

        },

        // Helper Methods:

            ucFirst: function( str ) {
                return str.replace( /^./, str.substring( 0, 1 ).toUpperCase() );
            },

            scrollToLastBotMsg: function() {
                var $lastBotMsg = this.element.find( '.bubble--bot:last' );
                $( 'html, body' ).animate({
                    scrollTop: $lastBotMsg.offset().top
                }, 500 );
            },

            serializeObject: function( form ) {
                var o = {};
                var a = form.serializeArray();
                $.each(a, function() {
                    if (o[this.name]) {
                        if (!o[this.name].push) {
                            o[this.name] = [o[this.name]];
                        }
                        o[this.name].push(this.value || '');
                    } else {
                        o[this.name] = this.value || '';
                    }
                });
                return o;
            },

            transformInput: function( inputObj ) {

                for ( var field in inputObj ) {

                    if ( !inputObj.hasOwnProperty( field ) ) continue;

                    var value = inputObj[field].trim();

                    if ( 'name' == field ) {

                        var nameParts = value.split( ' ' );
                        inputObj.firstname = this.ucFirst( nameParts[0] );

                        if ( nameParts[1] )
                            inputObj.lastname = this.ucFirst( nameParts[1] );

                        delete inputObj[field];

                    }

                }

                return inputObj;

            }

            /* We might need these later...
            humanizeResponseTime: function( text ) {
                var words = text.split( ' ' );
                var wpm = 55;
                var responseTime = ( ( words.length / wpm ) * 60 ) * 10;
                return responseTime;
            }
            */

    };

    $.fn[pluginName] = function( options ) {
        return this.each( function() {
            if ( !$.data( this, 'plugin_' + pluginName ) ) {
                $.data( this, 'plugin_' + pluginName, new Selby( this, options ) );
            }
        });
    }

    $.fn[pluginName].defaults = {};

})( jQuery, window, document );
