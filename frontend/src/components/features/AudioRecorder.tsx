import { useState, useRef } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(stream); // For visualizer

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' }); // or webm
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                onRecordingComplete(blob);

                // Stop all tracks
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
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <div className="relative w-full h-32 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center border border-stone-200">
                {isRecording ? (
                    <AudioVisualizer stream={stream} className="w-full h-full opacity-50" />
                ) : audioUrl ? (
                    <AudioVisualizer audioUrl={audioUrl} className="w-full h-full opacity-80" barColor="#10b981" />
                ) : (
                    <div className="text-stone-400 text-sm">No audio recorded</div>
                )}

                {/* Overlay Controls */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/5 hover:bg-transparent transition-colors">
                    {!isRecording && !audioUrl && (
                        <button
                            onClick={startRecording}
                            className="h-12 w-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                        >
                            <Mic size={20} />
                        </button>
                    )}
                    {isRecording && (
                        <button
                            onClick={stopRecording}
                            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 animate-pulse"
                        >
                            <Square size={20} fill="currentColor" />
                        </button>
                    )}
                    {audioUrl && (
                        <div className="flex bg-white/90 backdrop-blur rounded-full p-2 shadow-sm gap-2">
                            <button className="h-10 w-10 flex items-center justify-center hover:bg-stone-100 rounded-full text-stone-600">
                                ▶️
                            </button>
                            <button onClick={clearRecording} className="h-10 w-10 flex items-center justify-center hover:bg-rose-50 rounded-full text-rose-500">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-stone-400">
                {isRecording ? "Listening..." : audioUrl ? "Recording captured" : "Click mic to record reference audio"}
            </p>
        </div>
    );
}
