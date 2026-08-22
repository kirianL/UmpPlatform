"use client";

import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CrownIcon,
  DownloadSimpleIcon,
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
  downloadCarnetAsImage,
  getAutomaticExpiration,
  getDefaultFormattedDate,
} from "@/components/CarnetModal";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import { api } from "@/convex/_generated/api";

function VerificationContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [searchCode, setSearchCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);
  const [downloading, setDownloading] = useState(false);
  const [showSearch, setShowSearch] = useState(!initialCode);

  useEffect(() => {
    const codeParam = searchParams.get("code") || "";
    if (codeParam) {
      setSearchCode(codeParam);
      setActiveCode(codeParam);
      setShowSearch(false);
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
      setShowSearch(false);
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

  const handleDownload = async () => {
    if (!ally) return;
    setDownloading(true);
    try {
      await downloadCarnetAsImage({
        fullName: ally.fullName,
        code: ally.code,
        package: ally.package as "vip" | "elite",
        idCard: ally.idCard,
        date: formattedDate,
        validityMonth: validityText,
      });
    } catch (err) {
      console.error("Error al descargar carnet:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-grayscale-1 text-grayscale-12 flex flex-col justify-between overflow-hidden selection:bg-grayscale-12 selection:text-grayscale-1">
      {/* COMPACT TOP HEADER */}
      <header className="h-14 sm:h-16 shrink-0 border-b border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 z-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-5 sm:h-6 w-auto" />
            <span className="text-grayscale-6 dark:text-grayscale-5 text-sm select-none">
              |
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
              Aliados UMP
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSearch((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border border-grayscale-4 bg-grayscale-2 hover:bg-grayscale-3 dark:border-grayscale-4 dark:bg-grayscale-3 text-grayscale-11 hover:text-grayscale-12 transition-colors cursor-pointer"
            >
              <MagnifyingGlassIcon size={13} weight="bold" />
              <span>Buscar</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* SINGLE SCREEN HERO BODY */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center py-2 overflow-y-auto sm:overflow-hidden">
        {/* OPTIONAL SEARCH BAR TOGGLE */}
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-3 shrink-0"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  id="search-code"
                  autoFocus
                  placeholder="Código de aliado (ej: AL-88K29P)..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full bg-grayscale-2 border border-grayscale-4 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-grayscale-12 placeholder:text-grayscale-8 focus:outline-none focus:border-grayscale-12 transition-colors dark:bg-grayscale-3"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="px-3.5 py-2 text-xs font-bold font-mono uppercase"
              >
                <span>Consultar</span>
              </Button>
            </form>
          </motion.div>
        )}

        {/* VERIFICATION STATE DISPLAY */}
        {!activeCode.trim() ? (
          /* EMPTY PROMPT */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 max-w-sm"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-grayscale-3 text-grayscale-11 mx-auto mb-3 border border-grayscale-4 shadow-sm">
              <QrCodeIcon size={28} />
            </div>
            <h1 className="text-lg font-bold font-mono uppercase text-grayscale-12">
              Verificación de Afiliado
            </h1>
            <p className="mt-1 text-xs text-grayscale-10 leading-relaxed">
              Enfoca el código QR de un carnet con la cámara de tu celular o
              escribe el código en el buscador para consultar su autenticidad.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowSearch(true)}
                className="text-xs font-mono font-semibold px-4 py-2"
              >
                <MagnifyingGlassIcon size={14} />
                <span>Ingresar código manual</span>
              </Button>
            </div>
          </motion.div>
        ) : verification === undefined ? (
          /* LOADING SPINNER */
          <div className="py-12 flex flex-col items-center gap-2.5">
            <div className="size-7 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
            <p className="text-xs font-mono text-grayscale-10">
              Verificando membresía...
            </p>
          </div>
        ) : isValid && ally ? (
          /* VERIFIED ACTIVE AFFILIATE: CARNET FIRST AS HERO */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center justify-center"
          >
            {/* STATUS BADGE PILL */}
            <div className="mb-3.5 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-950/40 shadow-xs">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Afiliado Verificado</span>
              </span>
            </div>

            {/* 3D CARNET HERO */}
            <div className="w-full max-w-[420px] px-1">
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

            {/* MINIMALIST DATA SUMMARY */}
            <div className="w-full max-w-[420px] mt-3 pt-2.5 pb-1 border-t border-grayscale-3/70 dark:border-grayscale-4/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-grayscale-9 text-[11px] uppercase">
                  Membresía
                </span>
                <span className="font-bold text-grayscale-12 uppercase">
                  {ally.package === "vip" ? "VIP" : "Élite"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-grayscale-11 text-[11px]">
                <CalendarCheckIcon size={13} className="text-emerald-500" />
                <span>Hasta {validityText}</span>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="mt-3 flex items-center justify-center">
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2 px-5 py-2 text-xs font-bold font-mono uppercase rounded-xl border border-grayscale-4"
              >
                <DownloadSimpleIcon size={14} weight="bold" />
                <span>
                  {downloading ? "Generando..." : "Descargar carnet"}
                </span>
              </Button>
            </div>
          </motion.div>
        ) : isExpired && ally ? (
          /* EXPIRED MEMBERSHIP */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center py-4 space-y-3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Membresía Vencida</span>
            </span>
            <h1 className="text-base font-bold text-grayscale-12">
              {ally.fullName} (#{ally.code})
            </h1>
            <p className="text-xs text-grayscale-10 leading-relaxed">
              Esta membresía de afiliado ha superado su período de vigencia (Venció el {validityText}).
            </p>
          </motion.div>
        ) : isPending && ally ? (
          /* PENDING PAYMENT */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center py-4 space-y-3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span>Pago Pendiente</span>
            </span>
            <h1 className="text-base font-bold text-grayscale-12">
              {ally.fullName} (#{ally.code})
            </h1>
            <p className="text-xs text-grayscale-10">
              La afiliación está registrada pero pendiente de confirmación de pago.
            </p>
          </motion.div>
        ) : isNotFound ? (
          /* NOT FOUND */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center py-4 space-y-3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <span>No Registrado</span>
            </span>
            <p className="text-xs text-grayscale-10">
              No se encontró ningún afiliado activo con el código <strong className="font-mono text-grayscale-12">{activeCode}</strong>.
            </p>
          </motion.div>
        ) : null}
      </main>

      {/* CENTERED MINIMAL FOOTER */}
      <footer className="h-12 shrink-0 border-t border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 flex items-center justify-center text-center px-4 z-20">
        <p className="text-[11px] font-mono text-grayscale-9 text-center">
          Ultimate Media Productions · Verificación Oficial
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
