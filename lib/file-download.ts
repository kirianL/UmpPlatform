"use client";

import { useEffect, useState } from "react";

/**
 * Detect if current device is running iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || window.navigator.vendor || "";
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isAppleTouch;
}

/**
 * Helper to convert Base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const arr = dataUrl.split(",");
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Error converting Data URL to Blob:", e);
    return null;
  }
}

/**
 * Custom React hook to convert a base64 PDF Data URL to a native Blob URL for proper iframe rendering & scrolling
 */
export function usePdfBlobUrl(fileUrl?: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) {
      setBlobUrl(null);
      return;
    }

    if (fileUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(fileUrl);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    }

    setBlobUrl(fileUrl);
  }, [fileUrl]);

  return blobUrl;
}

/**
 * Robust cross-browser file download handler supporting iOS (iPhone/iPad), Android, and Desktop
 */
export async function downloadFile(
  fileUrl?: string,
  fileName = "guion.pdf",
  fallbackContent?: string,
): Promise<void> {
  if (!fileUrl && !fallbackContent) return;

  const sanitizeName = (name: string) => {
    let clean = name.trim();
    if (
      !clean.toLowerCase().endsWith(".pdf") &&
      !clean.toLowerCase().endsWith(".txt")
    ) {
      clean += ".pdf";
    }
    return clean;
  };

  const finalName = sanitizeName(fileName);

  try {
    let blob: Blob | null = null;

    // 1. Convert Data URL to Blob
    if (fileUrl && fileUrl.startsWith("data:")) {
      blob = dataUrlToBlob(fileUrl);
    } else if (
      fileUrl &&
      (fileUrl.startsWith("http://") ||
        fileUrl.startsWith("https://") ||
        fileUrl.startsWith("blob:"))
    ) {
      try {
        const res = await fetch(fileUrl);
        blob = await res.blob();
      } catch (fetchErr) {
        console.warn(
          "Could not fetch remote fileUrl for blob creation:",
          fetchErr,
        );
      }
    } else if (fallbackContent) {
      const isPdfName = finalName.toLowerCase().endsWith(".pdf");
      const mimeType = isPdfName
        ? "application/pdf"
        : "text/plain;charset=utf-8";
      blob = new Blob([fallbackContent], { type: mimeType });
    }

    // 2. iOS Specific Handling (iPhone / iPad / Safari)
    if (isIOS()) {
      if (blob) {
        const mime = blob.type || "application/pdf";
        const file = new File([blob], finalName, { type: mime });

        // iOS Native Web Share API (Triggers native iOS "Guardar en Archivos" / Share Sheet)
        if (
          typeof navigator !== "undefined" &&
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: finalName,
            });
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === "AbortError") {
              return; // User explicitly dismissed the iOS Share Sheet
            }
          }
        }

        // Fallback for iOS: Open Blob URL in a new tab so Safari opens native viewer with Save/Share options
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          window.location.href = blobUrl;
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
        return;
      }

      if (fileUrl) {
        const win = window.open(fileUrl, "_blank");
        if (!win) {
          window.location.href = fileUrl;
        }
        return;
      }
    }

    // 3. Desktop / Android Standard Download Trigger
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
    }

    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = finalName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error("Error in downloadFile:", err);
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  }
}
