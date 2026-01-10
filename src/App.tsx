import React, { Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import IntersectObserver from '@/components/common/IntersectObserver';
import { RouteGuard } from '@/components/common/RouteGuard';
import MainLayout from '@/components/layouts/MainLayout';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Web3Provider } from '@/contexts/Web3Context';
import routes from './routes';

// 加载中组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// 布局包装器
const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return <MainLayout>{children}</MainLayout>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Web3Provider>
            <RouteGuard>
              <IntersectObserver />
              <LayoutWrapper>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {routes.map((route, index) => (
                      <Route
                        key={index}
                        path={route.path}
                        element={route.element}
                      />
                    ))}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </LayoutWrapper>
              <Toaster />
            </RouteGuard>
          </Web3Provider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
