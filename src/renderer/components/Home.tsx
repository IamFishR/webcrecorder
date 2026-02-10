import React from 'react';
import { Icons } from './Icons';

interface HomeProps {
    onEnterStudio: (mode: 'video' | 'audio' | 'screen') => void;
    onOpenGallery: () => void;
    onOpenFolder: () => void;
    recordingsCount: number;
    onOpenSettings: () => void;
}

export const Home: React.FC<HomeProps> = ({
    onEnterStudio,
    onOpenGallery,
    onOpenFolder,
    recordingsCount,
    onOpenSettings
}) => {
    return (
        <div className="h-full w-full overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 to-background">
            <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
                <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
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
                            onClick={() => onEnterStudio('video')}
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
                            onClick={() => onEnterStudio('audio')}
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
                            onClick={() => onEnterStudio('screen')}
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

                    <div className="mt-12 z-10 flex gap-3">
                        <button
                            onClick={onOpenGallery}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white"
                        >
                            <Icons.Gallery className="w-4 h-4" />
                            Open Library ({recordingsCount})
                        </button>
                        <button
                            onClick={onOpenFolder}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white"
                            title="Open recordings folder in Explorer"
                        >
                            <Icons.Save className="w-4 h-4" />
                            Recordings Folder
                        </button>
                    </div>

                    <button
                        onClick={onOpenSettings}
                        className="absolute top-6 right-6 p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Settings"
                    >
                        <Icons.Settings className="w-6 h-6" />
                    </button>

                </div>
            </div>
        </div>
    );
};
