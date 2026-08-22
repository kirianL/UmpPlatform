import type { Metadata } from "next";
import { Suspense } from "react";
import PublicAllyFormClient from "./PublicAllyFormClient";

export const metadata: Metadata = {
  title: "Registro de Aliados — UMP Platform",
  description:
    "Formulario oficial de afiliación y registro de Aliados de Ultimate Media Productions. Paquetes Élite y VIP.",
  openGraph: {
    title: "Registro de Aliados — UMP Platform",
    description:
      "Únete como Aliado oficial de Ultimate Media Productions. Paquetes Élite y VIP con acceso y beneficios exclusivos.",
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
      "Formulario oficial de afiliación y registro de Aliados de Ultimate Media Productions.",
    images: ["/ICO-UMP/favicon-180x180.png"],
  },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-full bg-grayscale-1 flex items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
        </div>
      }
    >
      <PublicAllyFormClient />
    </Suspense>
  );
}
