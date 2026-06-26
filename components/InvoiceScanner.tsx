"use client";

import {
  CameraIcon,
  ScanIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useCallback, useRef, useState } from "react";
import Button from "@/components/public/Button";
import Modal from "@/components/public/Modal";
import { type InvoiceData, recogniseInvoice } from "@/lib/invoice-ocr";

type ScanStatus = "idle" | "processing" | "done" | "error";

type InvoiceScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (data: InvoiceData) => void;
};

export default function InvoiceScanner({
  open,
  onOpenChange,
  onScanComplete,
}: InvoiceScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show preview
      const url = URL.createObjectURL(file);
      setPreview(url);
      setStatus("processing");
      setProgress(0);
      setError(null);

      try {
        const data = await recogniseInvoice(file, (p) => setProgress(p));
        setResult(data);
        setStatus("done");
      } catch (err) {
        console.error("OCR error:", err);
        setError(
          "No se pudo procesar la imagen. Intenta con otra foto más clara.",
        );
        setStatus("error");
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (result) {
      onScanComplete(result);
      handleClose(false);
    }
  }, [result, onScanComplete, handleClose]);

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Escanear Factura"
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="invoice-scan-input"
        />

        {/* Idle state — prompt to capture */}
        {status === "idle" && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-grayscale-4 bg-grayscale-2 px-6 py-10 transition-all duration-200 hover:border-accent-8 hover:bg-accent-2 dark:border-grayscale-5 dark:bg-grayscale-3 dark:hover:border-accent-8 dark:hover:bg-accent-3"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-accent-3 text-accent-11 transition-transform duration-200 group-hover:scale-110 dark:bg-accent-4">
              <CameraIcon size={28} weight="duotone" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-grayscale-12">
                Tomar foto o seleccionar imagen
              </p>
              <p className="mt-0.5 text-xs text-grayscale-9">
                JPG, PNG — Se extraerán los datos automáticamente
              </p>
            </div>
          </button>
        )}

        {/* Preview + Processing */}
        {preview && status === "processing" && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-lg border border-grayscale-4 dark:border-grayscale-5">
              <img
                src={preview}
                alt="Factura capturada"
                className="max-h-48 w-full object-contain bg-grayscale-2 dark:bg-grayscale-3"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grayscale-1/70 backdrop-blur-sm dark:bg-grayscale-2/70">
                <SpinnerIcon
                  size={32}
                  weight="bold"
                  className="animate-spin text-accent-9"
                />
                <p className="mt-2 text-sm font-medium text-grayscale-12">
                  Procesando imagen…
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-grayscale-4 dark:bg-grayscale-5">
                  <div
                    className="h-full rounded-full bg-accent-9 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-grayscale-9">{progress}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div className="flex flex-col gap-3">
            {/* Extracted data */}
            <div className="rounded-lg border border-green-6 bg-green-2 p-3 dark:border-green-7 dark:bg-green-3">
              <div className="mb-2 flex items-center gap-1.5">
                <CheckCircleIcon
                  size={16}
                  weight="fill"
                  className="text-green-9"
                />
                <p className="text-xs font-semibold text-green-11">
                  Datos extraídos
                </p>
              </div>
              <div className="space-y-1.5">
                <DataRow
                  label="Concepto"
                  value={result.concept || "—"}
                />
                <DataRow
                  label="Monto"
                  value={
                    result.amount
                      ? new Intl.NumberFormat("es-CR", {
                          style: "currency",
                          currency: "CRC",
                          maximumFractionDigits: 0,
                        }).format(result.amount)
                      : "No detectado"
                  }
                  missing={!result.amount}
                />
                <DataRow
                  label="Fecha"
                  value={result.date ?? "No detectada"}
                  missing={!result.date}
                />
              </div>
            </div>

            {/* Raw text toggle (collapsible) */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-grayscale-9 transition-colors hover:text-grayscale-11">
                <ScanIcon
                  size={12}
                  weight="bold"
                  className="mr-1 inline-block"
                />
                Ver texto extraído
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-grayscale-2 p-3 text-xs text-grayscale-10 dark:bg-grayscale-3">
                {result.rawText || "Sin texto detectado"}
              </pre>
            </details>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1 justify-center text-xs"
                type="button"
                onClick={reset}
              >
                <ArrowCounterClockwiseIcon size={14} weight="bold" />
                Reintentar
              </Button>
              <Button
                variant="primary"
                className="flex-1 justify-center text-xs"
                type="button"
                onClick={handleConfirm}
              >
                <CheckCircleIcon size={14} weight="bold" />
                Usar datos
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-red-6 bg-red-2 p-4 dark:border-red-7 dark:bg-red-3">
              <div className="flex items-center gap-2">
                <WarningCircleIcon
                  size={18}
                  weight="fill"
                  className="text-red-9"
                />
                <p className="text-sm font-medium text-red-11">{error}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="justify-center text-xs"
              type="button"
              onClick={reset}
            >
              <ArrowCounterClockwiseIcon size={14} weight="bold" />
              Intentar de nuevo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Internal — data row for results display
// ---------------------------------------------------------------------------

function DataRow({
  label,
  value,
  missing = false,
}: {
  label: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-mono uppercase text-green-10 dark:text-green-9">
        {label}
      </span>
      <span
        className={`text-sm font-medium ${
          missing
            ? "italic text-grayscale-8"
            : "text-green-12 dark:text-green-11"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
