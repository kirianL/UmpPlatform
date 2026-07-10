import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { hashPassword } from "@/lib/auth-helpers";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback_secret_for_ump_platform_2026";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin@ultimate.cr";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "UmpPlatform2026!";

// Helper to convert ArrayBuffer to Base64Url (Edge Runtime compatible)
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Helper to sign session data
async function signSession(username: string, role: string, expiresAt: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = `${username}.${role}.${expiresAt}`;
  const keyData = encoder.encode(SESSION_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  const signatureBase64 = arrayBufferToBase64Url(signature);
  return `${data}.${signatureBase64}`;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    let isValid = false;
    let role = "produccion"; // Default role if not specified

    // 1. Try to find the user in Convex
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        const convex = new ConvexHttpClient(convexUrl);
        const user = await convex.query(api.users.getByEmail, { email: username });
        if (user) {
          const expectedHash = hashPassword(password);
          if (user.passwordHash === expectedHash) {
            isValid = true;
            role = user.role || "produccion";
          }
        }
      }
    } catch (dbErr) {
      console.error("Error querying database for login:", dbErr);
    }

    // 2. Fallback to Env variables if database check was not successful
    if (!isValid) {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isValid = true;
        role = "admin";
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    // Session valid for 7 days
    const duration = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + duration;
    const token = await signSession(username, role, expiresAt);

    // Redirect produccion role to /inventario, others to /
    const redirectUrl = role === "produccion" ? "/inventario" : "/";
    const response = NextResponse.json({ success: true, redirect: redirectUrl });
    
    // Set HTTP-Only Cookie
    response.cookies.set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Error en el servidor de autenticación" }, { status: 500 });
  }
}
