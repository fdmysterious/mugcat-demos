/***************
 * Ballinatone * 
 ***************
 Author      : Florian Dupeyron
 Description : Some fun Synthesis thing with balls
*/

// Possible improvements //
// TODO // Scene managment using Quadtrees to drastically improve performance
// TODO // Clearing only needed rects instead of all the screen ; requires quadtree object managment to be optimized
// TODO // Add some limit to the amount of played sounds, as it causes lags at some points

//////////////////////////////////////////
// Math utilities
//////////////////////////////////////////
var maths = (function(){
    function euclidian_norm( vec2 ) {
        return Math.sqrt( vec2[0] * vec2[0] + vec2[1] * vec2[1] );
    }

    function collides_circle( c1, c2 ) {
        return euclidian_norm( [
                c2.center[0] - c1.center[0],
                c2.center[1] - c1.center[1]
            ]) <= c1.radius + c2.radius
        ;
    }

    return {
        euclidian_norm,
        collides_circle
    }
})();

//////////////////////////////////////////
// Canvas handling facilities
//////////////////////////////////////////
// This class handles simply the creation and
// display of a 2D canvas. It makes it take the full
// size of the wrapper it's put in, and fires a callback
// when the window is resized to update the display.
var Canvas = function( wrapper_id, canvas_id )
{
    console.debug("Creating canvas");
    // Getting DOM related things //
    this.dom = {
        wrapper : document.getElementById( wrapper_id ),
        canvas  : document.getElementById( canvas_id  )
    };
    // Checking stuff
    if( this.dom.wrapper == null || this.dom.canvas == null ) console.error("Some dom element was not found");
    // End of section //

    // Callbacks definition //
    this.callbacks = {
        resize : function()    { console.debug( "Called resize callback !" ); },
        draw   : function( dt ){ console.debug( "Called draw callback !"   ); }
    };
    // End of section //

    // Init canvas properties //
    this.size = { width : 0, height : 0 };
    this.size_update();
    this.ctx = this.dom.canvas.getContext("2d");
    // End of section //

    console.debug( "Successfully created canvas !" );
};

Canvas.prototype.size_update = function() 
{
    // Note // https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Determining_the_dimensions_of_elements
    // Resizing canvas //
    this.size.width  = this.dom.wrapper.clientWidth;
    this.size.height = this.dom.wrapper.clientHeight;
    this.dom.canvas.width  = this.size.width ;
    this.dom.canvas.height = this.size.height;

    console.debug( "Updated canvas size with new size", this.size );
    // End of section //

    // Triggering user resize callback //
    this.callbacks.resize();
    // End of section //
};

Canvas.prototype.draw = function( dt )
{
    // Clearing screen //
    this.ctx.clearRect( 0, 0, this.size.width, this.size.height );
    // End of section //

    // Calling user callback //
    this.ctx.save();
    this.callbacks.draw( dt );
    this.ctx.restore();
    // End of section //
}
//////////////////////////////////////////
// Window resize event optimized handler
//////////////////////////////////////////
// Note // https://developer.mozilla.org/de/docs/Web/Events/resize
var resize_event = (function(){
    let callbacks = [];
    let running   = false;

    function handle() {
        if( !running ) {
            running = true;
            requestAnimationFrame( run_callbacks );
        }
    }

    function run_callbacks() {
        for( let i = 0 ; i < callbacks.length ; i++ ) {
            callbacks[i]();
        }

        running = false;
    }

    function register( clbk ) {
        callbacks.push( clbk );
    }

    ////////////////////////
    return {
        add : function( clbk ) {
            // Dom event //
            if(!callbacks.length) window.addEventListener( "resize", handle );
            // End of section //
            register( clbk );
        }
    }
})();

//////////////////////////////////////////
// On-Screen object class
//////////////////////////////////////////
// This class gives the basic properties to
// implement an object on the screen. As we're only
// tackling with circles here, the bounding box of the
// object is only a circle. But we could add some more
// (square, or a set of circles that makes a complex object).
var SceneObj = function()
{
    // Properties //
    this.boundingBox = {
        center : [0,0],
        radius : 0
    };

    // The previous bounding box is saved so that
    // we can make some fancy checks. For example, a
    // collision occurs only once, when the current bounding
    // box collides when the previous one doesn't.
    this.previousBoundingBox = {
        center : [0,0],
        radius : 0
    };
    // End of section //
    
    // Callbacks //
    this.callbacks = {
        draw       : function( ctx )       {},
        hit        : function( other     ) {}, // When collision with another object
        update     : function( scene, dt ) {},
        save_state : function() {}             // Fired when we need to save the object state before updating
    };
    // End of section //
};

