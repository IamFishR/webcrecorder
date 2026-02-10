import React, { useState, useCallback, useEffect } from 'react';
import { Home } from './components/Home';
import { Studio } from './components/Studio';
import { Gallery } from './components/Gallery';
import { Editor } from './components/Editor';
import { SettingsPage } from './components/SettingsPage';
import { MediaConstraints, RecordedMedia, RecordingType } from './types';

const App: React.FC = () => {
    // --- State ---
    const [view, setView] = useState<'home' | 'studio' | 'settings'>('home');
    const [mode, setMode] = useState<RecordingType>('video');
    const [recordedMedia, setRecordedMedia] = useState<RecordedMedia[]>([]);
    const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);

    // Persistent Settings
    const [mediaConstraints, setMediaConstraints] = useState<MediaConstraints>(() => {
        const saved = localStorage.getItem('lumina_settings');
        return saved ? JSON.parse(saved) : { resolution: '1080p' };
    });

    // --- Load existing recordings from disk on startup ---
    useEffect(() => {
        const loadRecordings = async () => {
            if (window.electronAPI) {
                try {
                    const existing = await window.electronAPI.listRecordings();
                    if (existing.length > 0) {
                        setRecordedMedia(existing);
                    }
                } catch (err) {
                    console.error('Failed to load recordings:', err);
                }
            }
        };
        loadRecordings();
    }, []);

    // --- Handlers ---

    const handleSaveSettings = (newConstraints: MediaConstraints) => {
        setMediaConstraints(newConstraints);
        localStorage.setItem('lumina_settings', JSON.stringify(newConstraints));
    };

    const handleEnterStudio = (selectedMode: RecordingType) => {
        setMode(selectedMode);
        setView('studio');
    };

    const handleBackToHome = () => {
        setView('home');
    };

    const onRecordingSaved = useCallback((recording: RecordedMedia) => {
        setRecordedMedia(prev => {
            // Avoid duplicates if already loaded from disk
            const filtered = prev.filter(m => m.filePath !== recording.filePath);
            return [recording, ...filtered];
        });
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
                    onOpenSettings={() => setView('settings')}
                />
            )}

            {view === 'settings' && (
                <SettingsPage
                    onBack={handleBackToHome}
                    savedConstraints={mediaConstraints}
                    onSaveConstraints={handleSaveSettings}
                />
            )}

            {view === 'studio' && (
                <Studio
                    initialMode={mode}
                    initialConstraints={mediaConstraints}
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
