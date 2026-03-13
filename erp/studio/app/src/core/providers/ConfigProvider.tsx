import { createContext, useContext, type ReactNode } from 'react';

// Inline type definition to avoid import issues
type ModuleConfig = {
  enabled: boolean;
  permissions?: string[];
};

type FeatureFlagConfig = {
  enabled: boolean;
  rollout?: number;
  metadata?: Record<string, unknown>;
};

type AppConfig = {
  app: {
    name: string;
    version: string;
    defaultLocale: string;
    supportedLocales: string[];
    environment: 'development' | 'staging' | 'production';
  };
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  auth: {
    sessionDuration: string;
    refreshThreshold: string;
    mfaRequired: boolean;
    providers: string[];
  };
  modules: Record<string, ModuleConfig>;
  features: Record<string, Record<string, FeatureFlagConfig>>;
  theme: {
    default: string;
    available: string[];
  };
  integrations: Record<string, { enabled: boolean; [key: string]: unknown }>;
};

type ConfigProviderProps = {
  children: ReactNode;
  config: AppConfig;
};

const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children, config }: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }

  return context;
}

export function useFeatureFlag(flag: string): boolean {
  const config = useConfig();
  const [module, feature] = flag.split('.');

  if (!module || !feature) return false;

  const moduleFlags = config.features?.[module as keyof typeof config.features];
  if (!moduleFlags || typeof moduleFlags !== 'object') return false;

  const flagConfig = (moduleFlags as Record<string, unknown>)[feature];
  if (!flagConfig || typeof flagConfig !== 'object') return false;

  const flagObj = flagConfig as { enabled?: boolean; rollout?: number };
  if (!flagObj.enabled) return false;

  // Rollout percentage check (simplified - in production use user ID hash)
  if (flagObj.rollout !== undefined && flagObj.rollout < 100) {
    const random = Math.random() * 100;
    return random <= flagObj.rollout;
  }

  return true;
}
