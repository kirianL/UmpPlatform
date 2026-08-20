"use client";

import React, { createContext, useContext } from "react";

interface AuthContextValue {
  userRole: string;
  userEmail: string;
}

const AuthContext = createContext<AuthContextValue>({
  userRole: "produccion",
  userEmail: "",
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
  return (
    <AuthContext.Provider value={{ userRole, userEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
