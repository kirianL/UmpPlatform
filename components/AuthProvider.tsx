"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AuthContextValue {
  userRole: string;
  userEmail: string;
  userName: string;
  allowedRoutes?: string[];
  isAdmin: boolean;
  canAccess: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userRole: "produccion",
  userEmail: "",
  userName: "",
  isAdmin: false,
  canAccess: () => true,
});

export function AuthProvider({
  children,
  userRole = "produccion",
  userEmail = "",
}: {
  children: React.ReactNode;
  userRole?: string;
  userEmail?: string;
}) {
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

  const allowedRoutes = userDoc?.allowedRoutes;

  const value = useMemo<AuthContextValue>(() => {
    return {
      userRole: effectiveRole,
      userEmail,
      userName: userDoc?.name || "",
      allowedRoutes,
      isAdmin,
      canAccess: (route: string) => {
        if (isAdmin) return true;
        if (allowedRoutes && Array.isArray(allowedRoutes)) {
          return allowedRoutes.includes(route);
        }
        // Fallback default rules if allowedRoutes is not explicitly set yet
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
  }, [effectiveRole, userEmail, userDoc?.name, allowedRoutes, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
