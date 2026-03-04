# Plan de Mejoras SEO - Celimap

**Objetivo:** Mejorar el posicionamiento en Google y atraer más usuarios mediante búsquedas típicas relacionadas con celiaquía, lugares sin gluten y mapa para celíacos en Argentina.

---

## Estado actual (resumen)

El proyecto ya tiene una **base SEO sólida**:
- Sitemap dinámico
- Robots.txt configurado
- Metadata, Open Graph y Twitter cards
- JSON-LD (Organization, WebSite, FAQ, BreadcrumbList, ItemList)
- Páginas SEO por ciudad y categoría
- Canonical URLs
- Breadcrumbs

---

## Plan paso a paso

### FASE 1: Keywords y metadata (impacto alto)

#### Paso 1.1 — Ampliar keywords en el layout raíz
**Archivo:** `app/layout.tsx`

Las keywords actuales son buenas pero faltan variantes que la gente busca:
- Agregar: `"apto celíacos"`, `"donde comer sin gluten"`, `"mapa celíaco"`, `"restaurantes sin TACC"`, `"panaderías sin gluten"`, `"cafés aptos celíacos"`, `"sin gluten Buenos Aires"`, `"celíacos Argentina"`, `"lugares aptos celíacos"`, `"comida sin TACC"`

#### Paso 1.2 — Metadata específica para la home
**Archivo:** `app/page.tsx` (agregar `generateMetadata` o `metadata` export)

La home usa la metadata del layout. Conviene tener metadata explícita con:
- Título optimizado para "mapa para celíacos" + "lugares sin gluten"
- Descripción que incluya "Argentina", "Buenos Aires", "sin TACC"
- Open Graph específico para compartir en redes

#### Paso 1.3 — Mejorar metadata de páginas clave
**Archivos:** `app/mapa/layout.tsx`, `app/explorar/layout.tsx`, `app/sugerir/layout.tsx`

- **Mapa:** Incluir "mapa interactivo", "Buenos Aires", "Córdoba", "restaurantes sin gluten cerca"
- **Explorar:** Incluir "explorar lugares sin gluten", "cerca tuyo", "mejor valorados"
- **Sugerir:** Incluir "agregar lugar sin TACC", "sugerir restaurante celíaco", "comunidad celíaca"

---

### FASE 2: Schema y datos estructurados (impacto alto)

#### Paso 2.1 — Schema LocalBusiness en cada lugar
**Archivo:** Crear `components/seo/PlaceJsonLd.tsx` o agregar en `app/lugar/[id]/page.tsx`

Cada página de lugar (`/lugar/[id]`) debería tener su propio JSON-LD `LocalBusiness` con:
- `name`, `address`, `geo`, `url`, `image`
- `aggregateRating` si hay reseñas
- `priceRange`, `openingHours` si están disponibles
- `servesCuisine` o descripción de tipo

Esto mejora la visibilidad en resultados locales y rich snippets.

#### Paso 2.2 — Revisar ItemList en páginas de ciudad
**Archivo:** `components/seo/CityPageJsonLd.tsx`

- Verificar que `itemListElement` tenga hasta 10 ítems (ya está)
- Considerar agregar `name` al ItemList: "Lugares sin gluten en [ciudad]"

#### Paso 2.3 — Schema para la landing Argentina
**Archivo:** `app/sin-gluten-argentina/page.tsx`

Agregar `CollectionPage` o `ItemList` con las ciudades como ítems para reforzar la estructura.

---

### FASE 3: Contenido y long-tail keywords (impacto alto)

#### Paso 3.1 — Expandir contenido en la landing Argentina
**Archivo:** `app/sin-gluten-argentina/page.tsx`

Agregar:
- Bloque de texto SEO con H2/H3 para: "Lugares sin gluten en Argentina", "Restaurantes aptos celíacos", "Mapa de celíacos Argentina"
- FAQ breve (3–4 preguntas) con schema FAQPage
- Párrafos con keywords: "donde comer sin gluten", "restaurantes sin TACC", "panaderías sin gluten", "cafés aptos celíacos"

#### Paso 3.2 — Mejorar templates de títulos/descripciones
**Archivo:** `lib/seo/templates.ts`

- Incluir más variantes: "apto celíacos", "sin TACC", "donde comer"
- Ejemplo descripción ciudad: "Donde comer sin gluten en [ciudad]. Restaurantes, panaderías y cafés aptos celíacos verificados por la comunidad."

#### Paso 3.3 — Página home: más contenido SEO
**Archivo:** `app/page.tsx`

- Agregar sección con enlaces a ciudades principales (Buenos Aires, Córdoba, Rosario, etc.) con anchor text optimizado
- Ejemplo: "Restaurantes sin gluten en Buenos Aires", "Lugares sin TACC en Córdoba"

---

### FASE 4: Imágenes y Open Graph (impacto medio)

#### Paso 4.1 — Open Graph por lugar
**Archivo:** `app/lugar/[id]/layout.tsx`

En `generateMetadata`, agregar:
- `openGraph.images`: usar la primera foto del lugar si existe, sino el logo
- `openGraph.type: "website"`
- Mejorar `openGraph.title` y `description` con ciudad y tipo

#### Paso 4.2 — Corregir alt vacíos
**Archivos:** `app/listas/[id]/page.tsx`, `components/lists/ListCard.tsx`, `components/image-upload.tsx`

