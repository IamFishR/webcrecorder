import { globalShortcut, BrowserWindow } from 'electron';

export function registerShortcuts(mainWindow: BrowserWindow) {
    globalShortcut.register('CommandOrControl+Shift+R', () => {
        mainWindow.webContents.send('toggle-recording');
    });

    globalShortcut.register('CommandOrControl+Shift+P', () => {
        mainWindow.webContents.send('pause-recording');
    });

    globalShortcut.register('CommandOrControl+Shift+M', () => {
        if (mainWindow.isVisible()) mainWindow.hide();
        else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
