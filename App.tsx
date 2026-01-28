import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './components/Icons';
import { useMediaStream } from './hooks/useMediaStream';
import { Visualizer } from './components/Visualizer';
import { Editor } from './components/Editor';
import { RecordedMedia, RecordingType, MediaConstraints } from './types';
import { formatTime, generateId } from './utils/format';

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'home' | 'studio'>('home');
  const [mode, setMode] = useState<RecordingType>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  // Continuous Mode State
  const [isContinuous, setIsContinuous] = useState(false);

  // PiP Camera State
  const [pipStream, setPipStream] = useState<MediaStream | null>(null);

  // Settings State
  const [constraints, setConstraints] = useState<MediaConstraints>({
    resolution: '1080p'
  });
  const [showSettings, setShowSettings] = useState(false);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Refs for Continuous Mode Logic
  const isContinuousRef = useRef(isContinuous);

  const isLoopingRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Sync ref with state
  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // --- Hooks ---
  // Only activate media stream when in 'studio' view
  const { stream, devices, error, permissionGranted, startStream, switchCamera } = useMediaStream(mode, constraints, view === 'studio');

  // --- Effects ---

  // Attach main stream to video element for preview
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

    // Only fetch PiP if in studio mode and screen mode
    if (view === 'studio' && mode === 'screen') {
      const getPip = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false
          });
          if (active) setPipStream(stream);
        } catch (e) {
          console.warn("Could not get PiP camera:", e);
        }
      };
      getPip();
    } else {
      // Cleanup PiP
      if (pipStream) {
        pipStream.getTracks().forEach(t => t.stop());
        setPipStream(null);
      }
    }

    return () => {
      active = false;
    };
  }, [mode, view]);

  // Attach PiP stream
  useEffect(() => {
    if (pipVideoRef.current && pipStream) {
      pipVideoRef.current.srcObject = pipStream;
    }
  }, [pipStream]);


  // --- Handlers ---

  const handleEnterStudio = (selectedMode: RecordingType) => {
    setMode(selectedMode);
    setView('studio');
  };

  const handleBackToHome = () => {
    if (isRecording) {
      if (!window.confirm("Recording is in progress. Are you sure you want to stop and leave?")) return;
      handleStopRecording();
    }
    setView('home');
    setShowSettings(false);
  };

  const handleStartRecording = useCallback(() => {
    if (!stream) {
      if (mode === 'screen') {
        startStream();
        return;
      }
      console.error("No stream available to record");
      return;
    }

    if (!stream.active) {
      console.error("Stream is inactive (ended)");
      startStream();
      return;
    }

    let options: MediaRecorderOptions = {};
    if (mode === 'audio') {
      options.mimeType = 'audio/webm';
    } else {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options.mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      isLoopingRef.current = false;

      // Internal helper to manage the timer logic
      const startTimer = (initialTimeOffset: number = 0) => {
        if (timerRef.current) clearInterval(timerRef.current as any);
        const startTime = Date.now() - initialTimeOffset * 1000;

        timerRef.current = window.setInterval(() => {
          const sec = Math.floor((Date.now() - startTime) / 1000);
          setRecordingTime(sec);

          // Continuous Mode Check: 20 minutes = 1200 seconds
          if (isContinuousRef.current && sec >= 1200) {
            isLoopingRef.current = true;
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
          }
        }, 1000);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || options.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const newRecording: RecordedMedia = {
          id: generateId(),
          type: mode,
          blob,
          url,
          createdAt: Date.now(),
          duration: isLoopingRef.current ? 1200 : Math.round((Date.now() - startTimeRef.current) / 1000), // Accurate duration from ref
          name: `${mode === 'screen' ? 'Screen' : mode === 'video' ? 'Video' : 'Audio'} ${recordedMedia.length + 1}${isLoopingRef.current ? ' (Part)' : ''}`
        };

        // Save the file
        setRecordedMedia(prev => [newRecording, ...prev]);

        if (isLoopingRef.current) {
          // RESTART LOGIC
          chunksRef.current = []; // Clear buffer
          isLoopingRef.current = false; // Reset flag
          recorder.start(200); // Start immediately
          setRecordingTime(0); // Reset UI timer
          startTimer(0); // Restart timer from 0
        } else {
          // STOP LOGIC
          setRecordingTime(0);
          if (timerRef.current) clearInterval(timerRef.current as any);
          setIsRecording(false);
          setIsPaused(false);
        }
      };

      recorder.onerror = (e) => {
        console.error("Recorder error:", e);
        handleStopRecording();
      };

      recorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      startTimer(recordingTime); // Start timer (handle resume case by passing recordingTime)

    } catch (e) {
      console.error("Recorder initialization failed", e);
      alert("Failed to start recording. Please ensure camera/screen is active.");
      setIsRecording(false);
    }
  }, [stream, mode, recordingTime, recordedMedia.length, startStream]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Note: State updates happen in recorder.onstop
  }, []);

  const handleSwitchCamera = async () => {
    const nextDeviceId = await switchCamera();
    if (nextDeviceId) {
      setConstraints(prev => ({ ...prev, videoDeviceId: nextDeviceId }));
    }
  };

  const deleteMedia = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecordedMedia(prev => prev.filter(m => m.id !== id));
  };

  const downloadMedia = (media: RecordedMedia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const a = document.createElement('a');
    a.href = media.url;
    a.download = `${media.name}.${media.type === 'audio' ? 'webm' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const updateMediaName = (id: string, name: string) => {
    setRecordedMedia(prev => prev.map(m => m.id === id ? { ...m, name } : m));
  };

  const switchMode = (newMode: RecordingType) => {
    if (isRecording) return;
    setMode(newMode);
  };

  // --- Render ---

  return (
    <div className="relative h-full w-full bg-background flex flex-col overflow-hidden font-sans">

      {/* ==================== HOME SCREEN ==================== */}
      {view === 'home' && (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 to-background">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tighter">
              Lumina Capture
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-md mx-auto">
              Professional recording studio. Choose a mode to begin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl z-10">
            {/* Card 1: Video */}
            <button
              onClick={() => handleEnterStudio('video')}
              className="group relative bg-surface/50 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/5 transition-all hover:scale-105 hover:border-primary/50 text-left overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-primary/20 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-primary/50 text-white group-hover:text-primary transition-colors">
                  <Icons.Video className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Video</h3>
                <p className="text-gray-400 text-sm">Record high-quality video with manual camera controls.</p>
              </div>
            </button>

            {/* Card 2: Audio */}
            <button
              onClick={() => handleEnterStudio('audio')}
              className="group relative bg-surface/50 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/5 transition-all hover:scale-105 hover:border-accent/50 text-left overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-accent/20 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-accent/50 text-white group-hover:text-accent transition-colors">
                  <Icons.Mic className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Audio</h3>
                <p className="text-gray-400 text-sm">Capture crystal clear audio with visualizer feedback.</p>
              </div>
            </button>

            {/* Card 3: Screen */}
            <button
              onClick={() => handleEnterStudio('screen')}
              className="group relative bg-surface/50 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/5 transition-all hover:scale-105 hover:border-green-500/50 text-left overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-24 bg-green-500/20 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-green-500/50 text-white group-hover:text-green-500 transition-colors">
                  <Icons.Screen className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Screen</h3>
                <p className="text-gray-400 text-sm">Share and record your screen for presentations.</p>
              </div>
            </button>
          </div>

          <div className="mt-12 z-10">
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white"
            >
              <Icons.Gallery className="w-4 h-4" />
              Open Library ({recordedMedia.length})
            </button>
          </div>
        </div>
      )}

      {/* ==================== STUDIO MODE ==================== */}
      {view === 'studio' && (
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
                  {error}. Please check your browser permissions settings and try again.
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

            {/* PiP Camera (Screen Mode Only) */}
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

            {/* Recording Indicator (DARK MODE) */}
            {isRecording && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full z-20">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <span className="font-mono font-bold text-white tracking-widest text-sm shadow-black drop-shadow-md">
                  {formatTime(recordingTime)}
                </span>
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
                  onClick={handleBackToHome}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 shrink-0"
                  title="Home"
                >
                  <Icons.Home className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>

                {/* Gallery Button */}
                <button
                  onClick={() => setShowGallery(!showGallery)}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 overflow-hidden group shrink-0"
                >
                  {recordedMedia.length > 0 && recordedMedia[0].type !== 'audio' ? (
                    <video src={recordedMedia[0].url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Icons.Gallery className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  )}
                </button>

                {/* Shutter Button */}
                <div className="relative group shrink-0">
                  <button
                    disabled={!permissionGranted && mode !== 'screen'}
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
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

                {/* Settings Button */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border border-white/5 shrink-0 ${showSettings ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                >
                  <Icons.Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Settings Panel Popover */}
            {showSettings && (
              <div className="absolute bottom-full left-0 right-0 mb-4 bg-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 p-4 animate-in slide-in-from-bottom-2 shadow-2xl w-full max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</h3>
                  <button onClick={() => setShowSettings(false)}><Icons.Close className="w-4 h-4 text-gray-400" /></button>
                </div>

                <div className="space-y-4">
                  {/* Mode Switcher (Mobile) */}
                  <div className="flex gap-2 bg-black/20 p-2 rounded-lg justify-center md:hidden">
                    {(['video', 'audio', 'screen'] as RecordingType[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`
                                px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex-1
                                ${mode === m ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}
                              `}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Continuous Mode Toggle (Only in Video) */}
                  {mode === 'video' && (
                    <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/5">
                          <Icons.Flip className="w-4 h-4 text-blue-400 rotate-90" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Continuous Mode</p>
                          <p className="text-[10px] text-gray-400">Save every 20 mins</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsContinuous(!isContinuous)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isContinuous ? 'bg-blue-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isContinuous ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  )}

                  {/* Video Quality (Only in Video Mode) */}
                  {mode === 'video' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Video Quality</label>
                      <select
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 transition-colors"
                        value={constraints.resolution || '1080p'}
                        onChange={(e) => {
                          setConstraints({ ...constraints, resolution: e.target.value as any });
                        }}
                      >
                        <option value="720p">720p (HD)</option>
                        <option value="1080p">1080p (Full HD)</option>
                        <option value="4k">4K (Ultra HD)</option>
                      </select>
                    </div>
                  )}

                  {/* Camera Select */}
                  {mode !== 'audio' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Camera</label>
                      <select
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 transition-colors"
                        value={constraints.videoDeviceId}
                        onChange={(e) => { setConstraints({ ...constraints, videoDeviceId: e.target.value }); }}
                      >
                        <option value="">Default Camera</option>
                        {devices.filter(d => d.kind === 'videoinput').map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Microphone Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Microphone</label>
                    <select
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 transition-colors"
                      value={constraints.audioDeviceId}
                      onChange={(e) => { setConstraints({ ...constraints, audioDeviceId: e.target.value }); }}
                    >
                      <option value="">Default Mic</option>
                      {devices.filter(d => d.kind === 'audioinput').map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== SHARED OVERLAYS ==================== */}

      {/* Editor Modal */}
      {selectedMediaId && (
        (() => {
          const media = recordedMedia.find(m => m.id === selectedMediaId);
          return media ? (
            <Editor
              media={media}
              onClose={() => setSelectedMediaId(null)}
              onDelete={(id) => deleteMedia(id)}
              onUpdate={updateMediaName}
            />
          ) : null;
        })()
      )}

      {/* Gallery Sheet */}
      {showGallery && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-full duration-300 flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Icons.Gallery className="w-5 h-5 text-primary" />
              Library
            </h2>
            <button onClick={() => setShowGallery(false)} className="p-2 rounded-full bg-surface text-white hover:bg-white/10">
              <Icons.Close className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {recordedMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                  <Icons.Gallery className="w-8 h-8 opacity-50" />
                </div>
                <p>No recordings yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                {recordedMedia.map(item => (
                  <div key={item.id} className="flex flex-col gap-1.5 group">
                    <div
                      className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-white/30 cursor-pointer transition-all shadow-lg"
                      onClick={() => setSelectedMediaId(item.id)}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/50 group-hover:bg-zinc-800 transition-colors">
                        {item.type === 'video' ? (
                          <Icons.Video className="w-8 h-8 text-gray-600 group-hover:text-white transition-colors duration-300" />
                        ) : item.type === 'audio' ? (
                          <Icons.Audio className="w-8 h-8 text-gray-600 group-hover:text-white transition-colors duration-300" />
                        ) : (
                          <Icons.Screen className="w-8 h-8 text-gray-600 group-hover:text-white transition-colors duration-300" />
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMediaId(item.id); }}
                            className="p-1.5 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => downloadMedia(item, e)}
                            className="p-1.5 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
                            title="Download"
                          >
                            <Icons.Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => deleteMedia(item.id, e)}
                          className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-full text-white/70 transition-colors"
                          title="Delete"
                        >
                          <Icons.Delete className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-1.5 left-1.5 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/40 group-hover:text-white/80 border border-white/5 transition-colors">
                        {item.type}
                      </div>
                    </div>

                    {/* Metadata Below Card */}
                    <div className="px-1">
                      <input
                        className="text-xs font-bold text-gray-300 truncate group-hover:text-white transition-colors bg-transparent border-none outline-none w-full p-0 focus:ring-1 focus:ring-white/20 rounded px-1"
                        defaultValue={item.name}
                        onBlur={(e) => updateMediaName(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Click to rename"
                      />
                      <p className="text-[10px] text-gray-500 font-mono flex justify-between items-center">
                        <span>{formatTime(item.duration)}</span>
                        <span className="opacity-50 text-[9px] uppercase">{item.type}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;