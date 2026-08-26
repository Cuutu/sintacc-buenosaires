import { isNativeAndroidApp, isNativeIosApp } from "@/lib/native-app"

/** Permission-denied copy. Android = system Settings, not browser site settings. */
export function locationPermissionDeniedCopy(): string {
  if (isNativeAndroidApp()) {
    return "No se pudo acceder a tu ubicación. Activá el permiso de Ubicación para CeliMap en Ajustes del sistema."
  }
  if (isNativeIosApp()) {
    return "No se pudo acceder a tu ubicación. Activá Ubicación para CeliMap en Ajustes."
  }
  return "No se pudo acceder a tu ubicación. Activá el permiso de ubicación para este sitio en la configuración del navegador."
}

export function locationPermissionBlockedRetryCopy(): string {
  if (isNativeAndroidApp()) {
    return "No se pudo acceder a tu ubicación. Si la bloqueaste antes, activala en Ajustes → Apps → CeliMap → Permisos."
  }
  if (isNativeIosApp()) {
    return "No se pudo acceder a tu ubicación. Si la bloqueaste antes, activala en Ajustes → CeliMap → Ubicación."
  }
  return "No se pudo acceder a tu ubicación. Si la bloqueaste antes, activala en la configuración del navegador."
}
