"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AuthContextValue {
  userRole: string;
  userEmail: string;
  userName: string;
  allowedRoutes?: string[];
  isAdmin: boolean;
  isLoading: boolean;
  canAccess: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userRole: "produccion",
  userEmail: "",
  userName: "",
  isAdmin: false,
  isLoading: false,
  canAccess: () => true,
});

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.includes("/public") ||
    pathname.startsWith("/aliados/verificar") ||
    pathname.startsWith("/v/")
  );
}

function matchRoutePrefix(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AuthProvider({
  children,
  userRole = "produccion",
  userEmail = "",
  initialAllowedRoutes,
}: {
  children: React.ReactNode;
  userRole?: string;
  userEmail?: string;
  initialAllowedRoutes?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const userDoc = useQuery(
    api.users.getByEmail,
    userEmail ? { email: userEmail } : "skip"
  );

  const effectiveRole = userDoc?.role || userRole;
  const isAdmin =
    effectiveRole === "admin" ||
    effectiveRole === "programador" ||
    userEmail.toLowerCase() === "admin@ultimate.cr" ||
    userEmail.toLowerCase() === "kirian@ultimate.cr";

  const allowedRoutes =
    userDoc !== undefined ? userDoc?.allowedRoutes : initialAllowedRoutes;
  const isLoading =
    Boolean(userEmail) &&
    userDoc === undefined &&
    initialAllowedRoutes === undefined;

  useEffect(() => {
    if (isLoading || isAdmin || !pathname || isPublicRoute(pathname)) return;
    if (!allowedRoutes || !Array.isArray(allowedRoutes)) return;

    if (allowedRoutes.length === 0) {
      if (pathname !== "/") {
        router.replace("/");
      }
      return;
    }

    const isAllowed = allowedRoutes.some((route) =>
      matchRoutePrefix(pathname, route)
    );
    if (!isAllowed) {
      const lowerEmail = userEmail.toLowerCase();
      const target =
        lowerEmail.includes("michelle") && allowedRoutes.includes("/notas")
          ? "/notas"
          : lowerEmail.includes("ginger") && allowedRoutes.includes("/clientes")
            ? "/clientes"
            : allowedRoutes[0];
      router.replace(target);
    }
  }, [isLoading, isAdmin, pathname, allowedRoutes, userEmail, router]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      userRole: effectiveRole,
      userEmail,
      userName: userDoc?.name || "",
      allowedRoutes,
      isAdmin,
      isLoading,
      canAccess: (route: string) => {
        if (isAdmin) return true;
        if (isLoading) return false;
        if (allowedRoutes && Array.isArray(allowedRoutes)) {
          return allowedRoutes.includes(route);
        }
        // Fallback default rules if allowedRoutes is not explicitly set in DB
        const isBryan =
          userEmail.toLowerCase().includes("bryan") || effectiveRole === "bryan";
        if (isBryan) {
          return ["/calendario", "/notas", "/inventario", "/tareas"].includes(route);
        }
        const isGinger =
          userEmail.toLowerCase().includes("ginger") ||
          effectiveRole === "ventas" ||
          effectiveRole === "comercial";
        if (isGinger) {
          return ["/clientes", "/calendario", "/calendario-actores", "/noticias"].includes(route);
        }
        if (effectiveRole === "actores") {
          return ["/calendario-actores", "/personal", "/tareas", "/notas"].includes(route);
        }
        if (effectiveRole === "produccion") {
          const list = ["/inventario", "/calendario", "/guiones", "/calendario-actores", "/tareas", "/notas", "/brainstorm"];
          if (userEmail.toLowerCase().includes("eymar")) list.push("/noticias");
          return list.includes(route);
        }
        if (effectiveRole === "directorio" || userEmail.toLowerCase().includes("michelle")) {
          return ["/clientes", "/personal", "/calendario-actores", "/inventario", "/tareas", "/notas"].includes(route);
        }
        return true;
      },
    };
  }, [effectiveRole, userEmail, userDoc?.name, allowedRoutes, isAdmin, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
