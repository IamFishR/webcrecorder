import { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingType, MediaConstraints } from '../types';

export const useMediaStream = (mode: RecordingType, constraints: MediaConstraints, isActive: boolean) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    const streamRef = useRef<MediaStream | null>(null);

    // Enumerate devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devs = await navigator.mediaDevices.enumerateDevices();
                setDevices(devs);
            } catch (e) {
                console.error("Error enumerating devices:", e);
            }
        };
        getDevices();
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
            setPermissionGranted(false);
        }
    }, []);

    const startStream = useCallback(async () => {
        if (!isActive) return;

        // Stop old tracks immediately
        stopStream();

        try {
            let newStream: MediaStream;

            if (mode === 'screen') {
                newStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
            } else {
                // Construct constraints dynamically
                const videoConstraints: MediaTrackConstraints = {};
                if (mode === 'video') {
                    if (constraints.videoDeviceId) {
                        videoConstraints.deviceId = { exact: constraints.videoDeviceId };
                    }
                    // Map resolution to width/height
                    const width = constraints.resolution === '4k' ? 3840 : constraints.resolution === '720p' ? 1280 : 1920;
                    const height = constraints.resolution === '4k' ? 2160 : constraints.resolution === '720p' ? 720 : 1080;

                    videoConstraints.width = { ideal: width };
                    videoConstraints.height = { ideal: height };
                }

                const audioConstraints: MediaTrackConstraints = {
                    echoCancellation: true,
                    noiseSuppression: true
                };
                if (constraints.audioDeviceId) {
                    audioConstraints.deviceId = { exact: constraints.audioDeviceId };
                }

                console.log("[useMediaStream] Requesting:", { video: mode === 'video' ? videoConstraints : false, audio: audioConstraints });

                try {
                    newStream = await navigator.mediaDevices.getUserMedia({
                        video: mode === 'video' ? videoConstraints : false,
                        audio: audioConstraints
                    });
                } catch (firstErr: any) {
                    console.warn("[useMediaStream] First attempt failed:", firstErr);
                    // Fallback to defaults if strict constraints fail
                    if (firstErr.name === 'NotSupportedError' || firstErr.name === 'OverconstrainedError') {
                        console.log("[useMediaStream] Retrying with defaults...");
                        newStream = await navigator.mediaDevices.getUserMedia({
                            video: mode === 'video', // true/false
                            audio: true
                        });
                    } else {
                        throw firstErr;
                    }
                }
            }

            streamRef.current = newStream;
            setStream(newStream);
            setPermissionGranted(true);
            setError(null);

            // Handle stream end
            newStream.getVideoTracks()[0]?.addEventListener('ended', () => {
                if (streamRef.current === newStream) {
                    stopStream();
                }
            });

        } catch (err: any) {
            console.error("Stream error:", err);
            setError(err.name || err.message || "Failed to access camera/mic");
            setPermissionGranted(false);
        }
    }, [mode, constraints, isActive, stopStream]);

    useEffect(() => {
        // For screen mode, don't auto-start — let the user click "Start Screen Share"
        if (mode === 'screen') return;

        if (isActive) {
            startStream();
        } else {
            stopStream();
        }
        return () => {
            stopStream();
        };
    }, [startStream, isActive, stopStream, mode]);

    const switchCamera = async () => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length < 2) return null;

        const currentId = constraints.videoDeviceId;
        const currentIndex = videoDevices.findIndex(d => d.deviceId === currentId);
        const nextIndex = (currentIndex + 1) % videoDevices.length;
        return videoDevices[nextIndex].deviceId;
    };

    return { stream, devices, error, permissionGranted, startStream, switchCamera };
};
