# Celimap — Launch Play Store + App Store

Shell Capacitor carga `https://www.celimap.com.ar` (misma PWA). **No cambia la webapp.**

App ID: `com.celimap.app`  
Nombre: Celimap

---

## Prerequisito legal (vos, fuera del shell)

Stores exigen URL pública de privacidad.

**URL:** https://www.celimap.com.ar/privacidad  
(Implementada en la web: ruta `/privacidad`. Deployá a producción antes de pegarla en las consolas.)

Checklist completo: [PREREQUISITES.md](./PREREQUISITES.md)

Templates deep links (publicar en el dominio cuando quieras): [well-known-templates.md](./well-known-templates.md)

---

## Fase A — Android (primero)

### 1. Cuentas
- [ ] Google Play Console (USD 25 una vez)

### 2. Keystore (ya automatizado)
```bash
npm run android:keystore
```
Genera `secrets/celimap-release.keystore` + `android/key.properties` (gitignored).  
**Backup offline obligatorio.**

## Build Android local (Windows)

JDK **21** requerido (Capacitor 8). Usar JBR de Android Studio:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run cap:sync
npm run android:keystore   # una vez; backup secrets/
npm run android:bundle
```

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Debug APK (probar en device): `android/app/build/outputs/apk/debug/app-debug.apk`


### 4. Play Console listing (draft)
- Título: Celimap
- Short/full description (mapa celíaco, sin TACC, comunidad)
- Screenshots teléfono (mín. 2)
- Feature graphic 1024×500
- Privacy policy URL
- Data safety (email vía Google OAuth, ubicación opcional)
- Content rating IARC
- Categoría: Maps & Navigation / Food & Drink

### 5. Internal testing
- Subir AAB → Internal testing track
- Probar: login Google, mapa, cerca mío, favoritos, sugerir
- Dejar Production draft listo **sin publicar**

Checklist QA Android:
- [ ] Abre www.celimap.com.ar dentro del WebView
- [ ] Login Google vuelve a la app
- [ ] Mapa + geolocalización
- [ ] Deep link `celimap://` (OAuth handoff)
- [ ] Offline: pagina local (`server.errorPath` → `www/index.html`)

Internal testing (firma + OAuth + SHA): [ANDROID-INTERNAL-TESTING.md](./ANDROID-INTERNAL-TESTING.md)

---

## Fase B — iOS (segundo, sin Mac local)

### 1. Cuentas
- [ ] Apple Developer Program (USD 99/año)
- [ ] App ID `com.celimap.app` en developer.apple.com
- [ ] App Store Connect → nueva app Celimap

### 2. Codemagic
1. Conectar repo en [codemagic.io](https://codemagic.io)
2. Usar [codemagic.yaml](../../codemagic.yaml) de la raíz
3. Configurar integration App Store Connect + group `app_store_credentials`
4. Reemplazar `APP_STORE_APPLE_ID` / nombres de profiles en el YAML
5. Correr workflow `ios-testflight`

### 3. TestFlight
- [ ] Build aparece en TestFlight
- [ ] Testers internos: mismos checks que Android
- [ ] Privacy Nutrition Labels
- [ ] Screenshots 6.7" / 6.5"
- [ ] Dejar Submit for Review draft **sin enviar**

Permisos ya en Info.plist: `NSLocationWhenInUseUsageDescription`.

Associated Domains en `ios/App/App/App.entitlements` (activá capability en Apple Dev + publicá apple-app-site-association).

---

## Fase C — Submit simultáneo

Cuando Internal Android OK + TestFlight OK:

1. Enviar **los dos** a review el mismo día
2. Play suele aprobar antes; esperá Apple (24–48h típico)
3. Publicar Play el día que Apple apruebe (o staggered consciente)

---

## Comandos útiles

| Acción | Comando |
|--------|---------|
| Sync nativo | `npm run cap:sync` |
| Abrir Android Studio | `npm run cap:android` |
| Generar keystore | `npm run android:keystore` |
| AAB release | `npm run android:bundle` |
| Regenerar iconos | `npx capacitor-assets generate --iconBackgroundColor '#0b1220' --splashBackgroundColor '#0b1220'` |

---

## Riesgo Apple 4.2

Wrapper WebView puro a veces rechazan. Mitigaciones ya en shell: splash, iconos, deep links, offline fallback, location purpose string.  
Si rechazan: agregar 1 feature nativa chica (share sheet / push) — **sin** reescribir en Expo.
