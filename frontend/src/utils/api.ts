// API utilities for backend integration

// Dynamic base URL function that adapts to current domain
function getAPIBaseURL(): string {
  return `http://${window.location.hostname}:3211`;
}

const API_BASE_URL = getAPIBaseURL();

// API response types
export interface SummaryJobResponse {
  video_id: string;
  status: string;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

export interface SummaryResponse {
  no_summary_reason: string | null;
  summary: string | null;
}

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData;

      try {
        errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Response is not JSON, use default error message
      }

      throw new APIError(errorMessage, response.status, errorData);
    }

    // Try to parse JSON response
    try {
      return await response.json();
    } catch {
      // Response is not JSON (e.g., 204 No Content)
      return {} as T;
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError('Failed to connect to server. Please check your connection.');
    }

    throw new APIError('An unexpected error occurred. Please try again.');
  }
}

/**
 * Start a new summarization job for a video
 * @param videoId - YouTube video ID
 * @returns Promise with job response
 */
export async function startSummaryJob(videoId: string): Promise<SummaryJobResponse> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  return apiRequest<SummaryJobResponse>(`/summarize/${videoId}`, {
    method: 'POST',
  });
}

/**
 * Get the status of a summarization job
 * @param videoId - YouTube video ID
 * @returns Promise with job status
 */
export async function getJobStatus(videoId: string): Promise<SummaryJobResponse> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  return apiRequest<SummaryJobResponse>(`/summarize/${videoId}`, {
    method: 'GET',
  });
}

/**
 * Get the completed summary for a video
 * @param videoId - YouTube video ID
 * @returns Promise with summary response object
 */
export async function getSummary(videoId: string): Promise<SummaryResponse> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  return apiRequest<SummaryResponse>(`/summaries/${videoId}`, {
    method: 'GET',
  });
}

/**
 * Get all videos from the database
 * @returns Promise with map of video IDs to video metadata
 */
export async function getAllVideos(): Promise<Record<string, import('@/types/job').VideoMetadata>> {
  return apiRequest<Record<string, import('@/types/job').VideoMetadata>>(`/videos`, {
    method: 'GET',
  });
}

/**
 * Get video metadata
 * @param videoId - YouTube video ID
 * @returns Promise with video metadata
 */
export async function getVideoMetadata(videoId: string): Promise<import('@/types/job').VideoMetadata> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  return apiRequest<import('@/types/job').VideoMetadata>(`/videos/${videoId}`, {
    method: 'GET',
  });
}

// Helper function to check if an error is an API error
export function isAPIError(error: any): error is APIError {
  return error instanceof APIError;
}

// Helper function to get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Helper function to determine if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (!isAPIError(error)) {
    return false;
  }

  // Network errors and server errors (5xx) are typically retryable
  return !error.status || error.status >= 500;
}

/**
 * Get chat history for a video
 * @param videoId - YouTube video ID
 * @returns Promise with array of chat messages
 */
export async function getChatHistory(videoId: string): Promise<import('@/types/chat').ChatMessage[]> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  try {
    return apiRequest<import('@/types/chat').ChatMessage[]>(`/chat/${videoId}`, {
      method: 'GET',
    });
  } catch (error) {
    if (isAPIError(error) && error.status === 404) {
      // Chat history doesn't exist yet, return empty array
      return [];
    }
    throw error;
  }
}

/**
 * Send a chat message
 * @param videoId - YouTube video ID  
 * @param message - Message content to send
 * @returns Promise that resolves when message is sent
 */
export async function sendChatMessage(videoId: string, message: string): Promise<void> {
  if (!videoId || typeof videoId !== 'string') {
    throw new APIError('Invalid video ID provided');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new APIError('Message cannot be empty');
  }

  return apiRequest<void>(`/chat/${videoId}/send`, {
    method: 'POST',
    body: JSON.stringify({ message: message.trim() }),
  });
}