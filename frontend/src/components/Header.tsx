import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb } from '@/components/Breadcrumb';

interface HeaderProps {
  actions?: React.ReactNode;
}

export function Header({ actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 px-4 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <div className="flex-1 min-w-0 ml-4">
          <Breadcrumb />
        </div>
        {actions && (
          <>
            <div className="flex-shrink-0">
              {actions}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