Reemplazar `alt=""` por descripciones útiles:
- ListCard: `alt={place.name || "Lugar sin gluten"}`
- Listas: `alt={lista.name || "Lista de lugares sin gluten"}`

#### Paso 4.3 — Imagen OG por defecto de mayor calidad
**Archivo:** `app/layout.tsx`

- Considerar imagen 1200x630 para redes (formato recomendado)
- Mantener el logo como fallback

---

### FASE 5: Sitemap y crawling (impacto medio)

#### Paso 5.1 — Incluir listas públicas en el sitemap
**Archivo:** `app/sitemap.ts`

Si hay listas públicas/curadas, agregarlas al sitemap con `changeFrequency: "weekly"` y `priority: 0.7`.

#### Paso 5.2 — Prioridades y changeFrequency
**Archivo:** `app/sitemap.ts`

Revisar:
- Home: `priority: 1`, `changeFrequency: "daily"` ✓
- `/sin-gluten-argentina`: `priority: 0.9` ✓
- Lugares individuales: `lastModified` desde DB ✓
- Considerar `priority` más alto para ciudades top (Buenos Aires, Córdoba, etc.)

#### Paso 5.3 — Canonical en paginación
**Archivo:** `app/sin-gluten/[ciudadSlug]/page.tsx` (y similares)

Cuando `page > 1`, definir canonical a la página paginada para evitar contenido duplicado:
- `canonical: ${BASE_URL}/sin-gluten/${ciudadSlug}?page=${page}`

---

### FASE 6: URLs y estructura (impacto medio-bajo)

#### Paso 6.1 — Redirects adicionales
**Archivo:** `next.config.js`

Considerar redirects para variantes comunes:
- `/mapa-celiacos` → `/mapa`
- `/restaurantes-sin-gluten` → `/restaurantes-sin-gluten` (ya existe como ruta)
- `/sin-gluten` → `/sin-gluten-argentina` (si alguien busca /sin-gluten)

#### Paso 6.2 — Internal linking
**Archivos:** Home, footer, navbar

- Footer: enlaces a "Lugares sin gluten en Buenos Aires", "Restaurantes sin gluten", "Mapa para celíacos"
- Home: enlaces claros a ciudades principales y categorías

---

### FASE 7: Técnico y rendimiento (impacto medio)

#### Paso 7.1 — Core Web Vitals
- Revisar LCP, FID, CLS con Lighthouse
- Imágenes: `sizes` y `loading="lazy"` donde corresponda
- Next.js Image ya optimiza; verificar que no falten `alt`

#### Paso 7.2 — Meta robots en páginas vacías
**Archivos:** Páginas de ciudad/categoría

Ya se usa `noindex` cuando `total === 0`. Mantener y extender a categorías sin resultados.

---

### FASE 8: Contenido adicional (opcional, largo plazo)

#### Paso 8.1 — Blog o guías
Crear sección `/guia` o `/blog` con artículos como:
- "Guía de restaurantes sin gluten en Buenos Aires"
- "Cómo elegir un restaurante seguro para celíacos"
- "Panaderías sin TACC recomendadas"

Cada artículo con metadata, schema Article, y enlaces internos.

#### Paso 8.2 — Páginas por barrio (Buenos Aires)
Para Buenos Aires, crear páginas tipo:
- `/sin-gluten/buenos-aires/palermo`
- `/sin-gluten/buenos-aires/recoleta`

Solo si hay suficientes lugares por barrio para justificar el contenido.

---

## Priorización sugerida

| Prioridad | Paso | Esfuerzo | Impacto |
|-----------|------|----------|---------|
| 1 | 1.1 Ampliar keywords | Bajo | Alto |
| 2 | 2.1 Schema LocalBusiness por lugar | Medio | Alto |
| 3 | 3.1 Expandir landing Argentina | Medio | Alto |
| 4 | 1.2 Metadata home | Bajo | Medio |
| 5 | 4.1 Open Graph por lugar | Bajo | Medio |
| 6 | 3.2 Mejorar templates | Bajo | Medio |
| 7 | 4.2 Alt vacíos | Bajo | Medio |
| 8 | 5.1 Listas en sitemap | Bajo | Medio |
| 9 | 5.3 Canonical paginación | Bajo | Medio |
| 10 | 3.3 Enlaces ciudades en home | Bajo | Medio |

---

## Búsquedas objetivo (keywords a capturar)

- mapa para celíacos
- mapa para celiacos (sin tilde)
- lugares sin gluten
- restaurantes sin gluten
- restaurantes sin gluten Buenos Aires
- restaurantes sin gluten Córdoba
- panaderías sin gluten
- cafés sin gluten
- donde comer sin gluten
- apto celíacos
- sin TACC
- mapa celíaco
- celíacos Argentina
- lugares aptos celíacos
- comida sin gluten
- restaurantes aptos celíacos Buenos Aires

---

## Herramientas recomendadas

- **Google Search Console:** Verificar el sitio, ver queries reales, indexación
- **Google Analytics 4:** Tráfico, conversiones, comportamiento
- **Lighthouse:** Core Web Vitals y SEO
- **Schema Markup Validator:** Validar JSON-LD
- **Rich Results Test:** Ver cómo se muestran los rich snippets

---

*Documento generado para el proyecto sintacc-bsas (Celimap).*
