import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "fallback_secret_for_ump_platform_2026";

// Helper to convert ArrayBuffer to Base64Url (Edge Runtime compatible)
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to sign session data
async function signSession(
  username: string,
  role: string,
  expiresAt: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = `${username}.${role}.${expiresAt}`;
  const keyData = encoder.encode(SESSION_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );
  return arrayBufferToBase64Url(signature);
}

async function verifySession(token: string): Promise<{
  valid: boolean;
  role?: string;
  username?: string;
  reason?: string;
}> {
  if (!token) return { valid: false, reason: "Token vacío" };
  const parts = token.split(".");
  if (parts.length < 4)
    return {
      valid: false,
      reason: "Formato de token inválido (menos de 4 partes)",
    };

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
      reason: `Firma inválida`,
    };
  }

  return { valid: true, role, username };
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

interface UserPermissions {
  role?: string;
  allowedRoutes?: string[];
}

async function fetchUserPermissions(
  email: string,
): Promise<UserPermissions | null> {
  if (!CONVEX_URL || !email) return null;
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "users:getByEmail",
        args: { email: email.trim().toLowerCase() },
        format: "json",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === "success" && data.value) {
      return {
        role: data.value.role,
        allowedRoutes: Array.isArray(data.value.allowedRoutes)
          ? data.value.allowedRoutes
          : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function isAdminUser(role: string, email: string): boolean {
  const lowerEmail = email.toLowerCase();
  return (
    role === "admin" ||
    role === "programador" ||
    lowerEmail === "admin@ultimate.cr" ||
    lowerEmail === "kirian@ultimate.cr"
  );
}

function getDefaultRoute(
  allowedRoutes: string[] | null,
  role: string,
  email: string,
): string {
  if (isAdminUser(role, email)) return "/";

  const lowerEmail = email.toLowerCase();

  if (allowedRoutes) {
    if (allowedRoutes.length === 0) return "/";
    if (lowerEmail.includes("ginger") && allowedRoutes.includes("/clientes")) {
      return "/clientes";
    }
    if (lowerEmail.includes("michelle") && allowedRoutes.includes("/notas")) {
      return "/notas";
    }
    if (
      (lowerEmail.includes("bryan") || role === "bryan") &&
      allowedRoutes.includes("/calendario")
    ) {
      return "/calendario";
    }
    if (role === "produccion" && allowedRoutes.includes("/inventario")) {
      return "/inventario";
    }
    if (role === "actores" && allowedRoutes.includes("/calendario-actores")) {
      return "/calendario-actores";
    }
    return allowedRoutes[0];
  }

  if (lowerEmail.includes("ginger")) return "/clientes";
  if (lowerEmail.includes("bryan") || role === "bryan") return "/calendario";
  if (lowerEmail.includes("michelle")) return "/notas";
  if (role === "produccion") return "/inventario";
  if (role === "directorio") return "/notas";
  if (role === "actores") return "/calendario-actores";
  return "/";
}

function isRouteInAllowedList(pathname: string, allowedRoutes: string[]): boolean {
  if (pathname.startsWith("/api/")) return true;
  return allowedRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow next assets, favicon, icon, manifest, logos, public APIs, and public verification/form routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/guiones/public") ||
    pathname.startsWith("/calendario-actores/public") ||
    pathname.startsWith("/aliados/public") ||
    pathname.startsWith("/aliados/verificar") ||
    pathname.startsWith("/v/") ||
    pathname.startsWith("/logos") ||
    pathname.startsWith("/ICO-UMP") ||
    pathname.startsWith("/static") ||
    pathname.includes("/icon.svg") ||
    pathname.includes("/ICO-UMP") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    /\.(svg|png|jpg|jpeg|webp|gif|ico|json|woff2?|ttf|css|js)$/i.test(pathname)
  ) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const sessionToken = request.cookies.get("session_token")?.value;
  console.log(
    `[Proxy Auth Check] sessionToken value read from cookie: "${sessionToken}"`,
  );

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
      console.warn(
        `[Proxy Auth Check] Acceso denegado en "${pathname}": ${result.reason}`,
      );
    }
  } else {
    console.warn(
      `[Proxy Auth Check] Acceso denegado en "${pathname}": No se encontró cookie session_token`,
    );
  }

  // Resolve dynamic permissions from Convex when session is valid
  let allowedRoutes: string[] | null = null;
  if (isSessionValid && userEmail) {
    const userPerms = await fetchUserPermissions(userEmail);
    if (userPerms) {
      if (userPerms.role) userRole = userPerms.role;
      if (userPerms.allowedRoutes !== undefined) {
        allowedRoutes = userPerms.allowedRoutes;
      }
    }
  }

  // If path is /login and session is valid, redirect to appropriate start page
  if (pathname === "/login") {
    if (isSessionValid) {
      console.log(
        `[Proxy Auth Check] Usuario autenticado intentó acceder a /login. Redirigiendo.`,
      );
      const redirectUrl = getDefaultRoute(allowedRoutes, userRole, userEmail);
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

  const isAdmin = isAdminUser(userRole, userEmail);

  // Permisos route & user management API protection: only admin or programador
  if (pathname.startsWith("/permisos") || pathname.startsWith("/api/users")) {
    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      console.warn(
        `[Proxy Auth Check] Usuario no autorizado intentó acceder a "${pathname}". Redirigiendo.`,
      );
      const fallbackUrl = getDefaultRoute(allowedRoutes, userRole, userEmail);
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }
  }

  // Dynamic route protection based on Convex allowedRoutes
  if (!isAdmin && allowedRoutes !== null) {
    if (allowedRoutes.length === 0) {
      if (pathname !== "/" && !pathname.startsWith("/api/")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } else if (!isRouteInAllowedList(pathname, allowedRoutes)) {
      const fallbackUrl = getDefaultRoute(allowedRoutes, userRole, userEmail);
      if (pathname !== fallbackUrl) {
        console.warn(
          `[Proxy Auth Check] Usuario "${userEmail}" intentó acceder a "${pathname}" sin permiso. Redirigiendo a ${fallbackUrl}.`,
        );
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }
    }
  } else if (!isAdmin && allowedRoutes === null) {
    // Fallback role-based route protection when allowedRoutes is not set in DB
    if (userRole === "actores") {
      const isAllowedPath =
        pathname.startsWith("/calendario-actores") ||
        pathname.startsWith("/personal") ||
        pathname.startsWith("/tareas") ||
        pathname.startsWith("/notas") ||
        pathname.startsWith("/api/");

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/calendario-actores", request.url));
      }
    }

    const isEymar = userEmail.toLowerCase().includes("eymar");

    if (userRole === "produccion") {
      const isAllowedPath =
        pathname.startsWith("/inventario") ||
        pathname.startsWith("/calendario") ||
        pathname.startsWith("/guiones") ||
        pathname.startsWith("/calendario-actores") ||
        pathname.startsWith("/tareas") ||
        pathname.startsWith("/notas") ||
        pathname.startsWith("/brainstorm") ||
        (isEymar && pathname.startsWith("/noticias")) ||
        pathname.startsWith("/api/");

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/inventario", request.url));
      }
    }

    const isMichelle = userEmail.toLowerCase().includes("michelle");
    const isBryan = userEmail.toLowerCase().includes("bryan") || userRole === "bryan";

    if (isBryan) {
      const isAllowedPath =
        pathname.startsWith("/calendario") ||
        pathname.startsWith("/notas") ||
        pathname.startsWith("/inventario") ||
        pathname.startsWith("/tareas") ||
        pathname.startsWith("/api/");

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/calendario", request.url));
      }
    }

    if (userRole === "directorio" || isMichelle) {
      const isAllowedPath =
        pathname.startsWith("/notas") ||
        pathname.startsWith("/tareas") ||
        pathname.startsWith("/inventario") ||
        pathname.startsWith("/personal") ||
        pathname.startsWith("/calendario-actores") ||
        pathname.startsWith("/calendario") ||
        pathname.startsWith("/clientes") ||
        pathname.startsWith("/api/");

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/notas", request.url));
      }
    }

    const isGinger = userEmail.toLowerCase().includes("ginger");

    if (isGinger || userRole === "ventas" || userRole === "comercial") {
      const isAllowedPath =
        pathname.startsWith("/clientes") ||
        pathname.startsWith("/notas") ||
        pathname.startsWith("/calendario-actores") ||
        pathname.startsWith("/calendario") ||
        pathname.startsWith("/noticias") ||
        pathname.startsWith("/tareas") ||
        pathname.startsWith("/api/");

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/clientes", request.url));
      }
    }
  }

  // Inject current pathname and user info into headers for Server Component layouts to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-user-role", userRole);
  requestHeaders.set("x-user-email", userEmail);
  if (allowedRoutes !== null) {
    requestHeaders.set("x-allowed-routes", JSON.stringify(allowedRoutes));
  }

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
     * - favicon.ico
     * - icon.svg
     * - manifest.webmanifest
     * - sw.js
     * - ICO-UMP icons
     * - logos
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|ICO-UMP|logos).*)",
  ],
};
