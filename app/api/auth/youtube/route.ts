import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID || "1057093144266-3dvtlp0687o42qfephk3ql3rbca8vu3d.apps.googleusercontent.com";

  // Determinar la base URL de forma dinámica
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/auth/youtube/callback`;

  // Construir la URL segura de Google OAuth
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly"
  ].join(" ");

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent" // Fuerza a entregar el Refresh Token
    }).toString();

  return NextResponse.redirect(authUrl);
}
