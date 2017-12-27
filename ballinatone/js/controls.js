/***************
 * controls.js *
 ***************
 Author      : Florian Dupeyron
 Description : Handling of controls available at the top right of the screen.
*/

// TODO // Bug // Focus out of the number box when finished typing

var controls = (function(){
    var register    = {};

    //////////////////////////////////////////
    // Scales generation pattern
    //////////////////////////////////////////
    // The number are semitones
    const pitch_scales = {
        "pentatonic"   : [ 0, 2, 4, 7, 9 ],
        "chromatic"    : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ],
        "quartertones" : [ 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5 ],
        "horror !"     : [ 0, 0.5, 6, 6.5, 11, 11.5 ] // DIABOLUS IN MUSICAAA !!!
    };

    //////////////////////////////////////////
    // Control class
    //////////////////////////////////////////
    // Describes the basic properties of a control
    var Control = function() {
        this.callbacks = {
            get   : function(){},
            mount : function( wrapper ){} // Mount the control onto the page
        };

        this.dom = {};
    }

    Control.prototype.get = function() {
        return this.callbacks.get.call( this );
    }

    Control.prototype.mount = function( wrapper ) {
        this.callbacks.mount.call( this, wrapper );
    }

    //////////////////////////////////////////
    // Controls factory
    //////////////////////////////////////////
    var generate = {
        range : function( label, min, max, defaultValue ) {
            // Create DOM elements //
            let dom_range = document.createElement("input");
            dom_range.className = "range";
            dom_range.setAttribute( "type" , "range" );
            dom_range.setAttribute( "min"  , min.toString() );
            dom_range.setAttribute( "max"  , max.toString() );
            dom_range.setAttribute( "step" , "0.05" );
            dom_range.setAttribute( "value", defaultValue );

            let dom_number = document.createElement("input");
            dom_number.className = "number";
            dom_number.setAttribute( "type" , "number" );
            dom_number.setAttribute( "min"  , min.toString() );
            dom_number.setAttribute( "max"  , max.toString() );
            dom_number.setAttribute( "step" , "0.5" );
            dom_number.setAttribute( "value", defaultValue );

            let dom_random = document.createElement("input");
            dom_random.setAttribute( "type" , "checkbox" );
            dom_random.checked = true;
            dom_random.setAttribute( "value", "1");

            let dom_random_label = document.createElement("label");
            dom_random_label.innerHTML = "randomize";

            let dom_random_wrapper = document.createElement("div");
            dom_random_wrapper.appendChild( dom_random );
            dom_random_wrapper.appendChild( dom_random_label );

            let dom_label = document.createElement("span");
            dom_label.innerHTML = label;

            let dom_label_wrapper = document.createElement("div");
            dom_label_wrapper.className = "value_label";
            dom_label_wrapper.appendChild( dom_label          );
            dom_label_wrapper.appendChild( dom_random_wrapper );

            let dom_wrapper = document.createElement("div");
            dom_wrapper.className = "value";

            dom_wrapper.appendChild( dom_range  );
            dom_wrapper.appendChild( dom_number );
            // End of section //

            // Add events //
            dom_range.addEventListener ( "change", () => { dom_number.value = dom_range.value  } );
            dom_number.addEventListener( "change", () => { dom_range.value  = dom_number.value } );
            // End of section //

            // Create control //
            let c = new Control();
            c.dom = {
                range   : dom_range,
                number  : dom_number,
                wrapper : dom_wrapper,
                label   : {
                    elem    : dom_label,
                    wrapper : dom_label_wrapper
                },

                random : {
                    wrapper  : dom_random_wrapper,
                    label    : dom_random_label,
                    checkbox : dom_random
                }
            };

            c.callbacks.get   = function() {
                let randomize = this.dom.random.checkbox.checked;
                if( randomize ) {
                    let val = Math.random() * ( max - min + 1 ) + min; // adding +1 so that max is included in the range

                    this.dom.number.value = val;
                    this.dom.range.value  = val;
                    return val;
                }
                else            return Number(this.dom.number.value);
            }; // TODO // Consistency check

            c.callbacks.mount = function( wrapper ) {
                wrapper.appendChild( this.dom.label.wrapper  );
                wrapper.appendChild( this.dom.wrapper        );
            };
            // End of section //

            return c;
        },

        range_pitch : function( label, defaultValue ) {
            // Creating range control //
            let c = generate.range( label, -24, 24, defaultValue );
            // End of section //

            // Adding DOM select //
            let dom_select_wrapper     = document.createElement("div");
            let dom_select_label       = document.createElement("label");
            dom_select_label.innerHTML = "Randomize scale&nbsp;";
            
            // -- Creating little code shortcut
            function create_option( value, text ) {
                let opt         = document.createElement("option");
                opt.value       = value;
                opt.textContent = text;
                return opt;
            }

            let dom_select_obj = document.createElement("select");
            for( let sc in pitch_scales ) {
                dom_select_obj.appendChild( create_option(sc, sc) );
            }

            dom_select_wrapper.appendChild( dom_select_label );
            dom_select_wrapper.appendChild( dom_select_obj   );

            c.dom.scale = {
                wrapper : dom_select_wrapper,
                select  : dom_select_obj
            };
            // End of section //

            // Modifying callbacks //
            c.callbacks.range_get = c.callbacks.get;
            c.callbacks.get = function() {
                let randomize = this.dom.random.checkbox.checked;
                if( randomize ) {
                    let sc  = pitch_scales[ this.dom.scale.select.value ];
                    let idx = Math.floor( Math.random() * sc.length );
                    let val = sc[idx] + 12 * (Math.round( Math.random() * 2 ) - 1);
                    val = Math.max( -24, Math.min( val, 24 ) ) // Clamp value in accepted range

                    this.dom.number.value = val;
                    this.dom.range.value  = val;
                    return val;
                }
                else            return Number(this.dom.number.value);
            }

            c.callbacks.mount_range = c.callbacks.mount;
            c.callbacks.mount = function( wrapper ) {
                c.callbacks.mount_range.call( this, wrapper );
                wrapper.appendChild( this.dom.scale.wrapper );
            }
            // End of section //
            return c;
        },

        checkbox : function( label, defaultValue ) {
            // Dom creation //
            let dom_wrapper      = document.createElement("div")
            let dom_label        = document.createElement("label");
            dom_label.innerHTML  = label;

            let dom_checkbox     = document.createElement("input");
            dom_checkbox.type    = "checkbox";
            dom_checkbox.value   = "1";
            dom_checkbox.checked = defaultValue;

            dom_wrapper.appendChild( dom_label );
            dom_wrapper.appendChild( dom_checkbox );
            // End of section //

            // Control object //
            let c = new Control();
            c.dom = {
                wrapper  : dom_wrapper,
                checkbox : dom_checkbox
            };

            c.callbacks.get = function() {
                return this.dom.checkbox.checked;
            }

            c.callbacks.mount = function( wrapper ) {
                wrapper.appendChild( this.dom.wrapper );
            }
            // End of section //

            return c;
        },

        file : function( label ) {
            // Dom creation //
            let dom_wrapper = document.createElement("div");
            let dom_label   = document.createElement("label");
            dom_label.innerHTML = label;

            let dom_file = document.createElement("input");
            dom_file.type = "file";

            dom_wrapper.appendChild( dom_label );
            dom_wrapper.appendChild( dom_file  );
            // End of section //
            
            // Control object //
            let c = new Control();
            c.dom = {
                wrapper : dom_wrapper,
                file    : dom_file
            };

            c.callbacks.mount = function( wrapper ) {
                wrapper.appendChild( this.dom.wrapper );
            }

            c.callbacks.changed = function( newVal ) {}
            // End of section //

            // Events //
            dom_file.addEventListener( "change", () => {
                c.callbacks.changed( dom_file.value );
            });
            // End of section //

            return c;
        }
    };

    //////////////////////////////////////////
    // Register manipulation
    //////////////////////////////////////////
    function add( container, name, ctrl ) {
        register[ name ] = ctrl; // Add to register

        // Creating control wrapper element //
        let wrapper = document.createElement("div");
        wrapper.className = "control";
        ctrl.mount( wrapper );   // Mount it to the DOM
        // End of section //

        container.appendChild( wrapper );
    }

    function get( name ) {
        return register[name].get();
    }

    function reg( name ) {
        return register[name];
    }

    //////////////////////////////////////////
    // init function
    //////////////////////////////////////////
    function init() {
       let ctrlWrapper = document.getElementById("controls"); 
        add( ctrlWrapper, "pitch", generate.range_pitch( "Pitch", 0 ) );
        add( ctrlWrapper, "radius", generate.range("Radius", 10, 50, 10) );

        add( ctrlWrapper, "vel_x", generate.range( "Velocity X", -0.6, 0.6, 0.1 ) );
        add( ctrlWrapper, "vel_y", generate.range( "Velocity Y", -0.6, 0.6, 0.1 ) );

        add( ctrlWrapper, "playOnCreate", generate.checkbox( "Sound on create", true ) );
    }

    return {
        init,
        get,
        reg,
        register
    }
})();
