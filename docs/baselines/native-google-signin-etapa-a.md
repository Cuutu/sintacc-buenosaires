# Native Google Sign-In — Etapa A (backend)

Web Client ID (Google Cloud, type Web — NextAuth + iOSServerClientId / serverAuthCode exchange):
`162365902973-g8an5g38ua9ch83o77e1qfmc5etq325l.apps.googleusercontent.com`

iOS Client ID (Google Cloud, type iOS):
`162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo.apps.googleusercontent.com`

Reversed URL scheme (Info.plist, Etapa B):
`com.googleusercontent.apps.162365902973-ffml8h7qtolnmkgddd9dl0iv9a3i0fmo`

## Flow (Etapa A)

1. Native SDK (Etapa B) → `serverAuthCode` or `idToken`
2. `POST /api/auth/native/google` `{ serverAuthCode }` or `{ idToken }`
3. Backend validates with Google (aud allowlist = web + iOS client IDs)
4. Upsert User by email → opaque one-time `grant` (TTL 120s, single use)
5. WebView: `signIn("native-google", { grant })` → NextAuth JWT cookie

Web Google OAuth (browser) unchanged.

## Vercel env (Etapa A deploy)

| Var | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | Web Client ID above (verify matches Vercel today) |
| `GOOGLE_CLIENT_SECRET` | existing secret (never paste in chat) |
| `GOOGLE_IOS_CLIENT_ID` | iOS Client ID above |
| `NATIVE_GOOGLE_AUTH_ENABLED` | `true` when ready to accept native grants |

Optional for Etapa B binary:
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Web Client ID
- `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` = iOS Client ID

## Still needed from you

1. Confirm Vercel `GOOGLE_CLIENT_ID` **equals** Web ID above (if different, say which is prod)
2. Confirm Google Console reversed scheme matches iOS one above
3. Say **deploy Etapa A** → push/PR + Vercel env + flag on

## Out of scope (Etapa A)

No Capgo plugin, no Info.plist change, no Codemagic, no login UI swap.
Old TestFlight keeps Browser OAuth until Etapa B.
