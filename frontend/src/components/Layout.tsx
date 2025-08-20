import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { useNavigationPersistence } from '@/hooks/useNavigation';
import { JobProvider } from '@/contexts/JobContext';
import { useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

function LayoutContent({ children, headerActions }: LayoutProps) {
  const { updateSidebarState, isSidebarCollapsed } = useNavigationPersistence();
  const { open, setOpen } = useSidebar();

  // Initialize sidebar state from persistence (only once)
  useEffect(() => {
    const savedCollapsed = isSidebarCollapsed();
    if (savedCollapsed !== !open) {
      setOpen(!savedCollapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update persistent state when sidebar changes (without updateSidebarState in deps)
  useEffect(() => {
    updateSidebarState(!open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on open, not the function

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col min-w-0">
        <Header actions={headerActions} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

export function Layout({ children, headerActions }: LayoutProps) {
  return (
    <JobProvider>
      <SidebarProvider>
        <LayoutContent headerActions={headerActions}>{children}</LayoutContent>
      </SidebarProvider>
    </JobProvider>
  );
}