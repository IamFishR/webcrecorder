import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow) {
    const iconPath = join(__dirname, '../../resources/icon.png');
    // const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    // Using imported icon asset for reliability in build
    const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);
    tray.setToolTip('Lumina Capture');

    updateTrayMenu(mainWindow, false, false);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

export function updateTrayMenu(mainWindow: BrowserWindow, isRecording: boolean, isPaused: boolean) {
    if (!tray) return;

    const contextMenu = Menu.buildFromTemplate([
        {
            label: mainWindow.isVisible() ? 'Hide Window' : 'Show Window',
            click: () => {
                if (mainWindow.isVisible()) mainWindow.hide();
                else {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: isRecording ? 'Stop Recording' : 'Start Recording (Video)',
            click: () => {
                if (isRecording) {
                    mainWindow.webContents.send('stop-recording');
                } else {
                    mainWindow.show(); // Ensure window is focused to start
                    mainWindow.webContents.send('start-recording'); // Simplified, might need more context
                }
            }
        },
        {
            label: isPaused ? 'Resume Recording' : 'Pause Recording',
            enabled: isRecording,
            click: () => {
                mainWindow.webContents.send('pause-recording');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit Lumina Capture',
            click: () => {
                (app as any).isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}
