import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    saveRecording: (buffer, type) => ipcRenderer.invoke('save-recording', buffer, type),
    listRecordings: () => ipcRenderer.invoke('list-recordings'),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    openRecordingsFolder: () => ipcRenderer.invoke('open-recordings-folder'),
    updateTrayState: (state) => ipcRenderer.invoke('update-tray-state', state),

    onStartCommand: (callback) => ipcRenderer.on('start-recording', callback),
    onStopCommand: (callback) => ipcRenderer.on('stop-recording', callback),
    onPauseCommand: (callback) => ipcRenderer.on('pause-recording', callback),
    onToggleCommand: (callback) => ipcRenderer.on('toggle-recording', callback),
})
