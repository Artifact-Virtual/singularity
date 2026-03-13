import type { AppConfig, Environment } from './types';
import { developmentConfig } from './environments/development';
import { stagingConfig } from './environments/staging';
import { productionConfig } from './environments/production';

export type { AppConfig, Environment, ModuleConfig, FeatureFlagConfig } from './types';

/**
 * Get configuration based on environment
 */
function getConfig(): AppConfig {
  // Use process.env for Node or default to development
  const env = (typeof process !== 'undefined' && process.env?.VITE_APP_ENV) || 'development';

  const configs: Record<Environment, AppConfig> = {
    development: developmentConfig,
    staging: stagingConfig,
    production: productionConfig,
  };

  return configs[env as Environment] || developmentConfig;
}

/**
 * Application configuration - loaded at startup
 * This is the single source of truth for all app configuration
 */
export const appConfig = getConfig();

/**
 * Helper to check if a module is enabled
 */
export function isModuleEnabled(module: keyof AppConfig['modules']): boolean {
  return appConfig.modules[module]?.enabled ?? false;
}

/**
 * Helper to check if a feature flag is enabled
 */
export function isFeatureEnabled(
  category: keyof AppConfig['features'],
  feature: string
): boolean {
  const categoryFlags = appConfig.features[category];
  if (!categoryFlags) return false;

  const flag = (categoryFlags as Record<string, { enabled: boolean }>)[feature];
  return flag?.enabled ?? false;
}
