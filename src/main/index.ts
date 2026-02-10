import { app, shell, BrowserWindow, ipcMain, session, desktopCapturer, Menu, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createTray } from './tray'
import { registerShortcuts } from './shortcuts'
import { setupIpcHandlers } from './ipc-handlers'
import { setupAutoLaunch } from './auto-launch'

export let mainWindow: BrowserWindow | null = null

// Register custom protocol as privileged before app ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'lumina', privileges: { stream: true, bypassCSP: true, supportFetchAPI: true } }
])

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#09090b',
        icon: process.platform === 'linux' ? icon : undefined, // win uses .ico via builder config usually
        webPreferences: {
            preload: join(__dirname, '../preload/index.mjs'),
            sandbox: false,
            backgroundThrottling: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        const startMinimized = process.argv.includes('--minimized');
        if (!startMinimized) {
            mainWindow?.show()
            mainWindow?.webContents.openDevTools()
        }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Custom Protocol for local files — use modern protocol.handle API
    // URLs are formatted as lumina:///C:/Users/... (triple slash like file:///)
    protocol.handle('lumina', (request) => {
        // Strip scheme — request.url is like "lumina:///C:/Users/path/file.webm"
        const rawPath = request.url.replace(/^lumina:\/\/\//, '')
        const decodedPath = decodeURI(rawPath)
        // Convert forward slashes back to native backslashes on Windows
        const nativePath = process.platform === 'win32' ? decodedPath.replace(/\//g, '\\') : decodedPath
        return net.fetch(pathToFileURL(nativePath).href)
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Close to Tray behavior
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
            return false;
        }
        return true;
    });
}

// App lifecycle
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.luminacapture.app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()
    createTray(mainWindow!)
    registerShortcuts(mainWindow!)
    setupIpcHandlers(mainWindow!)
    setupAutoLaunch()

    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
            if (!sources.length) {
                callback(null)
                return
            }
            let selected = false
            const menu = Menu.buildFromTemplate(
                sources.map((source) => ({
                    label: source.name,
                    click: () => {
                        selected = true
                        callback({ video: source, audio: 'loopback' })
                    }
                }))
            )
            menu.popup({
                window: mainWindow!,
                callback: () => {
                    // Menu was closed — if no source was selected, reject
                    // so getDisplayMedia doesn't hang forever
                    if (!selected) {
                        callback(null)
                    }
                }
            })
        }).catch(() => {
            callback(null)
        })
    })

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

    // Add property to app to track quitting
    ; (app as any).isQuitting = false;
app.on('before-quit', () => {
    (app as any).isQuitting = true;
});
