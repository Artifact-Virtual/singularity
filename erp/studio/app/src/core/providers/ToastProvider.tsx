import { Toaster } from 'sonner';
import type { ReactNode } from 'react';
import { useTheme } from './ThemeProvider';

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        theme={resolvedTheme}
        position="bottom-right"
        toastOptions={{
          duration: 5000,
        }}
      />
    </>
  );
}
