;(function ( $, window, document, undefined ) {

    var pluginName = 'selby',
        defaults = {
            botName: 'Selby',
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
            }
        },
        tpl = {
            bot: Handlebars.compile( '<div class="bubble bubble--bot"><div class="bubble__inner">{{{smartString bot userInput}}}</div></div>' ),
            user: Handlebars.compile( '<form class="bubble bubble--user"><div class="bubble__inner">{{{ smartString prompt userInput }}}{{{fields}}}<input type="hidden" name="step" value="{{stepKey}}"></div></form>' )
        };

    function Plugin( element, options ) {

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
        this._tpl = tpl;
        this._storage = {};

        console.log( this );

        this.init();

    }

    Plugin.prototype.init = function () {

        // Place initialization logic here
        // You already have access to the DOM element and
        // the options via the instance, e.g. this.element
        // and this.options

        var parent = this;

        Handlebars.registerHelper( 'smartString', function( text, userInput ) {
            for ( var field in userInput ) {
                if ( !userInput.hasOwnProperty( field ) ) continue;
                //console.log( '{{' + field + '}}' );
                text = text.replace( '{{' + field + '}}', '<mark>' + userInput[field] + '</mark>' );
            }
            text = text.replace( '{{botName}}', parent.options.botName );
            return new Handlebars.SafeString( text );
        });

        this.element.addClass( 'selby' );
        this.setupListeners();
        this.renderStep();

    };

    Plugin.prototype.serializeObject = function( form ) {
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
    };

    Plugin.prototype.setupListeners = function() {

        var parent = this;

        this.element.on( 'submit', '.bubble--user', function( e ) {

            e.preventDefault();

            var $this = $(this);
            var userInput = parent.serializeObject( $this );

            parent._storage = $.extend( {}, parent._storage, parent.transformInput( userInput ) );
            console.log( parent._storage );

            $this.find( '.bubble__input' ).prop( 'disabled', true );

            parent.renderStep( parent.determineNextStep( parent._questions[userInput.step] ) );

        });

        this.element.on( 'change', '.bubble__input--select, .bubble__input--radio', function( e ) {

            var $this = $(this);
            console.log( $this.prop( 'disabled' ) );
            if ( $this.data( 'proceed-on-change' ) ) {
                var $form = $this.parents( 'form' );
                if ( !$this.prop( 'disabled' ) ) {
                    $form.submit();
                } else {
                    e.preventDefault();
                }
            }

        });

    };


    Plugin.prototype.ucFirst = function( str ) {
        return str.replace( /^./, str.substring( 0, 1 ).toUpperCase() );
    };

    Plugin.prototype.determineNextStep = function( step ) {

        var nextStepKey = '';

        if ( step.next.constructor === Array ) {
            for ( var i = 0; i < step.next.length; i++ ) {
                if ( step.next[i].condition() ) {
                    nextStepKey = step.next[i].key;
                    break;
                }
            }
        } else {
            nextStepKey = step.next;
        }

        return nextStepKey;

    };

    Plugin.prototype.transformInput = function( inputObj ) {

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

    };

    Plugin.prototype.renderFields = function( fieldKeys, stepKey ) {

        var parent = this;
        var html = '';
        var fieldCount = fieldKeys.length;
        var dataAttr = ' data-proceed-on-change="' + ( ( fieldCount === 1 ) ? 'true' : 'false' ) + '"';

        fieldKeys.forEach( function( key ) {

            html += '<div class="bubble__field">';

            var field = parent._fields[key];
            var fieldClass = 'bubble__input bubble__input--' + field.type;
            var commonAttr = ' name="' + key + '" class="' + fieldClass + '" ';

            if ( field.label )
                html += '<label class="bubble__input-label">' + field.label + '</label>';

            switch ( field.type ) {
                case 'text':
                    html += '<input' + commonAttr + ' type="' + field.type + '" placeholder="' + field.placeholder + '">';
                break;
                case 'select':
                    html += '<select' + commonAttr + dataAttr + '>';
                    for ( var item in field.options ) {
                        if ( !field.options.hasOwnProperty( item ) ) continue;
                        html += '<option value="' + item + '">' + field.options[item] + '</option>';
                    }
                    html += '</select>';
                break;
                case 'radio':
                    html += '<div class="bubble__radios">';
                    for ( var item in field.options ) {
                        if ( !field.options.hasOwnProperty( item ) ) continue;
                        html += '<input type="radio"' + commonAttr + dataAttr + 'autocomplete="off" value="' + item + '" id="' + key + '--' + item + '"><label for="' + key + '--' + item + '">' + field.options[item] + '</label>';
                    }
                    html += '</div>';
                break;
            }

            html += '</div>';

        });

        if ( fieldCount > 1 )
            html += '<button type="submit" class="bubble__button">Continue</button>';

        return html;

    };

    Plugin.prototype.renderStep = function ( stepKey ) {

        if ( stepKey == null )
            stepKey = 'start';

        var step = this._questions[stepKey];

        this.element.append( tpl.bot({
            bot: step.bot,
            userInput : this._storage
        }) );

        if ( step.prompt ) {

            var promptData = {
                prompt: step.prompt,
                stepKey: stepKey,
                userInput : this._storage
            };

            if ( step.fields )
                promptData.fields = this.renderFields( step.fields, stepKey );

            this.element.append( tpl.user( promptData ) );

        }

        var $lastBotMsg = this.element.find( '.bubble--bot:last' );

        if ( stepKey !== 'start' ) {
            $( 'html, body' ).animate({
                scrollTop: $lastBotMsg.offset().top
            }, 500 );
        }

    };

    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName,
                new Plugin( this, options ));
            }
        });
    }

})( jQuery, window, document );
