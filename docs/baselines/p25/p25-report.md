# P2.5 — Informe integración nativa / validación visual

**Estado: BLOQUEADO por entorno**

Fecha: 2026-08-03  
Host agente: Windows 10 · sin Xcode · JAVA_HOME inválido · ANDROID_SDK no seteado  
**No merge · No deploy producción**

---

## 1. Snapshot pre-sync

- Status: `docs/baselines/p25/pre-sync-status.txt`
- Patch WIP: `docs/baselines/p25/pre-sync-wip.patch` (~224 KB)
- Stash: `stash@{0}: KEEP-backup-wip-pre-lote1` **intacto**
- Toolchain: `docs/baselines/p25/toolchain.txt`

| Tool | Valor |
|------|-------|
| Node | v24.14.0 |
| npm | 11.9.0 |
| Capacitor CLI/core/ios/android | 8.4.2 |
| status-bar | 8.0.3 |
| Xcode / CocoaPods | N/A (Windows) |
| Java / Gradle build | BLOQUEADO (`JAVA_HOME` apunta a path inexistente) |
| Android SDK | NOT_SET |

### Archivos versionados

- `ios/`: **34** archivos (proyecto + assets + CapApp-SPM)
- `android/`: **625** archivos — **incluye `.gradle/`, `app/build/`, cordova-plugins `build/`**  
  → muchos **no deberían versionarse** (ya en `.gitignore` pero trackeados históricamente)

---

## 2. Cap sync

Ejecutado en este entorno:

```bash
npx cap sync android   # OK 0.26s
npx cap sync ios       # OK lógica; 2º pass warning open capacitor.config.json (archivo quedó actualizado)
```

### Diffs guardados

| Archivo | Contenido |
|---------|-----------|
| `sync-ios-expected.diff` | config + Package.swift |
| `sync-android-expected.diff` | config + plugins + gradle settings |
| `sync-ios-tracked.diff` / `sync-android-tracked.diff` | full tracked incl. ruido build |

### Clasificación

| Cambio | Clase |
|--------|-------|
| `capacitor.config.json` iOS/Android → `overlaysWebView: true`, splash `0`, UA, bg `#0b1220` | **Esperado** (Lote 2) |
| `packageClassList` + `CAPBrowserPlugin` | **Esperado** (plugin ya en package.json, sync atrasado) |
| `Package.swift` + `CapacitorBrowser` | **Esperado** |
| `android/capacitor.settings.gradle` + `capacitor.build.gradle` Browser | **Esperado** |
| `capacitor.plugins.json` + Browser entry | **Generado / esperado** |
| Deletes bajo `android/capacitor-cordova-android-plugins/build/**` | **No debería versionarse** — sync regeneró carpeta; dejar fuera de commits |
| Podfile.lock / Xcode pbxproj | **Sin cambio** (SPM, no CocoaPods pods sync en Windows) |
| Manifest / Info.plist | **Sin cambio** |

### Comandos developer (build binario)

```bash
# Android (con JDK 17 + ANDROID_HOME válidos)
npx cap sync android
npx cap open android   # o: cd android && .\gradlew.bat assembleDebug

# iOS (Mac)
npx cap sync ios
npx cap open ios
# Xcode → Run en simulador/device
```

Tras sync revisar: `Package.swift`, `capacitor.settings.gradle`, configs JSON, **no** commitear `build/` ni `.gradle/`.

---

## 3. Estrategia staging (segura)

Implementada en `capacitor.config.ts` (sync-time):

| Modo | Cómo |
|------|------|
| **Release / default** | `npx cap sync` → **solo** `https://www.celimap.com.ar` |
| **Preview** | `CAPACITOR_SERVER_MODE=preview CAPACITOR_SERVER_URL=https://<host> npx cap sync` |
| Guardas | URL sin MODE → throw; preview sin URL → throw; preview=prod URL → throw |

Volver a prod:

```bash
# unset CAPACITOR_SERVER_*
npx cap sync
# verificar JSON nativo: server.url == https://www.celimap.com.ar
```

