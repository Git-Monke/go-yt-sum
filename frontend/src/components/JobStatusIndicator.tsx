import { CheckCircle, XCircle, Loader2, Clock, Download, Music, Scissors, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@/types/job';

interface JobStatusIndicatorProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-gray-500',
    badgeVariant: 'secondary' as const,
  },
  checking_for_captions: {
    icon: FileText,
    label: 'Checking Captions',
    color: 'bg-blue-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  downloaded_captions: {
    icon: CheckCircle,
    label: 'Captions Found',
    color: 'bg-green-500',
    badgeVariant: 'default' as const,
  },
  downloading_audio: {
    icon: Download,
    label: 'Downloading',
    color: 'bg-blue-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  extracting_audio: {
    icon: Music,
    label: 'Extracting Audio',
    color: 'bg-purple-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  chunking: {
    icon: Scissors,
    label: 'Processing',
    color: 'bg-purple-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  transcribing: {
    icon: FileText,
    label: 'Transcribing',
    color: 'bg-yellow-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  summarizing: {
    icon: Sparkles,
    label: 'Summarizing',
    color: 'bg-green-500',
    badgeVariant: 'default' as const,
    animate: true,
  },
  finished: {
    icon: CheckCircle,
    label: 'Complete',
    color: 'bg-green-500',
    badgeVariant: 'default' as const,
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'bg-red-500',
    badgeVariant: 'destructive' as const,
  },
};

export function JobStatusIndicator({ status, size = 'sm' }: JobStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = (config.animate || false) ? Loader2 : config.icon;
  
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5',
  };

  return (
    <Badge variant={config.badgeVariant} className="flex items-center gap-1.5">
      <Icon 
        className={`${iconSizeClasses[size]} ${(config.animate || false) ? 'animate-spin' : ''}`}
      />
      <span className="capitalize">{config.label}</span>
    </Badge>
  );
}