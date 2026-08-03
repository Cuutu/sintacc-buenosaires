# Native Google Sign-In — Etapa B (Capgo SDK)

## Qué cambió
- Plugin `@capgo/capacitor-social-login@8.3.39`
- Login nativo: Google Sign-In SDK → `POST /api/auth/native/google` → `signIn("native-google")`
- **No** usa `Browser.open` / Safari para login
- iOS `Info.plist`: scheme Google reversed + `celimap`
- `AppDelegate.swift`: `GIDSignIn.sharedInstance.handle(url)`

## Client IDs
| Tipo | Valor |
|------|--------|
| Web | `162365902973-g8an5g38ua9ch83o77e1qfmc5etq325l.apps.googleusercontent.com` |
| iOS | `162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo.apps.googleusercontent.com` |
| URL scheme | `com.googleusercontent.apps.162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo` |

## Vercel (ya Etapa A + públicos)
- `NATIVE_GOOGLE_AUTH_ENABLED=true`
- `GOOGLE_IOS_CLIENT_ID` = iOS id
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Web id
- `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` = iOS id

## TestFlight
1. Merge a `main` (web deploy = JS nuevo en WebView)
2. Codemagic workflow `ios-testflight` (`npx cap sync ios` ya mete plugin)
3. Instalar build nuevo en device
4. Login → sheet Google sistema (no página CeliMap en Safari)
5. Sesión queda en WebView

## Rollback
- Web Mapbox-safe: `dpl_4a3pAZmefQTapzxXsY8Hpoxnuo8T` (nunca `dpl_8Uqq…`)
- Binario: reinstalar TestFlight anterior (Browser OAuth); deep link bridge sigue vivo
