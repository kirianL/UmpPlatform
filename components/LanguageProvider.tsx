"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Locale = "es" | "en";

type TranslationDictionary = typeof es;

const dictionaries: Record<Locale, TranslationDictionary> = {
  es,
  en,
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "es",
  setLocale: () => {},
  t: (path: string) => path,
});

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({
  children,
  defaultLocale = "es",
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Read preference from cookie or localStorage
    const savedCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ump_locale="))
      ?.split("=")[1];

    const savedStorage =
      typeof window !== "undefined"
        ? (localStorage.getItem("ump_locale") as Locale | null)
        : null;

    const initialLocale = (savedCookie || savedStorage) as Locale;
    if (initialLocale === "es" || initialLocale === "en") {
      setLocaleState(initialLocale);
      document.documentElement.lang = initialLocale;
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    startTransition(() => {
      setLocaleState(newLocale);
    });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ump_locale", newLocale);
        // biome-ignore lint/suspicious/noDocumentCookie: client-side cookie assignment for Next.js SSR locale
        document.cookie = `ump_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = newLocale;
      } catch (err) {
        console.error("Error saving locale:", err);
      }
    }
  };

  const t = (
    path: string,
    params?: Record<string, string | number>,
  ): string => {
    const activeDict = dictionaries[locale] as unknown as Record<
      string,
      unknown
    >;
    const fallbackDict = dictionaries.es as unknown as Record<string, unknown>;

    let text =
      getNestedValue(activeDict, path) ??
      getNestedValue(fallbackDict, path) ??
      path;

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        text = text.replace(
          new RegExp(`\\{\\{?${key}\\}?\\}`, "g"),
          String(value),
        );
      }
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
