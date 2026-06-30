"use client";

import {
  CameraIcon,
  ScanIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
  StorefrontIcon,
  CalendarIcon,
  FileIcon,
  ImageIcon,
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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatWithCurrency(n: number, currency: string): string {
  return new Intl.NumberFormat(currency === "CRC" ? "es-CR" : "en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "CRC" ? 0 : 2,
  }).format(n);
}

export default function InvoiceScanner({
  open,
  onOpenChange,
  onScanComplete,
}: InvoiceScannerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setFileName(null);
    setIsPdf(false);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  const processFile = useCallback(async (file: File) => {
    const isFilePdf = file.type === "application/pdf";
    setIsPdf(isFilePdf);
    setFileName(file.name);

    if (!isFilePdf) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }

    setStatus("processing");
    setProgress(0);
    setError(null);

    try {
      const data = await recogniseInvoice(file, (p) => setProgress(p));
      setResult(data);
      setStatus("done");
    } catch (err) {
      console.error("Scan error:", err);
      const message =
        err instanceof Error ? err.message : "Error al procesar";
      setError(message);
      setStatus("error");
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
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
      className="sm:max-w-xl md:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="invoice-camera-input"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="invoice-file-input"
        />

        {/* Idle state — two options */}
        {status === "idle" && (
          <div className="flex flex-col gap-2.5">
            {/* Camera button — primary action on mobile */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="group flex cursor-pointer items-center gap-3.5 rounded-xl border-2 border-dashed border-grayscale-4 bg-grayscale-2 px-5 py-5 transition-all duration-200 hover:border-accent-8 hover:bg-accent-2 active:scale-[0.98] dark:border-grayscale-5 dark:bg-grayscale-3 dark:hover:border-accent-8 dark:hover:bg-accent-3"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-3 text-accent-11 transition-transform duration-200 group-hover:scale-110 dark:bg-accent-4">
                <CameraIcon size={22} weight="duotone" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-grayscale-12">
                  Tomar foto
                </p>
                <p className="text-xs text-grayscale-9">
                  Abre la cámara del teléfono
                </p>
              </div>
            </button>

            {/* Upload button — secondary */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-grayscale-3 bg-grayscale-1 px-5 py-4 transition-all duration-200 hover:border-grayscale-5 hover:bg-grayscale-2 active:scale-[0.98] dark:border-grayscale-4 dark:bg-grayscale-2 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-grayscale-3 text-grayscale-10 transition-transform duration-200 group-hover:scale-105 dark:bg-grayscale-4">
                <FileIcon size={18} weight="duotone" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-grayscale-12">
                  Subir archivo
                </p>
                <p className="text-xs text-grayscale-9">
                  Imagen o PDF desde el dispositivo
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Processing */}
        {status === "processing" && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-lg border border-grayscale-4 dark:border-grayscale-5">
              {preview && !isPdf ? (
                <img
                  src={preview}
                  alt="Factura capturada"
                  className="max-h-44 w-full object-contain bg-grayscale-2 dark:bg-grayscale-3"
                />
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-2 bg-grayscale-2 dark:bg-grayscale-3">
                  {isPdf ? (
                    <FileIcon
                      size={32}
                      weight="duotone"
                      className="text-grayscale-8"
                    />
                  ) : (
                    <ImageIcon
                      size={32}
                      weight="duotone"
                      className="text-grayscale-8"
                    />
                  )}
                  {fileName && (
                    <p className="max-w-[200px] truncate text-xs text-grayscale-9">
                      {fileName}
                    </p>
                  )}
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grayscale-1/70 backdrop-blur-sm dark:bg-grayscale-2/70">
                <SpinnerIcon
                  size={28}
                  weight="bold"
                  className="animate-spin text-accent-9"
                />
                <p className="mt-2 text-sm font-medium text-grayscale-12">
                  Analizando factura…
                </p>
                <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-grayscale-4 dark:bg-grayscale-5">
                  <div
                    className="h-full rounded-full bg-accent-9 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-lg border border-grayscale-4 dark:border-grayscale-5">
              {preview && !isPdf ? (
                <img
                  src={preview}
                  alt="Vista previa de factura"
                  className="max-h-44 w-full object-contain bg-grayscale-2 dark:bg-grayscale-3"
                />
              ) : isPdf ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 bg-grayscale-2 dark:bg-grayscale-3">
                  <FileIcon
                    size={32}
                    weight="duotone"
                    className="text-grayscale-8"
                  />
                  {fileName && (
                    <p className="max-w-[200px] truncate text-xs text-grayscale-9">
                      {fileName}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Results card */}
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-1/50 p-5 dark:border-grayscale-4 dark:bg-grayscale-2/30">
              <div className="mb-4 flex items-center justify-between border-b border-grayscale-3 pb-3 dark:border-grayscale-4">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-9 dark:text-green-8">
                  <CheckCircleIcon size={16} weight="fill" />
                  Lectura Exitosa
                </span>
                <p className="text-[10px] text-grayscale-8 font-medium">
                  {result.items.length === 1
                    ? "1 ítem detectado"
                    : `${result.items.length} ítems detectados`}
                </p>
              </div>

              {/* Vendor, Date & Exchange Rate */}
              {(result.vendor || result.date || result.currency !== "CRC") && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {result.vendor && (
                    <span className="flex items-center gap-1 text-xs font-medium text-grayscale-11">
                      <StorefrontIcon size={12} weight="bold" className="text-grayscale-8" />
                      {result.vendor}
                    </span>
                  )}
                  {result.date && (
                    <span className="flex items-center gap-1 text-xs font-medium text-grayscale-11">
                      <CalendarIcon size={12} weight="bold" className="text-grayscale-8" />
                      {result.date}
                    </span>
                  )}
                  {result.currency && result.currency !== "CRC" && (
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-2 dark:bg-amber-4/30 text-amber-11 px-2.5 py-0.5 rounded border border-amber-5">
                      {result.currency} @ ₡{result.exchangeRate.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Items list */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto no-scrollbar">
                {result.items.map((item, i) => (
                  <div
                    key={`${item.description}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-grayscale-2/50 px-3.5 py-2.5 dark:bg-grayscale-3/20"
                  >
                    <span className="min-w-0 truncate text-xs text-grayscale-11 dark:text-grayscale-10">
                      {item.description}
                    </span>
                    <div className="shrink-0 text-right flex flex-col">
                      <span className="text-xs font-semibold text-grayscale-12 dark:text-grayscale-11 font-mono">
                        {result.currency !== "CRC" 
                          ? formatWithCurrency(item.amount, result.currency)
                          : formatCurrency(item.amount)}
                      </span>
                      {result.currency !== "CRC" && (
                        <span className="text-[10px] text-grayscale-8 font-medium font-mono">
                          ({formatCurrency(item.convertedAmount)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              {result.total != null && result.items.length > 1 && (
                <div className="mt-3.5 flex items-center justify-between border-t border-grayscale-3 pt-3.5 dark:border-grayscale-4">
                  <span className="text-xs font-mono uppercase font-semibold text-grayscale-8">
                    Total
                  </span>
                  <div className="text-right flex flex-col">
                    <span className="text-sm font-bold text-grayscale-12 dark:text-grayscale-11 font-mono">
                      {result.currency !== "CRC"
                        ? formatWithCurrency(result.total, result.currency)
                        : formatCurrency(result.total)}
                    </span>
                    {result.currency !== "CRC" && result.convertedTotal != null && (
                      <span className="text-xs font-semibold text-grayscale-8 font-mono">
                        ({formatCurrency(result.convertedTotal)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Raw text toggle */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-grayscale-9 transition-colors hover:text-grayscale-11">
                <ScanIcon
                  size={12}
                  weight="bold"
                  className="mr-1 inline-block"
                />
                Ver respuesta de IA
              </summary>
              <pre className="mt-2 max-h-28 overflow-auto rounded-lg bg-grayscale-2 p-3 text-xs text-grayscale-10 dark:bg-grayscale-3">
                {result.rawText || "Sin datos"}
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
                {result.items.length > 1
                  ? `Crear ${result.items.length} movimientos`
                  : "Usar datos"}
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-red-6 bg-red-2 p-4 dark:border-red-7 dark:bg-red-3">
              <div className="flex items-start gap-2">
                <WarningCircleIcon
                  size={18}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-red-9"
                />
                <p className="text-sm text-red-11">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 justify-center text-xs"
                type="button"
                onClick={reset}
              >
                <ArrowCounterClockwiseIcon size={14} weight="bold" />
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
