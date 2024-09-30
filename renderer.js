const { drawArm } = require(__dirname + '/kuvster');
const jsconfig = require('electron-json-config');
const { ipcRenderer } = require('electron');
const fs = require('fs');

let config;
let canvas, ctx;
let images = ['/img/bg.png', '/img/eye1.png', '/img/eye2.png', '/img/up.png', '/img/mouse.png',
    '/img/left.png', '/img/right.png', '/img/forward.png', '/img/back.png',
    '/img/wave.png', '/img/border.png', '/img/mouth.png', 
    '/img/mouselr.png','/img/mouser.png', '/img/mousel.png'];
let hand = 1;
let keysDown = new Set();
let leftKeys, rightKeys, forwardKeys, backKeys, waveKeys;
let mouseX, mouseY;
let volume = 0;

const BG = 0; const EYE1 = 1; const EYE2 = 2; const UP = 3; const MOUSE = 4;
const LEFT = 5; const RIGHT = 6; const FORWARD = 7; const BACK = 8;
const WAVE = 9; const BORDER = 10; const MOUTH = 11;
const MOUSELR = 12; const MOUSER = 13; const MOUSEL = 14;

// Click state variables
let isLeftClick = false;
let isRightClick = false;
let currentEye = EYE1; // Start with the first background image
let runCount = 0; // Counter for animation
setInterval(() => {
    runCount++;
    if (runCount === 10) {
        currentEye = EYE2;
        setTimeout(() => {
            currentEye = EYE1;
        }, 500);
        runCount = 0;
    }
}, 1000);

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
            "blink": 'true',
            "left": ['a', 'q', '1', 'Tab', 'Shift', 'Alt', 'Escape', 'x', '5', '6', '0', 'ArrowLeft'],
            "right": ['d', 'e', '3', 'r', 't', 'b', 'z', 'v', '4', '9', 'ArrowRight'],
            "forward": ['w', '2', 'ArrowUp'],
            "back": ['s', 'f', 'g', 'ShiftRight', 'ControlRight', 'c', 'Space', '7', '8', 'ArrowDown'],
            "wave": ['k']
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

function isValidKey(keychar) {
    return leftKeys.includes(keychar)
        || rightKeys.includes(keychar)
        || forwardKeys.includes(keychar)
        || backKeys.includes(keychar)
        || waveKeys.includes(keychar);
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
    if (config.blink === 'true') {
        ctx.drawImage(images[currentEye], 0, 0);
    } else {
        ctx.drawImage(images[EYE1], 0, 0);
    }

    let lastKey = Array.from(keysDown).pop();
    if (leftKeys.includes(lastKey)) hand = LEFT;
    else if (rightKeys.includes(lastKey)) hand = RIGHT;
    else if (forwardKeys.includes(lastKey)) hand = FORWARD;
    else if (backKeys.includes(lastKey)) hand = BACK;
    else if (waveKeys.includes(lastKey)) hand = WAVE;
    else hand = UP;

    ctx.drawImage(images[hand], 0, 0);

    if (isLeftClick && isRightClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSELR]);
    } else if (isLeftClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSEL]);
    } else if (isRightClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSER]);
    } else {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSE]);
    }

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
}

function initInputHandler() {
    if (process.platform === 'linux') {
        if (process.env.DISPLAY === undefined) { 
            console.log("Using Wayland input handling");
            const { WaylandClient } = require('wayland-client');

            const wayland = new WaylandClient();

            let mouseX = 0;
            let mouseY = 0;

            wayland.on('pointerMotion', (event) => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            wayland.on('pointerButton', (event) => {
                if (event.button === 0) {
                    isLeftClick = event.state === 1;
                }
                if (event.button === 1) {
                    isRightClick = event.state === 1;
                }
            });

            wayland.on('key', (event) => {
                if (isValidKey(event.keychar)) {
                    keysDown.add(event.keychar);
                } else {
                    keysDown.delete(event.keychar);
                }
            });

            wayland.connect();
        } else {
            console.log("Using X11 input handling");
            const ioHook = require('iohook');

            ioHook.on('mousemove', event => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            ioHook.on('mousedown', event => {
                if (event.button === 1) isLeftClick = true;
                if (event.button === 3) isRightClick = true;
            });

            ioHook.on('mouseup', event => {
                if (event.button === 1) isLeftClick = false;
                if (event.button === 3) isRightClick = false;
            });

            ioHook.on('keydown', event => {
                if (isValidKey(event.keychar)) {
                    keysDown.add(event.keychar);
                }
            });

            ioHook.on('keyup', event => {
                keysDown.delete(event.keychar);
            });

            ioHook.start();
        }
    } else {
        console.log("Using iohook for input handling");
        const ioHook = require('iohook');

        ioHook.on('mousemove', event => {
            mouseX = Math.min(Math.max(event.x, 0), 1920);
            mouseY = Math.min(Math.max(event.y, 0), 1080);
        });

        ioHook.on('mousedown', event => {
            if (event.button === 1) isLeftClick = true;
            if (event.button === 2) isRightClick = true;
        });

        ioHook.on('mouseup', event => {
            if (event.button === 1) isLeftClick = false;
            if (event.button === 2) isRightClick = false;
        });

        ioHook.on('keydown', event => {
            if (isValidKey(event.keychar)) {
                keysDown.add(event.keychar);
            }
        });

        ioHook.on('keyup', event => {
            keysDown.delete(event.keychar);
        });

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
