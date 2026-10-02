/**
 * Script inline que corre antes de pintar y marca `<html>` con:
 * - `data-device="android" | "ios" | "desktop"` (misma lógica que `getDevicePlatform`)
 * - `data-app-shell` en la app nativa (UA `CelimapNative`) o PWA instalada
 *
 * Permite mostrar/ocultar por CSS (ver `globals.css`) contenido que el HTML ISR
 * no puede decidir en el servidor, sin saltos de layout ni errores de hidratación.
 * `<html>` lleva `suppressHydrationWarning` por estos atributos.
 */
export const DEVICE_HINT_SCRIPT = `(function(){try{var d=document.documentElement,n=navigator,u=n.userAgent||"",t=n.maxTouchPoints||0;d.setAttribute("data-device",/Android/i.test(u)?"android":/iPhone|iPad|iPod/i.test(u)||(/Macintosh/i.test(u)&&t>1)?"ios":"desktop");if(/CelimapNative/.test(u)||n.standalone||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches))d.setAttribute("data-app-shell","")}catch(e){}})()`
