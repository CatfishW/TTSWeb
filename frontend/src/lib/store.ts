import { create } from 'zustand';
import { api } from '@/lib/api';
import { type JobStatus, type SpeakerInfo, type LanguageInfo, type TTSJobResponse } from '@/types/schema';

export type TTSMode = 'custom' | 'design' | 'clone' | 'tokenizer';

interface TTSState {
    mode: TTSMode;
    text: string;
    instruct: string;
    advancedMode: boolean;

    // Selection
    selectedSpeaker: string;
    selectedLanguage: string;

    // Clone specific
    refText: string;
    xVectorOnly: boolean;
    consentAcknowledged: boolean;
    cloneTimbre: string | null; // Selected speaker timbre for voice clone guidance

    // Job State
    isGenerating: boolean;
    jobId: string | null;
    jobStatus: JobStatus | null;
    progress: number;
    error: string | null;
    resultAudioUrl: string | null;

    // Metadata
    speakers: SpeakerInfo[];
    languages: LanguageInfo[];

    // Actions
    setMode: (mode: TTSMode) => void;
    setText: (text: string) => void;
    setInstruct: (instruct: string) => void;
    toggleAdvancedMode: () => void;

    setSelectedSpeaker: (speaker: string) => void;
    setSelectedLanguage: (lang: string) => void;

    setRefText: (text: string) => void;
    setXVectorOnly: (val: boolean) => void;
    setConsentAcknowledged: (val: boolean) => void;
    setCloneTimbre: (timbre: string | null) => void;

    generate: (audioFile?: Blob) => Promise<void>;
    cancelGeneration: () => Promise<void>;

    fetchMetadata: () => Promise<void>;
}

export const useTTSStore = create<TTSState>((set, get) => ({
    mode: 'custom',
    text: '',
    instruct: '',
    advancedMode: false,

    selectedSpeaker: 'vivian', // Default
    selectedLanguage: 'Auto',

    refText: '',
    xVectorOnly: false,
    consentAcknowledged: false,
    cloneTimbre: null, // No timbre selected by default for voice clone

    isGenerating: false,
    jobId: null,
    jobStatus: null,
    progress: 0,
    error: null,
    resultAudioUrl: null,

    speakers: [],
    languages: [],

    setMode: (mode) => set({ mode }),
    setText: (text) => set({ text }),
    setInstruct: (instruct) => set({ instruct }),
    toggleAdvancedMode: () => set((state) => ({ advancedMode: !state.advancedMode })),

    setSelectedSpeaker: (speaker) => set({ selectedSpeaker: speaker }),
    setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),

    setRefText: (text) => set({ refText: text }),
    setXVectorOnly: (val) => set({ xVectorOnly: val }),
    setConsentAcknowledged: (val) => set({ consentAcknowledged: val }),
    setCloneTimbre: (timbre) => set({ cloneTimbre: timbre }),

    fetchMetadata: async () => {
        try {
            const [speakers, languages] = await Promise.all([
                api.getSpeakers(),
                api.getLanguages()
            ]);
            console.log("Loaded speakers:", speakers);
            console.log("Loaded languages:", languages);
            set({ speakers, languages });

            // If current speaker not in list, pick first available
            const { selectedSpeaker } = get();
            if (speakers.length > 0 && !speakers.find(s => s.name === selectedSpeaker)) {
                set({ selectedSpeaker: speakers[0].name });
            }
        } catch (err) {
            console.error("Failed to load metadata", err);
            set({ speakers: [], languages: [] });
        }
    },

    generate: async (audioFile?: Blob) => {
        const { mode, text, instruct, selectedSpeaker, selectedLanguage, refText, xVectorOnly, cloneTimbre } = get();

        set({ isGenerating: true, error: null, progress: 0, jobId: null, resultAudioUrl: null, jobStatus: 'queued' });

        try {
            let jobRes: TTSJobResponse;

            if (mode === 'custom') {
                jobRes = await api.createCustomVoice({
                    text,
                    language: selectedLanguage,
                    speaker: selectedSpeaker,
                    instruct: instruct || undefined
                });
            } else if (mode === 'design') {
                jobRes = await api.createVoiceDesign({
                    text,
                    language: selectedLanguage,
                    instruct: instruct
                });
            } else {
                if (!audioFile) throw new Error("Reference audio is required for cloning");
                jobRes = await api.createVoiceClone({
                    text,
                    language: selectedLanguage,
                    ref_text: refText || undefined,
                    x_vector_only_mode: xVectorOnly,
                    consent_acknowledged: true,
                    instruct: instruct || undefined,
                    speaker: cloneTimbre || undefined // Pass timbre guide if selected
                }, audioFile);
            }

            set({ jobId: jobRes.job_id, jobStatus: jobRes.status });

            // Poll for completion
            const polling = async () => {
                const status = await api.getJobStatus(jobRes.job_id);
                // Prepend /TTS to the audio URL since backend returns /api/v1/...
                const audioUrl = status.audio_url ? `/TTS${status.audio_url}` : null;
                set({
                    jobStatus: status.status,
                    progress: status.progress || 0,
                    error: status.error,
                    resultAudioUrl: audioUrl
                });

                if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                    set({ isGenerating: false });
                    return;
                }

                setTimeout(polling, 1000);
            };

            polling();

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Generation failed";
            set({
                isGenerating: false,
                error: message,
                jobStatus: 'failed'
            });
        }
    },

    cancelGeneration: async () => {
        const { jobId } = get();
        if (jobId) {
            await api.cancelJob(jobId);
            set({ isGenerating: false, jobStatus: 'cancelled' });
        }
    }
}));
