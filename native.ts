/**
 * Capacitor native platform bootstrap.
 * Dynamic imports keep the web bundle free of native plugin side effects.
 * Never called with Anthropic keys — client talks only to VITE_TORQ_API_BASE (BFF).
 */
export async function initNativeShell(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const [{ StatusBar, Style }, { Keyboard, KeyboardResize }, { App }, { SplashScreen }] =
      await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/keyboard'),
        import('@capacitor/app'),
        import('@capacitor/splash-screen'),
      ]);

    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {
      /* non-fatal on unsupported platforms */
    });

    // Keep accessory bar for multiline chat composer (iPhone).
    await Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {
      /* Android may not support accessory bar */
    });

    // Resize body when keyboard opens so the composer stays visible (iOS).
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {
      /* non-fatal */
    });

    await SplashScreen.hide().catch(() => {
      /* already auto-hidden via config */
    });

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });

    App.addListener('appStateChange', ({ isActive }) => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.debug('[native] appStateChange isActive=', isActive);
      }
    });
  } catch (err) {
    // Web builds without Capacitor runtime should never break.
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug('[native] init skipped or failed:', err);
    }
  }
}
