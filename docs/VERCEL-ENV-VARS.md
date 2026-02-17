# Variables de entorno para Vercel

Usá esta lista para completar la sección **Environment Variables** en tu proyecto de Vercel.

**Importante:** Reemplazá cada valor con tus datos reales. No subas este archivo con secretos; es solo una guía.

---

## Lista para agregar en Vercel

Agregá **cada fila** como una variable (Key = nombre, Value = tu valor).

| Key | Dónde conseguirlo | Ejemplo de valor |
|-----|-------------------|------------------|
| `MONGODB_URI` | MongoDB Atlas → Cluster → Connect → Connection string | `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/sintacc-bsas?retryWrites=true&w=majority` |
| `NEXTAUTH_URL` | **Tu URL de Vercel** (ej. después del primer deploy) | `https://sintacc-buenosaires.vercel.app` |
| `NEXTAUTH_SECRET` | Generar uno random (ver abajo) | Una string larga aleatoria |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Mismo lugar que el anterior | Valor que te da Google |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Account → Access tokens | `pk.eyJ1Ijoi...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard | Tu cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary Dashboard → API Keys | Número |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard → API Keys | String secreta |
| `ADMIN_EMAILS` | Emails que serán admin (separados por coma) | `tu@email.com,otro@email.com` |
| `CONTACT_EMAIL` | Email donde llegan las consultas del formulario | `tu-email@ejemplo.com` |
| `RESEND_API_KEY` | API key de Resend | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_DOMAIN` | Remitente (uso pruebas: `onboarding@resend.dev`) | `onboarding@resend.dev` |
| `FEATURES` | Opcional. Fases activas | `phase1` o `phase1,phase2` |

---

## Orden sugerido al cargar

1. **MONGODB_URI** – Sin esto la app no conecta a la base.
2. **NEXTAUTH_URL** – Primera vez podés poner `https://tu-proyecto.vercel.app` (el nombre que tenga el proyecto en Vercel).
3. **NEXTAUTH_SECRET** – Generalo con: `openssl rand -base64 32` (en Git Bash o WSL) o [generador online](https://generate-secret.vercel.app/32).
4. **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** – Para login con Google.
5. **NEXT_PUBLIC_MAPBOX_TOKEN** – Para que funcione el mapa.
6. **CLOUDINARY_*** – Para fotos (si no usás fotos aún, podés dejarlas con valores de prueba y configurar bien después).
7. **ADMIN_EMAILS** – Emails que pueden entrar al panel admin.
8. **CONTACT_EMAIL** – Email donde llegan las consultas del formulario de contacto (ej. `tu-email@ejemplo.com`).
9. **RESEND_API_KEY** y **RESEND_FROM_DOMAIN** – Para que las consultas de contacto lleguen por email. Creá una cuenta en [resend.com](https://resend.com), generá una API key y usá `onboarding@resend.dev` como FROM para pruebas.
10. **FEATURES** – Opcional; si no lo ponés, se usa `phase1`.

---

## Después del primer deploy

1. En Google Cloud Console, en la configuración del OAuth, agregá en **Authorized redirect URIs**:
   - `https://TU-DOMINIO.vercel.app/api/auth/callback/google`
2. Si cambiaste el dominio de Vercel, actualizá **NEXTAUTH_URL** con la URL final.

---

## Import .env en Vercel

Si ya tenés un `.env.local` en tu PC (solo con valores de desarrollo):

- **No** importes ese archivo tal cual en Vercel si tiene datos sensibles.
- Podés usar **Import .env** pegando **solo las keys** y luego completar los **values** en Vercel con los valores de **producción** (por ejemplo otra URI de MongoDB o el NEXTAUTH_URL de Vercel).

Ejemplo de qué pegar (solo nombres, sin valores reales):

```
MONGODB_URI=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_MAPBOX_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAILS=
CONTACT_EMAIL=
RESEND_API_KEY=
RESEND_FROM_DOMAIN=onboarding@resend.dev
FEATURES=phase1
```

Luego editás cada una en Vercel y completás el valor.
