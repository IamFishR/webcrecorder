import { useEffect } from 'react';

interface UseElectronIPCProps {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    onStartCommand: () => void;
    onStopCommand: () => void;
    onPauseCommand: () => void;
    onToggleCommand: () => void;
}

export const useElectronIPC = ({
    isRecording,
    isPaused,
    recordingTime,
    onStartCommand,
    onStopCommand,
    onPauseCommand,
    onToggleCommand
}: UseElectronIPCProps) => {

    // Sync state to Tray
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.updateTrayState({ isRecording, isPaused });
        }
    }, [isRecording, isPaused, recordingTime]);

    // Listen for commands
    useEffect(() => {
        const api = window.electronAPI;
        if (!api) return;

        api.onStartCommand(onStartCommand);
        api.onStopCommand(onStopCommand);
        api.onPauseCommand(onPauseCommand);
        api.onToggleCommand(onToggleCommand);

        // Cleanup listeners? Electron listeners usually persistent or handled by bridge, 
        // but React effect cleanup is good practice if we had 'removeListener' exposed.
        // For now, assuming simple persistent listeners or one-way binding.

    }, [onStartCommand, onStopCommand, onPauseCommand, onToggleCommand]);
};
