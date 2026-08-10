"use client";

import {
  KeyIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface VaultSecurityGateProps {
  onUnlock: () => void;
}

const CORRECT_PIN = "182612";
const PIN_SLOTS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"];

export default function VaultSecurityGate({
  onUnlock,
}: VaultSecurityGateProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [isShaking, setIsShaking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const verifyPin = (fullPin: string) => {
    if (fullPin === CORRECT_PIN) {
      setIsSuccess(true);
      setHasError(false);
      // Holds the success animation for 2.0s (1s longer than before) so the user enjoys the unlock sequence
      setTimeout(() => {
        onUnlock();
      }, 2000);
    } else {
      setIsShaking(true);
      setHasError(true);
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      setTimeout(() => {
        setIsShaking(false);
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
      }, 650);
    }
  };

  const handleChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    const fullCode = newPin.join("");
    if (fullCode.length === 6) {
      verifyPin(fullCode);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setPin(digits);
      digits.forEach((d, i) => {
        const input = inputRefs.current[i];
        if (input) {
          input.value = d;
        }
      });
      verifyPin(pastedData);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={
          isShaking
            ? { x: [-10, 10, -7, 7, -4, 4, 0], opacity: 1, y: 0 }
            : { opacity: 1, y: 0 }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* DIRECT CLEAN ICON (NO CONTAINER BOX) */}
        <motion.div
          animate={
            isSuccess
              ? { scale: [1, 1.25, 1.1], rotate: [0, 8, -8, 0] }
              : isShaking
                ? { rotate: [0, -6, 6, -4, 4, 0] }
                : { scale: 1 }
          }
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="mb-4 flex items-center justify-center"
        >
          {isSuccess ? (
            <ShieldCheckIcon size={52} weight="fill" className="text-green-9" />
          ) : hasError ? (
            <WarningCircleIcon size={52} weight="fill" className="text-red-9" />
          ) : (
            <LockKeyIcon size={52} weight="fill" className="text-accent-9" />
          )}
        </motion.div>

        {/* HEADER */}
        <h3 className="text-base font-bold font-mono uppercase text-grayscale-12 tracking-wide mb-1">
          Bóveda Protegida
        </h3>
        <p className="text-xs text-grayscale-9 mb-6 max-w-xs leading-relaxed">
          Introduce tu PIN de seguridad de 6 dígitos para acceder a las claves.
        </p>

        {/* 6-DIGIT OTP PIN INPUTS WITH HIDDEN CARET & ANIMATED TYPING */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 justify-center w-full py-3 px-1">
          {pin.map((digit, index) => {
            const isFilled = !!digit;
            const isFocused = focusedIndex === index;

            return (
              <motion.div
                key={PIN_SLOTS[index]}
                animate={
                  isSuccess
                    ? {
                        scale: 1.08,
                        y: -6,
                      }
                    : isFilled
                      ? { scale: 1.06, y: 0 }
                      : { scale: 1, y: 0 }
                }
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 18,
                  delay: isSuccess ? index * 0.08 : 0,
                }}
                className="relative"
              >
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  style={{ caretColor: "transparent" }}
                  className={`size-11 sm:size-12 text-center font-mono text-lg sm:text-xl font-bold rounded-xl border bg-grayscale-1 text-grayscale-12 outline-none cursor-pointer transition-colors duration-200 dark:bg-grayscale-3 caret-transparent ${
                    hasError
                      ? "border-red-9 ring-2 ring-red-9/30 bg-red-9/5 text-red-9"
                      : isSuccess
                        ? "border-green-9 ring-2 ring-green-9/30 bg-green-9/5 text-green-9"
                        : isFocused
                          ? "border-accent-9 ring-2 ring-accent-9/30"
                          : isFilled
                            ? "border-grayscale-6 font-black dark:border-grayscale-5"
                            : "border-grayscale-4 dark:border-grayscale-5"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ERROR OR SUCCESS STATUS MESSAGES */}
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-mono font-semibold text-red-9 mb-4 flex items-center gap-1.5"
            >
              <WarningCircleIcon size={14} weight="bold" />
              Código PIN incorrecto. Reintenta.
            </motion.p>
          )}

          {isSuccess && (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-mono font-semibold text-green-9 mb-4 flex items-center gap-1.5"
            >
              <ShieldCheckIcon size={14} weight="bold" />
              Bóveda Desbloqueada con éxito
            </motion.p>
          )}
        </AnimatePresence>

        {/* FOOTER ASSIST */}
        <div className="text-[11px] font-mono text-grayscale-9 flex items-center gap-1">
          <KeyIcon size={14} className="text-grayscale-9" />
          <span>Acceso seguro protegido por PIN</span>
        </div>
      </motion.div>
    </div>
  );
}
