import { useState, useRef } from 'react';
import { Mic, Square, Trash2, Upload, Play } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | undefined>(undefined);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(stream);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                onRecordingComplete(blob);

                stream.getTracks().forEach(track => track.stop());
                setStream(undefined);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setAudioUrl(null);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const clearRecording = () => {
        setAudioUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file');
            return;
        }

        // Validate file size (25MB limit)
        if (file.size > 25 * 1024 * 1024) {
            alert('File size must be less than 25MB');
            return;
        }

        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        onRecordingComplete(file);
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <div className="relative w-full h-32 bg-[var(--color-bg)] rounded-xl overflow-hidden flex items-center justify-center border-2 border-[var(--color-border)]">
                {isRecording ? (
                    <AudioVisualizer stream={stream} className="w-full h-full opacity-50" />
                ) : audioUrl ? (
                    <AudioVisualizer audioUrl={audioUrl} className="w-full h-full opacity-80" barColor="var(--color-primary)" />
                ) : (
                    <div className="text-[var(--color-text-muted)] text-sm">No audio selected</div>
                )}

                {/* Overlay Controls */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/5 hover:bg-transparent transition-colors">
                    {!isRecording && !audioUrl && (
                        <>
                            {/* Record Button */}
                            <button
                                onClick={startRecording}
                                className="h-12 w-12 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                title="Record audio"
                            >
                                <Mic size={20} />
                            </button>

                            {/* Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="h-12 w-12 rounded-full bg-[var(--color-secondary)] hover:opacity-90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                title="Upload audio file"
                            >
                                <Upload size={20} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </>
                    )}
                    {isRecording && (
                        <button
                            onClick={stopRecording}
                            className="h-12 w-12 rounded-full bg-[var(--color-error)] hover:opacity-90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 animate-pulse-glow"
                        >
                            <Square size={20} fill="currentColor" />
                        </button>
                    )}
                    {audioUrl && (
                        <div className="flex bg-white/90 backdrop-blur rounded-full p-2 shadow-sm gap-2">
                            <button className="h-10 w-10 flex items-center justify-center hover:bg-[var(--color-bg)] rounded-full text-[var(--color-primary)]">
                                <Play size={18} fill="currentColor" />
                            </button>
                            <button onClick={clearRecording} className="h-10 w-10 flex items-center justify-center hover:bg-[var(--color-error)]/10 rounded-full text-[var(--color-error)]">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
                {isRecording
                    ? "Listening..."
                    : audioUrl
                        ? "Audio ready"
                        : "Record or upload reference audio (WAV, MP3, etc.)"}
            </p>
        </div>
    );
}
