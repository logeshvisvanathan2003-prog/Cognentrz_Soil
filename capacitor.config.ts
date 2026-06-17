import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cognentrz.app',
  appName: 'Cognentrz',
  webDir: 'out',
  server: {
    // Production Vercel URL - no auth, no redirects
    url: 'https://cognentrz-logz-mt52yf69k-logeshvisvanathan2003-progs-projects.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a0f0a',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#0a0f0a',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0f0a',
    },
  },
};

export default config;
