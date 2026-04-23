import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LayoutChrome } from "@/components/layout/LayoutChrome";
import { MobileShell } from "@/components/layout/MobileShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mapa para celíacos | Celimap - Lugares sin gluten en todo el mundo",
    template: "%s | Celimap",
  },
  description:
    "Mapa para celíacos sin restricciones. Celimap: restaurantes, cafés y panaderías sin TACC en todo el mundo. Reseñas de la comunidad, certificados y opciones seguras para celíacos.",
  keywords: [
    "mapa para celiacos",
    "mapa para celíacos",
    "Celimap",
    "mapa celíacos mundial",
    "lugares sin gluten",
    "sin TACC",
    "restaurantes celíacos",
    "comida sin gluten",
    "apto celíacos",
    "donde comer sin gluten",
    "mapa celíaco",
    "restaurantes sin TACC",
    "panaderías sin gluten",
    "cafés aptos celíacos",
    "sin gluten Buenos Aires",
    "celíacos Argentina",
    "lugares aptos celíacos",
    "restaurantes sin gluten",
  ],
  authors: [{ name: "Celimap" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: BASE_URL,
    siteName: "Celimap",
    title: "Mapa para celíacos | Celimap - Lugares sin gluten en todo el mundo",
    description:
      "El mapa para celíacos sin fronteras. Restaurantes, cafés y panaderías sin TACC. Reseñas de la comunidad.",
    images: [
      { url: "/CelimapLOGO.png", width: 512, height: 512, alt: "Celimap - Mapa para celíacos en todo el mundo" },
      { url: "/CelimapLOGO.png", width: 1200, height: 630, alt: "Celimap - Lugares sin gluten en Argentina" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa para celíacos | Celimap - Lugares sin gluten en todo el mundo",
    description: "El mapa para celíacos sin restricciones. Lugares sin TACC verificados por la comunidad.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Celimap", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  alternates: { canonical: BASE_URL },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
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
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
