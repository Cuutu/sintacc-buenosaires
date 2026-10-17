/**
 * apple-app-site-association: qué links de celimap.com.ar abren la app de iOS (Universal Links).
 * Sólo el panel del local (/local…): así el QR de la tarjeta de sellos abre la app con la sesión
 * del local. /tarjeta queda afuera a propósito: el cliente guarda la tarjeta desde Safari (dentro
 * de la app el .pkpass no se puede agregar al Wallet).
 */

/** Team de la app (no el de la tarjeta de Wallet) + bundle de iOS (capacitor.config.ts). */
export const IOS_APP_TEAM_ID = "GT349H3FCR"
export const IOS_BUNDLE_ID = "com.celimap.app"
export const IOS_APP_ID = `${IOS_APP_TEAM_ID}.${IOS_BUNDLE_ID}`

export const UNIVERSAL_LINK_PATHS = ["/local", "/local/*"] as const

export function buildAppleAppSiteAssociation() {
  return {
    applinks: {
      // iOS 13+.
      details: [
        {
          appIDs: [IOS_APP_ID],
          components: UNIVERSAL_LINK_PATHS.map((path) => ({ "/": path })),
        },
      ],
      // iOS 12 y anteriores.
      apps: [],
    },
  }
}
