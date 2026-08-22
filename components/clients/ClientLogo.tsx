"use client";

import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";

interface ClientLogoProps {
  logoUrl?: string;
  name?: string;
  company?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function getCompanyInitials(company?: string, name?: string): string {
  const source = (company || name || "").trim();
  if (!source) return "CL";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function ClientLogo({
  logoUrl,
  name,
  company,
  size = "md",
  className = "",
}: ClientLogoProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when logoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const initials = getCompanyInitials(company, name);

  const sizeClasses = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
    xl: "size-16 text-lg",
  };

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 18,
    lg: 22,
    xl: 28,
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (logoUrl && !imgError) {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-lg border border-grayscale-4 bg-white shadow-xs dark:border-grayscale-5 dark:bg-grayscale-2 ${currentSizeClass} ${className}`}
      >
        <img
          src={logoUrl}
          alt={company || name || "Logo de cliente"}
          className="h-full w-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 font-mono font-bold uppercase rounded-lg border border-grayscale-4 bg-grayscale-3 text-grayscale-12 shadow-xs dark:border-grayscale-5 dark:bg-grayscale-3 dark:text-grayscale-12 ${currentSizeClass} ${className}`}
      title={company || name || "Cliente"}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <BuildingsIcon
          size={iconSizes[size] || 18}
          className="text-grayscale-9"
        />
      )}
    </div>
  );
}
