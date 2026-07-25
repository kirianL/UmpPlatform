"use client";

import { useEffect, useState } from "react";

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
 * Robust cross-browser file download handler for desktop and mobile
 */
export function downloadFile(fileUrl?: string, fileName = "archivo.pdf", fallbackContent?: string): void {
  if (!fileUrl && !fallbackContent) return;

  try {
    // 1. Data URL (Base64)
    if (fileUrl && fileUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(fileUrl);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        return;
      }
    }

    // 2. HTTP/HTTPS or Blob URL
    if (fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://") || fileUrl.startsWith("blob:"))) {
      fetch(fileUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        })
        .catch(() => {
          const windowRef = window.open(fileUrl, "_blank");
          if (!windowRef) {
            window.location.href = fileUrl;
          }
        });
      return;
    }

    // 3. Fallback text content
    if (fallbackContent) {
      const blob = new Blob([fallbackContent], { type: "text/plain;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const downloadName = fileName.endsWith(".pdf") ? fileName.replace(/\.pdf$/, ".txt") : fileName;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    }
  } catch (err) {
    console.error("Error al descargar archivo:", err);
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  }
}
