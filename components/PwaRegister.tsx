"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development mode, unregister active service workers to prevent stale CSS caching
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    // In production, register /sw.js
    if (!("workbox" in window)) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully with scope: ", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed: ", err);
        });
    }
  }, []);

  return null;
}

