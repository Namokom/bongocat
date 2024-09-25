const { drawArm } = require(__dirname + '/kuvster');
const jsconfig = require('electron-json-config');
const { ipcRenderer } = require('electron');
const fs = require('fs');

let config;
let canvas, ctx;
let images = ['/img/mousebg.png', '/img/up.png', '/img/mouse.png',
    '/img/left.png', '/img/right.png', '/img/forward.png', '/img/back.png',
    '/img/wave.png', '/img/border.png', '/img/mouth.png', 
    '/img/mouselr.png','/img/mouser.png', '/img/mousel.png'];
let hand = 1;
let keysDown = new Set();
let leftKeys, rightKeys, forwardKeys, backKeys, waveKeys;
let mouseX, mouseY;
let volume = 0;

// Click state variables
let isLeftClick = false;
let isRightClick = false;

const BG = 0; const UP = 1; const MOUSE = 2;
const LEFT = 3; const RIGHT = 4; const FORWARD = 5; const BACK = 6;
const WAVE = 7; const BORDER = 8; const MOUTH = 9;
const MOUSELR = 10; const MOUSER = 11; const MOUSEL = 12;

// Initialize input handling based on environment
let inputHandler;

function readConfig() {
    config = jsconfig.all();
    if (config.border && config.resWidth && config.resHeight
        && config.left && config.right && config.forward && config.back
        && config.wave && config.mic) {
        leftKeys = config.left;
        rightKeys = config.right;
        forwardKeys = config.forward;
        backKeys = config.back;
        waveKeys = config.wave;
        mouseX = config.resWidth / 2;
        mouseY = config.resHeight / 2;
    } else {
        jsconfig.setBulk({
            "resWidth": 1920,
            "resHeight": 1080,
            "border": 'true',
            "mic": 'true',
            "left": [65, 81, 49, 9, 16, 192, 27, 88, 53, 54, 48, 37],
            "right": [68, 69, 51, 82, 84, 66, 90, 86, 52, 57, 39],
            "forward": [87, 50, 38],
            "back": [83, 70, 71, 160, 162, 67, 32, 55, 56, 40],
            "wave": [75]
        });
        fs.writeFile(jsconfig.file(), JSON.stringify(jsconfig.all(), null, 4), (err) => { if (err) { throw err; } });
        readConfig();
    }
}

function setCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = 612;
    canvas.height = 354;
}

function isValidKey(keycode) {
    return leftKeys.includes(keycode)
        || rightKeys.includes(keycode)
        || forwardKeys.includes(keycode)
        || backKeys.includes(keycode)
        || waveKeys.includes(keycode);
}

function loadImage(imagePath) {
    return new Promise((resolve, reject) => {
        let image = new Image();
        image.addEventListener('load', () => { resolve(image); });
        image.addEventListener('error', (err) => { reject(err); });
        image.src = imagePath;
    });
}

async function loadImages() {
    let imgs = [];
    await Promise
        .all(images.map(i => loadImage(__dirname + i)))
        .then((i) => { imgs = i; })
        .catch((err) => { console.error(err); });
    return imgs;
}

// https://stackoverflow.com/questions/33322681/checking-microphone-volume-in-javascript
function setMic() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
            let audioContext = new AudioContext();
            let streamSource = audioContext.createMediaStreamSource(stream);
            let processor = audioContext.createScriptProcessor(512);

            streamSource.connect(processor);
            processor.connect(audioContext.destination);
            processor.onaudioprocess = (e) => {
                let buf = event.inputBuffer.getChannelData(0);
                let sum = 0;
                for (var i = 0; i < buf.length; i++) {
                    sum += buf[i] * buf[i];
                }
                let rms = Math.sqrt(sum / buf.length);
                volume = Math.max(rms, volume * 0.50);
            };
        })
        .catch(function (err) {
            console.log(err);
        });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[BG], 0, 0);

    let lastKey = Array.from(keysDown).pop();
    if (leftKeys.includes(lastKey)) hand = LEFT;
    else if (rightKeys.includes(lastKey)) hand = RIGHT;
    else if (forwardKeys.includes(lastKey)) hand = FORWARD;
    else if (backKeys.includes(lastKey)) hand = BACK;
    else if (waveKeys.includes(lastKey)) hand = WAVE;
    else hand = UP;

    ctx.drawImage(images[hand], 0, 0);
    drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSE]);
    if (config.border === 'true') ctx.drawImage(images[BORDER], 0, 0);

    if (config.mic === 'true') {
        let lAnchor = { x: 270, y: 149 };
        let rAnchor = { x: 294, y: 157 };
        let mAnchor = { x: 282, y: 153 };
        if (volume > 0.02) {
            ctx.beginPath();
            ctx.fillStyle = 'pink';
            ctx.arc(mAnchor.x, mAnchor.y, 2, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.lineWidth = "6";
            ctx.strokeStyle = 'black';
            ctx.moveTo(lAnchor.x, lAnchor.y);
            ctx.bezierCurveTo(lAnchor.x, lAnchor.y, mAnchor.x, mAnchor.y + (volume * 200), rAnchor.x, rAnchor.y);
            ctx.fill();
            ctx.stroke();
        }
    }

    ctx.drawImage(images[MOUTH], 0, 0);

    // Draw mouse click images based on click state
    if (isLeftClick && isRightClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSELR]);// mouselr.png for both clicks
    } else if (isLeftClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSEL]); // mousel.png for left click only
    } else if (isRightClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSER]); // mouser.png for right click only
    }
}

