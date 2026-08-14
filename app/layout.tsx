import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
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
import {
  CELIMAP_DESCRIPTION,
  CELIMAP_DESCRIPTION_SHORT,
  CELIMAP_NAME,
} from "@/lib/seo/brand";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  // title.template agrega la marca UNA sola vez. Las funciones de pagina devuelven el titulo SIN marca.
  title: {
    default: "Mapa para celíacos en Argentina | CeliMap",
    template: "%s | CeliMap",
  },
  description: CELIMAP_DESCRIPTION,
  keywords: [
    "mapa sin tacc",
    "mapa celiaco",
    "mapa celíaco",
    "mapa para celiacos",
    "mapa para celíacos",
    "CeliMap",
    "Celimap",
    "lugares sin gluten",
    "sin TACC",
    "restaurantes celíacos",
    "comida sin gluten",
    "apto celíacos",
    "donde comer sin gluten",
    "restaurantes sin TACC",
    "panaderías sin gluten",
    "cafés aptos celíacos",
    "sin gluten Buenos Aires",
    "celíacos Argentina",
    "lugares aptos celíacos",
    "restaurantes sin gluten",
  ],
  authors: [{ name: CELIMAP_NAME }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: BASE_URL,
    siteName: CELIMAP_NAME,
    title: "Mapa para celíacos en Argentina | CeliMap",
    description: CELIMAP_DESCRIPTION_SHORT,
    images: [
      { url: "/CelimapLOGO.png", width: 512, height: 512, alt: "CeliMap - Mapa para celíacos" },
      { url: "/CelimapLOGO.png", width: 1200, height: 630, alt: "CeliMap - Lugares sin gluten en Argentina" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa para celíacos en Argentina | CeliMap",
    description: CELIMAP_DESCRIPTION_SHORT,
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: CELIMAP_NAME, statusBarStyle: "default" },
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
  themeColor: "#F7F3EB",
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
    <html lang="es" className={`${nunito.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased bg-cream text-olive">
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