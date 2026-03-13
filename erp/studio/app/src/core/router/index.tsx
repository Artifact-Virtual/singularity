import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider as ReactRouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { AppLayout } from '@shared/components/layouts/AppLayout';
import { AuthLayout } from '@shared/components/layouts/AuthLayout';
import { LoadingSpinner } from '@shared/components/ui/LoadingSpinner';
import { useAuth } from '@core/providers';

// Lazy load modules for code splitting
const Dashboard = lazy(() => import('@modules/dashboard'));
const Development = lazy(() => import('@modules/development'));
const CRM = lazy(() => import('@modules/crm'));
const HRM = lazy(() => import('@modules/hrm'));
const Finance = lazy(() => import('@modules/finance'));
const Stakeholders = lazy(() => import('@modules/stakeholders'));
const Infrastructure = lazy(() => import('@modules/infrastructure'));
const Security = lazy(() => import('@modules/security'));
const Analytics = lazy(() => import('@modules/analytics'));
const Integrations = lazy(() => import('@modules/integrations'));
const Workflows = lazy(() => import('@modules/workflows'));
const AI = lazy(() => import('@modules/ai'));
const Admin = lazy(() => import('@modules/admin'));

// Auth pages
const LoginPage = lazy(() => import('@modules/auth/LoginPage'));
const RegisterPage = lazy(() => import('@modules/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@modules/auth/ForgotPasswordPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

// Auth route wrapper
function AuthRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AuthLayout>
  );
}

// Create the router
const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: '', element: <Navigate to="login" replace /> },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'development/*', element: <Development /> },
      { path: 'crm/*', element: <CRM /> },
      { path: 'hrm/*', element: <HRM /> },
      { path: 'finance/*', element: <Finance /> },
      { path: 'stakeholders/*', element: <Stakeholders /> },
      { path: 'infrastructure/*', element: <Infrastructure /> },
      { path: 'security/*', element: <Security /> },
      { path: 'analytics/*', element: <Analytics /> },
      { path: 'integrations/*', element: <Integrations /> },
      { path: 'workflows/*', element: <Workflows /> },
      { path: 'ai/*', element: <AI /> },
      { path: 'admin/*', element: <Admin /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export function RouterProvider() {
  return <ReactRouterProvider router={router} />;
}
