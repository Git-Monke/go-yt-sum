import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JobStatusIndicator } from '@/components/JobStatusIndicator';
import type { SummaryJob } from '@/types/job';

interface VideoCardProps {
  job: SummaryJob;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function VideoCard({ job }: VideoCardProps) {
  const metadata = job.job_progress.VideoMeta;
  const title = metadata?.video_name || `Video ${job.video_id}`;
  const creator = metadata?.creator_name;
  const thumbnailUrl = metadata?.video_thumbnail_url;
  const duration = metadata?.length;
  const uploadDate = metadata?.upload_date;

  // Fallback thumbnail from YouTube
  const fallbackThumbnail = `https://img.youtube.com/vi/${job.video_id}/mqdefault.jpg`;
  const displayThumbnail = thumbnailUrl || fallbackThumbnail;

  return (
    <Link to={`/video/${job.video_id}`} className="block group">
      <div className="rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-border">
        {/* Thumbnail */}
        <div className="relative">
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={displayThumbnail}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                // If the custom thumbnail fails, try YouTube default
                if (e.currentTarget.src !== fallbackThumbnail) {
                  e.currentTarget.src = fallbackThumbnail;
                }
              }}
            />
          </div>
          
          {/* Duration Badge */}
          {duration && (
            <Badge 
              variant="secondary" 
              className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono"
            >
              {formatDuration(duration)}
            </Badge>
          )}
          
          {/* Status Indicator */}
          <div className="absolute top-2 right-2">
            <JobStatusIndicator status={job.status} />
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {/* Metadata */}
          <div className="space-y-1 text-sm text-muted-foreground">
            {creator && (
              <div>
                <span>by {creator}</span>
              </div>
            )}
            
            {uploadDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(uploadDate)}</span>
              </div>
            )}

            {/* Processing Status */}
            {job.status !== 'finished' && (
              <div className="text-xs">
                {job.status === 'failed' ? (
                  <span className="text-red-600">Processing failed</span>
                ) : (
                  <span className="text-blue-600">
                    {job.status.replace('_', ' ')} • {job.job_progress.percentage_string || 'Processing...'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}