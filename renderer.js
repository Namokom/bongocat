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
// Add this new interval to toggle the background every 2 seconds
let runCount = 0; // ตัวแปรนับรอบการรัน
setInterval(() => {
    runCount++; // เพิ่มรอบการรันขึ้น 1

    if (runCount === 10) {
        currentEye = EYE2; // เปลี่ยนเป็น BG2
        setTimeout(() => {
            currentEye = EYE1; // เปลี่ยนกลับไปเป็น BG1
        }, 500); // รอ 0.5 วินาทีก่อนกลับไปที่ BG1

        runCount = 0; // รีเซ็ตนับรอบการรัน
    }
}, 1000); // เรียกทุกๆ 1 วินาที


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

async function setCanvas() {
    let bgImage = await loadImage(__dirname + images[BG]);
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // ตั้งค่า canvas ตามขนาดของรูป BG
    canvas.width = bgImage.width;
    canvas.height = bgImage.height;
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

function setMic() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(async (stream) => {
            const audioContext = new AudioContext();
            await audioContext.audioWorklet.addModule('mic-processor.js'); // Load the worklet
            const micNode = new AudioWorkletNode(audioContext, 'mic-processor');

            // Connect the microphone stream to the worklet
            const streamSource = audioContext.createMediaStreamSource(stream);
            streamSource.connect(micNode);
            micNode.connect(audioContext.destination); // Connect to the output
            
            micNode.port.onmessage = (event) => {
                volume = event.data; // Update volume from the worklet
            };
        })
        .catch(function (err) {
            console.error('Error accessing microphone:', err);
        });
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[BG], 0, 0);
    if (config.blink === 'true') {
        ctx.drawImage(images[currentEye], 0, 0); // Use currentEye instead of BG
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
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSELR]); // วาดภาพเมื่อคลิกทั้งซ้ายและขวา
    } else if (isLeftClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSEL]); // วาดภาพเมื่อคลิกซ้าย
    } else if (isRightClick) {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSER]); // วาดภาพเมื่อคลิกขวา
    } else {
        drawArm(mouseX, mouseY, config.resWidth, config.resHeight, ctx, images[MOUSE]); // วาดภาพปกติเมื่อไม่มีการคลิก
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

function getKeyCodeList(key) {
    let obj = {
        backspace: 8,
        tab: 9,
        enter: 13,
        pause: 19,
        capslock: 20,
        escape: 27,
        pageup: 33,
        pagedown: 34,
        end: 35,
        home: 36,
        arrowleft: 37,
        arrowup: 38,
        arrowright: 39,
        arrowdown: 40,
        insert: 45,
        delete: 46,
        0: 48,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,
        a: 65,
        b: 66,
        c: 67,
        d: 68,
        e: 69,
        f: 70,
        g: 71,
        h: 72,
        i: 73,
        j: 74,
        k: 75,
        l: 76,
        m: 77,
        n: 78,
        o: 79,
        p: 80,
        q: 81,
        r: 82,
        s: 83,
        t: 84,
        u: 85,
        v: 86,
        w: 87,
        x: 88,
        y: 89,
        z: 90,
        metaleft: 91,
        metaright: 92,
        select: 93,
        numpad0: 96,
        numpad1: 97,
        numpad2: 98,
        numpad3: 99,
        numpad4: 100,
        numpad5: 101,
        numpad6: 102,
        numpad7: 103,
        numpad8: 104,
        numpad9: 105,
        numpadmultiply: 106,
        numpadadd: 107,
        numpadsubtract: 109,
        numpaddecimal: 110,
        numpaddivide: 111,
        f1: 112,
        f2: 113,
        f3: 114,
        f4: 115,
        f5: 116,
        f6: 117,
        f7: 118,
        f8: 119,
        f9: 120,
        f10: 121,
        f11: 122,
        f12: 123,
        numlock: 144,
        scrolllock: 145,
        semicolon: 186,
        equalsign: 187,
        comma: 188,
        minus: 189,
        period: 190,
        slash: 191,
        backquote: 192,
        bracketleft: 219,
        backslash: 220,
        bracketright: 221,
        quote: 222
    };

    if (key.rawcode === 32) {
        return 32; // Space key
    } else if (key.altKey === true) {
        return 18; // Alt key
    } else if (key.shiftKey === true) {
        return 16; // Shift key
    } else if (key.ctrlKey === true) {
        return 17; // Control key
    } else if (key.metaKey === true) {
        return obj['metaleft']; // Meta key
    } else if (obj.hasOwnProperty(String.fromCharCode(key.rawcode).toLowerCase())) {
        return obj[String.fromCharCode(key.rawcode).toLowerCase()]; // Handle character keys
    } else {
        return key.rawcode; // Return raw code for unhandled keys
    }
}


function initInputHandler() {
    if (process.platform === 'linux') {
        // Check for Wayland
        if (process.env.DISPLAY === undefined) {
            console.log("Using Wayland input handling");
            const { WaylandClient } = require('wayland-client');

            // Wayland input handling remains unchanged
            const wayland = new WaylandClient();
            let mouseX = 0, mouseY = 0;

            wayland.on('pointerMotion', (event) => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            wayland.on('pointerButton', (event) => {
                if (event.button === 0) isLeftClick = event.state === 1; // Left click
                if (event.button === 1) isRightClick = event.state === 1; // Right click
            });

            wayland.on('key', (event) => {
                if (isValidKey(event.keycode)) keysDown.add(event.keycode);
                else keysDown.delete(event.keycode);
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
                if (event.button === 1) isLeftClick = true; // Left click
                if (event.button === 3) isRightClick = true; // Right click
            });

            ioHook.on('mousedrag', event => {
                mouseX = Math.min(Math.max(event.x, 0), 1920);
                mouseY = Math.min(Math.max(event.y, 0), 1080);
            });

            ioHook.on('mouseup', event => {
                if (event.button === 1) isLeftClick = false; // Left click release
                if (event.button === 3) isRightClick = false; // Right click release
            });

            ioHook.on('keydown', event => {
                // ipcRenderer.send('log-message', `Keydown event: ${JSON.stringify(event)} Keychar: ${String.fromCharCode(event.rawcode)} ${getKeyCodeList(event)}`);
                if (isValidKey(getKeyCodeList(event))) keysDown.add(getKeyCodeList(event));
            });

            ioHook.on('keyup', event => { keysDown.delete(getKeyCodeList(event)); });

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
            if (event.button === 1) isLeftClick = true; // Left click
            if (event.button === 2) isRightClick = true; // Right click
        });

        ioHook.on('mousedrag', event => {
            mouseX = Math.min(Math.max(event.x, 0), 1920);
            mouseY = Math.min(Math.max(event.y, 0), 1080);
        });

        ioHook.on('mouseup', event => {
            if (event.button === 1) isLeftClick = false; // Left click release
            if (event.button === 2) isRightClick = false; // Right click release
        });

        ioHook.on('keydown', event => {
            if (isValidKey(event.rawcode)) keysDown.add(event.rawcode);
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
function animate() {
    draw();
    requestAnimationFrame(animate);
}
readConfig();
window.onkeydown = (e) => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') ipcRenderer.send('open-settings'); }
setCanvas();
setMic();
loadImages().then((imgs) => {
    images = imgs;
    initInputHandler();
    requestAnimationFrame(animate); // เริ่มการวาดเมื่อภาพโหลดเสร็จ
}).catch((err) => {
    console.error('Error initializing:', err);
});
