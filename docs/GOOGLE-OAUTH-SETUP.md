# Cómo obtener GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

Pasos para crear las credenciales de Google OAuth (login con Google) para SinTACC BSAS.

---

## 1. Entrar a Google Cloud Console

- Abrí: **[console.cloud.google.com](https://console.cloud.google.com)**
- Iniciá sesión con la cuenta de Google que quieras usar para administrar el proyecto.

---

## 2. Crear o elegir un proyecto

- Arriba a la izquierda hacé clic en el nombre del proyecto (donde dice "Select a project" o el nombre actual).
- Clic en **"New Project"**.
- Nombre: por ejemplo **"SinTACC BSAS"**.
- Clic en **Create**.
- Esperá unos segundos y asegurate de que ese proyecto esté seleccionado (arriba a la izquierda).

---

## 3. Activar la API de Google+ (People API)

- En el menú de la izquierda: **APIs & Services** → **Library** (Biblioteca).
- Buscá **"Google+ API"** o **"People API"**.
- Entrá a **Google+ API** (o **People API**) y clic en **Enable** (Activar).

*(Para "Sign in with Google" a veces basta con configurar OAuth en la siguiente parte; si más adelante te pide otra API, la activás cuando aparezca el mensaje.)*

---

## 4. Configurar la pantalla de consentimiento OAuth

- Menú izquierdo: **APIs & Services** → **OAuth consent screen** (Pantalla de consentimiento).
- Elegí **External** (usuarios con cualquier cuenta de Google) → **Create**.
- Completá solo lo obligatorio:
  - **App name:** SinTACC BSAS
  - **User support email:** tu email
  - **Developer contact:** tu email
- Clic en **Save and Continue**.
- En **Scopes** (Permisos): **Save and Continue** sin agregar nada por ahora.
- En **Test users** (si aparece): **Save and Continue**.
- Clic en **Back to Dashboard**.

---

## 5. Crear las credenciales OAuth

- Menú izquierdo: **APIs & Services** → **Credentials** (Credenciales).
- Arriba: **+ Create Credentials** → **OAuth client ID**.
- **Application type:** **Web application**.
- **Name:** por ejemplo "SinTACC Web" o "SinTACC BSAS".
- En **Authorized JavaScript origins** agregá:
  - Para desarrollo local: `http://localhost:3000`
  - Para Vercel: `https://TU-PROYECTO.vercel.app`  
  (reemplazá `TU-PROYECTO` por el nombre real de tu app en Vercel).
- En **Authorized redirect URIs** agregá:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Vercel: `https://TU-PROYECTO.vercel.app/api/auth/callback/google`
- Clic en **Create**.

---

## 6. Copiar Client ID y Client Secret

- Se abre un cuadro con:
  - **Your Client ID** → ese valor es tu **GOOGLE_CLIENT_ID**.
  - **Your Client Secret** → ese valor es tu **GOOGLE_CLIENT_SECRET**.
- Podés copiarlos desde ahí; también aparecen en **APIs & Services** → **Credentials** → clic en el nombre del cliente que creaste.

---

## 7. Usarlos en el proyecto

En tu **.env.local** (local) y en **Vercel → Environment Variables**:

| Variable | Valor |
|----------|--------|
| `GOOGLE_CLIENT_ID` | El Client ID que copiaste (termina en `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | El Client Secret que copiaste |

---

## Resumen rápido

1. [Google Cloud Console](https://console.cloud.google.com) → crear proyecto.
2. **APIs & Services** → **OAuth consent screen** → External → completar y guardar.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. Tipo: **Web application**.
5. Origins: `http://localhost:3000` y `https://TU-PROYECTO.vercel.app`.
6. Redirect URIs: `http://localhost:3000/api/auth/callback/google` y `https://TU-PROYECTO.vercel.app/api/auth/callback/google`.
7. Create → copiar **Client ID** = `GOOGLE_CLIENT_ID`, **Client Secret** = `GOOGLE_CLIENT_SECRET`.

Si tu app en Vercel tiene otra URL (por ejemplo un dominio propio), agregá esa URL también en **Authorized JavaScript origins** y en **Authorized redirect URIs** con `/api/auth/callback/google` al final.