Verificar entorno desde binario:

1. Safari Web Inspector / chrome://inspect → `location.host`
2. Con `NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG=1` en el **deploy web** cargado → log `[celimap-layout]` incluye `host`
3. UA contiene `CelimapNative/1`

**URL staging usada en P2.5:** ninguna.  
**Motivo:** no existe URL preview autorizada / accesible para device en este entorno; **no se desplegó nada**.

Sin URL staging → **imposible** validar Lote 2 dentro del WebView (sigue cargando prod sin Lote 2).

---

## 4. Plataformas realmente probadas

| Superficie | Resultado |
|------------|-----------|
| Cap sync Android (copy/update) | Sí |
| Cap sync iOS (copy/update) | Sí (parcial warning 2º pass) |
| Build APK / AAB | **No** (Java/SDK) |
| Simulador/device iOS | **No** (Windows) |
| Emulador/device Android | **No** |
| Matriz visual safe areas | **No** |
| Safari / PWA / teclado / 10 ciclos mapa | **No** |

---

## 5. Capturas

Ninguna — bloqueado por entorno + falta URL staging.

## 6. Insets computados

No medidos en device. Logger listo: `NativeLayoutDebug` + flag `NEXT_PUBLIC_CELIMAP_LAYOUT_DEBUG=1`.

## 7. 10 ciclos mapa / Mapbox

No ejecutados. Stats DEV ya existen en `window.__celimapMapboxStats` (Lote 1).

## 8. Problemas encontrados

1. **Bloqueo hard:** sin Mac/device/JDK/SDK + sin staging URL → P2.5 visual imposible aquí  
2. Android trackea artefactos `build/` / `.gradle` (deuda git)  
3. iOS `capacitor.config.json` estaba desfasado pre-sync (sin `overlaysWebView`) — sync lo corrigió  
4. Browser plugin no estaba en Package.swift / settings pre-sync  
5. Reporter sigue sin sink remoto (TestFlight ciego) — propuesta en `sentry-sink-proposal.md`  
6. Styles Android opacos post-splash — propuesta **no aplicada** en `android-styles-proposal.md`  
7. Sticky: `pb-24` no igualaba clearance+barra → corregido a `--lugar-bottom-clearance`

## 9. Cambios mínimos recomendados (hechos vs pendientes)

**Hechos en P2.5 (código, no visual):**

- Guards staging en `capacitor.config.ts`
- `NativeLayoutDebug` (off en prod salvo flag)
- Token `--lugar-bottom-clearance` + ficha lugar
- Tests contrato sticky + server guards
- Docs propuestas Android styles + Sentry
- Cap sync configs nativos alineados a Lote 2

**Pendientes (requieren humano/device):**

- Aplicar o rechazar styles transparentes Android tras cold-start real  
- Deploy preview Vercel (autorizado) + sync preview  
- Matriz iOS/Android completa + capturas  
- Conectar Sentry antes de TF externo  
- Limpiar tracking de `android/**/build` y `.gradle`

## 10. Acciones que requieren Mac / device / credenciales

- Xcode build + TestFlight  
- CocoaPods N/A (SPM) pero Mac sí  
- JDK 17 correcto + Android Studio / SDK  
- Cuenta Apple / Play  
- URL staging + auth Vercel si preview protegido  
- Sentry org/DSN  

## 11. Confirmación

- **No merge**
- **No deploy producción**
- Stash KEEP intacto
- No Lote 3

---

## Criterios P2.5 vs realidad

| Criterio | |
|----------|--|
| sync sin cambios inesperados de contrato | OK (Browser plugin catch-up esperado; build deletes = basura trackeada) |
| forma segura probar staging | OK (código) / URL staging **faltante** |
| doble inset / flash / matrices / teclado / Mapbox ciclos | **NO VALIDADO en device** |
| build iOS/Android completan | **NO** |

→ **BLOQUEADO por entorno** hasta Mac/device + URL preview autorizada.
