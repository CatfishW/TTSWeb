import { useEffect, useState } from 'react';
import { useTTSStore } from '@/lib/store';
import { ModeSelector } from './ModeSelector';
import { Sparkles, Music, Loader2, AlertCircle, Settings2, Mic2, Palette, User, ChevronDown, Volume2 } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '@/lib/utils';
import { Tokenizer } from './Tokenizer';

export function Generator() {
    const {
        text, setText, instruct, setInstruct, mode, advancedMode, toggleAdvancedMode,
        selectedSpeaker, selectedLanguage, speakers, languages, setSelectedSpeaker, setSelectedLanguage,
        refText, setRefText, xVectorOnly, setXVectorOnly, cloneTimbre, setCloneTimbre,
        isGenerating, jobStatus, error, resultAudioUrl, generate, fetchMetadata
    } = useTTSStore();

    const [recordedBlob, setRecordedBlob] = useState<Blob | undefined>(undefined);
    const [metadataLoaded, setMetadataLoaded] = useState(false);

    useEffect(() => {
        fetchMetadata().then(() => setMetadataLoaded(true));
    }, [fetchMetadata]);

    const handleGenerate = () => {
        if (!text) return;
        generate(recordedBlob);
    };

    if (mode === 'tokenizer') {
        return (
            <div className="space-y-6 animate-page-load">
                <div className="flex justify-between items-center">
                    <ModeSelector />
                </div>
                <Tokenizer />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-page-load">
            {/* Mode Selector - Full Width */}
            <div className="w-full">
                <ModeSelector />
            </div>

            {/* Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
                        mode === 'custom' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        mode === 'design' && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        mode === 'clone' && "bg-green-500/10 text-green-600 dark:text-green-400"
                    )}>
                        {mode === 'custom' && 'Custom Voice'}
                        {mode === 'design' && 'Voice Design'}
                        {mode === 'clone' && 'Voice Clone'}
                    </span>
                    {isGenerating && (
                        <span className="text-xs text-[var(--color-text-muted)] font-mono animate-pulse flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" />
                            {jobStatus === 'processing' ? 'Processing...' : 'Queued'}
                        </span>
                    )}
                </div>
                <button
                    onClick={toggleAdvancedMode}
                    className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs sm:text-sm font-medium hover:text-[var(--color-text)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--color-bg-paper)]"
                >
                    <Settings2 size={14} />
                    {advancedMode ? 'Hide Advanced' : 'Advanced'}
                </button>
            </div>

            {error && (
                <div className="card-sketch bg-[var(--color-error)]/10 border-[var(--color-error)] text-[var(--color-error)] px-4 py-3 flex items-start gap-3 text-sm animate-page-load">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Left Column: Inputs */}
                <div className="space-y-4 sm:space-y-6 animate-stagger">
                    {/* Main Text Input */}
                    <section className="card-sketch tape-effect">
                        <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex justify-between items-center">
                            <span className="flex items-center gap-2">
                                <Mic2 size={16} />
                                Input Text
                            </span>
                            <span className="text-xs font-normal opacity-50">{text.length}/10000</span>
                        </h2>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="input-sketch w-full h-32 sm:h-40"
                            placeholder="What should I say?"
                            disabled={isGenerating}
                            aria-label="Text to synthesize"
                        />
                    </section>

                    {/* Speaker Selection - Highlighted Section for Custom Mode */}
                    {mode === 'custom' && (
                        <section className="card-sketch border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/10">
                            <div className="flex items-center gap-2 mb-3">
                                <User size={18} className="text-[var(--color-primary)]" />
                                <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                                    Select Speaker
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {speakers.map((s) => (
                                    <button
                                        key={s.name}
                                        onClick={() => setSelectedSpeaker(s.name)}
                                        disabled={isGenerating}
                                        className={cn(
                                            "p-3 text-left transition-all duration-200 rounded-lg border-2",
                                            selectedSpeaker === s.name
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md"
                                                : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {selectedSpeaker === s.name && (
                                                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                                            )}
                                            <div className="font-bold text-[var(--color-text)]">{s.name}</div>
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] line-clamp-1 mt-0.5">{s.description || 'Voice speaker'}</div>
                                    </button>
                                ))}
                            </div>
                            {speakers.length === 0 && (
                                <div className="text-center py-4">
                                    {!metadataLoaded ? (
                                        <p className="text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            Loading speakers...
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm text-[var(--color-text-muted)]">Failed to load speakers</p>
                                            <button
                                                onClick={() => { setMetadataLoaded(false); fetchMetadata().then(() => setMetadataLoaded(true)); }}
                                                className="text-sm text-[var(--color-primary)] hover:underline"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Mode Specific Settings */}
                    <div className="card-sketch space-y-4">
                        {/* Language Selection */}
                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                                Language
                            </label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                disabled={isGenerating}
                                className="input-sketch select-sketch w-full"
                            >
                                <option value="Auto">Auto-Detect</option>
                                {languages.map(l => (
                                    <option key={l.code} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Voice: Optional Instruction */}
                        {mode === 'custom' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                                    Style Instruction (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={instruct}
                                    onChange={(e) => setInstruct(e.target.value)}
                                    disabled={isGenerating}
                                    className="input-sketch w-full"
                                    placeholder="e.g. Speak cheerfully, like a news anchor."
                                />
                            </div>
                        )}

                        {/* Voice Design: Description */}
                        {mode === 'design' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Palette size={14} />
                                    Voice Description
                                </label>
                                <textarea
                                    value={instruct}
                                    onChange={(e) => setInstruct(e.target.value)}
                                    disabled={isGenerating}
                                    className="input-sketch w-full h-24 resize-none"
                                    placeholder="e.g. An old man with a raspy voice, speaking slowly and thoughtfully."
                                    aria-label="Voice description for design"
                                />
                            </div>
                        )}

                        {/* Voice Clone: Audio Upload */}
                        {mode === 'clone' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                                        Reference Audio
                                        {recordedBlob && (
                                            <span className="ml-2 text-xs font-normal text-[var(--color-success)]">✓ Cached</span>
                                        )}
                                    </label>

                                    {/* Cached Audio Indicator */}
                                    {recordedBlob && (
                                        <div className="card-sketch bg-[var(--color-success)]/5 border-[var(--color-success)]/30 p-3 mb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Volume2 size={16} className="text-[var(--color-success)]" />
                                                    <span className="text-sm text-[var(--color-text)]">Audio cached ({(recordedBlob.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button
                                                    onClick={() => setRecordedBlob(undefined)}
                                                    className="text-xs text-[var(--color-error)] hover:underline"
                                                    disabled={isGenerating}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                                Will reuse this audio. Upload new audio to replace.
                                            </p>
                                        </div>
                                    )}

                                    <AudioRecorder onRecordingComplete={(blob) => {
                                        setRecordedBlob(blob);
                                        // Clear timbre selection when new audio is uploaded
                                        if (cloneTimbre) setCloneTimbre(null);
                                    }} />
                                </div>

                                {/* Timbre Selector - Sketch Themed Dropdown */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2">
                                        <Volume2 size={14} />
                                        Voice Timbre
                                        {recordedBlob && <span className="text-[var(--color-success)]">(Using cached audio)</span>}
                                        {!recordedBlob && <span className="text-[var(--color-warning)]">(Select timbre or upload audio)</span>}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={cloneTimbre || ''}
                                            onChange={(e) => {
                                                setCloneTimbre(e.target.value || null);
                                                // Clear cached audio when timbre is selected
                                                if (e.target.value) setRecordedBlob(undefined);
                                            }}
                                            disabled={isGenerating}
                                            className="input-sketch select-sketch w-full appearance-none cursor-pointer py-3 pr-10"
                                        >
                                            <option value="">🎤 Use my uploaded audio</option>
                                            {speakers.map((speaker) => (
                                                <option key={speaker.name} value={speaker.name}>
                                                    🎭 {speaker.name} — {speaker.description.substring(0, 40)}...
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                                    </div>
                                    {cloneTimbre && (
                                        <div className="card-sketch bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30 p-2 text-xs">
                                            <span className="font-bold text-[var(--color-primary)]">Selected timbre:</span> {speakers.find(s => s.name === cloneTimbre)?.description}
                                        </div>
                                    )}
                                    {!cloneTimbre && recordedBlob && (
                                        <div className="card-sketch bg-[var(--color-success)]/5 border-[var(--color-success)]/30 p-2 text-xs">
                                            <span className="font-bold text-[var(--color-success)]">Using cached audio:</span> Your previously uploaded reference audio
                                        </div>
                                    )}
                                </div>

                                {/* X-Vector Mode Toggle - Always visible */}
                                <div className="flex items-center gap-2 card-sketch p-3">
                                    <input
                                        type="checkbox"
                                        id="xvec"
                                        checked={xVectorOnly}
                                        onChange={(e) => setXVectorOnly(e.target.checked)}
                                        className="rounded border-[var(--color-border)]"
                                    />
                                    <label htmlFor="xvec" className="text-sm text-[var(--color-text-muted)]">
                                        Use X-Vector only (ignore content)
                                    </label>
                                </div>

                                {/* Style Instruction */}
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Palette size={14} />
                                        Style Instruction (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={instruct}
                                        onChange={(e) => setInstruct(e.target.value)}
                                        disabled={isGenerating}
                                        className="input-sketch w-full text-sm"
                                        placeholder="e.g., speak cheerfully, like a news anchor"
                                    />
                                </div>

                                {/* Reference Transcript - Required in ICL mode */}
                                <div>
                                    <label className={cn(
                                        "block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2",
                                        xVectorOnly ? "text-[var(--color-text-muted)]" : "text-[var(--color-primary)]"
                                    )}>
                                        Reference Transcript
                                        {!xVectorOnly && <span className="text-[var(--color-error)]">*</span>}
                                        {xVectorOnly && <span className="text-[var(--color-text-muted)] font-normal">(optional in X-Vector mode)</span>}
                                    </label>
                                    <textarea
                                        value={refText}
                                        onChange={(e) => setRefText(e.target.value)}
                                        disabled={isGenerating}
                                        className="input-sketch w-full h-20 resize-none text-sm"
                                        placeholder={xVectorOnly ? "Optional: Transcript of the audio clip..." : "REQUIRED: Enter the exact transcript of the reference audio for ICL mode..."}
                                    />
                                    {!xVectorOnly && !refText && (
                                        <p className="text-xs text-[var(--color-error)] mt-1">
                                            Transcript is required for voice cloning in ICL mode (when X-Vector only is disabled).
                                        </p>
                                    )}
                                </div>

                                {advancedMode && (
                                    <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            <strong>ICL Mode:</strong> Uses reference transcript to guide speech generation (more accurate clone).
                                            <br/>
                                            <strong>X-Vector Mode:</strong> Only uses voice characteristics, ignores content (faster, less accurate).
                                        </p>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !text || (mode === 'clone' && (!recordedBlob && !cloneTimbre) || (!xVectorOnly && !refText))}
                        className="btn-sketch btn-primary w-full py-3 sm:py-4 text-base sm:text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={20} className="sketch-spinner" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Generate Audio
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Results */}
                <div className="space-y-4 sm:space-y-6">
                    <section className="card-sketch h-full min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {resultAudioUrl ? (
                            <div className="w-full max-w-md p-4 sm:p-6 animate-page-load">
                                <div className="mb-6">
                                    <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/20 mx-auto mb-4 flex items-center justify-center text-[var(--color-success)] animate-float">
                                        <Sparkles size={28} />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">Generation Complete</h3>
                                    <p className="text-[var(--color-text-muted)] text-sm">Ready to play</p>
                                </div>
                                <AudioPlayer audioUrl={resultAudioUrl} autoPlay />
                            </div>
                        ) : (
                            <div className="opacity-50">
                                <div className="w-16 h-16 rounded-full bg-[var(--color-border)] mb-4 flex items-center justify-center text-[var(--color-text-muted)] mx-auto">
                                    <Music size={32} />
                                </div>
                                <p className="text-[var(--color-text)] font-medium">
                                    {isGenerating ? "Synthesizing audio..." : "Ready to generate"}
                                </p>
                                <p className="text-[var(--color-text-muted)] text-sm mt-1">
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
