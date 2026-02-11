import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream?: MediaStream;
    audioUrl?: string;
    className?: string;
    barColor?: string;
}

export function AudioVisualizer({ stream, audioUrl, className, barColor = '#f43f5e' }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!stream && !audioUrl) return;

        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }

        const ctx = audioContextRef.current;
        if (!analyserRef.current) {
            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 256;
        }
        const analyser = analyserRef.current;

        if (stream) {
            if (sourceRef.current) sourceRef.current.disconnect();
            sourceRef.current = ctx.createMediaStreamSource(stream);
            sourceRef.current.connect(analyser);
        } else if (audioUrl) {
            // For URL, we handle it via an internal audio element for simplicity in this visualizer
            // But typically the parent should handle playback. 
            // For now, let's assume the AudioVisualizer is JUST for visualization and expects a source.
            // If audioUrl is provided, we create a hidden audio element to play it and visualize it.
            if (!audioElRef.current) {
                audioElRef.current = new Audio(audioUrl);
                audioElRef.current.crossOrigin = "anonymous";
                // Wait for user interaction usually required, but for this component we assume it's triggered.
            }
            const audio = audioElRef.current;
            if (audio.src !== audioUrl) audio.src = audioUrl;

            if (sourceRef.current) sourceRef.current.disconnect();
            try {
                sourceRef.current = ctx.createMediaElementSource(audio);
                sourceRef.current.connect(analyser);
                analyser.connect(ctx.destination);
                // audio.play().catch(e => console.error("Auto-play prevented", e)); 
            } catch {
                // Re-connecting same element might fail if already connected
            }
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Rounded bars logic/style
                canvasCtx.fillStyle = barColor; // Rose-500 equivalent

                // Dynamic opacity based on height
                const opacity = Math.min(1, barHeight / 100 + 0.2);
                canvasCtx.globalAlpha = opacity;

                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
            canvasCtx.globalAlpha = 1;
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
            // Clean up context if needed, or keep it persistent?
            // sourceRef.current?.disconnect();
            // audioElRef.current?.pause();
        };
    }, [stream, audioUrl, barColor]);

    // Handle resizing
    useEffect(() => {
        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = canvasRef.current.offsetWidth;
                canvasRef.current.height = canvasRef.current.offsetHeight;
            }
        }
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            width={300}
            height={100}
        />
    );
}
