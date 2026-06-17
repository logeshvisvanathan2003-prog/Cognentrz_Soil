import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cognentrz.app',
  appName: 'Cognentrz',
  webDir: 'out',
  server: {
    url: 'https://cognentrz-logz-dpuabzrpn-logeshvisvanathan2003-progs-projects.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a0f0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#0a0f0a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0f0a',
    },
  },
};

export default config;
