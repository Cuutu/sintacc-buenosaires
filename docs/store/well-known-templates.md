# Templates para deep links.
# Live: GET / .well-known/assetlinks.json (Next route).
# Sin ANDROID_APP_SHA256_FINGERPRINTS en Vercel → 404 (no fingerprints inventados).
#
#   https://www.celimap.com.ar/.well-known/assetlinks.json
#   https://www.celimap.com.ar/.well-known/apple-app-site-association
#
# Scheme OAuth: celimap://auth/handoff — no depende de assetlinks.

## assetlinks.json (forma; fingerprints reales solo via env)

Ver `lib/android-assetlinks.ts` y `docs/store/ANDROID-INTERNAL-TESTING.md`.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.celimap.app",
      "sha256_cert_fingerprints": ["PEGAR_SHA256_UPLOAD_Y_PLAY_APP_SIGNING"]
    }
  }
]
```

## apple-app-site-association (sin extension, Content-Type: application/json)
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.celimap.app",
        "paths": ["*", "/lugar/*", "/mapa", "/favoritos", "/"]
      }
    ]
  }
}

## Obtener SHA256 del keystore
# keytool -list -v -keystore secrets/celimap-release.keystore -alias celimap
