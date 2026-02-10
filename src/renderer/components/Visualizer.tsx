import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
    stream: MediaStream | null;
    isActive: boolean;
    type?: 'bar' | 'wave';
}

export const Visualizer: React.FC<VisualizerProps> = ({ stream, isActive, type = 'bar' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();
    const sourceRef = useRef<MediaStreamAudioSourceNode>();

    useEffect(() => {
        if (!stream || !isActive || !canvasRef.current) return;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();

        try {
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            analyserRef.current = analyser;
            sourceRef.current = source;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;

            const draw = () => {
                const width = canvas.width;
                const height = canvas.height;

                requestRef.current = requestAnimationFrame(draw);

                analyser.getByteFrequencyData(dataArray);

                ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                ctx.clearRect(0, 0, width, height);

                const barWidth = (width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, '#ef4444'); // primary
                    gradient.addColorStop(1, '#3b82f6'); // accent

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                    x += barWidth + 1;
                }
            };

            draw();
        } catch (err) {
            console.error("Error setting up visualizer:", err);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioCtx.state !== 'closed') audioCtx.close();
        };
    }, [stream, isActive]);

    return <canvas ref={canvasRef} className="w-full h-full" width={600} height={200} />;
};
