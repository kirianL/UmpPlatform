"use client";

import {
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import Button from "@/components/public/Button";
import Modal from "@/components/public/Modal";

export type CarnetData = {
  fullName: string;
  code: string;
  package: "vip" | "elite";
  idCard?: string;
  validityMonth?: string;
  date?: string;
};

// Formats default formatted date DD/MM/YYYY
export function getDefaultFormattedDate(dateObj = new Date()): string {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

// Automatically calculates expiration date (1 month from emission/registration date)
export function getAutomaticExpiration(dateInput?: string | Date): {
  label: string;
  value: string;
} {
  let baseDate: Date;
  if (!dateInput) {
    baseDate = new Date();
  } else if (typeof dateInput === "string") {
    const parts = dateInput.split("/");
    if (parts.length === 3) {
      baseDate = new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0]),
      );
    } else {
      baseDate = new Date(dateInput);
    }
  } else {
    baseDate = new Date(dateInput);
  }

  if (Number.isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  // Exact 1 month expiration
  const expDate = new Date(baseDate);
  expDate.setMonth(expDate.getMonth() + 1);

  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  const day = expDate.getDate();
  const monthName = months[expDate.getMonth()];
  const year = expDate.getFullYear();

  return {
    label: "Válido hasta",
    value: `${day} DE ${monthName} ${year}`,
  };
}

// Draw high-resolution canvas and trigger download with custom Pattanakarn font
export async function downloadCarnetAsImage(data: CarnetData) {
  const isVip = (data.package || "").toLowerCase() === "vip";
  const imageSrc = isVip
    ? "/Carnet/Afiliado_VIP.jpg"
    : "/Carnet/Afiliado_Elite.jpg";

  // Base canvas dimensions matching the background JPG (1011 x 639)
  const width = 1011;
  const height = 639;
  const scale = 2; // 2x Retina resolution

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo obtener el contexto 2D del canvas");
  }

  // Scale context for crisp rendering
  ctx.scale(scale, scale);

  // Load custom font into document fonts for canvas if not already loaded
  try {
    const fontFace = new FontFace(
      "Pattanakarn",
      "url(/Carnet/fonnts.com-Pattanakarn_Medium.ttf)",
    );
    const loaded = await fontFace.load();
    document.fonts.add(loaded);
    await document.fonts.ready;
  } catch (err) {
    console.warn("No se pudo precargar la fuente Pattanakarn:", err);
  }

  // 1. Load and draw background image
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });

  ctx.drawImage(img, 0, 0, width, height);

  // 2. Generate QR code as data URL
  const qrText = data.code || data.idCard || data.fullName;
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    margin: 1,
    width: 140,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = (e) => reject(e);
    qrImg.src = qrDataUrl;
  });

  // 3. Right Column: QR Code + Date perfectly aligned and centered with each other
  const qrSize = 110;
  const qrX = 795;
  const qrY = 325;
  const qrCenterX = qrX + qrSize / 2; // 850

  // Rounded badge for QR
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 4. Date (Centered exactly below the QR code)
  const dateStr = data.date || getDefaultFormattedDate();
  ctx.save();
  ctx.font = "700 23px 'Pattanakarn', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillText(dateStr, qrCenterX, qrY + qrSize + 32);
  ctx.restore();

  // 5. Expiration Date (Top-Right)
  const expirationInfo = getAutomaticExpiration(data.date);
  const validityText = data.validityMonth || expirationInfo.value;
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  // Label "Válido hasta"
  ctx.font = "500 20px 'Pattanakarn', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("Válido hasta", 910, 110);

  // Expiration date
  ctx.font = "700 23px 'Pattanakarn', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(validityText.toUpperCase(), 910, 140);
  ctx.restore();

  // 6. Name and ID (Center-Left)
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const rawName = data.fullName.trim().toUpperCase();
  const words = rawName.split(/\s+/);

  // Split name into 1 or 2 lines
  let line1 = rawName;
  let line2 = "";

  if (words.length >= 2 && rawName.length > 14) {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(" ");
    line2 = words.slice(mid).join(" ");
  }

  // Draw Name lines with Pattanakarn font
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  const nameX = 96;
  let currentY = line2 ? 315 : 340;

  ctx.font = "700 46px 'Pattanakarn', sans-serif";
  ctx.fillText(line1, nameX, currentY);

  if (line2) {
    currentY += 54;
    ctx.fillText(line2, nameX, currentY);
  }

  // Draw Code
  const displayCode = data.code
    ? data.code.startsWith("#")
      ? data.code
      : `#${data.code}`
    : "#AL-000000";

  ctx.font = "700 26px 'Pattanakarn', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.shadowBlur = 8;
  ctx.fillText(displayCode, nameX, currentY + 46);

  // Export and download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  const cleanFileName = (data.fullName || "Afiliado")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  link.download = `Carnet_UMP_${data.code || "ID"}_${cleanFileName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Levitating Card Component with Pure Vertical Smooth Floating and Package Template