SceneObj.prototype.move = function( dx ) {
    this.boundingBox.center[0] += dx[0];
    this.boundingBox.center[1] += dx[1];
}

SceneObj.prototype.save_state = function() {
    // Saving bounding box //
    this.previousBoundingBox = {
        center : this.boundingBox.center.slice(),
        radius : this.boundingBox.radius
    };
    // End of section //

    // User callback //
    this.callbacks.save_state.call( this );
    // End of section //
}
//////////////////////////////////////////
// Scene Manager
//////////////////////////////////////////
// It's some kind of fancy register in which we tell which objects are on
// the screen, so that we can handle updating, testing collisions, and displaying
// simply.
var Scene = function() {
    this.objects        = [];
}

Scene.prototype.draw = function( ctx ) {
    for( let i = 0 ; i < this.objects.length ; i++ )
        this.objects[i].callbacks.draw.call( this.objects[i], ctx );
}

// Returns wether obj1 collides with obj2 or not, and calling callbacks
Scene.prototype.checkCollision = function( obj1, obj2 ) {
    let extCollide = maths.collides_circle( obj1.previousBoundingBox, obj2.previousBoundingBox );
    let intCollide = maths.collides_circle( obj1.boundingBox        , obj2.boundingBox         );
    let r = !extCollide && intCollide;

    if( r ) {
        // Calling callbacks //
        // Note // using call so that in these functions, this is bind to the object,
        // Hence we can access to their properties with `this` in these functions
        // See : https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Function/call
        obj1.callbacks.hit.call( obj1, obj2 );
        obj2.callbacks.hit.call( obj2, obj1 );
        // End of section //
    }
    return r;
}

// Finds objects colliding with the given position //
Scene.prototype.find = function( pos ) {
    let r = [];
    let c = { center : pos, radius : 0 };

    for( let i = 0 ; i < this.objects.length ; i++ ) {
        if( maths.collides_circle( c, this.objects[i].boundingBox ) ) r.push( this.objects[i] );
    }
    return r;
}

// Checks collision with all other objects (Naive managment)
Scene.prototype.checkAllCollisions = function(obj) {
    for( let i = 0 ; i < this.objects.length ; i++ ) {
        let sobj = this.objects[i];
        if( obj == sobj ) continue; // Do not check the object with itself
        this.checkCollision( obj, sobj );
    }
}

// dt stands for "delta time", the amount of time since the last update
Scene.prototype.update = function( viewport, dt ) {
    for( let i = 0 ; i < this.objects.length ; i++ ) {
        this.objects[i].save_state();
        this.objects[i].callbacks.update.call( this.objects[i], viewport, this, dt );
    }
}

Scene.prototype.register = function( obj ) {
    this.objects.push( obj );
}

Scene.prototype.deregister = function( obj ) {
    // Finding the object in the list and removing it //
    let i = this.objects.indexOf( obj );
    if( i !== -1 ) this.objects.splice( i, 1 );
    // End of section //
}

Scene.prototype.clear = function() {
    this.objects = []; // Doing it the VIOLENT way
};

//////////////////////////////////////////
// AudioContext
//////////////////////////////////////////
// This class initialize the audio context, and gives some tool
// to make some fancy sounds !
var AudioCtx = function() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
}

// This functions fires an Async request to load a sample into
// a buffer
AudioCtx.prototype.fromSampleUrl = function( url, callback ) {
    let req          = new XMLHttpRequest();
    req.responseType = "arraybuffer";
    req.open( "GET", url );

    req.onload = () => {
        let data = req.response;
        this.ctx.decodeAudioData( data, callback );
    };

    req.onerror = ( err ) => {
        alert("Cannot load sound file, see console for info :'(");
    };

    req.send();
};

//////////////////////////////////////////
// Resource loading state manager
//////////////////////////////////////////
// This class is a sort of fancy counter to check
// resources are left to load, so that we can launch
// the application when everything is loaded.
// To do it the pro way, I should have used Promises,
// but I haven't figured a nice architecture to
// use them
// Note // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise
var ResLoadingState = function( howMany, done ) {
    this.count = howMany;
    this.callbacks = {
        done:done
    };
};

ResLoadingState.prototype.loadedOne = function() {
    this.count--;
    console.debug("Remaining to load : ", this.count );
    if( this.count == 0 ) this.callbacks.done.call( this );
};

