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
  return arrayBufferToBase64Url(signature);
}

async function verifySession(token: string): Promise<{ valid: boolean; role?: string; username?: string; reason?: string }> {
  if (!token) return { valid: false, reason: "Token vacío" };
  const parts = token.split(".");
  if (parts.length < 4) return { valid: false, reason: "Formato de token inválido (menos de 4 partes)" };

  const signature = parts.pop()!;
  const expiresAtStr = parts.pop()!;
  const role = parts.pop()!;
  const username = parts.join(".");
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt)) {
    return { valid: false, reason: "Fecha de expiración no es un número" };
  }
  
  if (expiresAt < Date.now()) {
    return { valid: false, reason: `Token expirado` };
  }

  const expectedSignature = await signSession(username, role, expiresAt);
  if (expectedSignature !== signature) {
    return { 
      valid: false, 
      reason: `Firma inválida` 
    };
  }

  return { valid: true, role, username };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow next assets, favicon, icon, manifest, and public auth APIs to pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("/icon.svg") ||
    pathname.includes("/ICO-UMP") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  console.log(`[Proxy Auth Check] sessionToken value read from cookie: "${sessionToken}"`);
  
  let isSessionValid = false;
  let userRole = "produccion";
  let userEmail = "";

  if (sessionToken) {
    const result = await verifySession(sessionToken);
    isSessionValid = result.valid;
    if (result.valid) {
      userRole = result.role || "produccion";
      userEmail = result.username || "";
    } else {
      console.warn(`[Proxy Auth Check] Acceso denegado en "${pathname}": ${result.reason}`);
    }
  } else {
    console.warn(`[Proxy Auth Check] Acceso denegado en "${pathname}": No se encontró cookie session_token`);
  }

  // If path is /login and session is valid, redirect to dashboard (/)
  if (pathname === "/login") {
    if (isSessionValid) {
      console.log(`[Proxy Auth Check] Usuario autenticado intentó acceder a /login. Redirigiendo.`);
      const redirectUrl = userRole === "produccion" ? "/inventario" : "/";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
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

  // Role-based route protection
  if (userRole === "produccion") {
    const isAllowedPath =
      pathname.startsWith("/inventario") ||
      pathname.startsWith("/calendario") ||
      pathname.startsWith("/api/auth/logout");

    if (!isAllowedPath) {
      console.warn(`[Proxy Auth Check] Rol "produccion" intentó acceder a "${pathname}". Redirigiendo a /inventario.`);
      return NextResponse.redirect(new URL("/inventario", request.url));
    }
  }

  // Inject current pathname and user info into headers for Server Component layouts to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-user-role", userRole);
  requestHeaders.set("x-user-email", userEmail);

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
     * - manifest.webmanifest
     * - ICO-UMP icons
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|ICO-UMP).*)",
  ],
};
