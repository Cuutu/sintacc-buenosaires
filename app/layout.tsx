import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LayoutChrome } from "@/components/layout/LayoutChrome";
import { MobileShell } from "@/components/layout/MobileShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Toaster } from "sonner";
import { NativeAppBridge } from "@/components/native/NativeAppBridge";
import { NativeStatusBar } from "@/components/native/NativeStatusBar";
import { NativeLayoutDebug } from "@/components/native/NativeLayoutDebug";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ClientErrorListeners } from "@/components/ClientErrorListeners";
import { PreviewBadge } from "@/components/native/PreviewBadge";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { getBaseUrl } from "@/lib/base-url";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mapa para celíacos en Argentina | Celimap",
    template: "%s | Celimap",
  },
  description:
    "Mapa para celíacos de Argentina. Restaurantes, cafés y panaderías sin tacc verificados por la comunidad. Gratis y actualizado.",
  keywords: [
    "mapa sin tacc",
    "mapa celiaco",
    "mapa celíaco",
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
  // black-translucent + viewportFit cover → PWA edge-to-edge; env(safe-area-*) activos
  appleWebApp: { capable: true, title: "Celimap", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
          <ClientErrorListeners />
          <PwaRegister />
          <PreviewBadge />
          <MobileShell>
            <LayoutChrome>{children}</LayoutChrome>
          </MobileShell>
          <Toaster position="top-center" richColors closeButton />
          <NativeAppBridge />
          <NativeStatusBar />
          <NativeLayoutDebug />
          <InstallPrompt />
          <OnboardingModal />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
