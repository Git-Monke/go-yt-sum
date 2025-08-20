// YouTube video ID validation and extraction utilities

// Regular expression for valid YouTube video IDs (11 characters, alphanumeric + - and _)
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// YouTube URL patterns for different formats
const YOUTUBE_URL_PATTERNS = [
  // Standard watch URLs
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*[&?]v=([A-Za-z0-9_-]{11})/,
  
  // Short URLs
  /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/,
  
  // Mobile URLs
  /^https?:\/\/m\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
  /^https?:\/\/m\.youtube\.com\/watch\?.*[&?]v=([A-Za-z0-9_-]{11})/,
  
  // Embed URLs
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  
  // Old-style URLs
  /^https?:\/\/(?:www\.)?youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
  
  // YouTube Shorts
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  /^https?:\/\/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

/**
 * Extracts video ID from a YouTube URL
 * @param url - The YouTube URL to extract video ID from
 * @returns The video ID if found, null otherwise
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Clean the URL
  const cleanUrl = url.trim();
  
  // Try each pattern
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      // Validate the extracted video ID
      if (isValidVideoId(videoId)) {
        return videoId;
      }
    }
  }

  return null;
}

/**
 * Validates if a string is a valid YouTube video ID
 * @param videoId - The video ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }
  return VIDEO_ID_REGEX.test(videoId);
}

/**
 * Validates if a URL is a valid YouTube URL
 * @param url - The URL to validate
 * @returns True if valid YouTube URL, false otherwise
 */
export function isValidYouTubeURL(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null;
}

/**
 * Normalizes a YouTube URL to the standard format
 * @param url - The YouTube URL to normalize
 * @returns Normalized URL or original URL if not a YouTube URL
 */
export function normalizeYouTubeURL(url: string): string {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return url; // Return original if not a valid YouTube URL
  }
  
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Gets the thumbnail URL for a YouTube video
 * @param videoId - The YouTube video ID
 * @param quality - Thumbnail quality ('default', 'medium', 'high', 'standard', 'maxres')
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  if (!isValidVideoId(videoId)) {
    throw new Error('Invalid video ID');
  }
  
  const qualitySuffixes = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault'
  };
  
  const suffix = qualitySuffixes[quality];
  return `https://img.youtube.com/vi/${videoId}/${suffix}.jpg`;
}

/**
 * Extracts timestamp from YouTube URL
 * @param url - YouTube URL
 * @returns Timestamp in seconds, or null if not found
 */
export function extractTimestamp(url: string): number | null {
  try {
    const urlObj = new URL(url);
    
    // Check for 't' parameter (e.g., t=42s or t=1m30s)
    const tParam = urlObj.searchParams.get('t');
    if (tParam) {
      return parseTimeToSeconds(tParam);
    }
    
    // Check for hash-based timestamp (e.g., #t=42s)
    const hash = urlObj.hash;
    if (hash.startsWith('#t=')) {
      return parseTimeToSeconds(hash.substring(3));
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Converts time string to seconds
 * @param timeStr - Time string like "1m30s", "90s", "90"
 * @returns Time in seconds
 */
function parseTimeToSeconds(timeStr: string): number {
  // Remove any non-alphanumeric characters except for digits, 'm', 's'
  const cleaned = timeStr.replace(/[^\dms]/g, '');
  
  // Handle different formats
  if (cleaned.includes('m') || cleaned.includes('s')) {
    let totalSeconds = 0;
    
    // Extract minutes
    const minuteMatch = cleaned.match(/(\d+)m/);
    if (minuteMatch) {
      totalSeconds += parseInt(minuteMatch[1]) * 60;
    }
    
    // Extract seconds
    const secondMatch = cleaned.match(/(\d+)s/);
    if (secondMatch) {
      totalSeconds += parseInt(secondMatch[1]);
    }
    
    return totalSeconds;
  } else {
    // Assume it's just seconds
    return parseInt(cleaned) || 0;
  }
}

/**
 * Validation error types for YouTube URLs
 */
export enum YouTubeValidationError {
  EMPTY_URL = 'EMPTY_URL',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_VIDEO_ID = 'INVALID_VIDEO_ID',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
}

/**
 * Gets user-friendly error message for validation errors
 * @param error - The validation error type
 * @returns User-friendly error message
 */
export function getValidationErrorMessage(error: YouTubeValidationError): string {
  switch (error) {
    case YouTubeValidationError.EMPTY_URL:
      return 'Please enter a YouTube URL';
    case YouTubeValidationError.INVALID_FORMAT:
      return 'Invalid YouTube URL format';
    case YouTubeValidationError.INVALID_VIDEO_ID:
      return 'Video ID not found in URL';
    case YouTubeValidationError.ALREADY_EXISTS:
      return 'This video is already being processed';
    default:
      return 'Invalid URL';
  }
}

/**
 * Test data for URL validation
 */
export const TEST_YOUTUBE_URLS = {
  valid: [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/v/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?t=42',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy4G3I2R-NK8Pdt1H_-rTUh',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ', // http variant
  ],
  invalid: [
    'https://vimeo.com/123456789',
    'https://www.youtube.com/watch',
    'https://youtube.com/watch?v=invalid',
    'https://youtu.be/tooshort',
    'not-a-url-at-all',
    '',
    'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
    'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy4G3I2R-NK8Pdt1H_-rTUh',
  ],
};