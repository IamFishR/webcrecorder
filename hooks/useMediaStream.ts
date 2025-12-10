import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaDevice, MediaConstraints, RecordingType } from '../types';

export const useMediaStream = (type: RecordingType, constraints: MediaConstraints, active: boolean = true) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Keep a ref to the current stream to access it in startStream without adding it to dependencies
  // This avoids infinite loops when adding startStream to the useEffect dependencies
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Stop all tracks in the current stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setPermissionGranted(false);
    }
  }, [stream]);

  // Enumerate devices
  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}...)`
      })));
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, []);

  // Request stream
  const startStream = useCallback(async () => {
    if (!active) return; // Prevent starting if inactive

    // Stop any existing tracks first using ref
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setError(null);

    // Screen Recording Logic
    if (type === 'screen') {
      try {
        // @ts-ignore - getDisplayMedia exists in modern browsers
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always"
          } as any,
          audio: true // System audio
        });
        
        // Listen for the user stopping the share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setStream(null);
          setPermissionGranted(false);
        };

        // Try to get mic audio as well to mix in voiceover
        try {
           const micStream = await navigator.mediaDevices.getUserMedia({
             audio: constraints.audioDeviceId ? { deviceId: { exact: constraints.audioDeviceId } } : true
           });
           
           // Combine tracks
           const tracks = [
             ...screenStream.getVideoTracks(),
             ...screenStream.getAudioTracks(),
             ...micStream.getAudioTracks()
           ];
           setStream(new MediaStream(tracks));
        } catch (micErr) {
           console.warn("Could not add microphone to screen recording", micErr);
           setStream(screenStream);
        }

        setPermissionGranted(true);
      } catch (err: any) {
        console.error("Error accessing screen:", err);
        setError(err.message || "Could not start screen sharing");
        setPermissionGranted(false);
        setStream(null);
      }
      return;
    }

    // Normal Camera/Audio Logic
    const mediaConstraints: MediaStreamConstraints = {
      audio: constraints.audioDeviceId ? { deviceId: { exact: constraints.audioDeviceId } } : true,
      video: type === 'video' ? {
        deviceId: constraints.videoDeviceId ? { exact: constraints.videoDeviceId } : undefined,
        width: constraints.resolution === '4k' ? 3840 : constraints.resolution === '1080p' ? 1920 : 1280,
        height: constraints.resolution === '4k' ? 2160 : constraints.resolution === '1080p' ? 1080 : 720,
        facingMode: 'user' // Default to selfie
      } : false
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setStream(newStream);
      setPermissionGranted(true);
      
      // Refresh device list after permission is granted to get labels
      getDevices();
    } catch (err: any) {
      console.error("Error accessing media:", err);
      setError(err.message || "Could not access camera/microphone");
      setPermissionGranted(false);
      setStream(null);
    }
  }, [type, constraints, getDevices, active]); // Removed stream dependency

  const switchCamera = useCallback(async () => {
    if (type !== 'video' || !active) return;
    
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if (videoDevices.length < 2) return;

    const currentDeviceIndex = videoDevices.findIndex(d => d.deviceId === constraints.videoDeviceId);
    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    const nextDeviceId = videoDevices[nextIndex].deviceId;

    return nextDeviceId;

  }, [devices, type, constraints.videoDeviceId, active]);

  // Handle Mode Switching and Active State
  useEffect(() => {
    // If becoming inactive, stop everything immediately
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setStream(null);
        setPermissionGranted(false);
      }
      return;
    }

    // If active, handle mode switching or constraint changes
    // Clean up previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setStream(null);
      setPermissionGranted(false);
    }

    // We don't auto-start screen share because it prompts
    if (type !== 'screen') {
      startStream();
    }
  }, [type, active, startStream]); // Added startStream dependency

  // Device change listener
  useEffect(() => {
    if (active) {
      navigator.mediaDevices.addEventListener('devicechange', getDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', getDevices);
      };
    }
  }, [getDevices, active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Use ref for cleanup to be safe
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return { stream, devices, error, permissionGranted, startStream, stopStream, switchCamera };
};