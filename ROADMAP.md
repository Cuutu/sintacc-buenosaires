# Roadmap - SinTACC BSAS

## Fase 1 - MVP ✅ COMPLETADO

### Características implementadas:
- ✅ Mapa interactivo con Mapbox
- ✅ Búsqueda y filtros (tipo, barrio, tags)
- ✅ Sistema de reseñas con rate limiting (3/día)
- ✅ Sugerencias de lugares con aprobación admin
- ✅ Panel de administración
- ✅ Autenticación con Google (NextAuth)
- ✅ API completa con validación Zod
- ✅ Rate limiting con MongoDB
- ✅ Sanitización de inputs
- ✅ Seed script con datos de ejemplo

## Fase 2 - Diferenciación 🚧 SCAFFOLDED

### Características preparadas (requieren implementación completa):

#### 1. Nivel de Seguridad
- ✅ Modelo Place con campo `safetyLevel`
- ✅ Componente `SafetyBadge` creado
- ⚠️ Pendiente: UI completa y lógica de cálculo automático

#### 2. Fotos Reales
- ✅ Modelo Review con campo `evidencePhotos`
- ⚠️ Pendiente: Upload a Cloudinary en formulario de reseñas
- ⚠️ Pendiente: Galería de fotos en detalle de lugar
- ⚠️ Pendiente: Moderación de fotos

#### 3. "Cerca Mío"
- ✅ Endpoint `/api/places/near` creado
- ✅ Índice geoespacial en Place
- ⚠️ Pendiente: UI para solicitar geolocalización
- ⚠️ Pendiente: Integración en página de mapa

#### 4. Favoritos
- ✅ Modelo Favorite creado
- ✅ API completa (`/api/favorites`)
- ✅ Componente `FavoriteButton` creado
- ✅ Página `/favoritos` creada
- ⚠️ Pendiente: Integrar botón en todas las cards

#### 5. Verificado por Comunidad
- ✅ Función `calculateCommunityConfidenceScore` creada
- ⚠️ Pendiente: Mostrar score en UI
- ⚠️ Pendiente: Badge "Verificado por X usuarios"

#### 6. Frescura / Última Confirmación
- ✅ Campo `lastConfirmedAt` en Place
- ✅ Actualización automática en reviews con `safeFeeling: true`
- ⚠️ Pendiente: Mostrar "Actualizado hace..." en UI

### Para activar Fase 2:
1. Configurar `FEATURES=phase1,phase2` en `.env.local`
2. Completar implementaciones marcadas con ⚠️
3. Testing completo de nuevas features

## Fase 3 - Growth 🚧 SCAFFOLDED

### Características preparadas (requieren implementación completa):

#### 1. Gamificación
- ✅ Interfaces `IPointsEvent` y `IBadge` definidas
- ⚠️ Pendiente: Modelos Mongoose para PointsEvent y Badge
- ⚠️ Pendiente: Sistema de puntos (reseña = +10, sugerencia = +25, foto = +5)
- ⚠️ Pendiente: Badges automáticos ("Top colaborador del mes", "Explorador Palermo")
- ⚠️ Pendiente: Página `/perfil` con puntos y badges

#### 2. PWA
- ⚠️ Pendiente: Instalar `next-pwa`
- ⚠️ Pendiente: Configurar `manifest.json`
- ⚠️ Pendiente: Íconos para diferentes tamaños
- ⚠️ Pendiente: Service worker para cache offline
- ⚠️ Pendiente: Cache de `/mapa` y lugares consultados

#### 3. SEO Serio
- ⚠️ Pendiente: Páginas dinámicas `/barrio/[neighborhood]`
- ⚠️ Pendiente: Páginas dinámicas `/tipo/[type]`
- ⚠️ Pendiente: `sitemap.xml` generado dinámicamente
- ⚠️ Pendiente: `robots.txt`
- ⚠️ Pendiente: Meta tags OpenGraph por lugar
- ⚠️ Pendiente: Schema.org LocalBusiness en `/lugar/[id]`

#### 4. Reportes / Moderación Avanzada
- ✅ Interface `IReport` definida
- ⚠️ Pendiente: Modelo Mongoose para Report
- ⚠️ Pendiente: API para crear reportes
- ⚠️ Pendiente: Cola de reportes en admin
- ⚠️ Pendiente: Acciones rápidas (ocultar, eliminar, ignorar)

#### 5. Analytics
- ⚠️ Pendiente: Integrar Vercel Analytics o PostHog
- ⚠️ Pendiente: Tracking de búsquedas
- ⚠️ Pendiente: Tracking de clicks en lugares
- ⚠️ Pendiente: Dashboard de analytics en admin

### Para activar Fase 3:
1. Configurar `FEATURES=phase1,phase2,phase3` en `.env.local`
2. Completar todas las implementaciones marcadas con ⚠️
3. Testing completo y optimización

## Próximos Pasos Recomendados

1. **Testing**: Agregar más tests unitarios y E2E
2. **Performance**: Optimizar queries de MongoDB, agregar caché
3. **UX**: Mejorar feedback visual, loading states, error handling
4. **Accesibilidad**: Agregar ARIA labels, navegación por teclado
5. **Internacionalización**: Preparar para múltiples idiomas si es necesario

## Notas Técnicas

- Los feature flags están en `lib/features.ts`
- Los modelos de Fase 2 y 3 están scaffolded pero pueden necesitar ajustes
- Las APIs de Fase 2 y 3 retornan 403 si la feature no está activa
- El código está preparado para escalar sin romper la funcionalidad existente
