import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sugerir un lugar",
  description:
    "¿Conocés un lugar sin TACC? Sugerilo y ayudá a la comunidad celíaca a descubrir más opciones en todo el mundo.",
  keywords: [
    "agregar lugar sin TACC",
    "sugerir restaurante celíaco",
    "comunidad celíaca",
    "agregar lugar apto celíacos",
  ],
};

export default function SugerirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
