# P2.5 — Propuesta Android styles (NO aplicada)

Riesgo actual: `styles.xml` pinta `statusBarColor` / `navigationBarColor` con
`@color/splash_background` en AppTheme y post-splash. Con política B
(`overlaysWebView: true`) la barra opaca nativa puede pelear con WebView
edge-to-edge hasta que JS corre `NativeStatusBar` → flash / salto percibido.

## Diff propuesto (mínimo) — revisar en device antes de merge

```diff
--- a/android/app/src/main/res/values/styles.xml
+++ b/android/app/src/main/res/values/styles.xml
@@ AppTheme.NoActionBar
-        <item name="android:statusBarColor">@color/splash_background</item>
-        <item name="android:navigationBarColor">@color/splash_background</item>
+        <!-- Edge-to-edge: transparente post-splash; insets vía CSS -->
+        <item name="android:statusBarColor">@android:color/transparent</item>
+        <item name="android:navigationBarColor">@android:color/transparent</item>
+        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
```

Mantener colores splash en `AppTheme.NoActionBarLaunch` (solo launch).

## Validar en device

- Cold start sin flash blanco
- Gesture nav contrast OK
- No doble inset tras transparent + CSS

**Estado:** propuesto, **no aplicado** en P2.5.
