import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Falta YOUTUBE_CLIENT_ID en .env.local para iniciar la autenticación." },
      { status: 400 }
    );
  }

  // Las URIs redirigidas deben coincidir con la configurada en Google Cloud
  const redirectUri = `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ? "https://ump-platform.vercel.app" : "http://localhost:3000"}/api/auth/youtube/callback`;

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
