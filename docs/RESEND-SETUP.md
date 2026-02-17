# Configuración de Resend para emails de contacto

Las consultas del formulario de contacto se envían por email a tu casilla cuando configurás Resend.

## Pasos

1. **Crear cuenta en Resend**
   - Andá a [resend.com](https://resend.com) y creá una cuenta gratis.

2. **Generar API Key**
   - En el dashboard: API Keys → Create API Key.
   - Copiá la key (empieza con `re_`).

3. **Configurar variables en `.env.local`**

   ```env
   CONTACT_EMAIL=tu-email@ejemplo.com
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_DOMAIN=onboarding@resend.dev
   ```

   - **CONTACT_EMAIL**: Tu email donde llegan las consultas.
   - **RESEND_API_KEY**: La API key de Resend.
   - **RESEND_FROM_DOMAIN**: Para pruebas usá `onboarding@resend.dev` (Resend permite enviar a cualquier destino).

4. **Producción (Vercel)**
   - Agregá las mismas variables en el panel de Vercel → Settings → Environment Variables.
   - Si verificás tu dominio en Resend, podés usar `noreply@tudominio.com` en `RESEND_FROM_DOMAIN` para que los emails lleguen desde tu dominio.

## Flujo

Cuando alguien envía una consulta desde el formulario:
1. Se guarda en la base de datos y aparece en el panel admin.
2. Se envía un email a `tu-email@ejemplo.com` con el asunto `[Celimap] ...` y el mensaje.
3. El `replyTo` es el email del usuario, así que podés responder directamente para contactarlo.
