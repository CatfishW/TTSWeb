import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { cn } from '@/lib/utils'; // Assumes utility exists

interface AudioPlayerProps {
    audioUrl: string | null;
    className?: string;
    autoPlay?: boolean;
}

export function AudioPlayer({ audioUrl, className, autoPlay = false }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioUrl && autoPlay && audioRef.current) {
            audioRef.current.play().catch(console.error);
        }
    }, [audioUrl, autoPlay]);

    const togglePlay = () => {
        if (!audioRef.current || !audioUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!audioUrl) return null;

    return (
        <div className={cn("w-full bg-stone-50 rounded-xl p-4 border border-stone-200", className)}>
            <div className="mb-4 h-24 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 relative">
                <AudioVisualizer audioUrl={audioUrl} className="w-full h-full opacity-80" />
            </div>

            <div className="flex flex-col gap-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 text-xs text-stone-500 font-mono">
                    <span>{formatTime(progress)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={progress}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-stone-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500 cursor-pointer"
                    />
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlay}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-700 transition-transform active:scale-95 shadow-md"
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                        </button>

                        <button onClick={toggleMute} className="text-stone-400 hover:text-stone-600">
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                    </div>

                    <a
                        href={audioUrl}
                        download="generated-audio.wav"
                        className="flex items-center gap-2 text-stone-500 hover:text-rose-600 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
                    >
                        <Download size={16} />
                        Download
                    </a>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                className="hidden"
            />
        </div>
    );
}
