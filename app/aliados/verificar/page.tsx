"use client";

import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CrownIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CarnetCard,
  getAutomaticExpiration,
  getDefaultFormattedDate,
} from "@/components/CarnetModal";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/convex/_generated/api";

function maskIdCard(idCard?: string): string {
  if (!idCard) return "No registrada";
  const trimmed = idCard.trim();
  if (trimmed.length <= 4) return trimmed;
  const start = trimmed.slice(0, 2);
  const end = trimmed.slice(-3);
  return `${start}****${end}`;
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [searchCode, setSearchCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);

  useEffect(() => {
    const codeParam = searchParams.get("code") || "";
    if (codeParam) {
      setSearchCode(codeParam);
      setActiveCode(codeParam);
    }
  }, [searchParams]);

  const verification = useQuery(
    api.allies.verifyByCode,
    activeCode.trim() ? { code: activeCode.trim() } : "skip",
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setActiveCode(searchCode.trim());
    }
  };

  const ally = verification?.ally;
  const isValid = verification?.status === "valid";
  const isExpired = verification?.status === "expired";
  const isPending = verification?.status === "pending_payment";
  const isNotFound =
    activeCode.trim() !== "" &&
    verification !== undefined &&
    (!verification.found || verification.status === "not_found");

  const formattedDate = ally?.createdAt
    ? new Date(ally.createdAt).toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : getDefaultFormattedDate();

  const expirationInfo = getAutomaticExpiration(formattedDate);
  const validityText = expirationInfo.value;

  return (
    <div className="h-[100dvh] w-full bg-grayscale-1 text-grayscale-12 flex flex-col justify-between overflow-hidden selection:bg-grayscale-12 selection:text-grayscale-1">
      {/* HEADER */}
      <header className="h-14 shrink-0 border-b border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 z-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-5 sm:h-6 w-auto" />
            <span className="text-grayscale-6 dark:text-grayscale-5 text-sm select-none">
              |
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
              Verificador de Aliados
            </span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* FIXED TOP SEARCH BAR FOR BUSINESS USE */}
      <div className="w-full shrink-0 border-b border-grayscale-3/50 bg-grayscale-2/40 px-4 py-2.5 dark:border-grayscale-3/30 dark:bg-grayscale-2/20">
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto max-w-lg flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              id="search-code"
              placeholder="Escanear o ingresar código (ej: AL-88K29P)..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full bg-grayscale-1 border border-grayscale-4 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono uppercase text-grayscale-12 placeholder:text-grayscale-8 focus:outline-none focus:border-grayscale-12 transition-colors dark:bg-grayscale-3"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none">
              <QrCodeIcon size={14} />
            </div>
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase bg-grayscale-12 text-grayscale-1 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            Verificar
          </button>
        </form>
      </div>

      {/* SINGLE SCREEN VIEWPORT CONTAINER */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-2 flex flex-col items-center justify-center overflow-hidden">
        {!activeCode.trim() ? (
          /* EMPTY STATE */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 max-w-sm"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-grayscale-3 text-grayscale-11 mx-auto mb-2.5 border border-grayscale-4 shadow-sm">
              <QrCodeIcon size={24} />
            </div>
            <h1 className="text-sm font-bold font-mono uppercase text-grayscale-12">
              Terminal de Verificación
            </h1>
            <p className="mt-1 text-xs text-grayscale-10 leading-relaxed">
              Enfoca el código QR con la cámara del dispositivo o escribe el
              código de afiliado en la barra superior.
            </p>
          </motion.div>
        ) : verification === undefined ? (
          /* LOADING */
          <div className="py-8 flex flex-col items-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
            <p className="text-xs font-mono text-grayscale-10">
              Validando afiliación...
            </p>
          </div>
        ) : isValid && ally ? (
          /* VALID AFFILIATE VIEW (CARNET FIRST, MINIMAL BUSINESS DETAILS) */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center"
          >
            {/* 1. CARNET HERO (IMAGEN PRIMERO) */}
            <div className="w-full max-w-[390px]">
              <CarnetCard
                data={{
                  fullName: ally.fullName,
                  code: ally.code,
                  package: ally.package as "vip" | "elite",
                  idCard: ally.idCard,
                  date: formattedDate,
                  validityMonth: validityText,
                }}
              />
            </div>

            {/* 2. BUSINESS STATUS & DETAILS (NO AI-STYLE PILLS) */}
            <div className="w-full max-w-[390px] mt-2.5 rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 text-xs dark:border-grayscale-4 dark:bg-grayscale-3/40 space-y-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-grayscale-3/60 dark:border-grayscale-4/40">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                  Estado
                </span>
                <span className="font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Activo / Vigente
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                  Afiliado
                </span>
                <span className="font-semibold text-grayscale-12 truncate max-w-[200px] text-right">
                  {ally.fullName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                  Membresía
                </span>
                <span className="font-mono font-bold text-grayscale-12 uppercase">
                  {ally.package === "vip" ? "VIP" : "Élite"} (#{ally.code})
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-grayscale-3/60 dark:border-grayscale-4/40">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                  Válido hasta
                </span>
                <span className="font-mono font-bold text-grayscale-12">
                  {validityText}
                </span>
              </div>
            </div>
          </motion.div>
        ) : isExpired && ally ? (
          /* EXPIRED */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center py-4 space-y-2"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto">
              <WarningCircleIcon size={24} weight="bold" />
            </div>
            <h1 className="text-sm font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
              Membresía Vencida
            </h1>
            <p className="text-xs font-semibold text-grayscale-12">
              {ally.fullName} (#{ally.code})
            </p>
            <p className="text-xs font-mono text-grayscale-10">
              Período de vigencia finalizado el {validityText}.
            </p>
          </motion.div>
        ) : isPending && ally ? (
          /* PENDING PAYMENT */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center py-4 space-y-2"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto">
              <WarningCircleIcon size={24} weight="bold" />
            </div>
            <h1 className="text-sm font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
              Pago Pendiente
            </h1>
            <p className="text-xs font-semibold text-grayscale-12">
              {ally.fullName} (#{ally.code})
            </p>
            <p className="text-xs text-grayscale-10">
              Membresía no confirmada para acceso a beneficios.
            </p>
          </motion.div>
        ) : isNotFound ? (
          /* NOT FOUND */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center py-4 space-y-2"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto">
              <XCircleIcon size={24} weight="bold" />
            </div>
            <h1 className="text-sm font-mono font-bold uppercase text-rose-600 dark:text-rose-400">
              Código No Registrado
            </h1>
            <p className="text-xs font-mono text-grayscale-10">
              No existe afiliado con el código <span className="text-grayscale-12 font-bold">{activeCode}</span>.
            </p>
          </motion.div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="h-10 shrink-0 border-t border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 flex items-center justify-center text-center px-4 z-20">
        <p className="text-[10px] font-mono text-grayscale-9 text-center">
          Ultimate Media Productions · Terminal de Validación
        </p>
      </footer>
    </div>
  );
}

export default function AllyVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-full bg-grayscale-1 flex items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
        </div>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
