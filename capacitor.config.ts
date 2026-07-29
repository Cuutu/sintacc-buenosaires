import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.celimap.app",
  appName: "Celimap",
  webDir: "www",
  server: {
    url: "https://www.celimap.com.ar",
    cleartext: false,
  },
  android: {
    // Ayuda a detectar shell nativo / debug
    appendUserAgent: " CelimapNative/1",
    backgroundColor: "#0b1220",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Splash nativo lo controla MainActivity hasta pageReady
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0b1220",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1220",
    },
  },
}

export default config
