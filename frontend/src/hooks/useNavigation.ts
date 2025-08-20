import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const NAVIGATION_STORAGE_KEY = 'youtube-summarizer-navigation';

interface NavigationState {
  lastVisitedPath: string;
  visitHistory: string[];
  sidebarCollapsed: boolean;
}

const defaultState: NavigationState = {
  lastVisitedPath: '/',
  visitHistory: ['/'],
  sidebarCollapsed: false,
};

export function useNavigationPersistence() {
  const location = useLocation();
  const [navigationState, setNavigationState] = useState<NavigationState>(() => {
    try {
      const saved = localStorage.getItem(NAVIGATION_STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch {
      return defaultState;
    }
  });

  // Update navigation state when route changes
  useEffect(() => {
    const newPath = location.pathname;
    
    setNavigationState(prev => {
      const newState = {
        ...prev,
        lastVisitedPath: newPath,
        visitHistory: [
          newPath,
          ...prev.visitHistory.filter(path => path !== newPath).slice(0, 9) // Keep last 10 unique paths
        ],
      };

      // Persist to localStorage
      try {
        localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn('Failed to save navigation state:', error);
      }

      return newState;
    });
  }, [location.pathname]);

  const updateSidebarState = useCallback((collapsed: boolean) => {
    setNavigationState(prev => {
      // Prevent unnecessary updates if state hasn't changed
      if (prev.sidebarCollapsed === collapsed) {
        return prev;
      }

      const newState = { ...prev, sidebarCollapsed: collapsed };
      
      try {
        localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn('Failed to save sidebar state:', error);
      }

      return newState;
    });
  }, []);

  return {
    navigationState,
    updateSidebarState,
    getLastVisited: () => navigationState.lastVisitedPath,
    getVisitHistory: () => navigationState.visitHistory,
    isSidebarCollapsed: () => navigationState.sidebarCollapsed,
  };
}