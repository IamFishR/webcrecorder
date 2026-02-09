import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Visualizer } from './Visualizer';
import { SettingsPanel } from './SettingsPanel';
import { useMediaStream } from '../hooks/useMediaStream';
import { useRecorder } from '../hooks/useRecorder';
import { useCompositor } from '../hooks/useCompositor';
import { useElectronIPC } from '../hooks/useElectronIPC';
import { RecordedMedia, RecordingType, MediaConstraints } from '../types';
import { formatTime } from '../utils/format';

interface StudioProps {
    initialMode: RecordingType;
    onBack: () => void;
    onRecordingSaved: (media: RecordedMedia) => void;
    showGallery: boolean;
    onToggleGallery: () => void;
}

export const Studio: React.FC<StudioProps> = ({
    initialMode,
    onBack,
    onRecordingSaved,
    showGallery,
    onToggleGallery
}) => {
    // --- State ---
    const [mode, setMode] = useState<RecordingType>(initialMode);
    const [isContinuous, setIsContinuous] = useState(false);
    const [pipStream, setPipStream] = useState<MediaStream | null>(null);
    const [constraints, setConstraints] = useState<MediaConstraints>({ resolution: '1080p' });
    const [showSettings, setShowSettings] = useState(false);

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const pipVideoRef = useRef<HTMLVideoElement>(null);

    // --- Hooks ---
    const { stream, devices, error, permissionGranted, startStream, switchCamera } =
        useMediaStream(mode, constraints, true); // true = isActive

    // Compositor
    const { compositedStream } = useCompositor(
        stream,
        pipStream,
        mode === 'screen'
    );

    // Determine which stream to record
    const recordingStream = mode === 'screen' && compositedStream ? compositedStream : stream;

    const {
        isRecording,
        isPaused,
        recordingTime,
        startRecording,
        stopRecording,
        pauseRecording,
        toggleRecording
    } = useRecorder({
        mode,
        stream: recordingStream,
        isContinuous,
        onRecordingSaved
    });

    // Electron IPC
    useElectronIPC({
        isRecording,
        isPaused,
        recordingTime,
        onStartCommand: startRecording,
        onStopCommand: stopRecording,
        onPauseCommand: pauseRecording,
        onToggleCommand: toggleRecording
    });

    // --- Effects ---

    // Attach main stream
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [stream]);

    // Handle PiP Stream for Screen Mode
    useEffect(() => {
        let active = true;

        if (mode === 'screen') {
            const getPip = async () => {
                try {
                    const camStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 320, height: 240, facingMode: 'user' },
                        audio: false
                    });
                    if (active) setPipStream(camStream);
                } catch (e) {
                    console.warn("Could not get PiP camera:", e);
                }
            };
            getPip();
        } else {
            if (pipStream) {
                pipStream.getTracks().forEach(t => t.stop());
                setPipStream(null);
            }
        }

        return () => { active = false; };
    }, [mode]);

    // Attach PiP stream
    useEffect(() => {
        if (pipVideoRef.current && pipStream) {
            pipVideoRef.current.srcObject = pipStream;
        }
    }, [pipStream]);

    // --- Handlers ---

    const handleStartRecording = () => {
        if (!recordingStream) {
            if (mode === 'screen') {
                startStream();
                return;
            }
            return;
        }
        if (!recordingStream.active) {
            startStream();
            return;
        }
        startRecording();
    };

    const handleSwitchCamera = async () => {
        const nextDeviceId = await switchCamera();
        if (nextDeviceId) {
            setConstraints(prev => ({ ...prev, videoDeviceId: nextDeviceId }));
        }
    };

    const switchMode = (newMode: RecordingType) => {
        if (isRecording) return;
        setMode(newMode);
    };

    const handleHomeClick = () => {
        if (isRecording) {
            if (!window.confirm("Recording is in progress. Are you sure you want to stop and leave?")) return;
            stopRecording();
        }
        setShowSettings(false);
        onBack();
    };

    // --- Render ---

    return (
        <>
            {/* --- Viewfinder Area --- */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Permission Error State */}
                {!permissionGranted && error && mode !== 'screen' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-50 p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <Icons.Camera className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            {error}. Please check your permissions settings and try again.
                        </p>
                        <button
                            onClick={() => startStream()}
                            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            Retry Access
                        </button>
                    </div>
                )}

                {/* Screen Share Start Prompt */}
                {mode === 'screen' && !stream && (
                    <div className="text-center z-10 relative flex flex-col items-center">
                        {error && (
                            <div className="mb-4 text-red-400 bg-red-950/50 px-4 py-2 rounded-lg border border-red-500/20 max-w-xs mx-auto text-sm">
                                {error}
                            </div>
                        )}
                        <button
                            onClick={() => startStream()}
                            className="group relative px-8 py-4 bg-surface border border-white/20 rounded-full hover:bg-white/10 flex items-center gap-3 transition-all mx-auto overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Icons.Screen className="w-6 h-6 text-white" />
                            <span className="font-bold text-lg">Start Screen Share</span>
                        </button>
                        <p className="mt-4 text-gray-500 text-sm max-w-xs">
                            Click above to select a window or screen to record.
                        </p>
                    </div>
                )}

                {/* Main Video Element */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-contain transition-opacity duration-500 ${mode === 'audio' ? 'opacity-20 blur-xl' : 'opacity-100'}`}
                />

                {/* PiP Camera Preview (Screen Mode Only) */}
                {mode === 'screen' && pipStream && (
                    <div className="absolute bottom-32 right-6 w-48 aspect-[3/4] md:w-64 md:aspect-video bg-black rounded-xl border border-white/20 overflow-hidden shadow-2xl z-20 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <video
                            ref={pipVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                        </div>
                    </div>
                )}

                {/* Audio Mode Visualizer Overlay */}
                {mode === 'audio' && permissionGranted && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full max-w-md h-64 p-8">
                            <Visualizer stream={stream} isActive={true} type="bar" />
                        </div>
                    </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full z-20">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <span className="font-mono font-bold text-white tracking-widest text-sm shadow-black drop-shadow-md">
                            {formatTime(recordingTime)}
                        </span>
                        {isPaused && (
                            <span className="text-yellow-400 text-xs font-bold uppercase">Paused</span>
                        )}
                        {isContinuous && (
                            <div className="border-l border-white/20 pl-3 ml-1" title="Continuous Mode Active">
                                <Icons.Flip className="w-4 h-4 text-blue-400 rotate-90" />
                            </div>
                        )}
                    </div>
                )}

                {/* Camera Flip Button */}
                {mode === 'video' && permissionGranted && !isRecording && (
                    <button
                        onClick={handleSwitchCamera}
                        className="absolute top-6 right-6 p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 transition-all z-20"
                    >
                        <Icons.Flip className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* --- Compact Control Bar --- */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md z-30">
                <div className="bg-black/60 backdrop-blur-xl rounded-full border border-white/10 p-3 shadow-2xl">
                    <div className="flex items-center justify-between gap-4">

                        {/* Home Button */}
                        <button
                            onClick={handleHomeClick}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 shrink-0"
                            title="Home"
                        >
                            <Icons.Home className="w-5 h-5 text-gray-400 hover:text-white" />
                        </button>

                        {/* Gallery Button */}
                        <button
                            onClick={onToggleGallery}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 overflow-hidden group shrink-0"
                        >
                            <Icons.Gallery className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        </button>

                        {/* Shutter Button */}
                        <div className="relative group shrink-0">
                            <button
                                disabled={!permissionGranted && mode !== 'screen'}
                                onClick={isRecording ? stopRecording : handleStartRecording}
                                className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                  ${!permissionGranted && mode !== 'screen' ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isRecording
                                        ? 'border-4 border-red-500 bg-transparent'
                                        : 'border-4 border-white bg-transparent hover:scale-105 hover:border-white'
                                    }
                `}
                            >
                                <div className={`
                  transition-all duration-300 ease-in-out
                  ${isRecording
                                        ? 'w-6 h-6 bg-red-500 rounded-md'
                                        : 'w-12 h-12 bg-red-600 rounded-full border-2 border-transparent'
                                    }
                `} />
                            </button>
                        </div>

                        {/* Pause Button (visible only when recording) */}
                        {isRecording ? (
                            <button
                                onClick={pauseRecording}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border border-white/5 shrink-0 ${isPaused ? 'bg-yellow-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                                title={isPaused ? 'Resume' : 'Pause'}
                            >
                                {isPaused ? <Icons.Play className="w-5 h-5" /> : <Icons.Pause className="w-5 h-5" />}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border border-white/5 shrink-0 ${showSettings ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                            >
                                <Icons.Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Settings Panel Popover */}
                <SettingsPanel
                    show={showSettings && !isRecording}
                    onClose={() => setShowSettings(false)}
                    mode={mode}
                    onSwitchMode={switchMode}
                    isContinuous={isContinuous}
                    onToggleContinuous={() => setIsContinuous(!isContinuous)}
                    constraints={constraints}
                    onConstraintChange={setConstraints}
                    devices={devices}
                />
            </div>
        </>
    );
};
