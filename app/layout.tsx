import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LayoutChrome } from "@/components/layout/LayoutChrome";
import { MobileShell } from "@/components/layout/MobileShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Celimap - Lugares sin gluten en Buenos Aires | Mapa celíacos",
    template: "%s | Celimap",
  },
  description:
    "Mapa de lugares sin TACC en Buenos Aires. Restaurantes, cafés y panaderías aptas para celíacos. Reseñas de la comunidad, certificados y opciones sin gluten.",
  keywords: [
    "celíacos Buenos Aires",
    "lugares sin gluten",
    "sin TACC",
    "restaurantes celíacos",
    "comida sin gluten CABA",
    "mapa celíacos",
    "apto celíacos",
  ],
  authors: [{ name: "Celimap" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: BASE_URL,
    siteName: "Celimap",
    title: "Celimap - Lugares sin gluten en Buenos Aires",
    description:
      "Mapa de lugares sin TACC en Buenos Aires. Restaurantes, cafés y panaderías aptas para celíacos.",
    images: [{ url: "/CelimapLOGO.png", width: 512, height: 512, alt: "Celimap" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Celimap - Lugares sin gluten en Buenos Aires",
    description: "Mapa de lugares sin TACC en Buenos Aires. Reseñas de la comunidad celíaca.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/CelimapLOGO.png" },
  alternates: { canonical: BASE_URL },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <JsonLdScript />
        <Providers>
          <MobileShell>
            <LayoutChrome>{children}</LayoutChrome>
          </MobileShell>
          <Toaster position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
