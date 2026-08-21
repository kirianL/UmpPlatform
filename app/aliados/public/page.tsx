import type { Metadata } from "next";
import PublicAllyFormClient from "./PublicAllyFormClient";

export const metadata: Metadata = {
  title: "Registro de Aliados — UMP Platform",
  description:
    "Formulario oficial de afiliación y registro de Aliados de Producciones UMP. Elige tu paquete Élite o VIP.",
  openGraph: {
    title: "Registro de Aliados — UMP Platform",
    description:
      "Únete como Aliado oficial de Producciones UMP. Paquetes Élite y VIP con acceso y beneficios exclusivos.",
    type: "website",
    siteName: "UMP Platform",
    images: [
      {
        url: "/ICO-UMP/favicon-180x180.png",
        width: 180,
        height: 180,
        alt: "UMP Platform",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Registro de Aliados — UMP Platform",
    description:
      "Formulario oficial de afiliación y registro de Aliados de Producciones UMP.",
    images: ["/ICO-UMP/favicon-180x180.png"],
  },
};

export default function Page() {
  return <PublicAllyFormClient />;
}
