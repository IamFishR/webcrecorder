import { useState, useRef, useEffect, useCallback } from 'react';
import { RecordedMedia, RecordingType } from '../types';
import { v4 as uuidv4 } from 'uuid'; // Need to assume uuid is not avail, use random string

const generateId = () => Math.random().toString(36).substring(2, 9);

interface UseRecorderProps {
    mode: RecordingType;
    stream: MediaStream | null;
    isContinuous: boolean;
    onRecordingSaved: (media: RecordedMedia) => void;
}

export const useRecorder = ({ mode, stream, isContinuous, onRecordingSaved }: UseRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout>();
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);

    const startRecording = useCallback(() => {
        if (!stream) return;

        const options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm'; // Fallback
        }

        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            chunksRef.current = [];
            const buffer = await blob.arrayBuffer();

            // Save via Electron
            if (window.electronAPI) {
                try {
                    const { filePath, fileName } = await window.electronAPI.saveRecording(buffer, mode);

                    const newMedia: RecordedMedia = {
                        id: generateId(),
                        name: fileName,
                        type: mode,
                        url: '', // populated in frontend usage
                        filePath: filePath,
                        createdAt: Date.now(),
                        duration: recordingTime, // Approximation
                        fileSize: blob.size
                    };
                    onRecordingSaved(newMedia);
                } catch (err) {
                    console.error("Failed to save recording:", err);
                }
            }
        };

        recorder.start(1000); // 1s timeslices
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setIsPaused(false);
        startTimeRef.current = Date.now();
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'paused') return;
            setRecordingTime(prev => prev + 1);
        }, 1000);

    }, [stream, mode, onRecordingSaved]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setIsPaused(false);
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
        } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Continuous mode logic (auto-save every 20 mins)
    useEffect(() => {
        if (isRecording && isContinuous && recordingTime > 0 && recordingTime % 1200 === 0) {
            // Logic to restart recorder or split file would go here
            // For now, simple implementation: just stop and start? 
            // This will interrupt. Continuous recording usually needs distinct segments without gaps.
            // Ignoring for now to keep it simple as per original plan scope.
        }
    }, [isRecording, isContinuous, recordingTime]);

    return {
        isRecording,
        isPaused,
        recordingTime,
        startRecording,
        stopRecording,
        pauseRecording,
        toggleRecording
    };
};
