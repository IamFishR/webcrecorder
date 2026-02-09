import React from 'react';
import { Icons } from './Icons';
import { RecordingType, MediaConstraints } from '../types';

interface SettingsPanelProps {
    show: boolean;
    onClose: () => void;
    mode: RecordingType;
    onSwitchMode: (mode: RecordingType) => void;
    isContinuous: boolean;
    onToggleContinuous: () => void;
    constraints: MediaConstraints;
    onConstraintChange: (constraints: MediaConstraints) => void;
    devices: MediaDeviceInfo[];
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    show,
    onClose,
    mode,
    onSwitchMode,
    isContinuous,
    onToggleContinuous,
    constraints,
    onConstraintChange,
    devices
}) => {
    if (!show) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-4 bg-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 p-4 animate-in slide-in-from-bottom-2 shadow-2xl w-full max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</h3>
                <button onClick={onClose}><Icons.Close className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="space-y-4">
                {/* Mode Switcher */}
                <div className="flex gap-2 bg-black/20 p-2 rounded-lg justify-center">
                    {(['video', 'audio', 'screen'] as RecordingType[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => onSwitchMode(m)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all flex-1 ${mode === m ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {/* Continuous Mode Toggle */}
                {(mode === 'video' || mode === 'screen') && (
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
                            onClick={onToggleContinuous}
                            className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isContinuous ? 'bg-blue-500' : 'bg-white/20'}`}
                        >
                            <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isContinuous ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                )}

                {/* Video Quality */}
                {mode === 'video' && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Video Quality</label>
                        <select
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30 transition-colors"
                            value={constraints.resolution || '1080p'}
                            onChange={(e) => onConstraintChange({ ...constraints, resolution: e.target.value as any })}
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
                            value={constraints.videoDeviceId || ''}
                            onChange={(e) => onConstraintChange({ ...constraints, videoDeviceId: e.target.value })}
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
                        value={constraints.audioDeviceId || ''}
                        onChange={(e) => onConstraintChange({ ...constraints, audioDeviceId: e.target.value })}
                    >
                        <option value="">Default Mic</option>
                        {devices.filter(d => d.kind === 'audioinput').map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
