import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import './App.css';

const VideosView = lazy(() => import('./views/VideosView'));
const VideoGridView = lazy(() => import('./views/VideoGridView'));
const VideoView = lazy(() => import('./views/VideoView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<VideosView />} />
            <Route path="/videos" element={<VideoGridView />} />
            <Route path="/video/:videoId" element={<VideoView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
