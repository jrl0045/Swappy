import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swappy.app',
  appName: 'Swappy',
  webDir: 'dist',
  server: {
    // Para live-reload en desarrollo: descomenta y pon tu IP local
    // url: 'http://TU_IP_LOCAL:3000',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
