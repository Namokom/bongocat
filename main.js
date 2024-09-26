const { app, BrowserWindow, ipcMain } = require('electron');
const windowStateKeeper = require('electron-window-state');

const dev = false;
let mainWindow;
app.allowRendererProcessReuse = false;
app.whenReady().then(() => {
    let w = dev ? 1200 : 612;
    let h = dev ? 600 : 414;
    let mainWindowState = windowStateKeeper({
        defaultWidth: w,
        defaultHeight: h
    });
    mainWindow = new BrowserWindow({
        useContentSize: true,
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: w,
        height: h,
        resizable: false,
        webPreferences: { nodeIntegration: true }
    });

    mainWindowState.manage(mainWindow);

    mainWindow.removeMenu();
    mainWindow.loadFile(__dirname + '/index.html');
    if (dev) mainWindow.webContents.openDevTools();
});

function openSettings() {
    let w = dev ? 600 : 390;
    let h = dev ? 400 : 335;
    let win = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        width: w,
        height: h,
        resizable: false,
        useContentSize: true,
        webPreferences: { nodeIntegration: true }
    });
    win.removeMenu();
    win.loadFile(__dirname + '/settings.html');
    if (dev) win.webContents.openDevTools();
}

ipcMain.on('open-settings', (event, args) => { openSettings(); });