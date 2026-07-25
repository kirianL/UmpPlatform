import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import PublicActorScheduleClient from "./PublicActorScheduleClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  let actorName = "Actor / Talento";
  let characterName = "";
  let photoUrl = "";
  let scheduleCount = 0;

  try {
    const actor = await fetchQuery(api.actors.getByShareToken, { shareToken: token });
    const schedules = await fetchQuery(api.actorSchedules.getByShareToken, { shareToken: token });

    if (actor) {
      actorName = actor.name;
      characterName = actor.characterName ? `(${actor.characterName})` : "";
      photoUrl = (actor as any).photoUrl || "";
    } else if (schedules && schedules.length > 0) {
      actorName = schedules[0].actorName;
      characterName = schedules[0].characterName ? `(${schedules[0].characterName})` : "";
    }

    if (schedules) {
      scheduleCount = schedules.length;
    }
  } catch (err) {
    console.warn("Could not fetch metadata for actor share link:", err);
  }

  const title = `${actorName} ${characterName} — Agenda de Rodaje UMP`.trim();
  const description = `Agenda oficial de citaciones, fechas de rodaje y locaciones para ${actorName} ${characterName} en UmpPlatform.${scheduleCount > 0 ? ` ${scheduleCount} llamado(s) programado(s).` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "UMP Platform",
      images: photoUrl
        ? [{ url: photoUrl, alt: actorName }]
        : [{ url: "/ICO-UMP/favicon-180x180.png", width: 180, height: 180, alt: "UMP Platform" }],
    },
    twitter: {
      card: photoUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: photoUrl ? [photoUrl] : ["/ICO-UMP/favicon-180x180.png"],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicActorScheduleClient token={token} />;
}
