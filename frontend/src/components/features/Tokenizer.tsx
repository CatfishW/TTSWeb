import { useState } from 'react';
import { api } from '@/lib/api';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { FileDown, FileUp, Loader2 } from 'lucide-react';

export function Tokenizer() {
    const [tokens, setTokens] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [decodedUrl, setDecodedUrl] = useState<string | null>(null);
    const [tokenString, setTokenString] = useState('');

    const handleEncode = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const res = await api.encode(blob);
            setTokens(res.tokens);
            setTokenString(res.tokens.join(', '));
        } catch (err) {
            console.error(err);
            alert("Encode failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecode = async () => {
        setIsProcessing(true);
        try {
            const tokenArray = tokenString.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
            const blob = await api.decode(tokenArray);
            const url = URL.createObjectURL(blob);
            setDecodedUrl(url);
        } catch (err) {
            console.error(err);
            alert("Decode failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Audio to Tokens */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                    <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileUp size={16} />
                        Audio to Tokens (Encode)
                    </h2>
                    <AudioRecorder onRecordingComplete={handleEncode} />
                    {isProcessing && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-stone-400 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Processing...
                        </div>
                    )}
                </section>

                {/* Tokens to Audio */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                    <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileDown size={16} />
                        Tokens to Audio (Decode)
                    </h2>
                    <textarea
                        value={tokenString}
                        onChange={(e) => setTokenString(e.target.value)}
                        className="w-full h-32 p-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:border-rose-400 text-stone-700 font-mono text-sm mb-4"
                        placeholder="Paste tokens here (comma separated)..."
                        aria-label="Tokens to decode"
                    />
                    <button
                        onClick={handleDecode}
                        disabled={isProcessing || !tokenString}
                        className="w-full py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition-all disabled:opacity-50"
                    >
                        Decode to Audio
                    </button>
                    {decodedUrl && (
                        <div className="mt-6 pt-6 border-t border-stone-100">
                            <AudioPlayer audioUrl={decodedUrl} />
                        </div>
                    )}
                </section>
            </div>

            {tokens.length > 0 && (
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
                        Tokens ({tokens.length})
                    </h3>
                    <div className="bg-stone-50 rounded-xl p-4 max-h-40 overflow-y-auto border border-stone-200">
                        <p className="text-xs font-mono text-stone-600 break-all leading-relaxed">
                            {tokens.join(', ')}
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}
