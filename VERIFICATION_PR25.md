# PR #25 Verification Guide

## Commit SHA: `2d4c694a84b8b7e30715d99c5c288ab92a48e94c`

---

## 1. Verify deployment serves correct commit

### Method A: Check Vercel deployment (if using Vercel)
1. Go to PR #25 on GitHub: https://github.com/Cuutu/sintacc-buenosaires/pull/25
2. Find the Vercel preview comment (posted by vercel[bot])
3. Preview URL should be in format: `https://sintacc-buenosaires-<hash>-cuutu.vercel.app`
4. Click "Visit Preview" link
5. In browser DevTools Console, run:
   ```javascript
   // Check git SHA if exposed
   fetch('/api/health').then(r => r.json()).then(console.log)
   // Or check build timestamp
   document.querySelector('meta[name="build-time"]')?.content
   ```

### Method B: Code inspection in Sources tab
1. Open preview URL
2. DevTools → Sources → Ctrl+P (Cmd+P on Mac)
3. Type `analytics-client` → open `analytics-client.ts`
4. Search for `[analytics-flush]` log strings
5. If present with "flushing", "queue empty", "fetch failed" → **correct build ✅**
6. If absent → stale deployment ❌

### Method C: Network timing proof
1. Vercel deployment header: check `x-vercel-deployment-id` in any request
2. Match against Vercel dashboard deployment list for PR branch

---

## 2. Verify Compartir button calls handleShare

### Map sheet (MobileMapBottomSheet / DesktopMapPopover):

#### Mobile:
1. Open preview on mobile viewport (or DevTools device emulation)
2. Click map to select a place
3. Sheet slides up (auto-expanded to show CTAs)
4. In expanded state, see "Compartir" button next to "Cómo llegar"
5. **Before clicking**: Open DevTools Console
6. Click "Compartir"
7. **Console should show** (if NODE_ENV !== production):
   ```
   [analytics-flush] flushing 1 events: ['place_share']
   ```
8. OS share dialog opens
9. Cancel or complete → analytics already sent

#### Desktop:
1. Open preview on desktop viewport
2. Click map marker
3. Popover appears with place info
4. See "Compartir" button in bottom row (next to "Cómo llegar" + favorite)
5. Open Console
6. Click "Compartir"
7. Console: `[analytics-flush] flushing 1 events: ['place_share']`

### Place detail page (PlacePrimaryActions / PlaceHeroChrome):

#### PlacePrimaryActions (below place info):
1. Navigate to `/lugar/[placeId]` (e.g. click "Ver ficha completa" from map sheet)
2. Scroll to primary actions section
3. See grid with "Guardar" and "Compartir" buttons
4. Console open
5. Click "Compartir"
6. Console: `[analytics-flush] flushing 1 events: ['place_share']`

#### PlaceHeroChrome (floating header, mobile only):
1. Mobile viewport on `/lugar/[placeId]`
2. See floating header with back button, share icon, favorite icon
3. Share icon = floating circle button top-right
4. Console open
5. Tap share icon
6. Console: `[analytics-flush] flushing 1 events: ['place_share']`

---

## 3. Verify Network POST with place_share payload

### Setup:
1. DevTools → Network tab
2. Filter: `analytics` or `api/analytics/events`
3. Clear existing requests
4. **Keep DevTools open** (important for keepalive fetch)

### Click Compartir:
1. Click any Compartir button (see section 2)
2. **Timeline**: Within ~10-50ms, see new request row:
   - **Name**: `events`
   - **Method**: `POST`
   - **Type**: `fetch` or `xhr` (NOT sendBeacon unless fetch failed)
   - **Status**: `204` (no content response = success)
   - **Size**: ~400-800 bytes (depends on payload)

### Inspect payload:
1. Click the `events` request row
2. Go to "Payload" or "Request" tab
3. Should see JSON body:
   ```json
   {
     "events": [
       {
         "name": "place_share",
         "props": {
           "placeId": "507f1f77bcf86cd799439011",
           "surface": "map_sheet"  // or "place_detail"
         },
         "distinctId": "...",
         "platform": "web",
         "authenticated": false,
         "ts": 1726729200000,
         "source": "direct",
         "medium": "none",
         "campaign": "",
         "referrerHost": "",
         "entryPath": "/mapa",
         "appVersion": "..."
       }
     ]
   }
   ```

