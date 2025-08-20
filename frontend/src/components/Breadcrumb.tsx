import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, Settings, Video } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/') {
    return [{ label: 'Videos', icon: Home }];
  }

  if (pathname === '/settings') {
    return [
      { label: 'Videos', href: '/', icon: Home },
      { label: 'Settings', icon: Settings }
    ];
  }

  if (pathname.startsWith('/video/')) {
    const videoId = pathname.split('/video/')[1];
    return [
      { label: 'Videos', href: '/', icon: Home },
      { label: `Video ${videoId}`, icon: Video }
    ];
  }

  return [{ label: 'Videos', icon: Home }];
}

export function Breadcrumb() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = item.icon;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 shrink-0" />
            )}
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.href && !isLast ? (
                <Link 
                  to={item.href} 
                  className="hover:text-foreground transition-colors truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-foreground font-medium truncate' : 'truncate'}>
                  {item.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}