"use client";

import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CrownIcon,
  DownloadSimpleIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import Input from "@/components/public/Input";
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
  const [downloading, setDownloading] = useState(false);

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
    <div className="min-h-screen w-full bg-grayscale-1 text-grayscale-12 flex flex-col justify-between selection:bg-grayscale-12 selection:text-grayscale-1">
      {/* HEADER */}
      <header className="h-16 shrink-0 border-b border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 z-20 sticky top-0">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-5 sm:h-6 w-auto" />
            <span className="text-grayscale-6 dark:text-grayscale-5 text-sm select-none">
              |
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
              Verificación Oficial
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center">
        {/* TOP SEARCH BAR */}
        <div className="w-full mb-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                id="search-code"
                placeholder="Ingresar código (ej: AL-ABC123)..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="font-mono uppercase pl-9"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-9 pointer-events-none">
                <QrCodeIcon size={18} />
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2 text-xs font-bold font-mono uppercase"
            >
              <MagnifyingGlassIcon size={14} weight="bold" />
              <span>Verificar</span>
            </Button>
          </form>
        </div>

        {/* VERIFICATION STATE DISPLAY */}
        {!activeCode.trim() ? (
          /* EMPTY PROMPT */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 max-w-md"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-grayscale-3 text-grayscale-11 mx-auto mb-4 border border-grayscale-4 shadow-sm">
              <QrCodeIcon size={32} />
            </div>
            <h1 className="text-xl font-bold font-mono uppercase text-grayscale-12">
              Escanear código QR
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-grayscale-10 leading-relaxed">
              Enfoca con la cámara de tu teléfono el código QR del carnet o
              escribe el código en la barra superior para verificar el estado de
              afiliación.
            </p>
          </motion.div>
        ) : verification === undefined ? (
          /* LOADING SPINNER */
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
            <p className="text-xs font-mono text-grayscale-10">
              Consultando registro en tiempo real...
            </p>
          </div>
        ) : isValid && ally ? (
          /* VERIFIED ACTIVE AFFILIATE */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full space-y-6"
          >
            {/* STATUS BANNER */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 ring-4 ring-emerald-500/10">
                <CheckCircleIcon size={28} weight="fill" />
              </div>
              <span className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 block">
                Membresía Oficial Verificada
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-grayscale-12 uppercase mt-0.5 tracking-tight">
                {ally.fullName}
              </h1>
              <p className="text-xs text-grayscale-10 mt-1">
                Afiliado activo y autorizado de Ultimate Media Productions.
              </p>
            </div>

            {/* DATA DETAILS GRID */}
            <div className="rounded-2xl border border-grayscale-3 bg-grayscale-2/60 p-4 text-xs space-y-3 dark:border-grayscale-4 dark:bg-grayscale-3/40">
              <div className="flex justify-between items-center pb-2 border-b border-grayscale-3 dark:border-grayscale-4/60">
                <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                  Código Oficial
                </span>
                <span className="font-mono text-sm font-black text-grayscale-12">
                  #{ally.code}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-grayscale-3 dark:border-grayscale-4/60">
                <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                  Paquete de Afiliación
                </span>
                <div className="flex items-center gap-1.5">
                  {ally.package === "vip" ? (
                    <>
                      <CrownIcon
                        size={16}
                        weight="fill"
                        className="text-amber-500"
                      />
                      <Badge variant="accent">PAQUETE VIP</Badge>
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon size={16} className="text-grayscale-11" />
                      <Badge variant="gray">PAQUETE ÉLITE</Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-grayscale-3 dark:border-grayscale-4/60">
                <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                  Identificación
                </span>
                <span className="font-mono font-bold text-grayscale-12">
                  {maskIdCard(ally.idCard)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-grayscale-3 dark:border-grayscale-4/60">
                <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                  Fecha de Emisión
                </span>
                <span className="font-mono font-bold text-grayscale-12">
                  {formattedDate}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                  Vigencia
                </span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  <CalendarCheckIcon size={14} weight="bold" />
                  <span>Válido hasta {validityText}</span>
                </div>
              </div>
            </div>

            {/* OFFICIAL DIGITAL CARNET PREVIEW */}
            <div className="w-full pt-2">
              <div className="text-center mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-grayscale-9">
                  Carnet Oficial Digital
                </span>
              </div>
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

            {/* ACTIONS */}
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2 px-6 py-2.5 text-xs font-bold font-mono uppercase"
              >
                <DownloadSimpleIcon size={16} weight="bold" />
                <span>
                  {downloading
                    ? "Generando..."
                    : "Descargar carnet en alta resolución"}
                </span>
              </Button>
            </div>
          </motion.div>
        ) : isExpired && ally ? (
          /* EXPIRED MEMBERSHIP */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center py-6 space-y-4"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto ring-6 ring-amber-500/5">
              <WarningCircleIcon size={32} weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono uppercase text-grayscale-12">
                Membresía Expirada
              </h1>
              <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                La afiliación de <strong className="text-grayscale-12">{ally.fullName}</strong> (#{ally.code}) ha superado su fecha de vigencia.
              </p>
            </div>
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3 text-xs font-mono text-grayscale-11 dark:border-grayscale-4 dark:bg-grayscale-3">
              Fecha de emisión: {formattedDate} — Expiró: {validityText}
            </div>
          </motion.div>
        ) : isPending && ally ? (
          /* PENDING PAYMENT */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center py-6 space-y-4"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto ring-6 ring-amber-500/5">
              <WarningCircleIcon size={32} weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono uppercase text-grayscale-12">
                Pago Pendiente
              </h1>
              <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                La membresía de <strong className="text-grayscale-12">{ally.fullName}</strong> (#{ally.code}) se encuentra registrada pero su pago está pendiente de confirmación.
              </p>
            </div>
          </motion.div>
        ) : isNotFound ? (
          /* NOT FOUND */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center py-6 space-y-4"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto ring-6 ring-rose-500/5">
              <XCircleIcon size={32} weight="bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono uppercase text-grayscale-12">
                Código No Registrado
              </h1>
              <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                No se encontró ningún afiliado activo con el código <span className="font-mono font-bold text-grayscale-12">{activeCode}</span>.
              </p>
            </div>
            <p className="text-[11px] text-grayscale-9">
              Verifica que el código escaneado o escrito sea el correcto.
            </p>
          </motion.div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="h-14 shrink-0 border-t border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 flex items-center justify-center">
        <span className="text-[11px] font-mono text-grayscale-9">
          Ultimate Media Productions — Sistema Oficial de Verificación
        </span>
      </footer>
    </div>
  );
}

export default function AllyVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-grayscale-1 flex items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
        </div>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
