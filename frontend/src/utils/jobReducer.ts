import type { SummaryJob, SSEConnectionState } from '@/types/job';

// Action types for job state management
export type JobAction =
  | { type: 'INIT_JOBS'; payload: Record<string, SummaryJob> }
  | { type: 'INIT_VIDEOS'; payload: Record<string, import('@/types/job').VideoMetadata> }
  | { type: 'INIT_JOBS_WITH_VIDEOS'; payload: { jobs: Record<string, SummaryJob>; videos: Record<string, import('@/types/job').VideoMetadata> } }
  | { type: 'ADD_JOB'; payload: SummaryJob }
  | { type: 'UPDATE_JOB'; payload: SummaryJob }
  | { type: 'SET_CONNECTION_STATE'; payload: SSEConnectionState }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'CLEAR_ERROR' };

// Job state interface
export interface JobState {
  jobs: Record<string, SummaryJob>;
  connectionState: SSEConnectionState;
  error: Error | null;
}

// Initial state
export const initialJobState: JobState = {
  jobs: {},
  connectionState: 'disconnected',
  error: null,
};

// Helper function to create a "completed" job from video metadata
function createCompletedJobFromVideo(video: import('@/types/job').VideoMetadata): SummaryJob {
  return {
    video_id: video.video_id,
    status: 'finished',
    error: '',
    job_progress: {
      VideoMeta: video,
      percentage_string: '100%',
      had_captions: false, // We don't know, but it doesn't matter for completed jobs
      transcription_chunks: 0,
      transcription_chunks_transcribed: 0,
      summary_chunks: 0,
      summary_chunks_transcribed: 0,
    },
  };
}

// Job reducer function
export function jobReducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case 'INIT_JOBS':
      return {
        ...state,
        jobs: action.payload,
        error: null,
      };

    case 'INIT_VIDEOS':
      // Create completed jobs from video database entries
      // Only add videos that don't already exist in jobs (SSE jobs take precedence)
      const videoJobs: Record<string, SummaryJob> = {};
      for (const [videoId, video] of Object.entries(action.payload)) {
        if (!state.jobs[videoId]) {
          videoJobs[videoId] = createCompletedJobFromVideo(video);
        }
      }
      
      return {
        ...state,
        jobs: {
          ...state.jobs, // Keep existing SSE jobs
          ...videoJobs, // Add video-based jobs only for missing entries
        },
        error: null,
      };

    case 'ADD_JOB':
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.payload.video_id]: action.payload,
        },
        error: null,
      };

    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: {
          ...state.jobs,
          [action.payload.video_id]: action.payload,
        },
        error: null,
      };

    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'INIT_JOBS_WITH_VIDEOS':
      // Atomically initialize with both jobs and videos
      const videoJobsAtomic: Record<string, SummaryJob> = {};
      for (const [videoId, video] of Object.entries(action.payload.videos)) {
        if (!action.payload.jobs[videoId]) {
          videoJobsAtomic[videoId] = createCompletedJobFromVideo(video);
        }
      }
      
      return {
        ...state,
        jobs: {
          ...videoJobsAtomic, // Add video-based jobs first
          ...action.payload.jobs, // SSE jobs override video-based jobs
        },
        error: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}