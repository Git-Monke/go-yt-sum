import { FileText, MessageCircle, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'summary' | 'chat' | 'split';

interface ViewToggleButtonsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggleButtons({ viewMode, onViewModeChange, className }: ViewToggleButtonsProps) {
  const buttons = [
    {
      mode: 'summary' as const,
      icon: FileText,
      label: 'Summary',
      shortLabel: 'Summary',
    },
    {
      mode: 'split' as const,
      icon: Split,
      label: 'Split View',
      shortLabel: 'Split',
    },
    {
      mode: 'chat' as const,
      icon: MessageCircle,
      label: 'Chat',
      shortLabel: 'Chat',
    },
  ];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {buttons.map(({ mode, icon: Icon, label, shortLabel }) => (
        <Button
          key={mode}
          variant={viewMode === mode ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange(mode)}
          className={cn(
            'flex items-center gap-2 transition-all',
            viewMode === mode && 'shadow-sm'
          )}
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
}