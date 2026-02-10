import { ipcMain, BrowserWindow, shell, dialog } from 'electron';
import { saveRecording, listRecordings, deleteRecording } from './file-manager';
import { updateTrayMenu } from './tray';

export function setupIpcHandlers(mainWindow: BrowserWindow) {
    ipcMain.handle('save-recording', async (_, buffer: ArrayBuffer, type: string) => {
        return await saveRecording(buffer, type);
    });

    ipcMain.handle('list-recordings', async () => {
        return await listRecordings();
    });

    ipcMain.handle('delete-file', async (_, filePath: string) => {
        return await deleteRecording(filePath);
    });

    ipcMain.handle('open-recordings-folder', async () => {
        // Need to get the path from file-manager or assumption
        const { app } = require('electron');
        const { join } = require('path');
        const documentsPath = app.getPath('documents');
        const recordingsPath = join(documentsPath, 'LuminaRecordings');
        await shell.openPath(recordingsPath);
    });

    ipcMain.handle('update-tray-state', (_, { isRecording, isPaused }) => {
        updateTrayMenu(mainWindow, isRecording, isPaused);
    });
}
