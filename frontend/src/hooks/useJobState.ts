import { useJobContext } from '@/contexts/JobContext';
import type { SummaryJob, JobStatus } from '@/types/job';

// Re-export the main hook for convenience
export const useJobState = useJobContext;

// Specialized hooks for specific use cases
export function useJob(videoId: string) {
  const { getJob, isJobActive, getJobProgress } = useJobContext();
  
  return {
    job: getJob(videoId),
    isActive: isJobActive(videoId),
    progress: getJobProgress(videoId),
  };
}

export function useRecentJobs() {
  const { recentJobs } = useJobContext();
  return recentJobs;
}

export function useActiveJobs() {
  const { activeJobs } = useJobContext();
  return activeJobs;
}

export function useCompletedJobs() {
  const { completedJobs } = useJobContext();
  return completedJobs;
}

export function useJobsByStatus(status: JobStatus) {
  const { jobs } = useJobContext();
  
  return Object.values(jobs).filter(job => job.status === status);
}

export function useJobById(videoId: string) {
  const { getJob } = useJobContext();
  return getJob(videoId);
}

export function useConnectionStatus() {
  const { connectionState, error, reconnect } = useJobContext();
  
  return {
    connectionState,
    error,
    reconnect,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    hasError: connectionState === 'error' || error !== null,
  };
}