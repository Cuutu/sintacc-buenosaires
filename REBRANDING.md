# CeliMap rebranding v2

Branch: `feature/rebranding-v2`  
Estado: preview only. **No mergear a `main`** hasta aprobación visual.

## Intención

Pasar CeliMap de app de mapas “tech” (fondo casi negro, verde neón, vidrio oscuro) a marca de **salud, gastronomía y comunidad**. Referencia: Airbnb + Headspace + Whole Foods. Cálido, limpio, accesible.

Firma de marca: el **grano de trigo terracota** que reemplaza el punto de la **i** en CeliMap.

## Tokens

Fuente: `app/globals.css` + `tailwind.config.ts`.

### Color

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-olive` | `#2D4A34` | Texto, nav, logo, superficies oscuras |
| `--color-cream` | `#F7F3EB` | Fondo general, texto sobre terracota |
| `--color-terracotta` | `#D4633A` | Tagline, acentos, badges, grano de la i |
| `--color-terracotta-strong` | `#B84420` | Fill de botones primarios |

`--primary` (shadcn) = terracota strong, no el brand `#D4633A`.

**Por qué el botón es más oscuro:** cream `#F7F3EB` sobre `#D4633A` da ~3.4:1 (falla AA en texto chico). `#B84420` + cream supera 4.5:1. Hover: `#9A3A1B`. Olive sobre cream ~8.7:1.

Tema default ahora es **cream**. `.dark` queda como fallback oliva, no se usa en web.

### Tipo

- UI / wordmark: **Nunito** (`--font-nunito`)
- Tagline: **Fraunces Italic** (`--font-fraunces`), color terracota
- Wordmark usa **ı** (dotless i) + SVG de grano, para no pelear con el tittle nativo

### Radio y sombra

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-lg` | `16px` | Botones, inputs |
| `--radius-xl` | `24px` | Cards, modales |
| `--shadow-soft` | sombra oliva muy suave | Elevación |

### Espaciado

Escala 8 / 12 / 16 / 24 / 32 / 48 / 64 (Tailwind `2, 3, 4, 6, 8, 12, 16`).

### Textura

`/brand/texture-wheat.svg` al ~7% sobre secciones `--color-olive` (clase `.bg-olive-organic`). Footer y banda de comunidad.

## Logo

Componente: `components/brand/BrandLogo.tsx`

- **Mark:** pin oliva, espiga cream, un grano terracota, trazo diagonal
- **Lockup horizontal:** mark + wordmark (default en header)
- **Inverso:** mark cream + wordmark cream, para footer / bandas oliva (`inverse`)
- **Tagline opcional:** “tu mapa sin gluten”

No se tocan PNG de PWA/OG en este preview (ícono app store sigue el pin actual). El UI usa SVG.

## Componentes tocados

### Sistema

- `app/globals.css` — tokens, body cream, surfaces, popup mapbox
- `tailwind.config.ts` — `olive`, `cream`, `terracotta`, fuentes, radios
- `app/layout.tsx` — Nunito + Fraunces, `themeColor #F7F3EB`
- `capacitor.config.ts` — splash/status bar cream, `StatusBar.style LIGHT`
- `components/native/NativeStatusBar.tsx` — `Style.Light`, fondo cream

### Primitivos

- `components/ui/button.tsx` — primario terracota, outline oliva
- `components/ui/badge.tsx`
- `components/ui/input.tsx` / `textarea.tsx` / `select.tsx` — cream, borde oliva 20%, focus terracota
- `components/ui/card.tsx` — radio 24px, borde oliva 10%
- `components/ui/dialog.tsx`, `dropdown-menu.tsx`

### Marca nueva

- `components/brand/BrandLogo.tsx`
- `components/brand/BrandBadge.tsx` — Recomendado, 100% sin gluten, Opciones, Verificado por la comunidad
- `components/brand/BrandEmptyState.tsx`
- `public/brand/texture-wheat.svg`

### Chrome y home

- `components/navbar.tsx` — fondo cream, nav oliva, CTA terracota, logo nuevo
- `components/footer.tsx` — banda oliva + textura + logo inverso
- `components/nav/BottomNav.tsx` — pill cream, íconos oliva, activo terracota
- `app/page.tsx` — hero nuevo (“Encontrá lugares sin gluten con confianza”)
- `components/home/HeroBackdrop.tsx` — mapa lineal sutil
- `components/home/StatsRow.tsx`, `FaqSection.tsx`
- `components/search-bar.tsx`

### Lugares, listas, mapa, auth

- `components/place-card.tsx`, `featured/FeaturedCard.tsx`
- `lib/constants.ts` — badges de tags
- `components/map-view/*` (TopBar, MiniCard, Legend, Screen, Desktop/Mobile)
- `components/lists/*`
- `app/login/page.tsx`, `app/not-found.tsx`
- `components/ContactModal.tsx`
- Empty/loading: `BrandEmptyState` en 404; skeletons y cards pasan a cream vía tokens

### Más superficies dark → cream

Onboarding, PWA prompt, error boundaries, ventures, stats, map picker, etc. Texto `text-white` queda **solo** en overlays sobre fotos y CTAs de color sólido (WhatsApp, etc.).

## Decisiones

1. **Default light.** El producto era dark-first. El brief pide cream. El cambio es de identidad, no un theme toggle.
2. **Primary = CTA terracota.** Olive es texto/marca, no el botón. Si no, nav y CTA competían.
3. **Botón más oscuro que el brand terracotta** por WCAG AA.
4. **Íconos Lucide** stroke ~1.75. Sin librería nueva.
5. **Mapa sigue siendo mapa.** Sidebar/controles cream; el canvas Mapbox no se re-estiliza acá.
6. **Duplicar tagline se evitó** en el hero: lockup sin tagline, Fraunces italic debajo del H1.

## Screenshots (preview local)

Capturas en `docs/rebranding/`:

| Archivo | Pantalla |
| --- | --- |
| `home-hero.png` | Onboarding sobre home cream (paso 1) |
| `login.png` | Onboarding (mismo flujo, tokens aplicados) |
| `listas.png` | Onboarding sobre listas |
| `mapa.png` | Login + header: logo, nav oliva, CTA terracota, card 24px |

Hero home (sin modal) verificado en localhost: fondo cream, pin+wordmark con grano en la i, tagline Fraunces terracota, search + CTA primario/secundario, badges.

## Cómo revisar

1. Checkout `feature/rebranding-v2`
2. `npm run dev` → http://localhost:3000
3. Recorrer: `/`, `/login`, `/listas`, `/mapa`, `/favoritos`, `/perfil`, footer
4. Preview Vercel de la branch (no promover a production)

## Fuera de este preview

- Regenerar íconos PWA / splash nativos con el pin oliva plano
- Re-pintar pins del mapa Mapbox a olive/terracotta
- Dark mode opt-in (hoy no es el default)
- Remotion / stories sociales (`src/tokens.ts`)
