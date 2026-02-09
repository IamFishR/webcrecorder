import React, { useState, useCallback } from 'react';
import { Home } from './components/Home';
import { Studio } from './components/Studio';
import { Gallery } from './components/Gallery';
import { Editor } from './components/Editor';
import { RecordedMedia, RecordingType } from './types';

const App: React.FC = () => {
    // --- State ---
    const [view, setView] = useState<'home' | 'studio'>('home');
    const [mode, setMode] = useState<RecordingType>('video');
    const [recordedMedia, setRecordedMedia] = useState<RecordedMedia[]>([]);
    const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);

    // --- Handlers ---

    const handleEnterStudio = (selectedMode: RecordingType) => {
        setMode(selectedMode);
        setView('studio');
    };

    const handleBackToHome = () => {
        setView('home');
    };

    const onRecordingSaved = useCallback((recording: RecordedMedia) => {
        setRecordedMedia(prev => [recording, ...prev]);
    }, []);

    const deleteFile = async (filePath: string) => {
        if (window.electronAPI) {
            await window.electronAPI.deleteFile(filePath);
        }
    };

    const openRecordingsFolder = async () => {
        if (window.electronAPI) {
            await window.electronAPI.openRecordingsFolder();
        }
    };

    const handleDeleteMedia = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const media = recordedMedia.find(m => m.id === id);
        if (media?.filePath) {
            await deleteFile(media.filePath);
        }
        setRecordedMedia(prev => prev.filter(m => m.id !== id));
    };

    const updateMediaName = (id: string, name: string) => {
        setRecordedMedia(prev => prev.map(m => m.id === id ? { ...m, name } : m));
    };

    // --- Render ---

    return (
        <div className="relative h-[100dvh] w-full bg-background flex flex-col overflow-hidden font-sans">

            {/* ==================== SCREEN VIEWS ==================== */}

            {view === 'home' && (
                <Home
                    onEnterStudio={handleEnterStudio}
                    onOpenGallery={() => setShowGallery(true)}
                    onOpenFolder={openRecordingsFolder}
                    recordingsCount={recordedMedia.length}
                />
            )}

            {view === 'studio' && (
                <Studio
                    initialMode={mode}
                    onBack={handleBackToHome}
                    onRecordingSaved={onRecordingSaved}
                    showGallery={showGallery}
                    onToggleGallery={() => setShowGallery(!showGallery)}
                />
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
                            onDelete={(id) => handleDeleteMedia(id)}
                            onUpdate={updateMediaName}
                        />
                    ) : null;
                })()
            )}

            {/* Gallery Sheet */}
            <Gallery
                show={showGallery}
                onClose={() => setShowGallery(false)}
                onOpenFolder={openRecordingsFolder}
                media={recordedMedia}
                onSelectMedia={setSelectedMediaId}
                onDeleteMedia={handleDeleteMedia}
                onUpdateName={updateMediaName}
            />

        </div>
    );
};

export default App;
