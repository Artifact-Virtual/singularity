import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4">SINGULARITY</h1>
          <p className="text-lg opacity-90">
            Autonomous enterprise platform. Development, CRM, HRM, finance, infrastructure — unified under one intelligence.
          </p>
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">SINGULARITY</h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
