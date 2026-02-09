import React from 'react';
import { Icons } from './Icons';
import { RecordedMedia } from '../types';
import { formatTime, formatBytes } from '../utils/format';

interface GalleryProps {
    show: boolean;
    onClose: () => void;
    onOpenFolder: () => void;
    media: RecordedMedia[];
    onSelectMedia: (id: string) => void;
    onDeleteMedia: (id: string, e: React.MouseEvent) => void;
    onUpdateName: (id: string, name: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
    show,
    onClose,
    onOpenFolder,
    media,
    onSelectMedia,
    onDeleteMedia,
    onUpdateName
}) => {
    if (!show) return null;

    return (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-full duration-300 flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Icons.Gallery className="w-5 h-5 text-primary" />
                    Library
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenFolder}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/5"
                        title="Open recordings folder"
                    >
                        Open Folder
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full bg-surface text-white hover:bg-white/10">
                        <Icons.Close className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {media.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                            <Icons.Gallery className="w-8 h-8 opacity-50" />
                        </div>
                        <p>No recordings yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {media.map(item => (
                            <div key={item.id} className="flex flex-col gap-1.5 group">
                                <div
                                    className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-white/30 cursor-pointer transition-all shadow-lg"
                                    onClick={() => onSelectMedia(item.id)}
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
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectMedia(item.id); }}
                                            className="p-1.5 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
                                            title="Edit"
                                        >
                                            <Icons.Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => onDeleteMedia(item.id, e)}
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
                                        onBlur={(e) => onUpdateName(item.id, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Click to rename"
                                    />
                                    <p className="text-[10px] text-gray-500 font-mono flex justify-between items-center">
                                        <span>{formatTime(item.duration)}</span>
                                        <span>{item.fileSize ? formatBytes(item.fileSize) : ''}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
