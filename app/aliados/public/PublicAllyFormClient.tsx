"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CrownIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  HandshakeIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  PencilSimpleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import confetti from "canvas-confetti";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CarnetCard, downloadCarnetAsImage } from "@/components/CarnetModal";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Button from "@/components/public/Button";
import { api } from "@/convex/_generated/api";

type PackageType = "elite" | "vip";

const TOTAL_STEPS = 7;

const slideVariants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 16 : -16,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: (direction: number) => ({
    y: direction < 0 ? 16 : -16,
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function PublicAllyFormClient() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const tokenValidation = useQuery(
    api.allies.validateToken,
    tokenParam ? { token: tokenParam } : "skip",
  );

  const createAlly = useMutation(api.allies.createPublic);

  // Form states
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const [selectedPackage, setSelectedPackage] = useState<PackageType>("vip");
  const [fullName, setFullName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(true);

  const [stepError, setStepError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadingCarnet, setDownloadingCarnet] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    fullName: string;
    idCard: string;
    phone: string;
    email: string;
    whatsappOptIn: boolean;
    package: PackageType;
    packageAmount: number;
    code: string;
  } | null>(null);

  const handleDownloadCarnet = async () => {
    if (!submittedData) return;
    setDownloadingCarnet(true);
    try {
      await downloadCarnetAsImage({
        fullName: submittedData.fullName,
        code: submittedData.code,
        package: submittedData.package,
        idCard: submittedData.idCard,
      });
    } catch (err) {
      console.error("Error al descargar carnet:", err);
    } finally {
      setDownloadingCarnet(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Confetti celebration on completion
  useEffect(() => {
    if (submitted) {
      try {
        const count = 180;
        const defaults = { origin: { y: 0.65 }, zIndex: 9999 };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      } catch (e) {
        console.error("Error firing confetti:", e);
      }
    }
  }, [submitted]);

  // Auto focus input when step changes
  useEffect(() => {
    if (step >= 2 && step <= 5) {
      const focusActiveInput = () => {
        const input = document.querySelector<HTMLInputElement>(
          "main input[type='text'], main input[type='tel'], main input[type='email']",
        );
        input?.focus();
      };

      focusActiveInput();
      const t1 = setTimeout(focusActiveInput, 50);
      const t2 = setTimeout(focusActiveInput, 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [step]);

  // Auto select default package from token if configured
  useEffect(() => {
    if (tokenValidation?.valid && tokenValidation.defaultPackage) {
      setSelectedPackage(tokenValidation.defaultPackage);
    }
  }, [tokenValidation]);

  // Next step validator
  const handleNext = () => {
    setStepError("");

    if (step === 1) {
      if (!selectedPackage) {
        setStepError("Por favor selecciona un paquete para continuar.");
        setShakeKey((prev) => prev + 1);
        return;
      }
    } else if (step === 2) {
      if (!fullName.trim()) {
        setStepError("Ingresa tu nombre completo para continuar.");
        setShakeKey((prev) => prev + 1);
        return;
      }
      if (fullName.trim().length < 3) {
        setStepError("El nombre ingresado es muy corto.");
        setShakeKey((prev) => prev + 1);
        return;
      }
    } else if (step === 3) {
      if (!idCard.trim()) {
        setStepError("Ingresa tu número de cédula o documento.");
        setShakeKey((prev) => prev + 1);
        return;
      }
    } else if (step === 4) {
      if (!phone.trim()) {
        setStepError("Ingresa tu número de celular o WhatsApp.");
        setShakeKey((prev) => prev + 1);
        return;
      }
    } else if (step === 5) {
      if (!email.trim() || !email.includes("@") || !email.includes(".")) {
        setStepError("Ingresa un correo electrónico válido.");
        setShakeKey((prev) => prev + 1);
        return;
      }
    }

    setDirection(1);
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  // Back step
  const handleBack = () => {
    setStepError("");
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Keyboard navigation on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step < TOTAL_STEPS) {
      e.preventDefault();
      handleNext();
    }
  };

  // Final submit
  const handleSubmitFinal = async () => {
    setStepError("");
    setLoading(true);
    try {
      const res = await createAlly({
        fullName: fullName.trim(),
        idCard: idCard.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        whatsappOptIn,
        package: selectedPackage,
        token: tokenParam || undefined,
      });

      setSubmittedData({
        fullName: fullName.trim(),
        idCard: idCard.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        whatsappOptIn,
        package: selectedPackage,
        packageAmount: selectedPackage === "vip" ? 12000 : 10000,
        code: res?.code || "",
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el formulario. Inténtelo nuevamente.";
      setStepError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFullName("");
    setIdCard("");
    setPhone("");
    setEmail("");
    setWhatsappOptIn(true);
    setSelectedPackage("vip");
    setStep(1);
    setSubmitted(false);
    setSubmittedData(null);
    setStepError("");
  };

  const isFormActive =
    !submitted && Boolean(tokenParam) && Boolean(tokenValidation?.valid);
  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="h-[100dvh] w-full bg-grayscale-1 text-grayscale-12 flex flex-col justify-between overflow-hidden selection:bg-grayscale-12 selection:text-grayscale-1">
      {/* TOP HEADER */}
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

          <div className="flex items-center gap-3 sm:gap-4">
            {isFormActive && (
              <span className="font-mono text-xs font-bold text-grayscale-10">
                {step} / {TOTAL_STEPS}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* PROGRESS BAR */}
        {isFormActive && (
          <div className="h-0.5 w-full bg-grayscale-3 dark:bg-grayscale-3 overflow-hidden">
            <motion.div
              className="h-full bg-grayscale-12 dark:bg-grayscale-12"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(progressPercent, 14)}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        )}
      </header>

      {/* IMMERSIVE CENTER CANVAS (FULL SCREEN, NO BOX WRAPPER, NO SCROLL) */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 flex flex-col justify-center items-stretch py-2 overflow-y-auto sm:overflow-hidden">
        {submitted && submittedData ? (
          /* SUCCESS CONFIRMATION VIEW (OPEN & ANIMATED) */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg mx-auto py-2"
          >
            {/* ICON & TITLE */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.05,
                }}
                className="flex size-14 sm:size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3.5 ring-8 ring-emerald-500/5"
              >
                <CheckCircleIcon size={36} weight="fill" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-grayscale-12 font-mono uppercase"
              >
                Registro completado
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="mt-1 text-xs sm:text-sm text-grayscale-10 max-w-sm mx-auto"
              >
                Tu afiliación fue registrada con éxito como aliado de Ultimate
                Media Productions, ¡muchas gracias!
              </motion.p>
            </div>

            {/* ID BANNER (OPEN & MINIMALIST) */}
            {submittedData.code && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
                className="mt-5 flex items-center justify-between pb-3.5 border-b border-grayscale-3 dark:border-grayscale-3"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-grayscale-9 block">
                    Tu ID oficial de aliado
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-grayscale-12 tracking-wider">
                    {submittedData.code}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedData.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2500);
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-bold"
                >
                  {copiedCode ? (
                    <>
                      <CheckIcon
                        size={14}
                        weight="bold"
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <IdentificationCardIcon
                        size={14}
                        weight="bold"
                        className="text-grayscale-10"
                      />
                      <span>Copiar ID</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* OPEN DATA LIST (NO BOX CONTAINER) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-3 text-xs space-y-2"
            >
              <div className="flex justify-between items-center py-1 border-b border-grayscale-3/60 dark:border-grayscale-3/40">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  Nombre
                </span>
                <span className="font-semibold text-grayscale-12 text-right">
                  {submittedData.fullName}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-grayscale-3/60 dark:border-grayscale-3/40">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  Cédula
                </span>
                <span className="font-semibold font-mono text-grayscale-12 text-right">
                  {submittedData.idCard}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-grayscale-3/60 dark:border-grayscale-3/40">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  Celular
                </span>
                <span className="font-semibold font-mono text-grayscale-12 text-right">
                  {submittedData.phone}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-grayscale-3/60 dark:border-grayscale-3/40">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  Correo
                </span>
                <span className="font-semibold text-grayscale-12 truncate max-w-[200px] sm:max-w-xs text-right">
                  {submittedData.email}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-grayscale-3/60 dark:border-grayscale-3/40">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  Paquete
                </span>
                <span className="font-bold font-mono text-grayscale-12 uppercase text-right">
                  {submittedData.package === "vip" ? "VIP" : "Élite"} — ₡
                  {submittedData.packageAmount.toLocaleString("es-CR")}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-grayscale-9 font-mono uppercase text-[11px]">
                  WhatsApp exclusivo
                </span>
                <span className="font-semibold text-grayscale-12 text-right">
                  {submittedData.whatsappOptIn ? "Sí" : "No"}
                </span>
              </div>
            </motion.div>

            {/* 3D LEVITATING CARNET PREVIEW */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="mt-6 mb-4 w-full flex flex-col items-center"
            >
              <CarnetCard
                data={{
                  fullName: submittedData.fullName,
                  code: submittedData.code,
                  package: submittedData.package,
                  idCard: submittedData.idCard,
                }}
              />
            </motion.div>

            {/* ACTION BUTTONS */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="mt-5 flex flex-col items-center gap-2"
            >
              {/* DOWNLOAD CARNET BUTTON */}
              <Button
                variant="primary"
                onClick={handleDownloadCarnet}
                disabled={downloadingCarnet}
                className="w-full sm:w-auto px-8 py-3 text-sm font-bold shadow-xl cursor-pointer justify-center"
              >
                <DownloadSimpleIcon size={18} weight="bold" />
                <span>
                  {downloadingCarnet
                    ? "Generando carnet..."
                    : "Descargar / Guardar carnet"}
                </span>
              </Button>
              <p className="text-[11px] text-grayscale-9 text-center font-mono">
                En dispositivos móviles puedes guardarlo directamente en tu galería de fotos o compartirlo.
              </p>
            </motion.div>
          </motion.div>
        ) : !tokenParam ? (
          /* NO TOKEN PROVIDED */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto py-8 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-grayscale-3 text-grayscale-11 mx-auto mb-4 border border-grayscale-4 shadow-sm">
              <LockKeyIcon size={32} weight="bold" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-grayscale-12 font-mono uppercase">
              Enlace protegido
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-grayscale-10 max-w-sm mx-auto leading-relaxed">
              Para registrarte como aliado de Ultimate Media Productions,
              solicita tu enlace personalizado de registro una vez confirmado tu
              pago.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                href={`https://wa.me/50670609325?text=${encodeURIComponent(
                  "Hola, me gustaría solicitar un enlace de registro para el programa de Aliados de Ultimate Media Productions.",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                className="px-6 py-2.5 text-xs font-bold"
              >
                <span>Contactar por WhatsApp</span>
              </Button>
            </div>
          </motion.div>
        ) : tokenValidation === undefined ? (
          /* LOADING TOKEN VALIDATION */
          <div className="w-full max-w-md mx-auto py-12 flex flex-col items-center justify-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-grayscale-4 border-t-grayscale-12" />
            <p className="text-xs font-mono text-grayscale-10">
              Validando enlace de registro...
            </p>
          </div>
        ) : !tokenValidation.valid ? (
          /* INVALID OR ALREADY USED TOKEN */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto py-8 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-4 ring-8 ring-amber-500/5">
              <WarningCircleIcon size={32} weight="bold" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-grayscale-12 font-mono uppercase">
              {tokenValidation.reason === "already_used"
                ? "Enlace ya utilizado"
                : "Enlace no válido"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-grayscale-10 max-w-sm mx-auto leading-relaxed">
              {tokenValidation.reason === "already_used"
                ? "Este enlace de registro de un solo uso ya fue completado previamente. Si necesitas registrar a otro miembro o renovar tu membresía, solicita un nuevo enlace."
                : "El token de este enlace no es válido o ha expirado. Por favor solicita un nuevo enlace de registro a Ultimate Media Productions."}
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                href={`https://wa.me/50670609325?text=${encodeURIComponent(
                  "Hola, mi enlace de registro de aliado ya fue utilizado o no es válido. ¿Me pueden generar uno nuevo?",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                className="px-6 py-2.5 text-xs font-bold"
              >
                <span>Solicitar nuevo enlace por WhatsApp</span>
              </Button>
            </div>
          </motion.div>
        ) : (
          /* QUESTION CANVAS WITHOUT CONTAINER */
          <div className="w-full">
            <AnimatePresence mode="wait" custom={direction}>
              {/* STEP 1: SELECT PACKAGE */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 1 — Membresía
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Elige tu paquete de aliado
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Selecciona el nivel de beneficios para afiliarte a la
                      plataforma.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 max-w-2xl">
                    {/* PAQUETE VIP (12K DESTACADO) */}
                    <button
                      type="button"
                      onClick={() => setSelectedPackage("vip")}
                      className={`relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all text-left focus:outline-none w-full ${
                        selectedPackage === "vip"
                          ? "border-grayscale-12 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 ring-2 ring-grayscale-12/20 dark:ring-grayscale-1/20 shadow-md"
                          : "border-grayscale-4 bg-grayscale-1/80 dark:border-grayscale-4 dark:bg-grayscale-3/40 hover:border-grayscale-12"
                      }`}
                    >
                      <div className="absolute -top-2.5 right-4 rounded-full bg-grayscale-12 px-3 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-grayscale-1 shadow-sm dark:bg-grayscale-1 dark:text-grayscale-12">
                        Acceso VIP
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CrownIcon
                            size={22}
                            weight="fill"
                            className="text-amber-500 dark:text-amber-400"
                          />
                          <span className="font-bold text-base text-grayscale-12">
                            Paquete VIP
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="pkgChoice"
                          aria-label="Seleccionar paquete VIP"
                          checked={selectedPackage === "vip"}
                          onChange={() => setSelectedPackage("vip")}
                          className="size-4 text-grayscale-12 border-grayscale-4 focus:ring-grayscale-12"
                        />
                      </div>

                      <div className="mt-2.5">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-grayscale-12">
                          ₡12.000
                        </span>
                        <span className="text-xs text-grayscale-9 ml-1 font-mono">
                          colones
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-grayscale-11 font-medium leading-relaxed">
                        Acceso prioritario total, contenido premium VIP y
                        beneficios exclusivos de producción.
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-grayscale-4/70 dark:border-grayscale-5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-grayscale-3 px-2 py-0.5 text-[10px] font-mono font-semibold text-grayscale-12 dark:bg-grayscale-4">
                          <CheckCircleIcon
                            size={11}
                            weight="bold"
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                          <span>Contenido VIP</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-grayscale-3 px-2 py-0.5 text-[10px] font-mono font-semibold text-grayscale-12 dark:bg-grayscale-4">
                          <CheckCircleIcon
                            size={11}
                            weight="bold"
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                          <span>Prioridad total</span>
                        </span>
                      </div>
                    </button>

                    {/* PAQUETE ELITE (10K) */}
                    <button
                      type="button"
                      onClick={() => setSelectedPackage("elite")}
                      className={`relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all text-left focus:outline-none w-full ${
                        selectedPackage === "elite"
                          ? "border-grayscale-12 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 ring-2 ring-grayscale-12/20 dark:ring-grayscale-1/20 shadow-md"
                          : "border-grayscale-4 bg-grayscale-1/80 dark:border-grayscale-4 dark:bg-grayscale-3/40 hover:border-grayscale-12"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheckIcon
                            size={20}
                            weight={
                              selectedPackage === "elite" ? "fill" : "regular"
                            }
                            className={
                              selectedPackage === "elite"
                                ? "text-grayscale-12"
                                : "text-grayscale-9"
                            }
                          />
                          <span className="font-bold text-base text-grayscale-12">
                            Paquete Élite
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="pkgChoice"
                          aria-label="Seleccionar paquete Élite"
                          checked={selectedPackage === "elite"}
                          onChange={() => setSelectedPackage("elite")}
                          className="size-4 text-grayscale-12 border-grayscale-4 focus:ring-grayscale-12"
                        />
                      </div>

                      <div className="mt-2.5">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-grayscale-12">
                          ₡10.000
                        </span>
                        <span className="text-xs text-grayscale-9 ml-1 font-mono">
                          colones
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-grayscale-10 leading-relaxed">
                        Acceso preferencial a producciones, soporte y contenido
                        de la comunidad.
                      </p>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: NOMBRE COMPLETO */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 2 — Identidad
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      ¿Cuál es tu nombre completo?
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Ingresa tu nombre y apellidos tal como figuran en tu
                      documento.
                    </p>
                  </div>

                  <div className="pt-2">
                    <motion.div
                      key={shakeKey}
                      animate={
                        shakeKey > 0 && !fullName.trim()
                          ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                          : {}
                      }
                      transition={{ duration: 0.3 }}
                      className="relative flex items-center"
                    >
                      <div
                        className={`pointer-events-none absolute left-0 transition-colors ${
                          stepError ? "text-rose-500" : "text-grayscale-9"
                        }`}
                      >
                        <UserIcon size={24} />
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        autoFocus
                        value={fullName}
                        onChange={(e) => {
                          if (stepError) setStepError("");
                          setFullName(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej. Kirian Luna Quiros"
                        className={`w-full bg-transparent border-b-2 pl-9 pr-2 py-3 text-lg sm:text-2xl font-medium placeholder:text-grayscale-7 focus:outline-none transition-colors ${
                          stepError
                            ? "border-rose-500 text-rose-600 dark:text-rose-400"
                            : "border-grayscale-4 text-grayscale-12 focus:border-grayscale-12"
                        }`}
                      />
                    </motion.div>
                    {stepError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400"
                      >
                        <span className="size-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                        <span>{stepError}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: CEDULA / IDENTIFICACION */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 3 — Documento
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Número de cédula o identificación
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Utilizaremos este número para validar tu membresía
                      oficial.
                    </p>
                  </div>

                  <div className="pt-2">
                    <motion.div
                      key={shakeKey}
                      animate={
                        shakeKey > 0 && !idCard.trim()
                          ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                          : {}
                      }
                      transition={{ duration: 0.3 }}
                      className="relative flex items-center"
                    >
                      <div
                        className={`pointer-events-none absolute left-0 transition-colors ${
                          stepError ? "text-rose-500" : "text-grayscale-9"
                        }`}
                      >
                        <IdentificationCardIcon size={24} />
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        autoFocus
                        value={idCard}
                        onChange={(e) => {
                          if (stepError) setStepError("");
                          setIdCard(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej. 1-1234-0567"
                        className={`w-full bg-transparent border-b-2 pl-9 pr-2 py-3 text-lg sm:text-2xl font-mono font-medium placeholder:text-grayscale-7 focus:outline-none transition-colors ${
                          stepError
                            ? "border-rose-500 text-rose-600 dark:text-rose-400"
                            : "border-grayscale-4 text-grayscale-12 focus:border-grayscale-12"
                        }`}
                      />
                    </motion.div>
                    {stepError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400"
                      >
                        <span className="size-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                        <span>{stepError}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: CELULAR */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 4 — Contacto directo
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Tu número de celular o WhatsApp
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Para coordinaciones directas y acceso prioritario.
                    </p>
                  </div>

                  <div className="pt-2">
                    <motion.div
                      key={shakeKey}
                      animate={
                        shakeKey > 0 && !phone.trim()
                          ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                          : {}
                      }
                      transition={{ duration: 0.3 }}
                      className="relative flex items-center"
                    >
                      <div
                        className={`pointer-events-none absolute left-0 transition-colors ${
                          stepError ? "text-rose-500" : "text-grayscale-9"
                        }`}
                      >
                        <PhoneIcon size={24} />
                      </div>
                      <input
                        ref={inputRef}
                        type="tel"
                        autoFocus
                        value={phone}
                        onChange={(e) => {
                          if (stepError) setStepError("");
                          setPhone(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej. 8888-8888"
                        className={`w-full bg-transparent border-b-2 pl-9 pr-2 py-3 text-lg sm:text-2xl font-mono font-medium placeholder:text-grayscale-7 focus:outline-none transition-colors ${
                          stepError
                            ? "border-rose-500 text-rose-600 dark:text-rose-400"
                            : "border-grayscale-4 text-grayscale-12 focus:border-grayscale-12"
                        }`}
                      />
                    </motion.div>
                    {stepError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400"
                      >
                        <span className="size-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                        <span>{stepError}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: CORREO ELECTRONICO */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 5 — Correo electrónico
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Tu correo electrónico
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Para el envío de avisos y notificaciones de tu cuenta.
                    </p>
                  </div>

                  <div className="pt-2">
                    <motion.div
                      key={shakeKey}
                      animate={
                        shakeKey > 0 && !email.trim()
                          ? { x: [-6, 6, -4, 4, -2, 2, 0] }
                          : {}
                      }
                      transition={{ duration: 0.3 }}
                      className="relative flex items-center"
                    >
                      <div
                        className={`pointer-events-none absolute left-0 transition-colors ${
                          stepError ? "text-rose-500" : "text-grayscale-9"
                        }`}
                      >
                        <EnvelopeSimpleIcon size={24} />
                      </div>
                      <input
                        ref={inputRef}
                        type="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          if (stepError) setStepError("");
                          setEmail(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="nombre@ejemplo.com"
                        className={`w-full bg-transparent border-b-2 pl-9 pr-2 py-3 text-lg sm:text-2xl font-medium placeholder:text-grayscale-7 focus:outline-none transition-colors ${
                          stepError
                            ? "border-rose-500 text-rose-600 dark:text-rose-400"
                            : "border-grayscale-4 text-grayscale-12 focus:border-grayscale-12"
                        }`}
                      />
                    </motion.div>
                    {stepError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400"
                      >
                        <span className="size-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                        <span>{stepError}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 6: WHATSAPP EXCLUSIVO */}
              {step === 6 && (
                <motion.div
                  key="step-6"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 6 — Comunidad WhatsApp
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Contenido exclusivo por WhatsApp
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      ¿Deseas recibir primicias, material detrás de cámaras y
                      avisos prioritarios directamente en tu WhatsApp?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWhatsappOptIn(true)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition-all flex items-center justify-between gap-3 ${
                        whatsappOptIn === true
                          ? "border-grayscale-12 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 ring-2 ring-grayscale-12/15 shadow-sm"
                          : "border-grayscale-4 bg-grayscale-1/80 hover:border-grayscale-5 dark:border-grayscale-4 dark:bg-grayscale-3/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]">
                          <svg
                            viewBox="0 0 24 24"
                            className="size-6 fill-current"
                            role="img"
                            aria-label="WhatsApp"
                          >
                            <title>WhatsApp</title>
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8.01 12.27C8.14 12.44 9.76 14.94 12.24 16C12.83 16.26 13.28 16.41 13.64 16.53C14.23 16.72 14.77 16.69 15.2 16.63C15.68 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 13.99C16.32 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.93 13.95 10.96 13.09C10.2 12.42 9.7 11.59 9.55 11.34C9.4 11.09 9.53 10.96 9.65 10.84C9.77 10.72 9.91 10.54 10.03 10.4C10.15 10.26 10.2 10.16 10.28 10C10.36 9.83 10.32 9.69 10.26 9.56C10.2 9.44 9.72 8.24 9.51 7.75C9.31 7.27 9.11 7.34 8.95 7.33C8.81 7.33 8.67 7.33 8.53 7.33Z" />
                          </svg>
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-grayscale-12">
                            Sí, deseo recibirlo
                          </span>
                          <span className="text-[11px] text-grayscale-10">
                            Acceso directo a novedades
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="whatsappChoice"
                        aria-label="Sí, deseo recibir contenido por WhatsApp"
                        checked={whatsappOptIn === true}
                        onChange={() => setWhatsappOptIn(true)}
                        className="size-4 text-grayscale-12 border-grayscale-4 focus:ring-grayscale-12"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappOptIn(false)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition-all flex items-center justify-between gap-3 ${
                        whatsappOptIn === false
                          ? "border-grayscale-12 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 ring-2 ring-grayscale-12/15 shadow-sm"
                          : "border-grayscale-4 bg-grayscale-1/80 hover:border-grayscale-5 dark:border-grayscale-4 dark:bg-grayscale-3/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-grayscale-3 text-grayscale-10 dark:bg-grayscale-4">
                          <CheckCircleIcon size={22} />
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-grayscale-12">
                            No por ahora
                          </span>
                          <span className="text-[11px] text-grayscale-10">
                            Solo contacto esencial
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="whatsappChoice"
                        aria-label="No deseo recibir contenido por WhatsApp"
                        checked={whatsappOptIn === false}
                        onChange={() => setWhatsappOptIn(false)}
                        className="size-4 text-grayscale-12 border-grayscale-4 focus:ring-grayscale-12"
                      />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 7: REVISIÓN FINAL */}
              {step === 7 && (
                <motion.div
                  key="step-7"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 max-w-xl"
                >
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-9 block mb-1">
                      Paso 7 — Confirmación final
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-grayscale-12">
                      Revisa tus datos
                    </h1>
                    <p className="text-xs sm:text-sm text-grayscale-10 mt-1">
                      Verifica que todo esté correcto antes de completar tu
                      registro.
                    </p>
                  </div>

                  {/* SUMMARY REVIEW PILLS */}
                  <div className="rounded-2xl border border-grayscale-3 bg-grayscale-2/60 p-4 text-xs space-y-2.5 dark:border-grayscale-4 dark:bg-grayscale-3/40">
                    <div className="flex justify-between items-center py-1 border-b border-grayscale-3 dark:border-grayscale-4/60">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        Paquete
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-grayscale-12 uppercase">
                          {selectedPackage === "vip"
                            ? "VIP (₡12.000)"
                            : "Élite (₡10.000)"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDirection(-1);
                            setStep(1);
                          }}
                          className="text-grayscale-9 hover:text-grayscale-12 p-1 cursor-pointer"
                          title="Editar paquete"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-grayscale-3 dark:border-grayscale-4/60">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        Nombre
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-grayscale-12">
                          {fullName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDirection(-1);
                            setStep(2);
                          }}
                          className="text-grayscale-9 hover:text-grayscale-12 p-1 cursor-pointer"
                          title="Editar nombre"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-grayscale-3 dark:border-grayscale-4/60">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        Cédula
                      </span>
                      <span className="font-semibold font-mono text-grayscale-12">
                        {idCard}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-grayscale-3 dark:border-grayscale-4/60">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        Celular
                      </span>
                      <span className="font-semibold font-mono text-grayscale-12">
                        {phone}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-grayscale-3 dark:border-grayscale-4/60">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        Correo
                      </span>
                      <span className="font-semibold text-grayscale-12 truncate max-w-[190px] sm:max-w-xs">
                        {email}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="font-mono text-grayscale-9 uppercase text-[11px]">
                        WhatsApp exclusivo
                      </span>
                      <span className="font-semibold text-grayscale-12">
                        {whatsappOptIn ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>

                  {stepError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400"
                    >
                      <span className="size-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                      <span>{stepError}</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* DOCKED BOTTOM BAR */}
      {isFormActive && (
        <footer className="h-16 sm:h-20 shrink-0 border-t border-grayscale-3/70 bg-grayscale-1/90 backdrop-blur-md dark:border-grayscale-2/70 z-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-8 h-full flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={handleBack}
                className="gap-1.5 text-xs font-semibold"
              >
                <ArrowLeftIcon size={14} weight="bold" />
                <span>Atrás</span>
              </Button>
            ) : (
              <span className="text-xs text-grayscale-9 font-mono select-none">
                Producciones UMP
              </span>
            )}

            <div className="flex items-center gap-3">
              {step < TOTAL_STEPS ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="gap-2 px-6 py-2 text-xs font-bold uppercase font-mono tracking-wider"
                >
                  <span>Continuar</span>
                  <ArrowRightIcon size={14} weight="bold" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={loading}
                  onClick={() => handleSubmitFinal()}
                  className="gap-2 px-7 py-2 text-xs font-bold uppercase font-mono tracking-wider shadow-md"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="animate-spin size-4 text-grayscale-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        role="img"
                        aria-label="Cargando"
                      >
                        <title>Cargando</title>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Completando...
                    </span>
                  ) : (
                    <>
                      <CheckIcon size={15} weight="bold" />
                      <span>Completar registro</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
