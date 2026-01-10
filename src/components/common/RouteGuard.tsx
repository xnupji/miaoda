import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = ['/login', '/403', '/404'];

// Admin only routes
const ADMIN_ROUTES = ['/admin'];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

function matchAdminRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => path.startsWith(pattern));
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">正在加载系统资源...</p>
      </div>
    );
  }

  const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);
  const isAdminRoute = matchAdminRoute(location.pathname, ADMIN_ROUTES);

  // 未登录用户访问非公开页面，立即重定向
  if (!user && !isPublic) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 非管理员访问管理后台，立即重定向
  if (isAdminRoute && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}