//////////////////////////////////////////
// Resources
//////////////////////////////////////////
// Some global variable when we have all the main
// resources used through the app. Handles also initial loading
var resources = {
    canvas : null,
    scene  : null,
    audio  : null,
    audioCompressor : null,

    sampleBuf : null,

    init : function( callback ){
        console.log("Init resources");

        let resState = new ResLoadingState( 5, callback );
        resources.canvas = new Canvas( "main-wrapper", "main-canvas" );
        resState.loadedOne();
        resources.scene = new Scene();
        resState.loadedOne();
        resources.audio = new AudioCtx();
        resState.loadedOne();
        resources.audioCompressor = resources.audio.ctx.createDynamicsCompressor();
        resources.audioCompressor.threshold.value = -5;
        resources.audioCompressor.knee.value      = 10;   // So that we do not here the comp. too much
        resources.audioCompressor.ratio.value     = 50;
        resources.audioCompressor.attack.value    = 0;
        resources.audioCompressor.release.value   = 0.25; // 500ms release
        resources.audioCompressor.connect( resources.audio.ctx.destination );
        resState.loadedOne();
        
        resources.audio.fromSampleUrl( "snd/note.wav", function( buf ) {
            resources.sampleBuf = buf;
            resState.loadedOne();
        });
    }
};

//////////////////////////////////////////
// Object factory
//////////////////////////////////////////
// Using the "Factory" design pattern here.
// These functions are used to handle the two kind
// of objects (note balls and moving balls). Then,
// what is returned by this function is functions that
// creates those objects, by ~ extending the SceneObj class.
var object_factory = (function(){
    // Generic //
    // Checks that an object is not to far from the viewport. If so, discards it from the scene
    function check_in_viewport( viewport, scene, dt ) {
        if(
            (Math.abs( this.boundingBox.center[0] - viewport.width  / 2 ) > viewport.width  / 2 + 2 * this.boundingBox.radius) ||
            (Math.abs( this.boundingBox.center[1] - viewport.height / 2 ) > viewport.height / 2 + 2 * this.boundingBox.radius) 
        ) {
            console.debug("Discarding out of the box object");
            scene.deregister(this);
            return false;
        }
        return true;
    }
    // End of section //

    // Ball related functions //
    function ball_update( viewport, scene, dt ) {
        this.move( [this.velocity[0] * dt, this.velocity[1] * dt ] );

        if( check_in_viewport.call( this, viewport, scene, dt ) ) {
            let c      = this.boundingBox.center;
            let cp     = this.previousBoundingBox.center;

            let rad    = this.boundingBox.radius; //Little shortcuts
            let radp   = this.previousBoundingBox.radius;
            
            // Screen collisions //
            // The fancy condition below checks that the current boundingBox
            // has a part outside the screen and the preious doesn't
            function viewport_check( idx, dim ) {
                if(
                       ( ( c[idx] - rad < 0   ) && ( cp[idx] - radp >= 0   ) )
                    || ( ( c[idx] + rad > dim ) && ( cp[idx] + radp <= dim ) )
                )
                {
                    this.velocity[idx] *= -1;
                }
            }

            viewport_check.call( this, 0, viewport.width  );
            viewport_check.call( this, 1, viewport.height );
            // end of section //

            // Objects collision //
            scene.checkAllCollisions( this );
            // End of section //
        }
    }

    function ball_draw( ctx ) {
        ctx.strokeStyle = "white";
        ctx.lineWidth   = 5;
        ctx.beginPath();
        ctx.arc( this.boundingBox.center[0], this.boundingBox.center[1], this.boundingBox.radius, 0, 2 * Math.PI );
        ctx.stroke();
    }
    // End of section //

    // Sound object related functions //
    function sound_draw( ctx ) {
        ctx.strokeStyle = "#f18f01";
        ctx.lineWidth = 5;
        ctx.fillStyle = "rgba( 241, 143, 1, " + Number( this.colorStep / 255 ).toString() + ")";

        ctx.beginPath();
        ctx.arc( this.boundingBox.center[0], this.boundingBox.center[1], this.boundingBox.radius, 0, 2 * Math.PI );
        ctx.fill();
        ctx.stroke();
    }

    function sound_update( viewport, scene, dt ) {
        // Update color //
        if( this.colorStep > 0 ) {
            this.colorStep -= dt / this.boundingBox.radius * 20; // Found this emprirically
            if(this.colorStep < 0 ) this.colorStep = 0;          // To avoid some kind of error
        }
        // End of section //
        //check_in_viewport.call( this, viewport, scene, dt );
    }

    function sound_hit( other ) {
        // NOTE // https://developer.mozilla.org/de/docs/Web/API/StereoPannerNode
        //console.log("Sound hit");
        this.colorStep = 255;

        // Play that sample ! //
        let audioObj                = this.audioCtx.ctx.createBufferSource();
        audioObj.playbackRate.value = Math.pow( 2, this.pitch / 12 ); // Converting the note number to playback rate, hence the frequency multiplier coef.
        audioObj.buffer             = resources.sampleBuf;
        audioObj.loop               = false;

        let audioStereo       = this.audioCtx.ctx.createStereoPanner();
        audioStereo.pan.value = ( this.boundingBox.center[0] / resources.canvas.size.width ) * 2 - 1;

        let audioVol          = this.audioCtx.ctx.createGain();
        audioVol.gain.value   = ( this.boundingBox.center[1] / resources.canvas.size.height );

        audioObj.connect( audioStereo );
        audioStereo.connect( audioVol );
        audioVol.connect( this.audioOutput );
        audioObj.start();
        // End of section //
    }
    // End of section //

    return {
        ball : function( center, radius , velocity) {
            let b = new SceneObj();
            b.boundingBox.center = center;
            b.boundingBox.radius = radius;
            b.velocity = velocity;

            b.callbacks.draw   = ball_draw;
            b.callbacks.update = ball_update;

            return b;
        },

        sound_ball : function( center, pitch, audioCtx ) {
            let b = new SceneObj();
            b.pitch = pitch;

            b.boundingBox.center = center;
            b.boundingBox.radius = 210 - Math.min( 100 * Math.pow( 2, pitch / 24 ), 200 ); // Has some security here : limits the pitch range to avoid negative radius
            b.colorStep = 0;
            
            // Audio stuff //
            b.audioCtx    = audioCtx;
            b.audioOutput = resources.audioCompressor;
            // End of section //

            b.callbacks.draw   = sound_draw;
            b.callbacks.hit    = sound_hit ;
            b.callbacks.update = sound_update;
            b.hit = sound_hit;
            return b;
        }
    }
})();

