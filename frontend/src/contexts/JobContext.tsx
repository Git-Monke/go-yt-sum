import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { jobReducer, initialJobState, type JobState, type JobAction } from '@/utils/jobReducer';
import { getAllVideos } from '@/utils/api';
import type { SummaryJob, SSEConnectionState } from '@/types/job';

// Job utility functions
function sortJobsByRecency(jobs: SummaryJob[]): SummaryJob[] {
  return jobs.sort((a, b) => {
    // Sort by status priority first (active jobs first), then by date/id for consistency
    const statusPriority = {
      'pending': 0,
      'checking_for_captions': 1,
      'downloading_audio': 2,
      'extracting_audio': 3,
      'chunking': 4,
      'transcribing': 5,
      'summarizing': 6,
      'downloaded_captions': 7,
      'finished': 8,
      'failed': 9,
    };
    
    const aPriority = statusPriority[a.status] ?? 99;
    const bPriority = statusPriority[b.status] ?? 99;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // For jobs with same priority, sort by upload date if available
    const aDate = a.job_progress.VideoMeta?.upload_date;
    const bDate = b.job_progress.VideoMeta?.upload_date;
    
    if (aDate && bDate) {
      const dateComparison = new Date(bDate).getTime() - new Date(aDate).getTime();
      if (dateComparison !== 0) {
        return dateComparison; // Most recent first
      }
    }
    
    // Fallback to video_id for consistent ordering
    return b.video_id.localeCompare(a.video_id);
  });
}

function calculateJobProgress(job: SummaryJob): number {
  if (job.status === 'finished') return 100;
  if (job.status === 'failed') return 0;
  
  const { job_progress } = job;
  
  // If we have a percentage string, try to parse it
  if (job_progress.percentage_string) {
    const match = job_progress.percentage_string.match(/^(\d+(?:\.\d+)?)%$/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  // Calculate based on chunks if available
  const totalTranscriptionChunks = job_progress.transcription_chunks;
  const completedTranscriptionChunks = job_progress.transcription_chunks_transcribed;
  const totalSummaryChunks = job_progress.summary_chunks;
  const completedSummaryChunks = job_progress.summary_chunks_transcribed;
  
  if (totalSummaryChunks > 0) {
    // We're in summarization phase
    const transcriptionProgress = totalTranscriptionChunks > 0 ? (completedTranscriptionChunks / totalTranscriptionChunks) * 50 : 50;
    const summarizationProgress = (completedSummaryChunks / totalSummaryChunks) * 50;
    return Math.round(transcriptionProgress + summarizationProgress);
  }
  
  if (totalTranscriptionChunks > 0) {
    // We're in transcription phase
    return Math.round((completedTranscriptionChunks / totalTranscriptionChunks) * 50);
  }
  
  // Default progress based on status
  const statusProgress = {
    'pending': 5,
    'checking_for_captions': 10,
    'downloaded_captions': 15,
    'downloading_audio': 25,
    'extracting_audio': 35,
    'chunking': 40,
    'transcribing': 50,
    'summarizing': 75,
  };
  
  return statusProgress[job.status] ?? 0;
}

// Context value interface
interface JobContextValue {
  jobs: Record<string, SummaryJob>;
  connectionState: SSEConnectionState;
  error: Error | null;
  reconnect: () => void;
  
  // Derived state
  recentJobs: SummaryJob[];
  activeJobs: SummaryJob[];
  completedJobs: SummaryJob[];
  
  // Job utilities
  getJob: (videoId: string) => SummaryJob | undefined;
  isJobActive: (videoId: string) => boolean;
  getJobProgress: (videoId: string) => number;
}

const JobContext = createContext<JobContextValue | null>(null);

// Custom hook to use job context
export function useJobContext(): JobContextValue {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  return context;
}

// Job provider component
interface JobProviderProps {
  children: React.ReactNode;
}

export function JobProvider({ children }: JobProviderProps) {
  const [state, dispatch] = useReducer(jobReducer, initialJobState);
  const { jobs: sseJobs, connectionState, error, reconnect } = useSSE();

  // Atomically sync SSE jobs and database videos
  useEffect(() => {
    const initializeJobsWithVideos = async () => {
      try {
        const videos = await getAllVideos();
        // Atomically dispatch both SSE jobs and database videos
        dispatch({ 
          type: 'INIT_JOBS_WITH_VIDEOS', 
          payload: { jobs: sseJobs, videos } 
        });
      } catch (err) {
        console.error('Failed to fetch videos from database:', err);
        // Fallback to just SSE jobs if video fetch fails
        dispatch({ type: 'INIT_JOBS', payload: sseJobs });
      }
    };

    initializeJobsWithVideos();
  }, [sseJobs]);

  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState });
  }, [connectionState]);

  useEffect(() => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [error]);

  // Derived state with memoization
  const derivedState = useMemo(() => {
    const jobsArray = Object.values(state.jobs);
    
    const activeJobs = jobsArray.filter(job => 
      !['finished', 'failed'].includes(job.status)
    );
    
    const completedJobs = jobsArray.filter(job => 
      ['finished', 'failed'].includes(job.status)
    );
    
    const recentJobs = sortJobsByRecency([...jobsArray]).slice(0, 10);
    
    return {
      activeJobs,
      completedJobs,
      recentJobs,
    };
  }, [state.jobs]);

  // Utility functions
  const getJob = (videoId: string): SummaryJob | undefined => {
    console.log(state.jobs)
    return state.jobs[videoId];
  };

  const isJobActive = (videoId: string): boolean => {
    const job = getJob(videoId);
    return job ? !['finished', 'failed'].includes(job.status) : false;
  };

  const getJobProgress = (videoId: string): number => {
    const job = getJob(videoId);
    return job ? calculateJobProgress(job) : 0;
  };

  const contextValue: JobContextValue = {
    jobs: state.jobs,
    connectionState: state.connectionState,
    error: state.error,
    reconnect,
    
    recentJobs: derivedState.recentJobs,
    activeJobs: derivedState.activeJobs,
    completedJobs: derivedState.completedJobs,
    
    getJob,
    isJobActive,
    getJobProgress,
  };

  return (
    <JobContext.Provider value={contextValue}>
      {children}
    </JobContext.Provider>
  );
}
