/**
 * JSON-LD structured data para SEO.
 * Se inyecta en el layout raíz.
 */
export function JsonLdScript() {
  const BASE_URL =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Celimap",
    alternateName: ["Mapa para celiacos", "Mapa para celíacos", "Mapa celíacos mundial"],
    url: BASE_URL,
    logo: `${BASE_URL}/CelimapLOGO.png`,
    description:
      "Celimap - Mapa para celíacos sin fronteras. Restaurantes, cafés y panaderías sin TACC en todo el mundo.",
    areaServed: {
      "@type": "Place",
      name: "Worldwide",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Celimap",
    alternateName: ["Mapa para celiacos", "Mapa para celíacos"],
    url: BASE_URL,
    description: "Celimap - Mapa para celíacos sin restricciones. Lugares sin gluten verificados en todo el mundo.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/mapa?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Qué es el mapa para celíacos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Celimap es una plataforma global donde la comunidad comparte restaurantes, cafés y panaderías sin TACC en cualquier parte del mundo. Podés ver el mapa interactivo, filtrar por zona y nivel de seguridad, y leer reseñas de otros celíacos.",
        },
      },
      {
        "@type": "Question",
        name: "¿Dónde comer sin gluten?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En Celimap encontrás el mapa de lugares sin gluten sin restricción geográfica. Incluye restaurantes 100% sin TACC, cafés con opciones aptas y panaderías certificadas. Cada lugar tiene reseñas de la comunidad celíaca.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo saber si un lugar es seguro para celíacos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En Celimap cada lugar tiene un nivel de seguridad: 100% sin gluten (dedicado) u opciones sin gluten. Las reseñas de la comunidad te ayudan a decidir. También podés reportar si tuviste una experiencia de contaminación.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
