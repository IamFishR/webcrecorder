import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './components/Icons';
import { useMediaStream } from './hooks/useMediaStream';
import { Visualizer } from './components/Visualizer';
import { Editor } from './components/Editor';
import { RecordedMedia, RecordingType, MediaConstraints } from './types';
import { formatTime, generateId } from './utils/format';

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<RecordingType>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  
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

  // --- Hooks ---
  const { stream, devices, error, permissionGranted, startStream, switchCamera } = useMediaStream(mode, constraints);

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
    
    if (mode === 'screen') {
      // Small delay to ensure main stream transitions don't conflict
      const getPip = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false // Audio is handled by the main recorder
          });
          if (active) setPipStream(stream);
        } catch (e) {
          console.warn("Could not get PiP camera:", e);
        }
      };
      getPip();
    } else {
      // Cleanup PiP if not in screen mode
      if (pipStream) {
        pipStream.getTracks().forEach(t => t.stop());
        setPipStream(null);
      }
    }

    return () => {
      active = false;
      // We don't stop tracks here on unmount/re-render immediately to prevent flickering during quick updates,
      // but we do ensure we stop them if mode changes in the else block above.
    };
  }, [mode]); // Only re-run if mode changes

  // Attach PiP stream
  useEffect(() => {
    if (pipVideoRef.current && pipStream) {
      pipVideoRef.current.srcObject = pipStream;
    }
  }, [pipStream]);


  // --- Handlers ---

  const handleStartRecording = useCallback(() => {
    if (!stream) {
      // If in screen mode and no stream, this button acts as "Start Sharing"
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

    // Determine MIME type with MP4 preference
    let options: MediaRecorderOptions = {};
    if (mode === 'audio') {
      options.mimeType = 'audio/webm';
    } else {
      // Prefer MP4 for broader compatibility
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
          duration: recordingTime,
          name: `${mode === 'screen' ? 'Screen' : mode === 'video' ? 'Video' : 'Audio'} ${recordedMedia.length + 1}`
        };
        setRecordedMedia(prev => [newRecording, ...prev]);
        setRecordingTime(0);
        if (timerRef.current) clearInterval(timerRef.current as any);
      };

      recorder.onerror = (e) => {
         console.error("Recorder error:", e);
         handleStopRecording();
      };

      recorder.start(200); 
      setIsRecording(true);
      setIsPaused(false);

      const startTime = Date.now() - recordingTime * 1000;
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

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
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current as any);
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

  // Editor Modal
  if (selectedMediaId) {
    const media = recordedMedia.find(m => m.id === selectedMediaId);
    if (media) {
      return (
        <Editor 
          media={media} 
          onClose={() => setSelectedMediaId(null)} 
          onDelete={(id) => deleteMedia(id)}
          onUpdate={updateMediaName}
        />
      );
    }
  }

  return (
    <div className="relative h-full w-full bg-background flex flex-col overflow-hidden font-sans">
      
      {/* --- Viewfinder Area --- */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
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

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-500/10 backdrop-blur-md border border-red-500/20 px-4 py-1.5 rounded-full z-20">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <span className="font-mono font-bold text-white tracking-widest text-sm shadow-black drop-shadow-md">
              {formatTime(recordingTime)}
            </span>
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

            {/* Mode Switcher (Pill) */}
             <div className="flex bg-white/5 rounded-full p-1 border border-white/5 shrink-0 hidden md:flex">
              {(['video', 'audio', 'screen'] as RecordingType[]).map((m) => (
                <button 
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`
                    w-10 h-8 flex items-center justify-center rounded-full transition-all
                    ${mode === m ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                  `}
                  title={m.charAt(0).toUpperCase() + m.slice(1)}
                >
                   {m === 'video' && <Icons.Video className="w-4 h-4" />}
                   {m === 'audio' && <Icons.Mic className="w-4 h-4" />}
                   {m === 'screen' && <Icons.Screen className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Mobile Mode Switcher Trigger (Just Current Icon) */}
            <div className="md:hidden">
              <button className="w-10 h-8 bg-white text-black rounded-full flex items-center justify-center">
                   {mode === 'video' && <Icons.Video className="w-4 h-4" />}
                   {mode === 'audio' && <Icons.Mic className="w-4 h-4" />}
                   {mode === 'screen' && <Icons.Screen className="w-4 h-4" />}
              </button>
            </div>


            {/* Shutter Button (Redesigned) */}
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
          <div className="absolute bottom-full left-0 right-0 mb-4 bg-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 p-4 animate-in slide-in-from-bottom-2 shadow-2xl">
             <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</h3>
                <button onClick={() => setShowSettings(false)}><Icons.Close className="w-4 h-4 text-gray-400" /></button>
             </div>
             <div className="space-y-3">
                <div className="md:hidden flex gap-2 mb-4 bg-black/20 p-2 rounded-lg justify-center">
                    {/* Mobile Mode Switcher inside Settings for better UX if hidden in main bar */}
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

                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  value={constraints.videoDeviceId}
                  onChange={(e) => { setConstraints({...constraints, videoDeviceId: e.target.value}); if(mode!=='screen') startStream(); }}
                >
                   <option value="">Default Camera</option>
                  {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
                <select 
                   className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                   value={constraints.audioDeviceId}
                   onChange={(e) => { setConstraints({...constraints, audioDeviceId: e.target.value}); if(mode!=='screen') startStream(); }}
                >
                  <option value="">Default Mic</option>
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
             </div>
          </div>
        )}
      </div>

      {/* --- Gallery Sheet --- */}
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
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {recordedMedia.map(item => (
                  <div 
                    key={item.id} 
                    className="relative group aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/50 cursor-pointer transition-all"
                    onClick={() => setSelectedMediaId(item.id)}
                    onMouseEnter={(e) => {
                        const v = e.currentTarget.querySelector('video');
                        if (v) v.play().catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                        const v = e.currentTarget.querySelector('video');
                        if (v) { v.pause(); v.currentTime = 0; }
                    }}
                  >
                    {item.type === 'audio' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Icons.Audio className="w-8 h-8 text-gray-600 mb-2" />
                        <div className="w-8 h-1 bg-gray-800 rounded-full" />
                      </div>
                    ) : (
                      <video 
                        src={item.url} 
                        className="w-full h-full object-cover" 
                        muted 
                        playsInline
                        loop
                      />
                    )}
                    
                    {/* Overlay Options */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                      <div className="flex justify-end gap-1 pointer-events-auto">
                         <button 
                            onClick={(e) => downloadMedia(item, e)}
                            className="p-1.5 bg-white/10 rounded-full hover:bg-white text-white hover:text-black transition-colors"
                         >
                            <Icons.Download className="w-3 h-3" />
                         </button>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-white truncate">{item.name}</p>
                        <p className="text-[9px] text-gray-400">{formatTime(item.duration)}</p>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase text-white backdrop-blur-sm">
                      {item.type}
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