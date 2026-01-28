import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { RecordedMedia } from '../types';
import { formatBytes, formatTime } from '../utils/format';

interface EditorProps {
  media: RecordedMedia;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newName: string) => void;
}

type EditMode = 'none' | 'trim' | 'adjust' | 'speed';

export const Editor: React.FC<EditorProps> = ({ media, onClose, onDelete, onUpdate }) => {
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [isMuted, setIsMuted] = useState(false);

  // Edit State
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [name, setName] = useState(media.name);

  // Tools State
  const [trimRange, setTrimRange] = useState<[number, number]>([0, media.duration]);
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Refs to access latest state inside event listeners without re-binding
  const trimRangeRef = useRef(trimRange);
  const editModeRef = useRef(editMode);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { trimRangeRef.current = trimRange; }, [trimRange]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // --- Effects ---

  // Initial Load & Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initial load - Only run this when media.url changes
    video.load();

    const onLoadedMetadata = () => {
      if (!Number.isNaN(video.duration) && video.duration !== Infinity) {
        setDuration(video.duration);
        // Initialize trim range to full duration on load
        setTrimRange([0, video.duration]);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      setIsPlaying(false);
      if (video) video.currentTime = trimRangeRef.current[0];
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      const range = trimRangeRef.current;
      const mode = editModeRef.current;
      // Loop logic for trim preview
      if (mode === 'trim' && video.currentTime >= range[1]) {
        video.pause();
        video.currentTime = range[0];
        // Optional: auto-replay loop could go here
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [media.url]); // Crucial: Only run when media changes, not when trimRange changes

  // Apply Adjustments
  useEffect(() => {
    if (videoRef.current) {
      // Apply CSS filters for preview
      videoRef.current.style.filter = `
            brightness(${adjustments.brightness}%) 
            contrast(${adjustments.contrast}%) 
            saturate(${adjustments.saturation}%)
        `;
    }
  }, [adjustments]);

  // Apply Speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // --- Handlers ---

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error("Playback failed:", e));
    } else {
      videoRef.current.pause();
    }
  };

  const seek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = media.url;
    a.download = `${name}.${media.type === 'video' || media.type === 'screen' ? 'mp4' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Render Helpers ---

  const getFilterStyle = () => ({
    filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col font-sans animate-in fade-in duration-300">

      {/* --- Top Bar (Floating) --- */}
      <div className="absolute top-6 left-0 right-0 z-20 px-4 flex justify-center pointer-events-none">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-3 pr-3 flex items-center gap-4 shadow-2xl pointer-events-auto">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
            <Icons.Back className="w-5 h-5" />
          </button>

          <div className="h-6 w-[1px] bg-white/10" />

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => onUpdate(media.id, name)}
            className="bg-transparent text-center text-sm font-medium focus:outline-none w-32 truncate text-white placeholder-gray-500"
            placeholder="Untitled"
          />

          <div className="h-6 w-[1px] bg-white/10" />

          <button onClick={() => { onDelete(media.id); onClose(); }} className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition-colors">
            <Icons.Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden" onClick={() => editMode === 'none' && togglePlay()}>
        {media.type !== 'audio' ? (
          <video
            ref={videoRef}
            src={media.url}
            className="w-full h-full object-contain transition-all duration-300"
            playsInline
            muted={isMuted}
            style={getFilterStyle()} // Apply live filters
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <div className="w-48 h-48 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-8 relative">
              <div className={`absolute inset-0 rounded-full border-2 border-primary/50 ${isPlaying ? 'animate-ping' : ''}`} />
              <Icons.Audio className="w-16 h-16 text-gray-400" />
            </div>
            {/* Audio Element Hidden */}
            <video ref={videoRef} src={media.url} className="hidden" playsInline muted={isMuted} />
          </div>
        )}

        {/* Play Overlay (Only show if paused and no active tool is obscuring view) */}
        {!isPlaying && editMode === 'none' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
              <Icons.Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* --- Bottom Controls Area --- */}
      <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-4 px-4 pointer-events-none">

        {/* Tool Specific Panels (Floating Above Main Bar) */}

        {/* 1. TRIMMER */}
        {editMode === 'trim' && (
          <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 animate-in slide-in-from-bottom-5 pointer-events-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
              <span>Start: {formatTime(trimRange[0])}</span>
              <span>End: {formatTime(trimRange[1])}</span>
            </div>
            <div className="relative h-10 flex items-center select-none">
              {/* Track */}
              <div className="absolute left-0 right-0 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="absolute top-0 bottom-0 bg-primary/50"
                  style={{ left: `${(trimRange[0] / duration) * 100}%`, right: `${100 - (trimRange[1] / duration) * 100}%` }} />
              </div>
              {/* Inputs */}
              <input type="range" min={0} max={duration} step={0.1} value={trimRange[0]}
                onChange={(e) => { const v = parseFloat(e.target.value); if (v < trimRange[1]) setTrimRange([v, trimRange[1]]); }}
                className="absolute w-full h-full opacity-0 cursor-ew-resize z-20" />
              <input type="range" min={0} max={duration} step={0.1} value={trimRange[1]}
                onChange={(e) => { const v = parseFloat(e.target.value); if (v > trimRange[0]) setTrimRange([trimRange[0], v]); }}
                className="absolute w-full h-full opacity-0 cursor-ew-resize z-20" />

              {/* Handles */}
              <div className="absolute h-6 w-3 bg-white rounded-sm pointer-events-none shadow-lg" style={{ left: `${(trimRange[0] / duration) * 100}%`, transform: 'translateX(-50%)' }} />
              <div className="absolute h-6 w-3 bg-white rounded-sm pointer-events-none shadow-lg" style={{ left: `${(trimRange[1] / duration) * 100}%`, transform: 'translateX(-50%)' }} />
            </div>
          </div>
        )}

        {/* 2. ADJUSTMENTS */}
        {editMode === 'adjust' && (
          <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 animate-in slide-in-from-bottom-5 pointer-events-auto space-y-4">
            {[
              { label: 'Brightness', icon: Icons.Brightness, key: 'brightness' },
              { label: 'Contrast', icon: Icons.Contrast, key: 'contrast' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-gray-400" />
                <input
                  type="range" min="0" max="200"
                  value={adjustments[item.key as keyof typeof adjustments]}
                  onChange={(e) => setAdjustments({ ...adjustments, [item.key]: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            ))}
          </div>
        )}

        {/* 3. SPEED */}
        {editMode === 'speed' && (
          <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 animate-in slide-in-from-bottom-5 pointer-events-auto flex gap-2 overflow-x-auto no-scrollbar">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${playbackSpeed === s ? 'bg-white text-black' : 'bg-transparent text-white hover:bg-white/10'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}


        {/* Main Control Bar (Floating Pill) */}
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full p-2 pr-4 pl-4 flex items-center gap-4 shadow-2xl pointer-events-auto w-full max-w-lg justify-between">

          {/* Left: Tools Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditMode(editMode === 'trim' ? 'none' : 'trim')}
              className={`p-3 rounded-full transition-all ${editMode === 'trim' ? 'bg-white text-black' : 'hover:bg-white/10 text-gray-400'}`}
              title="Trim"
            >
              <Icons.Trim className="w-5 h-5" />
            </button>
            <button
              onClick={() => setEditMode(editMode === 'adjust' ? 'none' : 'adjust')}
              className={`p-3 rounded-full transition-all ${editMode === 'adjust' ? 'bg-white text-black' : 'hover:bg-white/10 text-gray-400'}`}
              title="Adjust Color"
            >
              <Icons.Contrast className="w-5 h-5" />
            </button>
            <button
              onClick={() => setEditMode(editMode === 'speed' ? 'none' : 'speed')}
              className={`p-3 rounded-full transition-all ${editMode === 'speed' ? 'bg-white text-black' : 'hover:bg-white/10 text-gray-400'}`}
              title="Speed"
            >
              <Icons.Speed className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Play/Pause */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-400 hidden sm:block">{formatTime(currentTime)}</span>
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-primary hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/20 transition-all hover:scale-105"
            >
              {isPlaying ? <Icons.Pause className="w-5 h-5 fill-current" /> : <Icons.Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              {isMuted ? <Icons.Mute className="w-5 h-5" /> : <Icons.Volume className="w-5 h-5" />}
            </button>

            <div className="w-[1px] h-8 bg-white/10 mx-1" />

            <button
              onClick={handleDownload}
              className="p-3 rounded-full bg-white text-black hover:bg-gray-200 transition-all"
              title="Download"
            >
              <Icons.Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrubber (Below Pill) */}
        <div className="w-full max-w-lg px-4 pb-2 pointer-events-auto group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 group-hover:[&::-webkit-slider-thumb]:w-3 group-hover:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all"
          />
        </div>

      </div>
    </div>
  );
};