# Android Internal Testing — acciones manuales

Firma, OAuth y App Links **no** se inventan en git. Codemagic ya firma AAB con el group `android_credentials` (`codemagic.yaml` workflow `android-aab`).

`celimap://` (OAuth handoff) **no** depende de `assetlinks.json`.

## MANUAL ACTION REQUIRED

### 1. Keystore (local y/o Codemagic)

Local (Windows, JDK 21 / JBR):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android:keystore
```

Genera `secrets/celimap-release.keystore` + `android/key.properties` (gitignored). **Backup offline.**

Codemagic (si el group `android_credentials` ya tiene el keystore): no hace falta otro sistema. Vars esperadas:

* `CM_KEYSTORE_PATH`
* `CM_KEYSTORE_PASSWORD`
* `CM_KEY_PASSWORD`
* `CM_KEY_ALIAS`

Sin `key.properties` local, `bundleRelease` **compila unsigned**. Play Internal Testing exige AAB **firmado**.

### 2. SHA-1 / SHA-256

```text
keytool -list -v -keystore secrets/celimap-release.keystore -alias celimap
```

Registrar **tres** SHA-1 en Google Cloud (mismo proyecto que el Web client):

* debug (`./gradlew signingReport`)
* release/upload (keystore de arriba)
* Play App Signing (Play Console → App integrity) — después del primer upload

SHA-256 del upload **y** del App Signing key → Vercel `ANDROID_APP_SHA256_FINGERPRINTS` (comma-separated, 64 hex o `AA:BB:...`). Eso publica `https://www.celimap.com.ar/.well-known/assetlinks.json`. Sin env → 404 a propósito (no fingerprints fake).

### 3. Google Cloud — OAuth Client Android

Crear cliente **Android** (no usar ese ID como `webClientId` en JS):

* package: `com.celimap.app`
* SHA-1: debug + release + Play App Signing

`webClientId` en `SocialLogin.initialize` sigue siendo el cliente **Web**.

Consent screen Testing → agregar cuentas tester.

### 4. Vercel production

Confirmar (no asumir):

* `NATIVE_GOOGLE_AUTH_ENABLED=true` — si falta, native grant responde 404 y Android cae a Browser OAuth.
* `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = Web client
* `ANDROID_APP_SHA256_FINGERPRINTS` cuando tengas certs reales

### 5. Play Console

* Upload AAB **firmado** → Internal testing
* Data Safety: email (Google), ubicación opcional (FINE/COARSE), analytics Vercel, Mapbox tiles, **sin** cámara Android, **sin** push Android
* Privacy URL: `https://www.celimap.com.ar/privacidad`
* Account deletion URL: misma página + flujo Perfil

### 6. Device smoke (NOT VERIFIED en CI)

Launch, Google login (nativo + cancel), mapa, cerca mío allow/deny, Android Back, offline (`errorPath`), `celimap://auth/handoff`
