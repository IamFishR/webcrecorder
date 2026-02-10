import { useState, useEffect, useRef } from 'react';

export const useCompositor = (mainStream: MediaStream | null, pipStream: MediaStream | null, isActive: boolean) => {
    const [compositedStream, setCompositedStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>();

    useEffect(() => {
        if (!isActive || !mainStream) {
            setCompositedStream(null);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        const videoMain = document.createElement('video');
        videoMain.srcObject = mainStream;
        videoMain.muted = true;
        videoMain.play().catch(console.error);

        let videoPip: HTMLVideoElement | null = null;
        if (pipStream) {
            videoPip = document.createElement('video');
            videoPip.srcObject = pipStream;
            videoPip.muted = true;
            videoPip.play().catch(console.error);
        }

        const draw = () => {
            if (!ctx) return;

            // Draw Main
            if (videoMain.readyState >= 2) { // HAVE_CURRENT_DATA
                ctx.drawImage(videoMain, 0, 0, canvas.width, canvas.height);
            }

            // Draw PiP
            if (videoPip && videoPip.readyState >= 2) {
                const pipWidth = 320;
                const pipHeight = 180;
                const padding = 20;
                const x = canvas.width - pipWidth - padding;
                const y = canvas.height - pipHeight - padding;

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(x, y, pipWidth, pipHeight, 15);
                ctx.clip();
                // Flip PiP horizontally
                ctx.translate(x + pipWidth, y);
                ctx.scale(-1, 1);
                ctx.drawImage(videoPip, 0, 0, pipWidth, pipHeight);
                ctx.restore();

                // Border
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            requestRef.current = requestAnimationFrame(draw);
        };

        draw();

        const stream = canvas.captureStream(30); // 30 FPS
        // Merge audio tracks
        mainStream.getAudioTracks().forEach(track => stream.addTrack(track));
        if (pipStream) {
            pipStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }

        setCompositedStream(stream);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // Don't stop source streams here, just the canvas composition
        };
    }, [mainStream, pipStream, isActive]);

    return { compositedStream };
};
