export type RecordingType = 'video' | 'audio' | 'screen';

export interface RecordedMedia {
    id: string;
    name: string;
    type: RecordingType;
    url: string; // lumina:// url
    filePath: string;
    createdAt: number;
    duration: number;
    fileSize?: number;
}

export interface MediaConstraints {
    videoDeviceId?: string;
    audioDeviceId?: string;
    resolution?: '720p' | '1080p' | '4k';
}

declare global {
    interface Window {
        electronAPI: {
            saveRecording: (buffer: ArrayBuffer, type: RecordingType) => Promise<{ filePath: string; fileName: string }>;
            listRecordings: () => Promise<RecordedMedia[]>;
            deleteFile: (filePath: string) => Promise<boolean>;
            openRecordingsFolder: () => Promise<void>;
            updateTrayState: (state: { isRecording: boolean; isPaused: boolean }) => Promise<void>;
            onStartCommand: (callback: () => void) => void;
            onStopCommand: (callback: () => void) => void;
            onPauseCommand: (callback: () => void) => void;
            onToggleCommand: (callback: () => void) => void;
        };
    }
}
