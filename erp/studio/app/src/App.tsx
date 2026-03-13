import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@core/providers/ThemeProvider';
import { ConfigProvider } from '@core/providers/ConfigProvider';
import { AuthProvider } from '@core/providers/AuthProvider';
import { ToastProvider } from '@core/providers/ToastProvider';
import { RouterProvider } from '@core/router';
import { appConfig } from '@config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <ConfigProvider config={appConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="singularity-theme">
          <AuthProvider>
            <ToastProvider>
              <RouterProvider />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
