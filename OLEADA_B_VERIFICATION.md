# Verificación Oleada B: Trust Links

## Resumen implementación

✅ **Completado**: Páginas `/contacto` y `/sobre-nosotros` con links rastreables en footer home

## Archivos modificados

```
app/contacto/page.tsx         (nuevo)
app/sobre-nosotros/page.tsx   (nuevo)
components/footer.tsx         (actualizado)
app/sitemap.ts                (actualizado)
```

## Cambios clave

### 1. Página /contacto
- Email principal: `contacto@celimap.com.ar` (clickeable como mailto:)
- Patrón InstitutionalPage con FAQs
- Metadata completa (canonical, OG, Twitter)
- JSON-LD: WebPage + BreadcrumbList + FAQPage
- Copy honesta: no inventa teléfono, dirección, CUIT

### 2. Página /sobre-nosotros
- Descripción usando `CELIMAP_DESCRIPTION` + `CELIMAP_SAFETY_DISCLAIMER`
- Links a páginas existentes (que-es-celimap, como-funciona, etc.)
- Sin bios inventados ni claims falsos de verificación
- Mismo patrón InstitutionalPage

### 3. Footer rastreable (CRÍTICO para microaudit)

**ANTES** (línea 164-171 footer.tsx):
```tsx
<ContactFooterButton className={linkClass} />  // ⚠️ Modal sin href
<Link href="/privacidad">Privacidad</Link>
<Link href="/terminos">Términos</Link>
```

**AHORA** (línea 162-173):
```tsx
<Link href="/contacto">Contacto</Link>          // ✅ href rastreable
<Link href="/sobre-nosotros">Sobre nosotros</Link>  // ✅ href rastreable
<Link href="/privacidad">Privacidad</Link>
<Link href="/terminos">Aviso legal</Link>       // ✅ "Aviso legal" label
```

### 4. Navegación footer
INFO_LINKS ahora incluye "Sobre nosotros" (línea 19):
```tsx
{ href: "/sobre-nosotros", label: "Sobre nosotros" },
```

### 5. Sitemap
Entries agregados (app/sitemap.ts líneas 84-93):
```tsx
entry(`${base}/contacto`, { priority: 0.6, changeFrequency: "monthly" })
entry(`${base}/sobre-nosotros`, { priority: 0.7, changeFrequency: "monthly" })
```

## Verificación post-deploy

### URLs deben responder 200
```bash
curl -I https://www.celimap.com.ar/contacto
curl -I https://www.celimap.com.ar/sobre-nosotros
```

### Footer home debe contener hrefs rastreables
```bash
curl https://www.celimap.com.ar/ | grep -E 'href="/contacto"|href="/sobre-nosotros"|Aviso legal'
```

Espera output:
```html
<a href="/contacto" ...>Contacto</a>
<a href="/sobre-nosotros" ...>Sobre nosotros</a>
<a href="/terminos" ...>Aviso legal</a>
```

### Sitemap incluye páginas nuevas
```bash
curl https://www.celimap.com.ar/sitemap.xml | grep -E 'contacto|sobre-nosotros'
```

### Email visible en /contacto
```bash
curl https://www.celimap.com.ar/contacto | grep -o "contacto@celimap.com.ar"
```

## Patterns reutilizados

✅ **InstitutionalPage** (components/seo/InstitutionalPage.tsx)  
✅ **buildWebPageJsonLd** para JSON-LD  
✅ **Brand constants** (lib/seo/brand.ts): `CELIMAP_NAME`, `CELIMAP_DESCRIPTION`, `CELIMAP_SAFETY_DISCLAIMER`  
✅ **getBaseUrl** para canonical URLs  
✅ **Metadata pattern** de que-es-celimap/page.tsx  

## Out of scope (según brief)

- ❌ WebMCP
- ❌ BreadcrumbList en home
- ❌ Reescritura FAQ accordion
- ❌ Schema mentions polish
- ❌ Content Signals
- ❌ Tests masivos (repo no tiene test suite para institutional pages)

## PR

https://github.com/Cuutu/sintacc-buenosaires/pull/18

Branch: `cursor/oleada-b-trust-links-2136`
Base: `main`
