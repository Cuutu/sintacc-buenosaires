# SinTACC BSAS

Plataforma web para encontrar lugares sin TACC (sin gluten) en Buenos Aires. Una comunidad donde celíacos comparten lugares seguros, reseñas y experiencias.

**Repositorio:** [github.com/Cuutu/sintacc-buenosaires](https://github.com/Cuutu/sintacc-buenosaires)

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Backend**: Next.js API Routes + Server Actions
- **Base de Datos**: MongoDB Atlas (Mongoose)
- **Autenticación**: NextAuth.js (Google OAuth)
- **Mapas**: Mapbox GL
- **Imágenes**: Cloudinary
- **Deploy**: Vercel

## 📋 Características

### Fase 1 (MVP) ✅
- Mapa interactivo con lugares sin TACC
- Búsqueda y filtros (tipo, barrio, tags)
- Sistema de reseñas con rate limiting (3/día)
- Sugerencias de lugares (requiere aprobación admin)
- Panel de administración
- Autenticación con Google

### Fase 2 (Scaffolded) 🚧
- Nivel de seguridad (dedicated_gf, gf_options, etc.)
- Fotos en reseñas
- "Cerca mío" con geolocalización
- Favoritos
- Score de confianza de la comunidad
- Frescura de información

### Fase 3 (Scaffolded) 🚧
- Gamificación (puntos y badges)
- PWA (instalable, offline)
- SEO avanzado (sitemap, schema.org)
- Sistema de reportes avanzado
- Analytics

## 🛠️ Setup Local

### Prerrequisitos

- Node.js 18+ y npm/yarn
- Cuenta de MongoDB Atlas (gratuita)
- Cuenta de Google Cloud (para OAuth)
- Token de Mapbox (gratuito)
- Cuenta de Cloudinary (gratuita)

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd sintacc-bsas
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/sintacc-bsas?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-random-aqui-genera-uno-con-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi...

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Admin emails (separados por coma)
ADMIN_EMAILS=admin@ejemplo.com,otro@ejemplo.com

# Feature flags (opcional, default: phase1)
FEATURES=phase1,phase2,phase3
```

4. **Ejecutar seed de datos**

```bash
npm run seed
```

5. **Iniciar servidor de desarrollo**

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
sintacc-bsas/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── admin/             # Panel admin
│   ├── lugar/             # Detalle de lugar
│   ├── mapa/              # Mapa interactivo
│   ├── sugerir/           # Formulario sugerir lugar
│   └── login/             # Página de login
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   ├── map.tsx           # Componente Mapbox
│   └── ...
├── lib/                   # Utilidades y configuraciones
│   ├── mongodb.ts        # Conexión MongoDB
│   ├── auth.ts           # Config NextAuth
│   ├── features.ts       # Feature flags
│   └── ...
├── models/                # Modelos Mongoose
│   ├── Place.ts
│   ├── Review.ts
│   ├── Suggestion.ts
│   └── User.ts
├── scripts/               # Scripts utilitarios
│   └── seed.ts           # Seed de datos
├── data/                  # Datos de ejemplo
│   └── places.seed.json
└── public/               # Archivos estáticos
```

## 🔐 Seguridad

- **Rate Limiting**: Máximo 3 reseñas por día por usuario
- **Validación**: Zod schemas en todas las APIs
- **Sanitización**: HTML escapado en comentarios
- **Autenticación**: NextAuth con Google OAuth
- **Autorización**: Middleware para rutas admin
- **Protección CSRF**: Next.js built-in

## 🧪 Testing

```bash
npm test
```

Tests básicos incluidos para:
- Creación de reseñas
- Filtros de lugares
- Aprobación de sugerencias (admin)

## 🚀 Deploy en Vercel

1. **Conectar repositorio a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Importa tu repositorio

2. **Configurar variables de entorno**
   - Agrega todas las variables de `.env.local` en el dashboard de Vercel
   - Asegúrate de actualizar `NEXTAUTH_URL` con tu dominio de Vercel

3. **Deploy automático**
   - Vercel detectará Next.js automáticamente
   - El build se ejecutará en cada push a `main`

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter
- `npm run seed` - Ejecutar seed de datos
- `npm test` - Ejecutar tests

## 🎯 Feature Flags

Controla qué fases están activas con la variable `FEATURES`:

```env
FEATURES=phase1              # Solo MVP
FEATURES=phase1,phase2       # MVP + Fase 2
FEATURES=phase1,phase2,phase3 # Todas las fases
```

## 📊 Modelos de Datos

### Place
- Información del lugar (nombre, dirección, coordenadas)
- Tags (certificado_sin_tacc, 100_gf, cocina_separada, etc.)
- Contacto (Instagram, WhatsApp, teléfono, URL)
- Fotos (máx 3 en fase 1)
- Status (approved/pending)

### Review
- Rating (1-5)
- safeFeeling (boolean)
- separateKitchen (yes/no/unknown)
- Comentario (máx 800 caracteres)
- Status (visible/hidden)

### Suggestion
- Place draft (mismos campos que Place)
- Usuario que sugiere
- Status (pending/approved/rejected)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👥 Autores

- Tu nombre aquí

## 🙏 Agradecimientos

- Comunidad celíaca de Buenos Aires
- shadcn/ui por los componentes
- Next.js team

---

**Nota**: Este es un MVP. Las fases 2 y 3 están scaffolded pero no completamente implementadas. Actívalas con feature flags cuando estén listas.
