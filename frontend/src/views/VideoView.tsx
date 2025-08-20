import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobById } from '@/hooks/useJobState';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { JobProgressView } from '@/components/JobProgressView';
import { SummaryViewer } from '@/components/SummaryViewer';
import { ChatInterface } from '@/components/ChatInterface';
import { ViewToggleButtons, type ViewMode } from '@/components/ViewToggleButtons';
import { getVideoMetadata } from '@/utils/api';
import { cn } from '@/lib/utils';
import type { VideoMetadata } from '@/types/job';

export default function VideoView() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const job = useJobById(videoId || '');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Clear error state when retry is initiated
  const handleRetryStart = () => {
    if (videoMetadata) {
      setVideoMetadata({
        ...videoMetadata,
        job_failed: false,
        last_error: ''
      });
    }
  };

  // Fetch video metadata to check persistent failure state
  useEffect(() => {
    if (!videoId) return;

    const fetchMetadata = async () => {
      setMetadataLoading(true);
      try {
        const metadata = await getVideoMetadata(videoId);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Failed to fetch video metadata:', error);
        setVideoMetadata(null);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [videoId]);

  // If no video ID, redirect to home
  if (!videoId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">No Video Selected</h1>
          <p className="text-muted-foreground">Please select a video from the sidebar or create a new summary.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Determine if we should show progress view based on job state and persistent failure state
  const shouldShowProgressView = () => {
    // Priority 1: If database shows persistent failure, always show progress (regardless of active job state)
    if (videoMetadata?.job_failed) {
      return true;
    }
    
    // Priority 2: If active job exists and not finished, show progress
    if (job && job.status !== 'finished') {
      return true;
    }
    
    return false;
  };

  // If we should show progress view, create a job object for display
  if (shouldShowProgressView()) {
    // Priority 1: If database shows persistent failure, always use mock failed job
    if (videoMetadata?.job_failed) {
      const mockJob = {
        video_id: videoId,
        status: 'failed' as const,
        error: videoMetadata.last_error || 'Job failed during processing',
        job_progress: {
          VideoMeta: videoMetadata,
          percentage_string: '',
          had_captions: false,
          transcription_chunks: 0,
          transcription_chunks_transcribed: 0,
          summary_chunks: 0,
          summary_chunks_transcribed: 0,
        }
      };
      return <JobProgressView job={mockJob} onRetryStart={handleRetryStart} />;
    }
    
    // Priority 2: If active job exists and not finished, use it
    if (job) {
      return <JobProgressView job={job} onRetryStart={handleRetryStart} />;
    }
  }

  // If job doesn't exist and no persistent failure, show not found
  if (!job && !videoMetadata?.job_failed) {
    // Show loading if we're still fetching metadata
    if (metadataLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Video Not Found</h1>
          <p className="text-muted-foreground">
            The video you're looking for doesn't exist or hasn't been processed yet.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate('/')}>
              Create New Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Job exists and is finished (or no job but successful completion) - show the summary
  const videoTitle = job?.job_progress.VideoMeta?.video_name || videoMetadata?.video_name || `Video ${videoId}`;
  const creatorName = job?.job_progress.VideoMeta?.creator_name || videoMetadata?.creator_name;
  const thumbnailUrl = job?.job_progress.VideoMeta?.video_thumbnail_url || videoMetadata?.video_thumbnail_url;

  // Calculate layout classes based on view mode
  const summaryClasses = cn(
    "flex flex-col min-w-0",
    viewMode === 'chat' && "hidden",
    viewMode === 'summary' && "w-full", 
    viewMode === 'split' && "flex-1 lg:border-r"
  );

  const chatClasses = cn(
    "flex flex-col bg-muted/20",
    viewMode === 'summary' && "hidden",
    viewMode === 'chat' && "w-full",
    viewMode === 'split' && "w-2/5"
  );

  return (
    <div className="flex flex-col h-full">
      {/* View Toggle Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
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
              <h1 className="text-xl font-semibold truncate">{videoTitle}</h1>
              {creatorName && (
                <p className="text-sm text-muted-foreground">{creatorName}</p>
              )}
            </div>
          </div>
          
          {/* View Toggle Buttons */}
          <ViewToggleButtons 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Summary Pane */}
        <div className={summaryClasses}>
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <SummaryViewer 
                videoId={videoId} 
                videoTitle={videoTitle}
                thumbnailUrl={thumbnailUrl}
              />
            </div>
          </div>
        </div>
        
        {/* Chat Pane */}
        <div className={chatClasses}>
          <ChatInterface videoId={videoId} />
        </div>
      </div>
    </div>
  );
}
