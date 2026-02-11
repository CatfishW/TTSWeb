import { useEffect, useState } from 'react';
import { useTTSStore } from '@/lib/store';
import { ModeSelector } from './ModeSelector';
import { Sparkles, Music, Loader2, AlertCircle } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '@/lib/utils';

export function Generator() {
    const {
        text, setText, instruct, setInstruct, mode, advancedMode, toggleAdvancedMode,
        selectedSpeaker, selectedLanguage, speakers, languages, setSelectedSpeaker, setSelectedLanguage,
        refText, setRefText, xVectorOnly, setXVectorOnly, consentAcknowledged, setConsentAcknowledged,
        isGenerating, jobStatus, error, resultAudioUrl, generate, fetchMetadata
    } = useTTSStore();

    const [recordedBlob, setRecordedBlob] = useState<Blob | undefined>(undefined);

    useEffect(() => {
        fetchMetadata();
    }, []);

    const handleGenerate = () => {
        if (!text) return;
        generate(recordedBlob);
    };

    return (
        <div className="space-y-6">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <ModeSelector />
                <div className="flex items-center gap-4">
                    {isGenerating && (
                        <span className="text-xs text-stone-500 font-mono animate-pulse">
                            {jobStatus === 'processing' ? 'Processing...' : 'Queued'}
                        </span>
                    )}
                    <button
                        onClick={toggleAdvancedMode}
                        className="text-stone-400 text-sm font-medium hover:text-stone-600 transition-colors"
                    >
                        {advancedMode ? 'Hide Details' : 'Show Advanced'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Inputs */}
                <div className="space-y-6">

                    {/* Main Text Input */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-stone-200">
                        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 flex justify-between">
                            <span>Input Text</span>
                            <span className="text-xs font-normal opacity-50">{text.length}/10000</span>
                        </h2>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full h-40 p-4 rounded-xl bg-stone-50 border border-stone-200 focus:border-rose-400 outline-none resize-none transition-all placeholder:text-stone-400 text-stone-800 text-lg leading-relaxed"
                            placeholder="What should I say?"
                            disabled={isGenerating}
                        />
                    </section>

                    {/* Mode Specific Inputs */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 space-y-6">

                        {/* Language Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Language</label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                disabled={isGenerating}
                                className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 outline-none focus:border-rose-400 appearance-none"
                            >
                                <option value="Auto">Auto-Detect</option>
                                {languages.map(l => (
                                    <option key={l.code} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Voice: Speaker Selection */}
                        {mode === 'custom' && (
                            <div>
                                <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Speaker</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {speakers.map(s => (
                                        <button
                                            key={s.name}
                                            onClick={() => setSelectedSpeaker(s.name)}
                                            disabled={isGenerating}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-all",
                                                selectedSpeaker === s.name
                                                    ? "border-rose-400 bg-rose-50 text-rose-900"
                                                    : "border-stone-200 hover:border-stone-300 text-stone-600"
                                            )}
                                        >
                                            <div className="font-medium">{s.name}</div>
                                            <div className="text-xs opacity-70 truncate">{s.description}</div>
                                        </button>
                                    ))}
                                </div>

                                {/* Optional Instruction */}
                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Style Instruction (Optional)</label>
                                    <input
                                        type="text"
                                        value={instruct}
                                        onChange={(e) => setInstruct(e.target.value)}
                                        disabled={isGenerating}
                                        className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-rose-400 text-stone-700"
                                        placeholder="e.g. Speak cheerfully, like a news anchor."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Voice Design: Description */}
                        {mode === 'design' && (
                            <div>
                                <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Voice Description</label>
                                <textarea
                                    value={instruct}
                                    onChange={(e) => setInstruct(e.target.value)}
                                    disabled={isGenerating}
                                    className="w-full h-24 p-3 rounded-lg bg-stone-50 border border-stone-200 outline-none focus:border-rose-400 text-stone-700 resize-none"
                                    placeholder="e.g. An old man with a raspy voice, speaking slowly and thoughtfully."
                                />
                            </div>
                        )}

                        {/* Voice Clone: Audio Upload */}
                        {mode === 'clone' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Reference Audio</label>
                                    <AudioRecorder onRecordingComplete={setRecordedBlob} />
                                </div>

                                {advancedMode && (
                                    <div className="space-y-3 pt-2 border-t border-stone-100">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-400 mb-1">Reference Transcript (Optional)</label>
                                            <input
                                                type="text"
                                                value={refText}
                                                onChange={(e) => setRefText(e.target.value)}
                                                className="w-full p-2 text-sm rounded border border-stone-200 bg-stone-50"
                                                placeholder="Transcript of the audio clip..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="xvec"
                                                checked={xVectorOnly}
                                                onChange={(e) => setXVectorOnly(e.target.checked)}
                                                className="rounded border-stone-300 text-rose-500 focus:ring-rose-500"
                                            />
                                            <label htmlFor="xvec" className="text-sm text-stone-600">Use X-Vector only (ignore content)</label>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={consentAcknowledged}
                                            onChange={(e) => setConsentAcknowledged(e.target.checked)}
                                            className="mt-1 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs text-amber-800 leading-tight">
                                            I verify that I have the necessary rights or consent to use this voice for cloning purposes.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !text || (mode === 'clone' && (!recordedBlob || !consentAcknowledged))}
                        className="w-full py-4 rounded-xl bg-stone-900 text-white font-medium text-lg shadow-lg hover:bg-stone-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} className="text-rose-300" />
                                Generate Audio
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Results */}
                <div className="space-y-6">
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 h-full min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {resultAudioUrl ? (
                            <div className="w-full max-w-md p-6 animate-in fade-in zoom-in duration-300">
                                <div className="mb-6">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center text-emerald-500">
                                        <Sparkles size={28} />
                                    </div>
                                    <h3 className="text-xl font-medium text-stone-800">Generation Complete</h3>
                                    <p className="text-stone-500 text-sm">Ready to play</p>
                                </div>
                                {/* Prefix with API base usually, here assuming proxy or absolute path from backend if needed */}
                                <AudioPlayer audioUrl={resultAudioUrl} autoPlay />
                            </div>
                        ) : (
                            <div className="opacity-50">
                                <div className="w-16 h-16 rounded-full bg-stone-100 mb-4 flex items-center justify-center text-stone-300 mx-auto">
                                    <Music size={32} />
                                </div>
                                <p className="text-stone-500 font-medium">
                                    {isGenerating ? "Synthesizing audio..." : "Ready to generate"}
                                </p>
                                <p className="text-stone-400 text-sm mt-1">
                                    {isGenerating ? "This may take a few seconds" : "Your audio will appear here"}
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
