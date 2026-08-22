"use client";

import {
  CalendarCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  CrownIcon,
  HandshakeIcon,
  KeyIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  TagIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CarnetCard,
  getAutomaticExpiration,
  getDefaultFormattedDate,
} from "@/components/CarnetModal";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import Modal from "@/components/public/Modal";
import { api } from "@/convex/_generated/api";

function maskIdCard(idCard?: string): string {
  if (!idCard) return "No registrada";
  const trimmed = idCard.trim();
  if (trimmed.length <= 4) return trimmed;
  const start = trimmed.slice(0, 2);
  const end = trimmed.slice(-3);
  return `${start}****${end}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHour = String(hours).padStart(2, "0");
  return `${day}/${month} ${formattedHour}:${mins} ${ampm}`;
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [searchCode, setSearchCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);

  // Redemption PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<any | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

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

  const allyBenefitsData = useQuery(
    api.benefits.getBenefitsForAlly,
    activeCode.trim() ? { allyCode: activeCode.trim() } : "skip",
  );

  const redeemBenefitMutation = useMutation(api.benefits.redeemBenefit);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setActiveCode(searchCode.trim());
      setRedeemSuccess(null);
      setPinError("");
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

  const benefitsList = allyBenefitsData?.benefits || [];

  const handleOpenRedeem = (benefit: any) => {
    setSelectedBenefit(benefit);
    setPinError("");
    setEnteredPin("");
    setPinModalOpen(true);
  };

  const handleExecuteRedeem = async (benefit: any, pin: string) => {
    setRedeeming(true);
    setPinError("");
    try {
      await redeemBenefitMutation({
        allyCode: activeCode.trim(),
        benefitId: benefit._id,
        pin: pin.trim(),
        businessId: benefit.businessId,
      });

      setPinModalOpen(false);
      setEnteredPin("");
      setRedeemSuccess(`Beneficio "${benefit.title}" canjeado con éxito.`);
      setTimeout(() => setRedeemSuccess(null), 4000);
    } catch (err: any) {
      const errorMsg = err?.message || "Error al canjear el beneficio.";
      setPinError(errorMsg);
      setShakeKey((prev) => prev + 1);

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([35, 45, 35]);
        } catch (_) {}
      }

      setPinModalOpen(true);
    } finally {
      setRedeeming(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin.trim()) {
      setPinError("Ingresa el PIN de 4 dígitos.");
      setShakeKey((prev) => prev + 1);
      return;
    }
    if (selectedBenefit) {
      handleExecuteRedeem(selectedBenefit, enteredPin.trim());
    }
  };

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
      <div className="w-full shrink-0 border-b border-grayscale-3/50 bg-grayscale-2/40 px-4 py-2 dark:border-grayscale-3/30 dark:bg-grayscale-2/20">
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

      {/* SUCCESS TOAST MESSAGE */}
      {redeemSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-emerald-500/10 border-b border-emerald-500/20 py-1.5 px-4 text-center text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
        >
          {redeemSuccess}
        </motion.div>
      )}

      {/* SINGLE SCREEN VIEWPORT CONTAINER */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-2 flex flex-col items-center justify-start overflow-y-auto sm:overflow-hidden">
        {!activeCode.trim() ? (
          /* EMPTY STATE */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 max-w-sm m-auto"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-grayscale-3 text-grayscale-11 mx-auto mb-2.5 border border-grayscale-4 shadow-sm">
              <QrCodeIcon size={24} />
            </div>
            <h1 className="text-sm font-bold font-mono uppercase text-grayscale-12">
              Terminal de Validación
            </h1>
            <p className="mt-1 text-xs text-grayscale-10 leading-relaxed">
              Enfoca el código QR del carnet con la cámara o escribe el código
              para consultar beneficios y aplicar descuentos.
            </p>
          </motion.div>
        ) : verification === undefined ? (
          /* LOADING */
          <div className="py-12 flex flex-col items-center gap-2 m-auto">
            <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
            <p className="text-xs font-mono text-grayscale-10">
              Validando afiliación...
            </p>
          </div>
        ) : isValid && ally ? (
          /* VALID AFFILIATE VIEW (CARNET FIRST + DISCOUNTS CHECKLIST) */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center gap-2"
          >
            {/* 1. CARNET HERO (IMAGEN PRIMERO) */}
            <div className="w-full max-w-[370px]">
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

            {/* 2. BUSINESS STATUS METADATA */}
            <div className="w-full max-w-[370px] rounded-xl border border-grayscale-3 bg-grayscale-2/60 px-3 py-2 text-xs dark:border-grayscale-4 dark:bg-grayscale-3/40 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9 block">
                  Estado
                </span>
                <span className="font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Activo · {ally.package === "vip" ? "VIP" : "Élite"}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9 block">
                  Vigencia
                </span>
                <span className="font-mono text-xs font-bold text-grayscale-12">
                  Hasta {validityText}
                </span>
              </div>
            </div>

            {/* 3. BENEFITS & DISCOUNTS CHECKLIST (CANJE PARA NEGOCIOS) */}
            <div className="w-full max-w-[370px] rounded-xl border border-grayscale-3 bg-grayscale-1 p-2.5 dark:border-grayscale-4 dark:bg-grayscale-2/50 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-grayscale-3/60 dark:border-grayscale-4/60 pb-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-10 flex items-center gap-1">
                  <TagIcon size={12} weight="bold" />
                  <span>Beneficios aplicables</span>
                </span>
                <span className="font-mono text-[10px] text-grayscale-9">
                  {benefitsList.length} disponibles
                </span>
              </div>

              {benefitsList.length === 0 ? (
                <p className="text-[11px] font-mono text-grayscale-9 text-center py-2">
                  No hay beneficios configurados para este tipo de membresía.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                  {benefitsList.map((b) => (
                    <div
                      key={b._id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                        b.isRedeemed
                          ? "border-grayscale-3 bg-grayscale-2/50 opacity-60 dark:border-grayscale-4 dark:bg-grayscale-3/20"
                          : "border-grayscale-4 bg-grayscale-2/30 hover:border-grayscale-12 dark:border-grayscale-4/80 dark:bg-grayscale-3/30"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p
                          className={`font-semibold text-xs truncate ${
                            b.isRedeemed
                              ? "line-through text-grayscale-9"
                              : "text-grayscale-12"
                          }`}
                        >
                          {b.title}
                        </p>
                        <p className="font-mono text-[10px] text-grayscale-9 truncate">
                          {b.businessName} ·{" "}
                          {b.frequency === "monthly"
                            ? "1 al mes"
                            : b.frequency === "once"
                              ? "Único"
                              : "Por visita"}
                        </p>
                        {b.isRedeemed && b.lastRedeemedAt && (
                          <p className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Canjeado: {formatDateTime(b.lastRedeemedAt)}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {b.isRedeemed ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-grayscale-9 bg-grayscale-3 px-2 py-1 rounded">
                            <CheckIcon size={11} weight="bold" />
                            <span>Canjeado</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={redeeming}
                            onClick={() => handleOpenRedeem(b)}
                            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-grayscale-12 text-grayscale-1 hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Canjear
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : isExpired && ally ? (
          /* EXPIRED */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center py-6 space-y-2 m-auto"
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
            className="w-full max-w-sm text-center py-6 space-y-2 m-auto"
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
            className="w-full max-w-sm text-center py-6 space-y-2 m-auto"
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

      {/* PIN AUTHORIZATION MODAL */}
      <Modal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="Autorización de Canje"
      >
        <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
          <div className="rounded-xl bg-grayscale-2 p-3 text-xs dark:bg-grayscale-3 space-y-1">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Beneficio a canjear
            </span>
            <p className="font-bold text-grayscale-12">
              {selectedBenefit?.title}
            </p>
            <p className="font-mono text-xs text-grayscale-10">
              Comercio: {selectedBenefit?.businessName}
            </p>
          </div>

          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.38, ease: "easeInOut" }}
            className="flex flex-col gap-1.5"
          >
            <label
              htmlFor="partner-pin"
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9 flex items-center justify-between"
            >
              <span>PIN de 4 dígitos del local</span>
              {selectedBenefit?.businessName && (
                <span className="text-grayscale-10 text-[9px] font-normal">
                  ({selectedBenefit.businessName})
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="partner-pin"
                type="password"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  if (pinError) setPinError("");
                }}
                className={`w-full bg-grayscale-1 border rounded-xl px-3.5 py-2.5 text-center font-mono text-xl tracking-[0.3em] text-grayscale-12 focus:outline-none transition-all duration-200 dark:bg-grayscale-3 ${
                  pinError
                    ? "border-rose-500 bg-rose-500/5 ring-2 ring-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "border-grayscale-4 focus:border-grayscale-12"
                }`}
              />
            </div>

            <AnimatePresence mode="wait">
              {pinError && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex items-center gap-1.5 text-xs font-mono text-rose-600 dark:text-rose-400 pt-0.5"
                >
                  <WarningCircleIcon
                    size={14}
                    weight="bold"
                    className="shrink-0"
                  />
                  <span>{pinError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPinModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={redeeming || !enteredPin.trim()}
            >
              {redeeming ? "Validando..." : "Confirmar Canje"}
            </Button>
          </div>
        </form>
      </Modal>
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