4. **Key checks**:
   - ✅ `name: "place_share"` present
   - ✅ `props.surface` present (was missing in allowlist before)
   - ✅ `props.placeId` present
   - ✅ Status 204 (not 4xx/5xx)
   - ✅ Timing: POST completes **before** OS share dialog opens

### If NO POST appears:

#### Check console errors:
- `[analytics-flush] queue empty` → trackEvent didn't enqueue (check FIRST_PARTY_EVENTS)
- `[analytics-flush] fetch failed: ...` → network/CORS issue
- No logs at all → NODE_ENV is production (logs suppressed) OR build is stale

#### Check button is clickable:
1. DevTools → Elements → Inspect Compartir button
2. Check CSS:
   - `pointer-events: none` → overlay blocking ❌
   - `z-index` lower than overlay → covered ❌
   - `display: none` or `visibility: hidden` → not visible ❌
3. Add click listener test:
   ```javascript
   // In console
   document.querySelector('button').addEventListener('click', () => {
     console.log('BUTTON CLICKED')
   })
   ```
   Then click button. If no log → button not receiving events.

#### Check FIRST_PARTY_EVENTS allowlist:
1. DevTools → Console
2. Run:
   ```javascript
   // Inline check (only works if analytics-catalog imported)
   import('@/lib/analytics-catalog').then(m => {
     console.log('place_share in FIRST_PARTY:', m.FIRST_PARTY_EVENTS.has('place_share'))
     console.log('surface in ALLOWED_PROPS:', m.ALLOWED_EVENT_PROP_KEYS.has('surface'))
   })
   ```
3. Both should be `true`

---

## 4. Root causes fixed

### Root cause 1 (initial bug report):
**Problem**: Analytics only fired AFTER `await navigator.share()` succeeded  
**Impact**: User cancel → no analytics → no useful_discovery  
**Fix**: Move `trackEvent` + `recordCommitment` BEFORE `navigator.share()`  
**Commit**: `c113a93` + `119e489`

### Root cause 2 (runtime smoke fail):
**Problem**: `trackEvent` enqueues with 400ms flush timer; `navigator.share()` suspends JS  
**Impact**: Cancel <400ms → event never sent  
**Fix**: Call `flushFirstPartyQueue(false)` after analytics, before share  
**Commit**: `8930191`

### Root cause 3 (preview still no POST):
**Problem**: `surface` property not in `ALLOWED_EVENT_PROP_KEYS` → server drops prop  
**Impact**: Event may be rejected if all props invalid (or just missing surface in DB)  
**Fix**: Add `surface` + `placeName` to allowlist  
**Commit**: `2d4c694`

### Root cause 4 (debugging impossible):
**Problem**: All errors in `flushFirstPartyQueue` silently swallowed  
**Impact**: Can't tell if fetch fails, queue empty, or allowlist blocking  
**Fix**: Add console.log in dev mode (NODE_ENV !== production)  
**Commit**: `2d4c694`

---

## 5. Expected behavior after fix

### User flow:
1. User clicks Compartir
2. `trackEvent("place_share", { placeId, surface })` enqueues event
3. `recordCommitment("place_share", placeId)` records for UD minting
4. `flushFirstPartyQueue(false)` immediately POSTs to `/api/analytics/events`
5. Server validates → `place_share` in allowlist ✅ → `surface` in prop keys ✅ → saves to Mongo
6. Fetch completes (~50-100ms)
7. `navigator.share()` opens OS dialog (~200ms from click)
8. User cancels OR completes → **analytics already in DB** ✅

### Smoke test PASS:
- ✅ Intent: `search_performed` fires
- ✅ Dwell: `place_dwell_qualified` fires after 8s
- ✅ Share tap ×2: `place_share` POST visible in Network
- ✅ UD: `useful_discovery` mints with `commitmentType: "place_share"`

---

## 6. Deployment checklist

Before merging (DO NOT MERGE per user):
- [ ] Verify preview URL serves commit `2d4c694`
- [ ] Test Compartir on map sheet (mobile + desktop)
- [ ] Test Compartir on place detail (primary actions + hero)
- [ ] Confirm POST visible in Network with `surface` prop
- [ ] Confirm console logs in dev mode (if applicable)
- [ ] Confirm Status 204 (not 4xx/5xx)
- [ ] Test cancel flow (analytics still sent)
- [ ] Test complete flow (analytics sent once, not duplicated)

After analytics verification:
- [ ] Check Mongo `product_events` collection for `place_share` docs
- [ ] Verify `props.surface` persisted (not stripped)
- [ ] Run UD minting query to confirm commitment recognized
