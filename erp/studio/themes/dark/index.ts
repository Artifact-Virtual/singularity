/**
 * Dark Theme Configuration
 */

export const themeConfig = {
  name: 'dark',
  displayName: 'Dark Mode',
  description: 'Modern dark theme for reduced eye strain',
  type: 'dark' as const,
  colors: {
    primary: '#3b82f6',
    secondary: '#1e293b',
    accent: '#1e293b',
    background: '#0f172a',
    foreground: '#f8fafc',
  },
};

export default themeConfig;
