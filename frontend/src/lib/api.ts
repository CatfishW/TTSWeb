import {
    type CustomVoiceRequest,
    type VoiceDesignRequest,
    type VoiceCloneRequest,
    type TTSJobResponse,
    type JobStatusResponse,
    type SpeakerInfo,
    type LanguageInfo
} from '@/types/schema';

const API_BASE = '/TTS/api/v1'; // API base for nginx /TTS/ proxy

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) errorMessage = errorJson.detail;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
    }
    return response.json();
}

export const api = {
    // Metadata
    getSpeakers: async (): Promise<SpeakerInfo[]> => {
        const res = await fetch(`${API_BASE}/meta/speakers`);
        return handleResponse(res);
    },

    getLanguages: async (): Promise<LanguageInfo[]> => {
        const res = await fetch(`${API_BASE}/meta/languages`);
        return handleResponse(res);
    },

    // Generation
    createCustomVoice: async (req: CustomVoiceRequest): Promise<TTSJobResponse> => {
        const res = await fetch(`${API_BASE}/tts/custom-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        });
        return handleResponse(res);
    },

    createVoiceDesign: async (req: VoiceDesignRequest): Promise<TTSJobResponse> => {
        const res = await fetch(`${API_BASE}/tts/voice-design`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        });
        return handleResponse(res);
    },

    createVoiceClone: async (req: VoiceCloneRequest, audioFile: Blob): Promise<TTSJobResponse> => {
        const formData = new FormData();
        formData.append('audio', audioFile, 'reference.wav');
        formData.append('text', req.text);
        formData.append('language', req.language);
        if (req.ref_text) formData.append('ref_text', req.ref_text);
        formData.append('x_vector_only_mode', String(req.x_vector_only_mode || false));
        formData.append('consent_acknowledged', String(req.consent_acknowledged));
        if (req.instruct) formData.append('instruct', req.instruct);

        const res = await fetch(`${API_BASE}/tts/voice-clone`, {
            method: 'POST',
            body: formData,
        });
        return handleResponse(res);
    },

    // Job Management
    getJobStatus: async (jobId: string): Promise<JobStatusResponse> => {
        const res = await fetch(`${API_BASE}/jobs/${jobId}/status`);
        return handleResponse(res);
    },

    cancelJob: async (jobId: string): Promise<void> => {
        await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' });
    },

    // Tokenizer
    encode: async (audioFile: Blob): Promise<{ tokens: number[]; count: number }> => {
        const formData = new FormData();
        formData.append('audio', audioFile, 'input.wav');
        const res = await fetch(`${API_BASE}/tokenizer/encode`, {
            method: 'POST',
            body: formData,
        });
        return handleResponse(res);
    },

    decode: async (tokens: number[]): Promise<Blob> => {
        const res = await fetch(`${API_BASE}/tokenizer/decode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens }),
        });
        if (!res.ok) throw new Error("Decode failed");
        return res.blob();
    },

    // Helper: Poll until completion
    pollJob: async (
        jobId: string,
        onProgress?: (status: JobStatusResponse) => void
    ): Promise<JobStatusResponse> => {
        const pollInterval = 1000;

        while (true) {
            const status = await api.getJobStatus(jobId);
            if (onProgress) onProgress(status);

            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                return status;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }
};
