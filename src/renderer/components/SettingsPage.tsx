import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { MediaConstraints } from '../types';

interface SettingsPageProps {
    onBack: () => void;
    savedConstraints: MediaConstraints;
    onSaveConstraints: (constraints: MediaConstraints) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    onBack,
    savedConstraints,
    onSaveConstraints
}) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [constraints, setConstraints] = useState<MediaConstraints>(savedConstraints);
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

    // Load devices
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

    const handleBack = () => {
        onSaveConstraints(constraints); // Auto-save on back
        onBack();
    };

    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const audioDevices = devices.filter(d => d.kind === 'audioinput');

    return (
        <div className="h-full w-full bg-background flex flex-col font-sans animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <Icons.ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                    <h1 className="text-xl font-bold text-white">Settings</h1>
                </div>
                <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
                >
                    Done
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-surface p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('video')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'video' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Icons.Video className="w-4 h-4" />
                        Video
                    </button>
                    <button
                        onClick={() => setActiveTab('audio')}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'audio' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Icons.Mic className="w-4 h-4" />
                        Audio
                    </button>
                </div>

                <div className="space-y-8 animate-in fade-in duration-300">
                    {activeTab === 'video' && (
                        <>
                            <section className="space-y-4">
                                <h2 className="text-lg font-semibold text-white/90 border-b border-white/5 pb-2">Camera</h2>
                                <div className="grid gap-4">
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-400 mb-2 block">Default Camera</span>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-primary/50 transition-colors"
                                                value={constraints.videoDeviceId || ''}
                                                onChange={(e) => setConstraints({ ...constraints, videoDeviceId: e.target.value })}
                                            >
                                                <option value="">System Default</option>
                                                {videoDevices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}...`}</option>
                                                ))}
                                            </select>
                                            <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-400 mb-2 block">Default Resolution</span>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-primary/50 transition-colors"
                                                value={constraints.resolution || '1080p'}
                                                onChange={(e) => setConstraints({ ...constraints, resolution: e.target.value as any })}
                                            >
                                                <option value="720p">720p (HD)</option>
                                                <option value="1080p">1080p (Full HD)</option>
                                                <option value="4k">4K (Ultra HD)</option>
                                            </select>
                                            <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Higher resolutions require more processing power and storage.</p>
                                    </label>
                                </div>
                            </section>
                        </>
                    )}

                    {activeTab === 'audio' && (
                        <section className="space-y-4">
                            <h2 className="text-lg font-semibold text-white/90 border-b border-white/5 pb-2">Microphone</h2>
                            <div className="grid gap-4">
                                <label className="block">
                                    <span className="text-sm font-medium text-gray-400 mb-2 block">Input Device</span>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-primary/50 transition-colors"
                                            value={constraints.audioDeviceId || ''}
                                            onChange={(e) => setConstraints({ ...constraints, audioDeviceId: e.target.value })}
                                        >
                                            <option value="">System Default</option>
                                            {audioDevices.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}</option>
                                            ))}
                                        </select>
                                        <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </label>
                            </div>
                        </section>
                    )}

                    <div className="mt-12 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-blue-200 text-sm">
                        <Icons.Video className="w-5 h-5 shrink-0" />
                        <p>These settings will be used as the default whenever you start a new recording session. You can still override them temporarily within the studio.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
