import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      {
        error:
          "Faltan credenciales de YouTube (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN) en .env.local",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Obtener Access Token temporal usando el Refresh Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Error al refrescar el token de Google", details: errBody },
        { status: 401 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 2. Consultar estadísticas del canal del usuario
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!channelRes.ok) {
      return NextResponse.json(
        { error: "Error al consultar las estadísticas del canal" },
        { status: channelRes.status }
      );
    }

    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: "No se encontró ningún canal asociado a esta cuenta" },
        { status: 404 }
      );
    }

    const followers = parseInt(channel.statistics.subscriberCount ?? "0", 10);
    const views = parseInt(channel.statistics.viewCount ?? "0", 10);

    // 3. Consultar los videos más recientes/populares del canal
    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
    let topVideos: any[] = [];

    if (playlistId) {
      const playlistItemsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=5`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      if (playlistItemsRes.ok) {
        const playlistItemsData = await playlistItemsRes.json();
        const videoIds = (playlistItemsData.items ?? [])
          .map((item: any) => item.snippet?.resourceId?.videoId)
          .filter(Boolean)
          .join(",");

        if (videoIds) {
          const videosStatsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
            {
              headers: { Authorization: `Bearer ${access_token}` },
            }
          );

          if (videosStatsRes.ok) {
            const videosStatsData = await videosStatsRes.json();
            topVideos = (videosStatsData.items ?? []).map((vData: any) => {
              // Convert ISO duration (e.g. PT14M20S) to readable time (14:20)
              const durationStr = vData.contentDetails?.duration ?? "";
              const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              let duration = "0:00";
              if (match) {
                const hours = match[1] ? `${match[1]}:` : "";
                const minutes = match[2] ? (match[1] ? match[2].padStart(2, "0") : match[2]) : "0";
                const seconds = match[3] ? match[3].padStart(2, "0") : "00";
                duration = `${hours}${minutes}:${seconds}`;
              }

              return {
                title: vData.snippet?.title ?? "",
                platform: "youtube" as const,
                views: parseInt(vData.statistics?.viewCount ?? "0", 10),
                likes: parseInt(vData.statistics?.likeCount ?? "0", 10),
                watchTime: "N/A", // Requiere API específica de analytics, estimamos o guardamos info básica
                retention: "N/A",
                duration,
                date: new Date(vData.snippet?.publishedAt).toLocaleDateString("es-CR"),
              };
            });
          }
        }
      }
    }

    // 4. Guardar los datos en Convex enviando una petición HTTP
    // (Puesto que estamos en Next.js Edge/Server, podemos enviar los datos usando fetch a Convex o con un webhook)
    // Para simplificar, devolvemos los datos para que el frontend pueda enviarlos con la Mutation,
    // o realizamos un post directo si las credenciales de Convex están presentes.
    
    return NextResponse.json({
      success: true,
      channelName: channel.snippet?.title,
      stats: {
        followers,
        views,
        // Mantener otros valores del mock como iniciales
        followersGrowth: "+0.0%",
        viewsGrowth: "+0.0%",
        engagement: "8.5%",
        engagementGrowth: "+0.0%",
        shares: 0,
        sharesGrowth: "+0.0%",
        watchTime: "N/A",
        avgRetention: "N/A",
      },
      topContent: topVideos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error de servidor en sincronización", details: error.message },
      { status: 500 }
    );
  }
}