function initInputHandler() {
    if (process.platform === 'linux') {
        // Check for Wayland
        if (process.env.DISPLAY === undefined) { 
            console.log("Using Wayland input handling");
            const { WaylandClient } = require('wayland-client');

            // Initialize Wayland connection
            const wayland = new WaylandClient();

            // Define variables for mouse position
            let mouseX = 0;
            let mouseY = 0;

            // Set up mouse event handlers
            wayland.on('pointerMotion', (event) => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            wayland.on('pointerButton', (event) => {
                if (event.button === 0) { // Left click
                    isLeftClick = event.state === 1; // 1 for pressed, 0 for released
                }
                if (event.button === 1) { // Right click
                    isRightClick = event.state === 1; // 1 for pressed, 0 for released
                }
            });

            wayland.on('key', (event) => {
                if (isValidKey(event.keycode)) {
                    keysDown.add(event.keycode);
                } else {
                    keysDown.delete(event.keycode);
                }
            });

            // Start the Wayland event loop
            wayland.connect();
        } else {
            console.log("Using X11 input handling");
            const ioHook = require('iohook');

            ioHook.on('mousemove', event => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            ioHook.on('mousedown', event => {
                if (event.button === 1) { // Left click
                    isLeftClick = true;
                }
                if (event.button === 2) { // Right click
                    isRightClick = true;
                }
            });

            ioHook.on('mouseup', event => {
                if (event.button === 1) { // Left click
                    isLeftClick = false;
                }
                if (event.button === 2) { // Right click
                    isRightClick = false;
                }
            });

            ioHook.on('keydown', event => {
                if (isValidKey(event.rawcode)) {
                    keysDown.add(event.rawcode);
                }
            });

            ioHook.on('keyup', event => { keysDown.delete(event.rawcode); });

            ioHook.start();
        }
    } else {
        console.log("Using keyboard and mouse handling for Windows or Mac");
        const ioHook = require('iohook');

        ioHook.on('mousemove', event => {
            mouseX = Math.min(Math.max(event.x, 0), 1920);
            mouseY = Math.min(Math.max(event.y, 0), 1080);
        });

        ioHook.on('mousedown', event => {
            if (event.button === 1) { // Left click
                isLeftClick = true;
            }
            if (event.button === 2) { // Right click
                isRightClick = true;
            }
        });

        ioHook.on('mouseup', event => {
            if (event.button === 1) { // Left click
                isLeftClick = false;
            }
            if (event.button === 2) { // Right click
                isRightClick = false;
            }
        });

        ioHook.on('keydown', event => {
            if (isValidKey(event.rawcode)) {
                keysDown.add(event.rawcode);
            }
        });

        ioHook.on('keyup', event => { keysDown.delete(event.rawcode); });

        ioHook.start();
    }
}

// IPC Communication
ipcRenderer.on('save-settings', (event, args) => {
    jsconfig.setBulk(args);
    fs.writeFile(jsconfig.file(), JSON.stringify(jsconfig.all(), null, 4), (err) => { if (err) { throw err; } });
    readConfig();
});

// Initialize everything
readConfig();
window.onkeydown = (e) => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') ipcRenderer.send('open-settings'); }
setCanvas();
setMic();
loadImages().then((imgs) => {
    images = imgs;
    initInputHandler(); // Initialize input handling
    setInterval(draw, 1000 / 144);
});
