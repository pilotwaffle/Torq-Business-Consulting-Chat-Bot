import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.torq.chat',
  appName: 'TORQ Chat',
  webDir: 'dist',
  server: {
    // Packaged dist by default. Optional live-reload / remote URL can be set later.
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#2B2D42',
    },
    StatusBar: {
      style: 'DARK',
    },
  },
};

export default config;