//////////////////////////////////////////////////////////////////////

//////////////////////////////////////////
// Main program
//////////////////////////////////////////
window.onload = function() {
    function main() {

        // Creates a moving ball //
        function do_ball( pos ) {
            //let radius = Math.random() * 90 + 10; //r in [10, 100[;
            let radius = controls.get("radius");
            let vel = [
                controls.get("vel_x"),
                controls.get("vel_y")
            ]

            console.debug("Creating ball", radius, pos, vel );

            resources.scene.register( object_factory.ball(
                pos,
                radius,
                vel
            ));
        }

        // Creates a note ball //
        function do_sound( pos ) {
            let pitch = controls.get("pitch");
            console.debug("Creating sound ball", pitch, pos );

            let obj = object_factory.sound_ball(
                pos,
                pitch,
                resources.audio,
                resources.sampleBuf
            );

            resources.scene.register(obj);
            if( controls.get("playOnCreate") ) obj.hit();
        }
        // End of section //

        // registering callbacks //
        resources.canvas.callbacks.draw = function( dt ) {
            resources.scene.draw( resources.canvas.ctx );
        };

        resources.canvas.callbacks.resize = function() {
            resources.canvas.draw();
        };
        // End of section //
        
        // registering events //
        let mousePos = [resources.canvas.size.width / 2,resources.canvas.size.height / 2];
        resize_event.add( () => {
            resources.canvas.size_update();
        });

        resources.canvas.dom.canvas.addEventListener("mousemove", function( ev ) {
            mousePos[0] = ev.clientX;
            mousePos[1] = ev.clientY;
        });

        resources.canvas.dom.canvas.addEventListener("click", function( ev ) {
            let objs = resources.scene.find( [ ev.clientX, ev.clientY ] );
            for( let i = 0 ; i < objs.length ; i++ ) resources.scene.deregister( objs[i] );
        });

        document.addEventListener("keydown", function( ev ) {
            var actions = {
                "f" : () => { do_ball ( mousePos.slice() ); },
                "g" : () => { do_sound( mousePos.slice() ); },
                "r" : () => { resources.scene.clear();      }
            };

            if( ev.key in actions ) actions[ev.key]();
        });
        // End of section //

        var start = 0;
        function loop( timestamp ) {
            if(!start) start = timestamp;
            let dt = timestamp - start; // Computing time passed since last frame
            start = timestamp;

            resources.scene.update( resources.canvas.size, dt );
            resources.canvas.draw( dt );
            requestAnimationFrame( loop );
        }
        requestAnimationFrame( loop );
    }

    controls.init(); // See controls.js
    resources.init( main ); // Init the resources and calls main when finished
};
