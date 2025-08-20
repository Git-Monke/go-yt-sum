import { useState, useCallback, useEffect } from 'react';
import { useJobState } from '@/hooks/useJobState';
import { 
  extractVideoId, 
  isValidYouTubeURL, 
  YouTubeValidationError, 
  getValidationErrorMessage 
} from '@/utils/youtube';

export interface URLValidationState {
  inputValue: string;
  videoId: string | null;
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  errorType: YouTubeValidationError | null;
}

export interface URLValidationActions {
  setInputValue: (value: string) => void;
  validate: (url?: string) => Promise<URLValidationResult>;
  reset: () => void;
}

export interface URLValidationResult {
  isValid: boolean;
  videoId: string | null;
  error: string | null;
  errorType: YouTubeValidationError | null;
}

export function useURLValidation() {
  const { jobs } = useJobState();
  
  const [state, setState] = useState<URLValidationState>({
    inputValue: '',
    videoId: null,
    isValid: false,
    isValidating: false,
    error: null,
    errorType: null,
  });

  // Debounced validation
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateURL = useCallback(async (url: string): Promise<URLValidationResult> => {
    // Handle empty URL
    if (!url.trim()) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.EMPTY_URL),
        errorType: YouTubeValidationError.EMPTY_URL,
      };
    }

    // Check if it's a valid YouTube URL format
    if (!isValidYouTubeURL(url)) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.INVALID_FORMAT),
        errorType: YouTubeValidationError.INVALID_FORMAT,
      };
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.INVALID_VIDEO_ID),
        errorType: YouTubeValidationError.INVALID_VIDEO_ID,
      };
    }

    // Check if video is already being processed
    if (jobs[videoId]) {
      return {
        isValid: false,
        videoId,
        error: getValidationErrorMessage(YouTubeValidationError.ALREADY_EXISTS),
        errorType: YouTubeValidationError.ALREADY_EXISTS,
      };
    }

    // URL is valid
    return {
      isValid: true,
      videoId,
      error: null,
      errorType: null,
    };
  }, [jobs]);

  const validate = useCallback(async (url?: string): Promise<URLValidationResult> => {
    const urlToValidate = url ?? state.inputValue;
    
    setState(prev => ({
      ...prev,
      isValidating: true,
    }));

    try {
      const result = await validateURL(urlToValidate);
      
      setState(prev => ({
        ...prev,
        videoId: result.videoId,
        isValid: result.isValid,
        error: result.error,
        errorType: result.errorType,
        isValidating: false,
      }));

      return result;
    } catch (error) {
      const errorResult = {
        isValid: false,
        videoId: null,
        error: 'Validation failed',
        errorType: YouTubeValidationError.INVALID_FORMAT,
      };

      setState(prev => ({
        ...prev,
        videoId: null,
        isValid: false,
        error: errorResult.error,
        errorType: errorResult.errorType,
        isValidating: false,
      }));

      return errorResult;
    }
  }, [state.inputValue, validateURL]);

  const setInputValue = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      inputValue: value,
      // Reset validation state when input changes
      isValid: false,
      error: null,
      errorType: null,
      videoId: null,
    }));

    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Validate immediately - no debounce needed for client-side validation
    if (value.trim()) {
      validate(value);
    }
  }, [validate, validationTimeout]);

  const reset = useCallback(() => {
    setState({
      inputValue: '',
      videoId: null,
      isValid: false,
      isValidating: false,
      error: null,
      errorType: null,
    });

    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
  }, [validationTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  // Re-validate when jobs change (in case a duplicate becomes available)
  useEffect(() => {
    if (state.inputValue && state.errorType === YouTubeValidationError.ALREADY_EXISTS) {
      validate();
    }
  }, [jobs, state.inputValue, state.errorType, validate]);

  return {
    ...state,
    setInputValue,
    validate,
    reset,
  };
}

// Specialized hook for simple validation without state management
export function useSimpleURLValidation() {
  const { jobs } = useJobState();

  const validateURL = useCallback(async (url: string): Promise<URLValidationResult> => {
    if (!url.trim()) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.EMPTY_URL),
        errorType: YouTubeValidationError.EMPTY_URL,
      };
    }

    if (!isValidYouTubeURL(url)) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.INVALID_FORMAT),
        errorType: YouTubeValidationError.INVALID_FORMAT,
      };
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        isValid: false,
        videoId: null,
        error: getValidationErrorMessage(YouTubeValidationError.INVALID_VIDEO_ID),
        errorType: YouTubeValidationError.INVALID_VIDEO_ID,
      };
    }

    if (jobs[videoId]) {
      return {
        isValid: false,
        videoId,
        error: getValidationErrorMessage(YouTubeValidationError.ALREADY_EXISTS),
        errorType: YouTubeValidationError.ALREADY_EXISTS,
      };
    }

    return {
      isValid: true,
      videoId,
      error: null,
      errorType: null,
    };
  }, [jobs]);

  return { validateURL };
}