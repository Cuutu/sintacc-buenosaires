import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorar lugares sin gluten",
  description:
    "Descubrí restaurantes, cafés y panaderías aptas para celíacos en Buenos Aires. Cerca tuyo, mejor valorados y nuevos lugares.",
};

export default function ExplorarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
