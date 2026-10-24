"use client";

import { useAuth } from "@/components/AuthProvider";

export const SYSTEM_ACCOUNTS = [
  { email: "admin@ultimate.cr", name: "Administrador UMP" },
  { email: "michelle@ultimate.cr", name: "Michelle" },
  { email: "tatiana@ultimate.cr", name: "Tatiana" },
  { email: "eymar@ultimate.cr", name: "Eymar" },
  { email: "kirian@ultimate.cr", name: "Kirian" },
];

export function useNotesAuth() {
  const { userRole, userEmail } = useAuth();
  const email = userEmail?.toLowerCase() ?? "";
  const isAdmin =
    userRole === "admin" ||
    userRole === "programador" ||
    email === "admin@ultimate.cr" ||
    email === "kirian@ultimate.cr";

  const userName =
    SYSTEM_ACCOUNTS.find((account) => account.email === email)?.name ||
    userEmail ||
    "Usuario";

  return {
    userEmail,
    userName,
    isAdmin,
    authArgs: { actorEmail: userEmail || "", isAdmin },
  };
}

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
});

/** Fecha corta en texto, por ejemplo "24 oct". */
export function formatShortDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date).replace(".", "");
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export async function downloadFile(url: string, filename?: string) {
  try {
    const safeName = (filename || "imagen-proyecto")
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .toLowerCase();

    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/^data:([^;]+);/);
      let ext = "png";
      if (mimeMatch && mimeMatch[1]) {
        const mime = mimeMatch[1];
        if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        else if (mime.includes("webp")) ext = "webp";
        else if (mime.includes("gif")) ext = "gif";
      }
      const finalName = safeName.includes(".") ? safeName : `${safeName}.${ext}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeName.includes(".") ? safeName : `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "imagen-proyecto";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

