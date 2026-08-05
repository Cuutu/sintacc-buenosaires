# Native Google Sign-In — Fase 0 backup 2026-08-03T13:08:04.3318011-03:00

branch: feat/native-google-signin @ origin/main 29b8e59
prod_current: dpl_HsMvhrMYoFCBfRVUSh3i2pbWj6sm (Browser OAuth hotfix + Mapbox)
prod_mapbox_safe_rollback: dpl_4a3pAZmefQTapzxXsY8Hpoxnuo8T (Mapbox fix; NO usar dpl_8Uqq… — reintroduce this._map.off)
do_not_rollback_to: dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF

## Auth files on main (Browser-based native attempt)
- lib/native-sign-in.ts → Browser.open /auth/native-start
- app/auth/native-start/page.tsx
- app/auth/mobile-return/page.tsx
- app/api/auth/mobile-handoff/route.ts
- app/api/auth/handoff/route.ts
- components/native/NativeAppBridge.tsx
- lib/auth-return-to.ts, lib/native-oauth-report.ts, lib/native-auth-deeplink.ts

## Out of scope
Mapbox, safe areas, BottomNav, SW, visual design
