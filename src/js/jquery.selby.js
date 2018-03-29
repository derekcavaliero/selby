;(function ( $, window, document, undefined ) {

    var pluginName = 'selby',
        defaults = {
            botName: 'Selby',
            dataEndpoint: false,
            fields: {
                name: {
                    type: 'text',
                    placeholder: 'First and last name'
                }
            },
            questions: {
                start: {
                    bot: 'Hey there, I\'m {{botName}}! I might look like Derek, but im just a machine living in a human\'s world. <strong>Now that you know my name, what\'s yours?</strong>',
                    prompt: 'Hey {{botName}}, nice to meet you!<br> <strong>My name is</strong>',
                    fields: [
                        'name'
                    ]
                }
            },

            // Global callbacks:
            dataFilter: null,          // function( data ) { return data; }
            onStepReady: null,         // function( $prompt ) {}
            onComplete: null           // @TODO: integrate these
        },
        tpl = {
            bot: Handlebars.compile( '<div class="bubble bubble--bot"><div class="bubble__inner">{{{smartString bot userInput}}}</div></div>' ),
            user: Handlebars.compile( '<form class="bubble bubble--user"><div class="bubble__inner">{{{ smartString prompt userInput }}}{{{fields}}}<input type="hidden" name="step" value="{{stepKey}}"></div></form>' )
        };


    function Selby( element, options ) {

        this.element = $( element );

        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend( true, {}, defaults, options );

        this._defaults = defaults;
        this._fields = this.options.fields;
        this._questions = this.options.questions;
        this._name = pluginName;
        this._tpl = tpl; // @TODO: Make the templates configurable inside options object
        this._storage = {};

        this.init();

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

                // @TODO: check step objeect fields array vs. storage to see if we're asking for data we either already have (remove the field keys if so)

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

            var $lastBotMsg = this.element.find( '.bubble--bot:last' );

            if ( stepKey !== 'start' ) {
                $( 'html, body' ).animate({
                    scrollTop: $lastBotMsg.offset().top
                }, 500 );
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

            if ( step.sendData === true || this._questions[nextStepKey].sendData === true ) {
                this.processData();
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

        processData: function () {

            // @TODO: allow user to filter datapayload prior to sending to endpoint.
            var parent = this;
            var url = this.options.dataEndpoint;
            var payload = this._storage;

            delete payload.step;

            if ( this.options.dataFilter.constructor === Function )
                payload = this.options.dataFilter( payload );

            $.ajax({
    			url: url,
                method: 'POST',
                type: 'json',
    			data: payload,
    			success: function( data ) {

                    parent.element.append( tpl.bot({
                        bot: '<strong>Thanks {{firstname}}, you\'re all set!</strong> Please give us some time to process your request. You can generally expect a response within a day or two.',
                        userInput : parent._storage
                    }) );

                    // @TODO: Add tracking and or data callback here.
    			},
    			error: function( jqXHR, textStatus, errorThrown ) {
                    // @TODO: Add error tracking and or data callback here.
    			},
    			beforeSend: function( xhr, opts ) {

                    parent.element.append( tpl.bot({
                        bot: '<strong>Hang tight!</strong> I\'m processing your information. This should only take a moment.',
                        userInput : parent._storage
                    }) );

                    var requiredFields = parent.checkRequiredFields();

                    //console.log( requiredFields );

                    if ( requiredFields.length > 0 ) {

                        xhr.abort();

                        parent.element.append( tpl.bot({
                            bot: '<strong>Sorry {{firstname}}</strong> It looks like I am missing some required information to process your request. Can you please provide the following information?',
                            userInput : parent._storage
                        }) );

                        parent.element.append( tpl.user({
                            prompt: 'Sure thing! Here\'s the remaining information:',
                            userInput : parent._storage,
                            stepKey: 'end',
                            fields: parent.renderFields( requiredFields, 'end' )
                        }) );

                    }

                }
    		});

        },

        // Helper Methods:

            ucFirst: function( str ) {
                return str.replace( /^./, str.substring( 0, 1 ).toUpperCase() );
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

            },

            // humanizeResponseTime: function( text ) {
            //     var words = text.split( ' ' );
            //     var wpm = 55;
            //     var responseTime = ( ( words.length / wpm ) * 60 ) * 10;
            //     return responseTime;
            // }

    };

    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if ( !$.data( this, 'plugin_' + pluginName ) ) {
                $.data( this, 'plugin_' + pluginName, new Selby( this, options ) );
            }
        });
    }

})( jQuery, window, document );
