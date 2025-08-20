import { useState, useEffect } from 'react';
import { AlertCircle, Play, ExternalLink, Loader2 } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
  thumbnailUrl?: string;
  videoTitle?: string;
}

type VideoStatus = 'loading' | 'available' | 'unavailable' | 'network_error';

async function checkVideoAvailability(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { method: 'GET' }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function YouTubePlayer({ 
  videoId, 
  className = '', 
  thumbnailUrl, 
  videoTitle 
}: YouTubePlayerProps) {
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('loading');
  const [showIframe, setShowIframe] = useState(false);

  // Check video availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isAvailable = await checkVideoAvailability(videoId);
        if (isAvailable) {
          setVideoStatus('available');
          setShowIframe(true);
        } else {
          setVideoStatus('unavailable');
        }
      } catch {
        setVideoStatus('network_error');
      }
    };

    if (videoId) {
      checkAvailability();
    }
  }, [videoId]);

  const handleIframeError = () => {
    setVideoStatus('unavailable');
    setShowIframe(false);
  };

  const handleRetry = () => {
    setVideoStatus('loading');
    setShowIframe(false);
    // Re-check availability
    setTimeout(async () => {
      try {
        const isAvailable = await checkVideoAvailability(videoId);
        if (isAvailable) {
          setVideoStatus('available');
          setShowIframe(true);
        } else {
          setVideoStatus('network_error'); // Assume network issue if retry fails
        }
      } catch {
        setVideoStatus('network_error');
      }
    }, 1000);
  };

  // No video ID case
  if (!videoId) {
    return (
      <div className={`bg-muted rounded-lg border flex items-center justify-center p-8 ${className}`}>
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No video ID provided</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (videoStatus === 'loading') {
    return (
      <div className={`bg-muted rounded-lg border flex items-center justify-center p-8 ${className}`}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Checking video availability...</p>
        </div>
      </div>
    );
  }

  // Video unavailable - show thumbnail fallback if available
  if (videoStatus === 'unavailable') {
    if (thumbnailUrl) {
      return (
        <div className={`relative rounded-lg overflow-hidden border ${className}`}>
          <div className="aspect-video relative">
            <img
              src={thumbnailUrl}
              alt={videoTitle || `Video ${videoId}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="bg-red-500/90 rounded-full p-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <div className="bg-black/80 rounded-lg p-3 max-w-xs">
                  <p className="text-sm font-medium text-white mb-1">Video Unavailable</p>
                  <p className="text-xs text-gray-300">This video may be private, deleted, or region-locked</p>
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                  >
                    Try on YouTube
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // No thumbnail available
      return (
        <div className={`bg-muted rounded-lg border flex items-center justify-center p-8 ${className}`}>
          <div className="text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Video Unavailable</p>
              <p className="text-xs text-muted-foreground">This video may be private, deleted, or region-locked</p>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 underline"
              >
                Try on YouTube
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  // Network error - show retry option
  if (videoStatus === 'network_error') {
    return (
      <div className={`bg-muted rounded-lg border flex items-center justify-center p-8 ${className}`}>
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-orange-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-orange-600">Connection Error</p>
            <p className="text-xs text-muted-foreground">Unable to check video availability</p>
            <button
              onClick={handleRetry}
              className="text-xs text-blue-500 hover:text-blue-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video is available - show iframe
  if (videoStatus === 'available' && showIframe) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden border ${className}`}>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
            title={videoTitle || "YouTube video player"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            onError={handleIframeError}
          />
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <div className={`bg-muted rounded-lg border flex items-center justify-center p-8 ${className}`}>
      <div className="text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Unable to load video</p>
      </div>
    </div>
  );
}