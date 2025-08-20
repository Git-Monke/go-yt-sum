import { useState, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { AlertCircle, Loader2, FileText, XCircle } from 'lucide-react';
import { getSummary, type SummaryResponse } from '@/utils/api';

interface SummaryViewerProps {
  videoId: string;
  videoTitle?: string;
  thumbnailUrl?: string;
}

export function SummaryViewer({ videoId, videoTitle, thumbnailUrl }: SummaryViewerProps) {
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const summaryResponse = await getSummary(videoId);
        setSummaryData(summaryResponse);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [videoId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    );
  }

  // Error state (network/API errors)
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <p className="font-medium text-red-600">Failed to Load Summary</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle summary response states
  if (summaryData) {
    // Check if there's a reason why no summary was generated
    if (summaryData.no_summary_reason) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <XCircle className="w-8 h-8 text-orange-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-medium text-orange-600">Summary Not Available</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {summaryData.no_summary_reason}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Check if summary content is available
    if (!summaryData.summary) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No summary content available</p>
          </div>
        </div>
      );
    }
  }

  // Empty state (shouldn't happen for finished jobs, but good to have)
  if (!summaryData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No summary data available</p>
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      {/* YouTube Video Player */}
      <YouTubePlayer 
        videoId={videoId} 
        className="w-full" 
        thumbnailUrl={thumbnailUrl}
        videoTitle={videoTitle}
      />
      
      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
        {/* Header with video title */}
        {videoTitle && (
          <header className="not-prose mb-8 pb-6 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground leading-tight">{videoTitle}</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-muted-foreground font-medium">AI-Generated Summary</p>
            </div>
          </header>
        )}
        
        {/* Markdown content */}
        <div className="w-full">
          <MarkdownRenderer>{summaryData.summary}</MarkdownRenderer>
        </div>
      </div>
    </article>
  );
}