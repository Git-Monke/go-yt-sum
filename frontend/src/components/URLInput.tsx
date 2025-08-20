import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Youtube, Send } from 'lucide-react';
import { useURLValidation } from '@/hooks/useURLValidation';
import { startSummaryJob, isAPIError, getErrorMessage } from '@/utils/api';
import { cn } from '@/lib/utils';

interface URLInputProps {
  onSubmit?: (videoId: string) => void;
  className?: string;
}

export function URLInput({ onSubmit, className }: URLInputProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    inputValue,
    setInputValue,
    videoId,
    isValid,
    isValidating,
    error: validationError,
    validate,
  } = useURLValidation();

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear submit error when input changes
  useEffect(() => {
    if (submitError) {
      setSubmitError(null);
    }
  }, [inputValue, submitError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoId || !isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Start the summarization job
      await startSummaryJob(videoId);
      
      // Call custom onSubmit handler if provided
      if (onSubmit) {
        onSubmit(videoId);
      }

      // Navigate to the video page
      navigate(`/video/${videoId}`);
      
      // Clear the input after successful submission
      setInputValue('');
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setSubmitError(errorMessage);
      
      // Re-focus input for user to try again
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  // Determine input icon based on state
  const getInputIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
    
    if (inputValue && !isValidating) {
      if (isValid) {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      } else if (validationError) {
        return <XCircle className="h-5 w-5 text-red-500" />;
      }
    }
    
    return <Youtube className="h-5 w-5 text-muted-foreground" />;
  };

  // Determine error message to show
  const errorMessage = submitError || validationError;
  const hasError = Boolean(errorMessage);

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main input container */}
        <div className="relative">
          <div className="relative">
            <Input
              ref={inputRef}
              type="url"
              placeholder="Enter YouTube URL (including Shorts)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className={cn(
                // Base styling
                'h-14 pl-12 pr-4 text-lg placeholder:text-muted-foreground/60',
                'border-2 transition-all duration-200',
                'focus:ring-2 focus:ring-primary/20',
                
                // State-based styling
                isValid && !isValidating && 'border-green-500/50 focus:border-green-500',
                hasError && !isValidating && 'border-red-500/50 focus:border-red-500',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            />
            
            {/* Input icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {getInputIcon()}
            </div>
          </div>
          
          {/* Submit button */}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting || isValidating}
            size="lg"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4',
              'transition-all duration-200',
              isValid && !isSubmitting && 'shadow-md hover:shadow-lg'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Summarize
              </>
            )}
          </Button>
        </div>

        {/* Error/Success message */}
        {errorMessage && (
          <div className={cn(
            'text-sm px-3 py-2 rounded-md',
            submitError ? 'text-red-600 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-900/50' :
            'text-red-600 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-900/50'
          )}>
            {errorMessage}
          </div>
        )}

        {/* Success message with video ID */}
        {isValid && videoId && !hasError && (
          <div className="text-sm px-3 py-2 rounded-md text-green-600 bg-green-50 border border-green-200 dark:text-green-400 dark:bg-green-950/50 dark:border-green-900/50">
            ✓ Valid YouTube video detected: {videoId}
          </div>
        )}
      </form>

      {/* Help text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Supports all YouTube formats including regular videos and Shorts
        </p>
        <div className="mt-2 text-xs text-muted-foreground space-x-4">
          <span>• youtube.com/watch?v=...</span>
          <span>• youtu.be/...</span>
          <span>• youtube.com/shorts/...</span>
        </div>
      </div>
    </div>
  );
}
