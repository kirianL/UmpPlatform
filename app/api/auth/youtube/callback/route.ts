import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

  const clientId = process.env.YOUTUBE_CLIENT_ID || "1057093144266-3dvtlp0687o42qfephk3ql3rbca8vu3d.apps.googleusercontent.com";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "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";
  
  // Determinar la base URL de forma dinámica
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/auth/youtube/callback`;

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
        }).toString(),
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

    // Intentar escribir el token automáticamente en el archivo .env.local
    let autoSaved = false;
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("YOUTUBE_REFRESH_TOKEN=")) {
          // Reemplazar la línea existente
          envContent = envContent.replace(/YOUTUBE_REFRESH_TOKEN=.*/, `YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
        } else {
          // Añadirla al final
          envContent += `\nYOUTUBE_REFRESH_TOKEN=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
        autoSaved = true;
      }
    } catch (fsErr) {
      console.error("Error al intentar autoguardar el token en .env.local:", fsErr);
    }

    return new NextResponse(`
      <html>
        <head>
          <title>Autorización de YouTube Exitosa</title>
        </head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f1f5f9; padding: 20px; margin: 0;">
          <div style="background-color: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); max-width: 600px; width: 100%; text-align: center; box-sizing: border-box; border: 1px solid #334155;">
            <div style="background-color: #059669; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ffffff" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
            </div>
            <h1 style="color: #34d399; margin-top: 0; margin-bottom: 12px; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">¡Conexión Exitosa con YouTube!</h1>
            <p style="margin-bottom: 24px; font-size: 15px; color: #94a3b8; line-height: 1.6;">
              ${autoSaved 
                ? "Hemos configurado automáticamente el <strong>Refresh Token</strong> en tu archivo <strong>.env.local</strong> local."
                : "Google ha autorizado la conexión de manera segura. Copia el siguiente Refresh Token y agrégalo a tu archivo <strong>.env.local</strong>:"
              }
            </p>
            
            ${autoSaved 
              ? `<p style="background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; color: #34d399; font-size: 13px; font-family: monospace; margin-bottom: 24px;">YOUTUBE_REFRESH_TOKEN=guardado_exitosamente_en_env.local</p>`
              : `<textarea readonly style="width: 100%; height: 90px; padding: 12px; border-radius: 8px; border: 1px solid #475569; background-color: #0f172a; color: #f1f5f9; font-family: monospace; font-size: 14px; resize: none; margin-bottom: 20px; box-sizing: border-box; outline: none; cursor: text;" onclick="this.select()">${refreshToken}</textarea>`
            }

            <a href="/analytics" style="display: inline-block; background-color: #3b82f6; hover:background-color: #2563eb; color: white; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
              Regresar a Analytics
            </a>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5;">
              Nota: Si el servidor local no detecta el cambio inmediatamente, por favor reinícialo ejecutando <code>npm run dev</code> de nuevo.
            </p>
          </div>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    return NextResponse.json({ error: "Error de servidor en el callback", message: err.message }, { status: 500 });
  }
}
