// Professional color palette (Tailwind + custom)
export const COLORS = {
  light: {
    bg: '#ffffff',
    bgSecondary: '#f8f9fa',
    bgTertiary: '#f0f2f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    
    // Brand colors
    primary: '#10b981', // Emerald
    primaryLight: '#d1fae5',
    primaryDark: '#059669',
    
    secondary: '#3b82f6', // Blue
    secondaryLight: '#dbeafe',
    
    accent: '#f59e0b', // Amber
    accentLight: '#fef3c7',
    
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  dark: {
    bg: '#0f1419',
    bgSecondary: '#1a2332',
    bgTertiary: '#242f3e',
    text: '#ffffff',
    textSecondary: '#b0b8c1',
    textTertiary: '#808a96',
    border: '#2d3844',
    borderLight: '#1f2937',
    
    // Brand colors
    primary: '#10b981',
    primaryLight: '#a7f3d0',
    primaryDark: '#059669',
    
    secondary: '#60a5fa',
    secondaryLight: '#bfdbfe',
    
    accent: '#fbbf24',
    accentLight: '#fcd34d',
    
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f87171',
    info: '#60a5fa',
  },
};

export const GRADIENTS = {
  light: {
    primary: 'from-emerald-500 to-emerald-600',
    secondary: 'from-blue-500 to-blue-600',
    accent: 'from-amber-500 to-amber-600',
    vibrant: 'from-emerald-500 via-blue-500 to-amber-500',
  },
  dark: {
    primary: 'from-emerald-500 to-emerald-600',
    secondary: 'from-blue-400 to-blue-500',
    accent: 'from-amber-400 to-amber-500',
    vibrant: 'from-emerald-400 via-blue-400 to-amber-400',
  },
};

export const ANIMATIONS = {
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  pulse: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 2, repeat: Infinity },
  },
};
