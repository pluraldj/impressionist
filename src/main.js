var $ = require('jquery');
var SimplexNoise = require('simplex-noise');
var Vector2 = require('vecmath').Vector2;

var smoothstep = require('interpolation').smoothstep;
var lerp = require('interpolation').lerp;

var NoiseMap = require('./util/NoiseMap');
var imagedata = require('./util/imagedata');

var Particle = require('./impression').Particle;

var dat = require('dat-gui');

var tmp = new Vector2();
var tmp2 = new Vector2();
var raf = require('raf.js');


//polyfill
if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia 
                        || navigator.webkitGetUserMedia 
                        || navigator.mozGetUserMedia 
                        || navigator.msGetUserMedia;
if (!window.URL)
    window.URL = window.URL 
                    || window.webkitURL 
                    || window.mozURL 
                    || window.msURL;


$(function() {
	// var canvas = $("<canvas>").appendTo(document.body)[0];
	var canvas = $("<canvas>")[0];
	var width = 900,
		height = 535;

	var minimal = !!$(document.body).data("minimal");

	var previewCanvas = $("<canvas>").appendTo(document.body)[0],
		previewWidth = Math.max(256, ~~(width/1)),
		previewHeight = ~~(previewWidth * 1/(width/height)),
		previewContext = previewCanvas.getContext("2d");

	previewCanvas.width = previewWidth;
	previewCanvas.height = previewHeight;

	canvas.width = width;
	canvas.height = height;


	var context = canvas.getContext("2d");
	var noiseSize = 256;
	var noise = new NoiseMap(noiseSize);
	noise.scale = 3.2;
	// noise.seamless = true;
	noise.smoothing = true;
	noise.generate();


	var image = new Image();
	image.onload = handleImageLoad;
	image.src = minimal ? "img/sun.png" : "img/skyline2.png";


	var imagePixels;

	var options = {
		scale: noise.scale,
		shift: false,
		painting: true,

		//stroke options
		count: 500,
		length: 33,
		thickness: 12.0,
		speed: 1.0,
		life: 1.0, 
		alpha: 0.25,
		round: true,
		motion: true,
		angle: 1,

		//color
		useOriginal: true,
		hue: 70,
		saturation: 1.0,
		lightness: 1.0,
		grain: minimal ? .5 : .7,
		darken: !minimal,
		

		background: minimal ? '#f1f0e2' : '#2f2f2f',
		clear: clear,
		animate: animateIn,
		viewOriginal: false,
		exportImage: saveImage.bind(this)
	};

	var noiseOverlay = $('<div>').appendTo(document.body).addClass('noise overlay').css({
		width: previewWidth,
		height: previewHeight,
		opacity: options.grain*0.2
	});
	$(document.body).css('background', '#252525');

	var originalImage = $(image).clone().appendTo(document.body).css({
		visibility: 'hidden'
	}).addClass('overlay original').css({
		width: previewWidth,
		height: previewHeight
	});

	
	var gui;
	setupGUI();


	var particles = [],
		count = 500,
		step = 0,
		time = 0,
		mouse = new Vector2();

	var video, playing=false;
	loadVideo();

	var startTime = Date.now(), webcamTimer = 0,
		webcamDelay = 500;

	setupParticles();

	animateIn();

	if (minimal) {
		$('#text').html('generative painting in the impressionist style<p>by Matt DesLauriers</p>')
			.css("top", 10).css("color", "#2f2f2f").css("z-index", 1000);
		$('.dg.ac').hide();
		$('canvas, div.noise').on("tap mousedown", function(ev) {
			ev.preventDefault();
			clear();

			options.painting = false;
			previewContext.drawImage(canvas, 0, 0, previewWidth, previewHeight);
			noise.randomize();
			noise.generate();
			options.scale = Math.random()*2+1
			TweenLite.delayedCall(0.5, function() {
				options.painting = true;
				animateIn();
			}.bind(this));
		}).on('touchmove', function(ev) {
			// ev.preventDefault()
		});

		// window.addEventListener("orientationchange", function() {
		// 	window.scrollTo(0, 0);
		// })
	}
	if (window.devicePixelRatio === 2) {
		$('div.noise').css("background-size", "128px 128px");
	}

	function handleImageLoad() {
		imagePixels = imagedata.getImageData(image).data;
				
		// context.fillStyle = '#ebebeb';
		clearRect();


		// context.globalAlpha = 1;
		// context.drawImage(image, 0, 0);

		requestAnimationFrame(render);
	}

	function updateAnimation() {

		//wtf dat.gui...
		for (var k in gui.__folders.stroke.__controllers) {
			gui.__folders.stroke.__controllers[k].updateDisplay();
		}
		for (var k in gui.__folders.color.__controllers) {
			gui.__folders.color.__controllers[k].updateDisplay();
		}
	}

	function saveImage() {
		// options.painting = false;

		// for (var k in gui.__folders.canvas.__controllers) {
		// 	gui.__folders.canvas.__controllers[k].updateDisplay();
		// }
		
		var dataURL = canvas.toDataURL("image/png");

		var displayWidth = width,
			displayHeight = height;
		var imageWindow = window.open("", "fractalLineImage",
                              "left=0,top=0,width="+800+",height="+500+",toolbar=0,resizable=0");
		imageWindow.document.write("<title>Export Image</title>")
		imageWindow.document.write("<img id='exportImage'"
		                             + " alt=''"
		                             + " height='" + displayHeight + "'"
		                             + " width='"  + displayWidth  + "'"
		                             + " style='position:absolute;left:0;top:0'/>");
		imageWindow.document.close();
		var exportImage = imageWindow.document.getElementById("exportImage");
		exportImage.src = dataURL;
	}

	function animateIn() {
		TweenLite.killTweensOf(options);
		updateAnimation();

		// TweenLite.to(options, 1.0, {
		// 	grain: 1.0,
		// 	onUpdate: updateGrain.bind(this),
		// });
	
		if (minimal) //god this code is getting nasty..
            animateIn2();
        else
            animateIn1();
	}

    function animateIn1() {
		TweenLite.killTweensOf(options);
		updateAnimation();

		// TweenLite.to(options, 1.0, {
		// 	grain: 1.0,
		// 	onUpdate: updateGrain.bind(this),
		// });

		TweenLite.fromTo(options, 1.0, {
			thickness: 30,
		}, {
			thickness: 20,
			ease: Expo.easeOut,
			delay: 2.0,
		})
		TweenLite.fromTo(options, 3.0, {
			length: 23,
			alpha: 0.3,
			life: 0.7,
			// round: true,
			speed: 1,
		}, {
			life: 0.5,
			alpha: 0.2,
			length: 70,
			speed: 0.6,
			delay: 1.0,
			// ease: Expo.easeOut,
			onUpdate: updateAnimation.bind(this)
		});
		TweenLite.to(options, 3.0, {
			thickness: 7.0,
			length: 30,
			// onComplete: function() {
			// 	options.round = true;
			// },
			delay: 4.0,
		});
		TweenLite.to(options, 1.0, {
			length: 10,
			delay: 6.0,
		})
	}

	function animateIn2() {
		var start = 0.0;
		TweenLite.fromTo(options, 1.0, {
			thickness: 40,

		}, {
			thickness: 10,
			ease: Expo.easeOut,
			delay: start+2.0,
		})
		TweenLite.fromTo(options, 3.0, {
			length: 23,
			alpha: 0.3,
			life: 0.7,
			// round: true,
			speed: 1,
		}, {
			life: 0.5,
			alpha: 0.2,
			length: 90,
			speed: 0.6,
			delay: start+1.0,
			// ease: Expo.easeOut,
			onUpdate: updateAnimation.bind(this)
		});
		TweenLite.to(options, 3.0, {
			thickness: 5.0,
			length: 40,
			// onComplete: function() {
			// 	options.round = true;
			// },
			delay: start+4.0,
		});
		TweenLite.to(options, 1.0, {
			length: 30,
			delay: start+6.0,
		})
		TweenLite.to(options, 1.0, {
			thickness: 3,
			delay: start+7.0,
		});
		TweenLite.to(options, 1.0, {
			thickness: 3,
			delay: start+7.0,
		});
	}

	function setupParticles() {
		particles.length = 0;
		for (var i=0; i<count; i++) {
			particles.push(new Particle().reset(width, height).random());
		}
	}

	function updateGrain() {
		noiseOverlay.css('opacity', options.grain*0.2);
	}

	function setupGUI() {
		gui = new dat.GUI();

		var motion = gui.addFolder('noise');	
		motion.add(options, 'shift');
		var noiseScale = motion.add(options, 'scale', 0.1, 5);

		noiseScale.onFinishChange(function(value) {
			noise.scale = options.scale;
			noise.generate();
		});

		var stroke = gui.addFolder('stroke');
		stroke.add(options, 'count', 1, 1500).onFinishChange(function(value) {
			count = ~~value;
			setupParticles();
		});

		stroke.add(options, 'length', 0.1, 100.0);
		stroke.add(options, 'thickness', 0.1, 50.0);
		stroke.add(options, 'life', 0.0, 1.0);
		stroke.add(options, 'speed', 0.0, 1.0);
		stroke.add(options, 'alpha', 0.0, 1.0);
		stroke.add(options, 'angle', 0.0, 2.0);
		stroke.add(options, 'round');
		stroke.add(options, 'motion');
		stroke.open();

		var color = gui.addFolder('color');
		color.add(options, 'useOriginal');
		color.add(options, 'darken');
		color.add(options, 'hue', 0, 360);
		color.add(options, 'saturation', 0, 1.0);
		color.add(options, 'lightness', 0, 1.0);
		color.add(options, 'grain', 0, 1.0).onFinishChange(updateGrain.bind(this));
		color.open();

		var canvas = gui.addFolder('canvas');

		canvas.add(options, 'painting');
		canvas.addColor(options, 'background');
		canvas.add(options, 'viewOriginal').onFinishChange(function(value) {
			originalImage.css('visibility', value ? 'visible' : 'hidden');
		});
		canvas.add(options, 'animate');
		canvas.add(options, 'clear');
		canvas.add(options, 'exportImage');
		canvas.open();



	}

	function clearRect() {
		context.globalAlpha = 1.0;
		context.fillStyle = options.background;
		context.fillRect(0, 0, width, height);
	}

	function clear() {
		TweenLite.killTweensOf(options);
		clearRect();
		setupParticles();
	}

    function loadVideo() {
    	//console.log("TRYING");
        if (navigator.getUserMedia && window.URL && window.URL.createObjectURL) {
        	//console.log("HELLOOOO");
            //create a <video> element
            video = document.createElement("video");
            video.setAttribute("autoplay", "");
            video.width = width;
            video.height = height;
            video.style.background = "black";
            // document.body.appendChild(video);

            video.addEventListener("play", function() {
            	playing = true;
            	clear();
            	animateIn();
            }, true);

            console.log("GETTING VIDEO");

            //disabled for now.
            // navigator.getUserMedia({video: true}, function(stream) {
            //     video.src = window.URL.createObjectURL(stream);
            //     hasVideo = true;

            // }, function() {
            //     //err handling...
            // });

        }
    }
//more failed experiments..
	window.addEventListener("mousemove", function(ev) {
		mouse.set(ev.clientX, ev.clientY);
	});


    var strokeCount = 0;
	function render() {
		requestAnimationFrame(render);

		var now = Date.now();
		var delta = now - startTime;
		startTime = now;
		
		time+=0.1;
		step++;



		if (!options.painting )
			return;

		webcamTimer += delta;
		if (webcamTimer > webcamDelay && playing) {
			// console.log("TEST");
			webcamTimer = 0;
			imagePixels = imagedata.getImageData(video).data;
		}

		// if (step % 100 === 0) 
		// 	console.log(strokeCount);

		if (options.shift && step % 20 === 0) {
			noise.offset+=.01;
			noise.generate();
		}

		// context.globalAlpha = 0.1;
		// context.fillStyle = 'white';
		// context.fillRect(0, 0, width, height);

		// context.clearRect(0, 0, width, height);
		var imageWidth = image.width;

		// for (var y=0; y<height; y++) {
		// 	for (var x=0; x<width; x++) {
		// 		var sampleWidth = width,
		// 			sampleHeight = width;

		// 		var pxIndex = (x + (y * imageWidth))*4;
		// 		var red = imagePixels[ pxIndex ],
		// 			green = imagePixels[ pxIndex + 1],
		// 			blue = imagePixels[pxIndex + 2];
		// 		context.fillStyle = 'rgb('+red+', '+green+', '+blue+')';

		// 		// var n = noise.sample(x*(noiseSize/sampleWidth), y*(noiseSize/sampleHeight));
		// 		// context.fillStyle = 'hsl(0, 0%, '+((n/2+0.5)*100)+'%)';
		// 		context.fillRect(x, y, 1, 1);
		// 	}
		// }
		

		for (var i=0; i<particles.length; i++) {
			var p = particles[i];

			if (p.motion)
				p.position.add(p.velocity);

			//add in our motion
			var px = ~~p.position.x,
				py = ~~p.position.y;

			var sampleWidth = width,
				sampleHeight = width;

			var n = noise.sample(px*(noiseSize/sampleWidth), py*(noiseSize/sampleHeight));

			var angle = n * Math.PI * 2 * options.angle;
			
			tmp.set( Math.cos(angle), Math.sin(angle) );
			p.velocity.add(tmp);
			p.velocity.normalize();

			// if (p.position.x > width || p.position.x < 0 || p.position.y > height || p.position.y < 0 ) {
			// 	p.reset();
			// }

			if (/*p.position.x < 0 || */p.position.x > width || p.position.y > height || p.position.y < 0) {
				p.reset();
			}

			var rot = (n/2+0.5);
			var hue = (noise.offset % 50)/50 * rot;

			var imgX = px,
				imgY = py;
			// var imgX =px-(mouse.x),
			// 	imgY = py-(mouse.y);
			var pxIndex = (imgX + (imgY * imageWidth))*4;
			var red = imagePixels[ pxIndex ],
				green = imagePixels[ pxIndex + 1],
				blue = imagePixels[pxIndex + 2];

			// var alpha = Math.sin(time*0.1)*100+100;
			var alpha = options.hue;

			// CIE luminance for the RGB
			var val = 0.2126 * (red/255) + 0.7152 * (green/255) + 0.0722 * (blue/255);
			

			var brightness = options.darken ? val : 1.0;
			
			// context.strokeStyle = 'hsl('+lerp(alpha, alpha-100, rot)+', '+(1-red/255)*lerp(0.7, 1, rot)*100+'%, '+lerp(0.45, 0.55, rot)*100+'%)';
			if (options.useOriginal)
				context.strokeStyle = 'rgb('+~~(red*brightness)+', '+~~(green*brightness)+', '+~~(blue*brightness)+')';
			else
				context.strokeStyle = 'hsl('+lerp(alpha, alpha-100, rot)+', '+(1-val)*lerp(0.2, 0.9, rot)*options.saturation*100+'%, '+(val)*lerp(0.45, 1, rot)*brightness*options.lightness*100+'%)';

			var s = 2;

			// context.fillStyle = 'black';
			// context.fillRect(p.position.x, p.position.y, 1, 1);

		 	context.beginPath();
			context.moveTo(p.position.x, p.position.y);
			var lineSize = (options.length*(n/2+0.5)*p.size);
			tmp.copy(p.position);
			tmp2.copy(p.velocity).scale(lineSize);
			tmp.add(tmp2);
			context.lineTo(tmp.x, tmp.y);
			context.stroke();
			context.globalAlpha = options.alpha;
			context.lineWidth = options.thickness*(n/2+0.5);
			context.lineCap = options.round ? 'round' : 'square';

			p.size += 0.1 * options.speed * p.speed;
			if (p.size >= options.life) {
				p.reset(width, height).random();	
			}
			
		}

		// strokeCount += particles.length;


		previewContext.drawImage(canvas, 0, 0, previewWidth, previewHeight);
	}
});