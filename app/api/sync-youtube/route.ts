import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelIdentifier = process.env.YOUTUBE_CHANNEL_ID || "@YouTube"; // Puede ser el ID (UC...) o el Handle (@...)

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Falta la clave YOUTUBE_API_KEY en tu archivo .env.local. Por favor créala en Google Cloud Console.",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Resolver el ID del canal (admite tanto ID UC... como Handle @...)
    let channelQueryParam = "";
    if (channelIdentifier.startsWith("UC")) {
      channelQueryParam = `id=${channelIdentifier}`;
    } else {
      // Normalizar el handle para asegurar que lleva el '@'
      const handle = channelIdentifier.startsWith("@") ? channelIdentifier : `@${channelIdentifier}`;
      channelQueryParam = `forHandle=${encodeURIComponent(handle)}`;
    }

    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${channelQueryParam}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);

    if (!channelRes.ok) {
      const errorBody = await channelRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Error al consultar la API de canales de YouTube", details: errorBody },
        { status: channelRes.status }
      );
    }

    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: `No se encontró ningún canal con el identificador: ${channelIdentifier}` },
        { status: 404 }
      );
    }

    const channelName = channel.snippet?.title || "Mi Canal de YouTube";
    const followers = parseInt(channel.statistics?.subscriberCount ?? "0", 10);
    const views = parseInt(channel.statistics?.viewCount ?? "0", 10);

    // 2. Obtener los videos recientes del canal (de su playlist automática de cargas)
    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
    let topVideos: any[] = [];

    if (playlistId) {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=5&key=${apiKey}`;
      const playlistItemsRes = await fetch(playlistUrl);

      if (playlistItemsRes.ok) {
        const playlistItemsData = await playlistItemsRes.json();
        const videoIds = (playlistItemsData.items ?? [])
          .map((item: any) => item.snippet?.resourceId?.videoId)
          .filter(Boolean)
          .join(",");

        if (videoIds) {
          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
          const videosStatsRes = await fetch(videosUrl);

          if (videosStatsRes.ok) {
            const videosStatsData = await videosStatsRes.json();
            topVideos = (videosStatsData.items ?? []).map((vData: any) => {
              // Convertir duración ISO (PT14M20S) a formato legible (14:20)
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
                watchTime: "N/A",
                retention: "N/A",
                duration,
                date: new Date(vData.snippet?.publishedAt).toLocaleDateString("es-CR"),
              };
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      channelName,
      stats: {
        followers,
        views,
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
      { error: "Error de servidor en la sincronización pública", details: error.message },
      { status: 500 }
    );
  }
}
