import { useLocation, Link } from 'react-router-dom';
import { Home, Settings, Clock, WifiOff, Plus } from 'lucide-react';
import { useRecentJobs, useConnectionStatus } from '@/hooks/useJobState';

function useActiveNavigation(pathname: string) {
  const getActiveState = (itemPath: string) => {
    // Exact match for home/summarize page
    if (itemPath === '/' && pathname === '/') return true;
    
    // For other routes, check if pathname starts with the item path
    if (itemPath !== '/' && pathname.startsWith(itemPath)) return true;
    
    // Special case: video routes should highlight "Videos" nav item
    if (itemPath === '/videos' && pathname.startsWith('/video/')) return true;
    
    return false;
  };

  return { getActiveState };
}
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const navigation = [
  {
    title: 'Summarize',
    url: '/',
    icon: Plus,
  },
  {
    title: 'Videos',
    url: '/videos',
    icon: Home,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

function getVideoTitle(job: import('@/types/job').SummaryJob): string {
  return job.job_progress.VideoMeta?.video_name || `Video ${job.video_id}`;
}

function getVideoCreator(job: import('@/types/job').SummaryJob): string {
  return job.job_progress.VideoMeta?.creator_name || 'Unknown';
}


export function AppSidebar() {
  const location = useLocation();
  const { getActiveState } = useActiveNavigation(location.pathname);
  const recentJobs = useRecentJobs();
  const { isConnected, hasError, reconnect } = useConnectionStatus();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-red-600 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">YouTube</span>
                  <span className="truncate text-xs">Summarizer</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title} className="mb-1">
                  <SidebarMenuButton 
                    asChild 
                    isActive={getActiveState(item.url)}
                    tooltip={item.title}
                    className="py-3"
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>
            Recent Videos
            {!isConnected && (
              <div className="ml-2 inline-flex items-center">
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasError && !isConnected && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={reconnect} variant="outline">
                    <WifiOff />
                    <span>Reconnect</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <SidebarMenuItem key={job.video_id} className="mb-1">
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === `/video/${job.video_id}`}
                      tooltip={getVideoTitle(job)}
                      className="py-3"
                    >
                      <Link to={`/video/${job.video_id}`}>
                        <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                          <span className="truncate font-medium">{getVideoTitle(job)}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {getVideoCreator(job)}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <Clock />
                    <span className="text-muted-foreground">No recent videos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}