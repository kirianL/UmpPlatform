import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UmpPlatform",
    short_name: "UmpPlatform",
    description:
      "Plataforma de gestión para productora audiovisual — personal, finanzas, clientes, inventario y calendario.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
