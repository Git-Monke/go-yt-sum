export interface VideoMetadata {
  video_id: string;
  video_thumbnail_url: string;
  video_name: string;
  creator_name: string;
  length: number;
  upload_date: string;
  job_failed: boolean;
  last_error: string;
}

export type JobStatus = 
  | "pending"
  | "checking_for_captions"
  | "downloaded_captions"
  | "downloading_audio"
  | "extracting_audio"
  | "chunking"
  | "transcribing"
  | "summarizing"
  | "finished"
  | "failed";

export interface JobProgress {
  VideoMeta: VideoMetadata | null;
  percentage_string: string;
  had_captions: boolean;
  transcription_chunks: number;
  transcription_chunks_transcribed: number;
  summary_chunks: number;
  summary_chunks_transcribed: number;
}

export interface SummaryJob {
  video_id: string;
  status: JobStatus;
  error: string;
  job_progress: JobProgress;
}

export interface SSEInitMessage {
  event: "init";
  data: Record<string, SummaryJob>;
}

export interface SSENewMessage {
  event: "new";
  data: SummaryJob;
}

export interface SSEUpdateMessage {
  event: "update";
  data: SummaryJob;
}

export type SSEMessage = SSEInitMessage | SSENewMessage | SSEUpdateMessage;