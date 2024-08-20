import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import path from 'path';
import url from 'url';
import fs from 'fs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
import electronSquirrelStartup from 'electron-squirrel-startup';
if(electronSquirrelStartup) app.quit();

let mainWindow: BrowserWindow | undefined;

const scheme = 'app';
const srcFolder = path.join(app.getAppPath(), `.vite/renderer/${MAIN_WINDOW_VITE_NAME}/`);
const fallbackFile = '200.html';
const staticAssetsFolder = MAIN_WINDOW_VITE_DEV_SERVER_URL ? path.join(import.meta.dirname, '../../static/') : srcFolder;

protocol.registerSchemesAsPrivileged([{
		scheme: scheme,
		privileges: {
			standard: true,
			secure: true,
			allowServiceWorkers: true,
			supportFetchAPI: true,
			corsEnabled: false,
		},
	},
]);

app.on('ready', () => {
	protocol.handle(scheme, async (request) => {
		const requestPath = path.normalize(decodeURIComponent(new URL(request.url).pathname));
		let responseFile: string | undefined;

		function tryFile(tryFilePath: string) {
			if(responseFile !== undefined) return;
			const fullTryFilePath = path.join(srcFolder, tryFilePath);
			const fileExits = fs.existsSync(fullTryFilePath) && fs.statSync(fullTryFilePath).isFile();
			if(fileExits) responseFile = fullTryFilePath;
		}

		tryFile(requestPath);
		if(path.basename(requestPath) === '') tryFile('index.html');
		else tryFile(path.join(path.dirname(requestPath), path.basename(requestPath) + '.html'));
		tryFile(fallbackFile);

		if(responseFile === undefined) {
			return new Response(null, { status: 404});
		}

		return net.fetch(url.pathToFileURL(responseFile).toString());
	});
});

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		icon: path.join(staticAssetsFolder, '/icon.png'),
		width: 900,
		height: 700,
		minWidth: 400,
		minHeight: 200,
		// Window Controls Overlay API - https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API
		// Allows for a custom window header while overlaying native window controls in the corner.
		// https://www.electronjs.org/docs/latest/tutorial/window-customization#window-controls-overlay
		titleBarStyle: 'hidden',
		titleBarOverlay: {
			color: '#374151',
			symbolColor: '#f8fafc',
			height: 40
		},
		webPreferences: {
			preload: path.join(import.meta.dirname, 'preload.js'),
		},
	});

	if(MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);

		// Open the DevTools.
		// mainWindow.webContents.openDevTools();
	}
	else {
		mainWindow.loadURL('app://-/');
	 }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if(BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on('toggleDevTools', () => mainWindow && mainWindow.webContents.toggleDevTools());
ipcMain.on('setTitleBarColors', (event, bgColor, iconColor) => mainWindow && mainWindow.setTitleBarOverlay({
	color: bgColor,
	symbolColor: iconColor,
	height: 40
}));