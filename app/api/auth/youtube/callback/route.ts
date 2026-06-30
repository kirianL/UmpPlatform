import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `Error de autorización: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No se recibió código de autorización" }, { status: 400 });
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  
  // La URI redirigida debe coincidir con la configurada en Google Cloud
  const redirectUri = `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ? "https://ump-platform.vercel.app" : "http://localhost:3000"}/api/auth/youtube/callback`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json({ error: "Fallo al intercambiar el código por tokens", details: errBody }, { status: 400 });
    }

    const data = await res.json();
    const refreshToken = data.refresh_token;

    if (!refreshToken) {
      return NextResponse.json({ 
        error: "Google no devolvió un Refresh Token. Intenta revocar los permisos de la aplicación en tu cuenta de Google y vuelve a intentar para forzar el consentimiento." 
      }, { status: 400 });
    }

    return new NextResponse(`
      <html>
        <head>
          <title>Autorización de YouTube Exitosa</title>
        </head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f3f4f6; color: #1f2937; padding: 20px; margin: 0;">
          <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 600px; width: 100%; text-align: center; box-sizing: border-box;">
            <h1 style="color: #10b981; margin-bottom: 10px; font-size: 24px;">¡Autorización Exitosa!</h1>
            <p style="margin-bottom: 20px; font-size: 14px; color: #4b5563; line-height: 1.5;">
              Google ha autorizado la conexión de manera segura con tu canal. Copia el siguiente <strong>Refresh Token</strong> y agrégalo a tu archivo <strong>.env.local</strong>:
            </p>
            <textarea readonly style="width: 100%; height: 90px; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #f9fafb; font-family: monospace; font-size: 14px; resize: none; margin-bottom: 20px; box-sizing: border-box; outline: none; cursor: text;" onclick="this.select()">${refreshToken}</textarea>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 10px; line-height: 1.5;">
              Una vez guardado en tu archivo <strong>.env.local</strong> como <strong>YOUTUBE_REFRESH_TOKEN</strong> y habiendo reiniciado el servidor, podrás usar la sincronización privada avanzada.
            </p>
          </div>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    return NextResponse.json({ error: "Error de servidor en el callback", message: err.message }, { status: 500 });
  }
}
