import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback_secret_for_ump_platform_2026";

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
async function signSession(username: string, expiresAt: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = `${username}.${expiresAt}`;
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
  return arrayBufferToBase64Url(signature);
}

async function verifySession(token: string): Promise<{ valid: boolean; reason?: string }> {
  if (!token) return { valid: false, reason: "Token vacío" };
  const parts = token.split(".");
  if (parts.length < 3) return { valid: false, reason: "Formato de token inválido (menos de 3 partes)" };

  const signature = parts.pop()!;
  const expiresAtStr = parts.pop()!;
  const username = parts.join(".");
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt)) {
    return { valid: false, reason: "Fecha de expiración no es un número" };
  }
  
  if (expiresAt < Date.now()) {
    return { valid: false, reason: `Token expirado (expiró el: ${new Date(expiresAt).toISOString()})` };
  }

  const expectedSignature = await signSession(username, expiresAt);
  if (expectedSignature !== signature) {
    return { 
      valid: false, 
      reason: `Firma inválida. ¿Secret de sesión coincide? Usando secret de longitud: ${SESSION_SECRET.length}` 
    };
  }

  return { valid: true };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow next assets, favicon, icon, and public auth APIs to pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("/icon.svg") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  console.log(`[Proxy Auth Check] sessionToken value read from cookie: "${sessionToken}"`);
  
  let isSessionValid = false;
  if (sessionToken) {
    const result = await verifySession(sessionToken);
    isSessionValid = result.valid;
    if (!result.valid) {
      console.warn(`[Proxy Auth Check] Acceso denegado en "${pathname}": ${result.reason}`);
    }
  } else {
    console.warn(`[Proxy Auth Check] Acceso denegado en "${pathname}": No se encontró cookie session_token`);
  }

  // If path is /login and session is valid, redirect to dashboard (/)
  if (pathname === "/login") {
    if (isSessionValid) {
      console.log(`[Proxy Auth Check] Usuario autenticado intentó acceder a /login. Redirigiendo a /.`);
      return NextResponse.redirect(new URL("/", request.url));
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Redirect to login if session is not valid
  if (!isSessionValid) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Inject current pathname into headers for Server Component layouts to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - static files (_next/static)
     * - image optimization files (_next/image)
     * - favicon.ico (favicon file)
     * - icon.svg
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