export function CarnetCard({
  data,
  className,
}: {
  data: CarnetData;
  className?: string;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");

  const isVip = (data.package || "").toLowerCase() === "vip";
  const bgImage = isVip
    ? "/Carnet/Afiliado_VIP.jpg"
    : "/Carnet/Afiliado_Elite.jpg";

  const dateStr = data.date || getDefaultFormattedDate();
  const expirationInfo = getAutomaticExpiration(dateStr);
  const validityText = data.validityMonth || expirationInfo.value;

  const displayCode = data.code
    ? data.code.startsWith("#")
      ? data.code
      : `#${data.code}`
    : "#AL-000000";

  // Generate QR Code data URL for in-card display
  useEffect(() => {
    const text = data.code || data.idCard || data.fullName;
    QRCode.toDataURL(text, {
      margin: 1,
      width: 140,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setQrUrl)
      .catch((err) => console.error("Error generating QR code:", err));
  }, [data.code, data.idCard, data.fullName]);

  // Name splitting
  const rawName = data.fullName.trim().toUpperCase();
  const words = rawName.split(/\s+/);
  let line1 = rawName;
  let line2 = "";
  if (words.length >= 2 && rawName.length > 14) {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(" ");
    line2 = words.slice(mid).join(" ");
  }

  return (
    <div
      className={`relative w-full max-w-[480px] mx-auto select-none ${className || ""}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full"
      >
        {/* Card Container (Static, Stable, No Continuous Motion) */}
        <div
          className={`relative aspect-[1011/639] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-all duration-300 ${
            isVip
              ? "shadow-[0_15px_35px_rgba(20,184,166,0.22),0_8px_16px_rgba(0,0,0,0.5)]"
              : "shadow-[0_15px_35px_rgba(148,163,184,0.22),0_8px_16px_rgba(0,0,0,0.5)]"
          }`}
          style={{ fontFamily: "'Pattanakarn', sans-serif" }}
        >
          {/* Background Card Image Template (VIP or Elite) */}
          <img
            key={bgImage}
            src={bgImage}
            alt={isVip ? "Afiliado VIP UMP" : "Afiliado Élite UMP"}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />

          {/* Gentle Glaze Sheen Overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />

          {/* Card Overlay Content */}
          <div className="relative z-20 h-full w-full p-[6%] flex flex-col justify-between">
            {/* Top Row: Expiration Date */}
            <div className="flex items-start justify-end w-full">
              <div className="text-right">
                <p className="text-[10px] sm:text-[12px] font-medium text-white/90 leading-tight drop-shadow-md">
                  Válido hasta
                </p>
                <p className="text-[11px] sm:text-[14px] font-bold uppercase text-white tracking-wide drop-shadow-md">
                  {validityText}
                </p>
              </div>
            </div>

            {/* Bottom Content Area: Name & ID on Left, (QR Code + Date centered underneath) on Right */}
            <div className="flex items-end justify-between gap-2 pb-[3%]">
              {/* Left Side: Name and ID */}
              <div className="flex-1 pr-2">
                <div className="text-white font-bold tracking-normal leading-[1.08] text-lg sm:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  <div>{line1}</div>
                  {line2 && <div>{line2}</div>}
                </div>
                <div className="mt-1 font-bold text-xs sm:text-sm text-white/95 tracking-wider drop-shadow-md">
                  {displayCode}
                </div>
              </div>

              {/* Right Side: QR Code + Date centered below QR */}
              <div className="flex flex-col items-center shrink-0">
                {qrUrl && (
                  <div className="bg-white p-1 sm:p-1.5 rounded-lg shadow-lg border border-black/10">
                    <img
                      src={qrUrl}
                      alt={`QR ${data.code}`}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain block rounded-sm"
                    />
                  </div>
                )}
                <p className="mt-1 text-[10px] sm:text-[13px] font-bold text-white tracking-tight drop-shadow-md text-center">
                  {dateStr}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Modal with Carnet View and Download Controls
export function CarnetModal({
  open,
  onOpenChange,
  ally,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ally: {
    fullName: string;
    code?: string;
    idCard?: string;
    package: "vip" | "elite";
    createdAt?: string;
  } | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!ally) return null;

  const isElite = (ally.package || "").toLowerCase() === "elite";
  const allyPackage: "vip" | "elite" = isElite ? "elite" : "vip";

  const formattedDate = ally.createdAt
    ? new Date(ally.createdAt).toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : getDefaultFormattedDate();

  const expirationInfo = getAutomaticExpiration(formattedDate);

  const carnetData: CarnetData = {
    fullName: ally.fullName,
    code: ally.code || "AL-000000",
    idCard: ally.idCard,
    package: allyPackage,
    validityMonth: expirationInfo.value,
    date: formattedDate,
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCarnetAsImage(carnetData);
    } catch (err) {
      console.error("Error al descargar carnet:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    if (!ally.code) return;
    navigator.clipboard.writeText(ally.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Carnet Digital — Membresía ${isElite ? "Élite" : "VIP"}`}
      className="max-w-lg"
    >
      <div className="flex flex-col items-center gap-5 py-2">
        {/* Floating Card */}
        <div className="w-full py-2 flex justify-center">
          <CarnetCard data={carnetData} />
        </div>

        {/* Affiliate Quick Details */}
        <div className="w-full grid grid-cols-2 gap-2 text-xs bg-grayscale-2 dark:bg-grayscale-3/60 p-3 rounded-xl border border-grayscale-3 dark:border-grayscale-4">
          <div>
            <span className="text-grayscale-9 text-[11px] block">
              Afiliado:
            </span>
            <span className="font-semibold text-grayscale-12 truncate block">
              {ally.fullName}
            </span>
          </div>
          <div>
            <span className="text-grayscale-9 text-[11px] block">
              Código ID:
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="font-mono font-bold text-grayscale-12 inline-flex items-center gap-1 hover:text-grayscale-11 transition-colors"
            >
              <span>{ally.code || "N/A"}</span>
              {copiedCode ? (
                <CheckIcon size={12} className="text-emerald-500" />
              ) : (
                <CopyIcon size={12} className="text-grayscale-9" />
              )}
            </button>
          </div>
        </div>

        {/* Download Action Button */}
        <div className="w-full flex items-center justify-between gap-3 pt-1">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cerrar
          </Button>

          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 gap-2 text-xs font-bold shadow-md"
          >
            <DownloadSimpleIcon size={16} weight="bold" />
            <span>
              {downloading
                ? "Generando imagen..."
                : "Descargar carnet (PNG HD)"}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
