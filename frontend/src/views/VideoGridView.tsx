import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useJobState } from '@/hooks/useJobState';
import { VideoCard } from '@/components/VideoCard';

// Custom hook for debounced values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function VideoGridView() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
  const { jobs } = useJobState();

  // Convert jobs object to array and filter based on debounced search
  const filteredVideos = useMemo(() => {
    const videosArray = Object.values(jobs);
    
    if (!debouncedSearchQuery.trim()) {
      return videosArray;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    return videosArray.filter((job) => {
      const title = job.job_progress.VideoMeta?.video_name?.toLowerCase() || '';
      const creator = job.job_progress.VideoMeta?.creator_name?.toLowerCase() || '';
      return title.includes(query) || creator.includes(query);
    });
  }, [jobs, debouncedSearchQuery]);

  // Sort videos by status priority (active first) then by upload date
  const sortedVideos = useMemo(() => {
    return filteredVideos.sort((a, b) => {
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

      // Sort by upload date if available
      const aDate = a.job_progress.VideoMeta?.upload_date;
      const bDate = b.job_progress.VideoMeta?.upload_date;

      if (aDate && bDate) {
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }

      // Fallback to video_id
      return b.video_id.localeCompare(a.video_id);
    });
  }, [filteredVideos]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">All Videos</h1>
            <p className="text-muted-foreground">
              Browse and search through your YouTube video summaries
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search videos by title or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {debouncedSearchQuery ? (
              <>
                Found {sortedVideos.length} video{sortedVideos.length !== 1 ? 's' : ''} 
                {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
              </>
            ) : (
              <>Showing {sortedVideos.length} video{sortedVideos.length !== 1 ? 's' : ''}</>
            )}
          </div>

          {/* Video Grid */}
          {sortedVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedVideos.map((job) => (
                <VideoCard key={job.video_id} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">
                  {debouncedSearchQuery ? 'No videos found' : 'No videos yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  {debouncedSearchQuery
                    ? `No videos match your search for "${debouncedSearchQuery}". Try a different search term.`
                    : 'Start by entering a YouTube URL to create your first video summary.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}