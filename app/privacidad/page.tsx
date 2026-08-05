import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()
const UPDATED_AT = "2 de agosto de 2026"
const CONTACT_MAIL = "hola@celimap.com.ar"

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Celimap trata datos personales: cuenta Google, ubicación, reseñas, mapas y la app móvil.",
  alternates: { canonical: `${BASE_URL}/privacidad` },
  openGraph: {
    title: "Política de privacidad ",
    description:
      "Información sobre datos personales, Google OAuth, ubicación, Mapbox y proveedores de Celimap.",
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
          Contacto sobre privacidad:{" "}
          <a href={`mailto:${CONTACT_MAIL}`} className="text-primary hover:underline">
            {CONTACT_MAIL}
          </a>{" "}
          o el formulario de contacto del sitio.
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
          <strong className="text-foreground">Cuenta:</strong> si iniciás sesión
          con Google, recibimos nombre, email e imagen de perfil que Google nos
          comparte vía OAuth.
        </li>
        <li>
          <strong className="text-foreground">Contenido que vos creás:</strong>{" "}
          reseñas, reportes, favoritos, listas, sugerencias de lugares o
          emprendimientos, y mensajes de contacto.
        </li>
        <li>
          <strong className="text-foreground">Ubicación:</strong> solo si
          autorizás el permiso del dispositivo o navegador (por ejemplo “cerca
          mío”). No rastreamos ubicación en segundo plano de forma continua.
        </li>
        <li>
          <strong className="text-foreground">Datos técnicos:</strong> IP,
          tipo de dispositivo/navegador, logs de error y métricas básicas de uso
          (p. ej. Vercel Analytics) para operar y mejorar el servicio.
        </li>
        <li>
          <strong className="text-foreground">Fotos:</strong> si subís imágenes
          (reseñas/sugerencias), se almacenan en nuestro proveedor de medios
          (Cloudinary).
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
        <li>Moderar contenido y prevenir abuso (límites de uso, spam).</li>
        <li>Responder consultas y notificaciones operativas (p. ej. email).</li>
        <li>Mejorar estabilidad, seguridad y experiencia del producto.</li>
      </ul>
    ),
  },
  {
    id: "base-legal",
    title: "4. Base del tratamiento",
    body: (
      <p>
        Tratamos datos para prestar el servicio que pedís (contrato/ejecución),
        con tu consentimiento cuando corresponde (ubicación, cookies no
        esenciales si las hubiera) y por interés legítimo en seguridad,
        prevención de fraude y mejora del producto, sin vulnerar tus derechos.
      </p>
    ),
  },
  {
    id: "terceros",
    title: "5. Proveedores y terceros",
    body: (
      <>
        <p>Para funcionar, Celimap usa servicios de terceros. Entre ellos:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Google:</strong> inicio de
            sesión (OAuth) y, según pantallas, datos de Places / Maps Platform
            (p. ej. fotos o ratings mostrados con atribución).
          </li>
          <li>
            <strong className="text-foreground">Mapbox:</strong> mapa
            interactivo y geocodificación.
          </li>
          <li>
            <strong className="text-foreground">MongoDB Atlas:</strong> base de
            datos.
          </li>
          <li>
            <strong className="text-foreground">Vercel:</strong> hosting y
            analytics.
          </li>
          <li>
            <strong className="text-foreground">Cloudinary:</strong> almacenamiento
            de imágenes.
          </li>
          <li>
            <strong className="text-foreground">Resend:</strong> envío de emails
            transaccionales (contacto, avisos).
          </li>
        </ul>
        <p className="mt-3">
          Cada proveedor trata datos según sus propias políticas. No vendemos
          datos personales.
        </p>
      </>
    ),
  },
  {
    id: "app",
    title: "6. App móvil (iOS / Android)",
    body: (
      <p>
        La app Celimap es un contenedor nativo (Capacitor) que carga el sitio
        web. Los permisos de ubicación se piden solo para funciones como ver
        lugares cercanos. La política de esta página aplica también a la app.
      </p>
    ),
  },
  {
    id: "conservacion",
    title: "7. Conservación",
    body: (
      <p>
        Conservamos los datos mientras tu cuenta esté activa o el contenido
        sea necesario para el servicio, moderación o obligaciones legales.
        Podés pedir eliminación de cuenta o contenido escribiendo a{" "}
        <a href={`mailto:${CONTACT_MAIL}`} className="text-primary hover:underline">
          {CONTACT_MAIL}
        </a>
        .
      </p>
    ),
  },
  {
    id: "derechos",
    title: "8. Tus derechos",
    body: (
      <p>
        Según la legislación aplicable (incl. Ley 25.326 en Argentina), podés
        solicitar acceso, rectificación, actualización o eliminación de datos
        personales, y oponerte a ciertos tratamientos. Respondemos en plazos
        razonables. También podés revocar el permiso de ubicación en el
        sistema del dispositivo.
      </p>
    ),
  },
  {
    id: "menores",
    title: "9. Menores",
    body: (
      <p>
        Celimap no está dirigido a menores de 13 años. Si detectamos una cuenta
        de un menor sin consentimiento adecuado, la eliminaremos.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "10. Cambios",
    body: (
      <p>
        Podemos actualizar esta política. La fecha de “Última actualización”
        indica la versión vigente. Si el cambio es relevante, lo comunicaremos
        en el sitio o por email cuando corresponda.
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
