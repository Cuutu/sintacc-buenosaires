import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const UPDATED_AT = "11 de agosto de 2026"
const CONTACT_MAIL = "hola@celimap.com.ar"

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Celimap trata datos personales: Google, Sign in with Apple, ubicación, reseñas, fotos y eliminación de cuenta en la app.",
  alternates: { canonical: `${BASE_URL}/privacidad` },
  openGraph: {
    title: "Política de privacidad",
    description:
      "Datos personales, autenticación Google/Apple, ubicación, Mapbox, Cloudinary y eliminación de cuenta desde Perfil.",
    url: `${BASE_URL}/privacidad`,
    type: "website",
  },
  robots: { index: true, follow: true },
}

const sections: Array<{ id: string; title: string; body: ReactNode }> = [
  {
    id: "responsable",
    title: "1. Responsable",
    body: (
      <>
        <p>
          Celimap (“nosotros”) opera el sitio{" "}
          <a href={BASE_URL} className="text-primary hover:underline">
            {BASE_URL}
          </a>{" "}
          y la aplicación móvil Celimap (iOS / Android), que muestra el mismo
          contenido web.
        </p>
        <p>
          Consultas:{" "}
          <a href={`mailto:${CONTACT_MAIL}`} className="text-primary hover:underline">
            {CONTACT_MAIL}
          </a>
          . Para borrar tu cuenta usá{" "}
          <strong className="text-foreground">Perfil → Eliminar cuenta</strong>; el
          email no es requisito.
        </p>
      </>
    ),
  },
  {
    id: "datos",
    title: "2. Datos que podemos tratar",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="text-foreground">Cuenta:</strong> con Google
          recibimos nombre, email e imagen de perfil. Con Sign in with Apple (app
          iOS) recibimos el identificador Apple (`sub`) y, si Apple lo comparte,
          email (puede ser privado) y nombre.
        </li>
        <li>
          <strong className="text-foreground">Contenido que creás:</strong>{" "}
          reseñas, reportes, favoritos, listas, sugerencias y mensajes de
          contacto.
        </li>
        <li>
          <strong className="text-foreground">Ubicación:</strong> si activás
          “cerca mío” o el botón de ubicación en el mapa, el dispositivo obtiene
          tu posición. Para mostrar lugares cercanos, las coordenadas se envían
          a nuestros servidores solo para esa consulta y no las guardamos en tu
          perfil. El mapa (Mapbox) puede recibir la zona que estás mirando para
          dibujar el mapa.
        </li>
        <li>
          <strong className="text-foreground">Fotos:</strong> si subís imágenes,
          se almacenan en Cloudinary asociadas a tu contenido.
        </li>
        <li>
          <strong className="text-foreground">Uso del producto:</strong> eventos
          anónimos de interacción (por ejemplo ver un lugar) vía Vercel
          Analytics, sin enviar tu email ni ID de cuenta.
        </li>
        <li>
          <strong className="text-foreground">Datos técnicos:</strong> logs
          operativos del servidor y, si aplica, mensajes de error de la
          interfaz. Los informes de fallo del sistema iOS los genera Apple; no
          los recopilamos nosotros con un SDK de crashes.
        </li>
      </ul>
    ),
  },
  {
    id: "finalidad",
    title: "3. Para qué usamos los datos",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Mostrar el mapa y fichas de lugares sin TACC / aptos para celíacos.</li>
        <li>Identificarte en favoritos, listas, reseñas y sugerencias.</li>
        <li>Moderar contenido y prevenir abuso.</li>
        <li>Responder consultas (email vía Resend).</li>
        <li>Entender qué funciones se usan (analytics sin vincular a tu cuenta).</li>
      </ul>
    ),
  },
  {
    id: "auth",
    title: "4. Autenticación (Google y Apple)",
    body: (
      <>
        <p>
          No hay registro con email y contraseña. El acceso es con Google y, en
          la app iOS, también con Sign in with Apple.
        </p>
        <p>
          No guardamos refresh tokens de Google. Al eliminar la cuenta borramos
          tu identidad en Celimap y cerramos la sesión; no afirmamos una
          revocación remota de tokens de Google.
        </p>
        <p>
          En cuentas Apple intentamos revocar la autorización con Apple al
          eliminar (pidiendo confirmación con Apple en ese momento). Si no es
          posible, te mostramos cómo hacerlo desde Ajustes de Apple. La
          eliminación de tus datos en Celimap no se bloquea por una falla de
          Apple.
        </p>
      </>
    ),
  },
  {
    id: "terceros",
    title: "5. Proveedores y terceros",
    body: (
      <>
        <p>Servicios que usamos:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Google:</strong> inicio de
            sesión y, en algunas pantallas, Places / Maps.
          </li>
          <li>
            <strong className="text-foreground">Apple:</strong> Sign in with
            Apple en iOS.
          </li>
          <li>
            <strong className="text-foreground">Mapbox:</strong> mapa
            interactivo.
          </li>
          <li>
            <strong className="text-foreground">MongoDB Atlas:</strong> base de
            datos.
          </li>
          <li>
            <strong className="text-foreground">Vercel:</strong> hosting y
            Analytics de producto (sin publicidad de Celimap).
          </li>
          <li>
            <strong className="text-foreground">Cloudinary:</strong> imágenes
            subidas.
          </li>
          <li>
            <strong className="text-foreground">Resend:</strong> emails
            transaccionales.
          </li>
        </ul>
        <p className="mt-3">
          No vendemos datos personales ni usamos la cuenta para tracking
          publicitario entre apps o sitios de terceros.
        </p>
      </>
    ),
  },
  {
    id: "app",
    title: "6. App móvil y permisos",
    body: (
      <p>
        La app es un contenedor nativo (Capacitor) del sitio. Pedimos ubicación
        o cámara solo cuando usás esa función. Podés revocar permisos en
        Ajustes del sistema.
      </p>
    ),
  },
  {
    id: "conservacion",
    title: "7. Conservación",
    body: (
      <p>
        Conservamos cuenta y contenido mientras la cuenta esté activa, o el
        tiempo necesario para moderación, seguridad u obligaciones legales. Los
        lugares del mapa público pueden permanecer publicados sin tu identidad.
        Los códigos temporales de login caducan en minutos. Tras borrar la
        cuenta, puede quedar un trabajo técnico breve para terminar de borrar
        fotos en Cloudinary; no guardamos ahí tu nombre, email ni textos.
      </p>
    ),
  },
  {
    id: "eliminacion",
    title: "8. Eliminación de cuenta",
    body: (
      <>
        <p className="font-medium text-foreground">Perfil → Eliminar cuenta</p>
        <p>
          Se eliminan perfil, favoritos, listas, reseñas, reportes, sugerencias
          asociadas, mensajes de contacto, tokens de notificación y fotos
          asociadas cuando podemos identificarlas. La acción es permanente y
          cierra tu sesión. Si la revocación automática con Apple no se
          completa, te indicamos el paso manual en Ajustes.
        </p>
        <p>
          Consultas:{" "}
          <a href={`mailto:${CONTACT_MAIL}`} className="text-primary hover:underline">
            {CONTACT_MAIL}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "derechos",
    title: "9. Tus derechos",
    body: (
      <p>
        Según la legislación aplicable (incl. Ley 25.326), podés pedir acceso,
        rectificación u oposición. La eliminación está en la app como se
        describe arriba. También podés revocar permisos del dispositivo.
      </p>
    ),
  },
  {
    id: "menores",
    title: "10. Menores",
    body: (
      <p>
        Celimap no está dirigido a menores de 13 años. Si detectamos una cuenta
        de un menor sin consentimiento adecuado, la eliminaremos.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "11. Cambios",
    body: (
      <p>
        Podemos actualizar esta política. La fecha de “Última actualización”
        indica la versión vigente.
      </p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
        Legal
      </p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
        Política de privacidad
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Última actualización: {UPDATED_AT}
      </p>

      <div className="space-y-10 text-sm leading-7 text-muted-foreground md:text-[15px]">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <div className="space-y-3">{section.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Volver al{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          inicio
        </Link>{" "}
        ·{" "}
        <Link href="/que-es-celimap" className="font-medium text-primary hover:underline">
          Qué es Celimap
        </Link>
      </p>
    </main>
  )
}
