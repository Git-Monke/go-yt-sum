import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { startSummaryJob, getErrorMessage } from '@/utils/api';
import type { SummaryJob } from '@/types/job';
import { JobStatusIndicator } from './JobStatusIndicator';
import { JobProgressSteps } from './JobProgressSteps';
import { YouTubePlayer } from './YouTubePlayer';

interface JobProgressViewProps {
  job: SummaryJob;
  onRetryStart?: () => void;
}

export function JobProgressView({ job, onRetryStart }: JobProgressViewProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState(false);

  // Calculate overall progress based on job status and processing type
  useEffect(() => {
    let calculatedProgress = 0;
    const hasTranscriptionChunks = job.job_progress.transcription_chunks > 0;
    const isFullProcessing = hasTranscriptionChunks || ['downloading_audio', 'extracting_audio', 'chunking', 'transcribing'].includes(job.status);
    
    switch (job.status) {
      case 'pending':
        calculatedProgress = 2;
        break;
      case 'checking_for_captions':
        calculatedProgress = 10;
        break;
      case 'downloaded_captions':
        // Fast path with captions - jump to 50% and go straight to summarizing
        calculatedProgress = 50;
        break;
      case 'downloading_audio':
        // Use percentage from job progress if available
        if (job.job_progress.percentage_string) {
          const percent = parseFloat(job.job_progress.percentage_string.replace('%', ''));
          calculatedProgress = 15 + (percent * 0.25); // 15-40% range
        } else {
          calculatedProgress = 20;
        }
        break;
      case 'extracting_audio':
        calculatedProgress = 45;
        break;
      case 'chunking':
        calculatedProgress = 55;
        break;
      case 'transcribing':
        if (job.job_progress.transcription_chunks > 0) {
          const transcriptionProgress = 
            (job.job_progress.transcription_chunks_transcribed / job.job_progress.transcription_chunks) * 100;
          calculatedProgress = 60 + (transcriptionProgress * 0.20); // 60-80% range
        } else {
          calculatedProgress = 65;
        }
        break;
      case 'summarizing':
        const baseProgress = isFullProcessing ? 80 : 50; // Different base depending on processing type
        if (job.job_progress.summary_chunks > 0) {
          const summaryProgress = 
            (job.job_progress.summary_chunks_transcribed / job.job_progress.summary_chunks) * 100;
          calculatedProgress = baseProgress + (summaryProgress * (isFullProcessing ? 0.19 : 0.49)); // 80-99% or 50-99%
        } else {
          calculatedProgress = baseProgress + 10;
        }
        break;
      case 'finished':
        calculatedProgress = 100;
        break;
      case 'failed':
        calculatedProgress = 0;
        break;
    }

    setProgress(calculatedProgress);
  }, [job.status, job.job_progress]);

  // Retry functionality
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);
    setRetrySuccess(false);

    try {
      await startSummaryJob(job.video_id);
      setRetrySuccess(true);
      
      // Clear error state in parent component (VideoView)
      if (onRetryStart) {
        onRetryStart();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setRetrySuccess(false), 3000);
      // The job will update via SSE and the component will automatically 
      // re-render with the new status, so no need to navigate
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setRetryError(errorMessage);
    } finally {
      setIsRetrying(false);
    }
  };

  const videoTitle = job.job_progress.VideoMeta?.video_name || `Video ${job.video_id}`;
  const creatorName = job.job_progress.VideoMeta?.creator_name;
  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold truncate">{videoTitle}</h1>
              <JobStatusIndicator status={job.status} />
            </div>
            {creatorName && (
              <p className="text-sm text-muted-foreground">{creatorName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* YouTube Video Player */}
          <YouTubePlayer 
            videoId={job.video_id} 
            className="w-full" 
            thumbnailUrl={job.job_progress.VideoMeta?.video_thumbnail_url}
            videoTitle={job.job_progress.VideoMeta?.video_name}
          />
          
          {/* Overall Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Processing Progress</span>
                <Badge 
                  variant={job.status === 'failed' ? 'destructive' : 'default'}
                  className="capitalize"
                >
                  {job.status.replace('_', ' ')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              
              {job.job_progress.percentage_string && job.status === 'downloading_audio' && (
                <div className="text-sm text-muted-foreground">
                  Download Progress: {job.job_progress.percentage_string}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Steps */}
          <JobProgressSteps job={job} />

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Video ID:</span>
                  <div className="font-mono text-xs break-all">{job.video_id}</div>
                </div>
                {job.job_progress.had_captions !== null && (
                  <div>
                    <span className="text-muted-foreground">Has Captions:</span>
                    <div>{job.job_progress.had_captions ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>

              {job.job_progress.transcription_chunks > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Transcription Progress</div>
                  <div className="flex justify-between text-xs">
                    <span>
                      {job.job_progress.transcription_chunks_transcribed} of {job.job_progress.transcription_chunks} chunks
                    </span>
                    <span>
                      {job.job_progress.transcription_chunks > 0 
                        ? Math.round((job.job_progress.transcription_chunks_transcribed / job.job_progress.transcription_chunks) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={job.job_progress.transcription_chunks > 0 
                      ? (job.job_progress.transcription_chunks_transcribed / job.job_progress.transcription_chunks) * 100 
                      : 0} 
                    className="h-2" 
                  />
                </div>
              )}

              {job.job_progress.summary_chunks > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Summarization Progress</div>
                  <div className="flex justify-between text-xs">
                    <span>
                      {job.job_progress.summary_chunks_transcribed} of {job.job_progress.summary_chunks} chunks
                    </span>
                    <span>
                      {job.job_progress.summary_chunks > 0 
                        ? Math.round((job.job_progress.summary_chunks_transcribed / job.job_progress.summary_chunks) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={job.job_progress.summary_chunks > 0 
                      ? (job.job_progress.summary_chunks_transcribed / job.job_progress.summary_chunks) * 100 
                      : 0} 
                    className="h-2" 
                  />
                </div>
              )}

              {job.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="text-sm font-medium text-destructive mb-1">Error</div>
                  <div className="text-xs text-destructive/80">{job.error}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {job.status === 'failed' && (
            <div className="space-y-4 pt-4">
              {/* Retry Success Display */}
              {retrySuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950/50 dark:border-green-900/50">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Retry Started</div>
                  <div className="text-xs text-green-600/80 dark:text-green-400/80">Video processing has been restarted. You should see progress updates shortly.</div>
                </div>
              )}

              {/* Retry Error Display */}
              {retryError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="text-sm font-medium text-destructive mb-1">Retry Failed</div>
                  <div className="text-xs text-destructive/80">{retryError}</div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Retry This Video
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  disabled={isRetrying}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Try Another Video
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}