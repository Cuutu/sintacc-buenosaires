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
    alternateName: ["Mapa para celiacos", "Mapa para celíacos", "Mapa celíacos Buenos Aires"],
    url: BASE_URL,
    logo: `${BASE_URL}/CelimapLOGO.png`,
    description:
      "Celimap - Mapa para celíacos en Buenos Aires. Restaurantes, cafés y panaderías sin TACC.",
    areaServed: {
      "@type": "City",
      name: "Argentina",
      "@id": "https://www.wikidata.org/wiki/Q1486",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Celimap",
    alternateName: ["Mapa para celiacos", "Mapa para celíacos"],
    url: BASE_URL,
    description: "Celimap - Mapa para celíacos en Buenos Aires. Lugares sin gluten verificados.",
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
          text: "El mapa para celíacos de Celimap es una plataforma donde la comunidad comparte restaurantes, cafés y panaderías sin TACC en Buenos Aires. Podés ver el mapa interactivo, filtrar por barrio y nivel de seguridad, y leer reseñas de otros celíacos.",
        },
      },
      {
        "@type": "Question",
        name: "¿Dónde comer sin gluten en Buenos Aires?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En Celimap encontrás el mapa de lugares sin gluten en Buenos Aires. Incluye restaurantes 100% sin TACC, cafés con opciones aptas y panaderías certificadas. Cada lugar tiene reseñas de la comunidad celíaca.",
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
