import { app } from 'electron';

export function setupAutoLaunch() {
    const appFolder = process.execPath;
    // Basic implementation
    app.setLoginItemSettings({
        openAtLogin: true,
        args: ['--minimized']
    });
}
