"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/helpers/classname-helper";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-grayscale-4 bg-grayscale-2 p-0.5 dark:border-grayscale-4/60 dark:bg-grayscale-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLocale("es")}
        aria-label="Cambiar idioma a Español"
        aria-pressed={locale === "es"}
        className={cn(
          "cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase transition-all duration-150",
          locale === "es"
            ? "bg-grayscale-1 text-grayscale-12 shadow-xs dark:bg-grayscale-5 dark:text-grayscale-12"
            : "text-grayscale-9 hover:text-grayscale-12",
        )}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-label="Change language to English"
        aria-pressed={locale === "en"}
        className={cn(
          "cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase transition-all duration-150",
          locale === "en"
            ? "bg-grayscale-1 text-grayscale-12 shadow-xs dark:bg-grayscale-5 dark:text-grayscale-12"
            : "text-grayscale-9 hover:text-grayscale-12",
        )}
      >
        EN
      </button>
    </div>
  );
}
