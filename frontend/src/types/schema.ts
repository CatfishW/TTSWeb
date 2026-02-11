export type JobStatus =
    | 'queued'
    | 'processing'
    | 'streaming'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type TTSMode =
    | 'custom'
    | 'design'
    | 'clone';

export interface SpeakerInfo {
    name: string;
    languages: string[];
    description: string;
}

export interface LanguageInfo {
    code: string;
    name: string;
}

export interface TTSJobResponse {
    job_id: string;
    status: JobStatus;
    created_at: string;
}

export interface JobStatusResponse {
    job_id: string;
    status: JobStatus;
    progress: number | null;
    error: string | null;
    audio_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface CustomVoiceRequest {
    text: string;
    language: string;
    speaker: string;
    instruct?: string;
}

export interface VoiceDesignRequest {
    text: string;
    language: string;
    instruct: string;
}

export interface VoiceCloneRequest {
    text: string;
    language: string;
    ref_text?: string;
    x_vector_only_mode?: boolean;
    consent_acknowledged: boolean;
}
