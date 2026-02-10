import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { RecordedMedia } from '../types';
import { formatTime } from '../utils/format';

interface EditorProps {
    media: RecordedMedia;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, name: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ media, onClose, onDelete, onUpdate }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [name, setName] = useState(media.name);

    const videoRef = useRef<HTMLVideoElement>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        // Reset state on media change
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackSpeed(1);
        setName(media.name);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.load();
        }
    }, [media]);

    const togglePlay = async () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            // Wait for any pending play() to resolve before pausing
            if (playPromiseRef.current) {
                try { await playPromiseRef.current; } catch { /* ignored */ }
            }
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            const promise = videoRef.current.play();
            playPromiseRef.current = promise;
            try {
                await promise;
                setIsPlaying(true);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Playback error:', err);
                }
            }
            playPromiseRef.current = null;
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setIsMuted(vol === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMute = !isMuted;
            setIsMuted(newMute);
            videoRef.current.muted = newMute;
            if (!newMute && volume === 0) {
                setVolume(0.5);
                videoRef.current.volume = 0.5;
            }
        }
    };

    const changeSpeed = () => {
        const speeds = [0.5, 1, 1.5, 2];
        const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
        const nextSpeed = speeds[nextIndex];
        setPlaybackSpeed(nextSpeed);
        if (videoRef.current) {
            videoRef.current.playbackRate = nextSpeed;
        }
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this recording?')) {
            onDelete(media.id);
            onClose();
        }
    };

    // Construct source URL — use triple slash like file:/// to preserve drive letter colon
    const normalizedPath = media.filePath.replace(/\\/g, '/');
    const srcUrl = `lumina:///${encodeURI(normalizedPath)}`;

    // Extract folder path for display
    const folderPath = media.filePath.substring(0, media.filePath.lastIndexOf(media.filePath.includes('/') ? '/' : '\\'));

    const handleOpenFolder = () => {
        if (window.electronAPI) {
            window.electronAPI.openRecordingsFolder();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col font-sans animate-in fade-in duration-300">
            {/* Top Bar */}
            <div className="h-14 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            onUpdate(media.id, e.target.value);
                        }}
                        className="bg-transparent text-white font-medium border-none focus:ring-0 w-full max-w-md text-lg placeholder-gray-500"
                        placeholder="Recording Name"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenFolder}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 flex items-center gap-1.5 shrink-0"
                        title={media.filePath}
                    >
                        <Icons.Folder className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Open Folder</span>
                    </button>
                    <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-full transition-colors">
                        <Icons.Delete className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors">
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }}>
                {media.type !== 'audio' ? (
                    <video
                        ref={videoRef}
                        src={srcUrl}
                        className="w-full h-full object-contain focus:outline-none"
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        onLoadedMetadata={handleTimeUpdate}
                        playsInline
                        onClick={togglePlay}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-primary animate-pulse">
                        <Icons.Mic className="w-24 h-24 mb-4" />
                        <audio
                            ref={videoRef}
                            src={srcUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={() => setIsPlaying(false)}
                            onLoadedMetadata={handleTimeUpdate}
                        />
                    </div>
                )}

                {/* Play Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Icons.Play className="w-8 h-8 text-white ml-1" />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-zinc-900 border-t border-white/10 p-4 pb-8">
                {/* Scrubber */}
                <div className="mb-4 flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                    />
                    <span className="text-xs font-mono text-gray-400 w-12">{formatTime(duration)}</span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 w-1/3">
                        <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
                            {isMuted || volume === 0 ? <Icons.Mute className="w-5 h-5" /> : <Icons.Volume className="w-5 h-5" />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                    </div>

                    <div className="flex items-center justify-center gap-6 w-1/3">
                        <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }} className="text-gray-400 hover:text-white transition-colors">
                            <Icons.Rewind className="w-6 h-6" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Icons.Pause className="w-5 h-5" /> : <Icons.Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }} className="text-gray-400 hover:text-white transition-colors">
                            <Icons.Forward className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex items-center justify-end gap-4 w-1/3">
                        <button onClick={changeSpeed} className="text-xs font-bold text-gray-400 hover:text-white border border-white/10 rounded px-2 py-1 min-w-[3rem] transition-colors">
                            {playbackSpeed}x
                        </button>
                    </div>
                </div>

                {/* File Location */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500">
                    <Icons.Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate" title={media.filePath}>{media.filePath}</span>
                    <button
                        onClick={handleOpenFolder}
                        className="shrink-0 text-gray-400 hover:text-white transition-colors underline underline-offset-2"
                    >
                        Show
                    </button>
                </div>
            </div>
        </div>
    );
};
