import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import PublicScriptClient from "./PublicScriptClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;

  let title = "Guión de Producción — UmpPlatform";
  let description = "Consulta y revisión de guiones en vivo en la plataforma UMP Platform.";

  try {
    const script = await fetchQuery(api.scripts.getByShareId, { shareId });

    if (script) {
      const episodeText = script.episodeOrProject ? `(${script.episodeOrProject})` : "";
      const versionText = script.version ? `[${script.version}]` : "";
      title = `${script.title} ${episodeText} ${versionText} — Guión UMP`.trim();
      description = `Visualiza y descarga el guión oficial de "${script.title}" ${episodeText}. Agrega retroalimentación y notas para el elenco en UmpPlatform.`;
    }
  } catch (err) {
    console.warn("Could not fetch metadata for script share link:", err);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "UMP Platform",
      images: [
        { url: "/ICO-UMP/favicon-180x180.png", width: 180, height: 180, alt: "UMP Platform" }
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/ICO-UMP/favicon-180x180.png"],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <PublicScriptClient shareId={shareId} />;
}
