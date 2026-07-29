# Templates para deep links. Publicar en el hosting de la web (fuera de este cambio de shell):
#   https://www.celimap.com.ar/.well-known/assetlinks.json
#   https://www.celimap.com.ar/.well-known/apple-app-site-association
#
# NO se committean en public/ para no tocar la webapp desde este plan.
# Reemplazar TEAM_ID y SHA256_FINGERPRINT antes de publicar.

## assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.celimap.app",
      "sha256_cert_fingerprints": ["SHA256_FINGERPRINT_DEL_UPLOAD_KEY"]
    }
  }
]

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
