import { CheckCircle, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SummaryJob, JobStatus } from '@/types/job';

interface JobProgressStepsProps {
  job: SummaryJob;
}

interface ProcessingStep {
  id: string;
  label: string;
  description: string;
  statuses: JobStatus[];
}

// Simple flow for videos with captions
const simpleSteps: ProcessingStep[] = [
  {
    id: 'check',
    label: 'Check for Captions',
    description: 'Looking for available captions',
    statuses: ['checking_for_captions', 'downloaded_captions'],
  },
  {
    id: 'summarize',
    label: 'Generate Summary',
    description: 'Creating intelligent summary with AI',
    statuses: ['summarizing'],
  },
];

// Full processing flow for videos without captions
const fullProcessingSteps: ProcessingStep[] = [
  {
    id: 'download',
    label: 'Download & Extract',
    description: 'Downloading video and extracting audio',
    statuses: ['checking_for_captions', 'downloading_audio', 'extracting_audio'],
  },
  {
    id: 'prepare',
    label: 'Prepare for Processing',
    description: 'Splitting audio into processable chunks',
    statuses: ['chunking'],
  },
  {
    id: 'transcribe',
    label: 'Transcribe Audio',
    description: 'Converting speech to text using AI',
    statuses: ['transcribing'],
  },
  {
    id: 'summarize',
    label: 'Generate Summary',
    description: 'Creating intelligent summary with AI',
    statuses: ['summarizing'],
  },
];

// Determine if we should show full processing steps
function shouldShowFullProcessing(job: SummaryJob): boolean {
  // If we have transcription chunks, processing definitely happened
  if (job.job_progress.transcription_chunks > 0) {
    return true;
  }
  
  // If current status is in the processing range, show full steps
  const processingStatuses: JobStatus[] = ['downloading_audio', 'extracting_audio', 'chunking', 'transcribing'];
  if (processingStatuses.includes(job.status)) {
    return true;
  }
  
  // Otherwise, use simple steps (captions were available)
  return false;
}

function getStepStatus(step: ProcessingStep, currentStatus: JobStatus, steps: ProcessingStep[]): 'pending' | 'current' | 'completed' | 'failed' {
  if (currentStatus === 'failed') {
    return 'failed';
  }
  
  if (currentStatus === 'finished') {
    return 'completed';
  }
  
  if (step.statuses.includes(currentStatus)) {
    return 'current';
  }
  
  // Find the index of the current step
  const currentStepIndex = steps.findIndex(s => s.statuses.includes(currentStatus));
  const thisStepIndex = steps.indexOf(step);
  
  if (currentStepIndex > thisStepIndex) {
    return 'completed';
  }
  
  return 'pending';
}

function StepIcon({ status }: { status: 'pending' | 'current' | 'completed' | 'failed' }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'current':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-muted-foreground" />;
  }
}

export function JobProgressSteps({ job }: JobProgressStepsProps) {
  const showFullProcessing = shouldShowFullProcessing(job);
  const steps = showFullProcessing ? fullProcessingSteps : simpleSteps;
  
  return (
    <Card>
      <CardContent className="">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Processing Steps</h3>
          {!showFullProcessing && job.job_progress.had_captions && (
            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              Using Captions
            </div>
          )}
        </div>
        <div className="space-y-0">
          {steps.map((step, index) => {
            const status = getStepStatus(step, job.status, steps);
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <StepIcon status={status} />
                    {!isLast && (
                      <div 
                        className={`absolute top-6 left-1/2 transform -translate-x-0.5 w-0.5 h-6 ${
                          status === 'completed' ? 'bg-green-200' : 'bg-muted'
                        }`} 
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <div className={`font-medium ${
                      status === 'current' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' :
                      status === 'failed' ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </div>
                    
                    {/* Show additional progress info for current step */}
                    {status === 'current' && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {job.status === 'downloading_audio' && job.job_progress.percentage_string && (
                          <div>Progress: {job.job_progress.percentage_string}</div>
                        )}
                        {job.status === 'transcribing' && job.job_progress.transcription_chunks > 0 && (
                          <div>
                            Transcribing chunk {job.job_progress.transcription_chunks_transcribed} of {job.job_progress.transcription_chunks}
                          </div>
                        )}
                        {job.status === 'summarizing' && job.job_progress.summary_chunks > 0 && (
                          <div>
                            Summarizing chunk {job.job_progress.summary_chunks_transcribed} of {job.job_progress.summary_chunks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
