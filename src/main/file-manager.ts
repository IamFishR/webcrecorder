import { app } from 'electron';
import { join } from 'path';
import { writeFile, readdir, stat, unlink } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

const getRecordingsDir = () => {
    const documentsPath = app.getPath('documents');
    const recordingsPath = join(documentsPath, 'LuminaRecordings');
    if (!existsSync(recordingsPath)) {
        mkdirSync(recordingsPath, { recursive: true });
    }
    return recordingsPath;
};

export async function saveRecording(buffer: ArrayBuffer, type: string) {
    const dir = getRecordingsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `recording-${type}-${timestamp}.webm`;
    const filePath = join(dir, fileName);

    await writeFile(filePath, Buffer.from(buffer));
    return { filePath, fileName };
}

export async function listRecordings() {
    const dir = getRecordingsDir();
    try {
        const allFiles = await readdir(dir);
        const files = allFiles.filter(f => f.endsWith('.webm'));
        const recordings = await Promise.all(files.map(async (file) => {
            const filePath = join(dir, file);
            const stats = await stat(filePath);
            return {
                id: file,
                name: file,
                type: file.includes('audio') ? 'audio' : file.includes('screen') ? 'screen' : 'video',
                url: '',
                filePath,
                createdAt: stats.birthtimeMs,
                duration: 0,
                fileSize: stats.size
            };
        }));
        return recordings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
        return [];
    }
}

export async function deleteRecording(filePath: string) {
    try {
        await unlink(filePath);
        return true;
    } catch (e) {
        console.error("Failed to delete", e);
        return false;
    }
}
