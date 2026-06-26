// =============================================================================
// Invoice OCR — Tesseract.js client-side extraction
// =============================================================================

import { createWorker, type Worker } from "tesseract.js";

export type InvoiceData = {
  concept: string;
  amount: number | null;
  date: string | null; // ISO YYYY-MM-DD
  rawText: string;
};

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------

function extractAmount(text: string): number | null {
  // Patterns ordered by specificity
  const patterns = [
    // "Total" or "TOTAL" followed by a number (most reliable)
    /(?:total|total\s*a\s*pagar|monto\s*total)\s*[:\s]*[\$₡]?\s*([\d.,]+)/i,
    // Currency symbol followed by number
    /[₡\$]\s*([\d.,]+)/,
    // "CRC" or "USD" followed by number
    /(?:CRC|USD)\s*([\d.,]+)/i,
    // Number followed by currency
    /([\d.,]+)\s*(?:CRC|USD|colones|dólares)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      // Normalise: remove thousand separators, convert decimal comma
      let raw = match[1];
      // If format is "1.234.567,89" (common in ES)
      if (raw.includes(".") && raw.includes(",")) {
        raw = raw.replace(/\./g, "").replace(",", ".");
      }
      // If format is "1,234,567.89" (common in EN)
      else if (
        raw.includes(",") &&
        (raw.indexOf(",") < raw.length - 3 || !raw.includes("."))
      ) {
        raw = raw.replace(/,/g, "");
      }
      // If only comma as decimal "1234,56"
      else if (raw.includes(",")) {
        raw = raw.replace(",", ".");
      }
      const num = Number.parseFloat(raw);
      if (!Number.isNaN(num) && num > 0) return Math.round(num);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

function extractDate(text: string): string | null {
  const patterns: { regex: RegExp; order: "dmy" | "ymd" }[] = [
    // DD/MM/YYYY or DD-MM-YYYY
    {
      regex: /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/,
      order: "dmy",
    },
    // YYYY-MM-DD (ISO)
    {
      regex: /(\d{4})-(\d{1,2})-(\d{1,2})/,
      order: "ymd",
    },
    // "Fecha: 20 jun 2026" or similar
    {
      regex:
        /(?:fecha|date)\s*[:\s]*(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de(?:l)?\s+)?(\d{4})/i,
      order: "dmy",
    },
  ];

  const MONTH_MAP: Record<string, number> = {
    ene: 1,
    enero: 1,
    jan: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    apr: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    aug: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
    dec: 12,
  };

  for (const { regex, order } of patterns) {
    const match = text.match(regex);
    if (!match) continue;

    let day: number;
    let month: number;
    let year: number;

    if (order === "ymd") {
      year = Number.parseInt(match[1], 10);
      month = Number.parseInt(match[2], 10);
      day = Number.parseInt(match[3], 10);
    } else {
      day = Number.parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      month = MONTH_MAP[monthStr] ?? Number.parseInt(monthStr, 10);
      year = Number.parseInt(match[3], 10);
    }

    if (
      !Number.isNaN(day) &&
      !Number.isNaN(month) &&
      !Number.isNaN(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 2000
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Concept extraction — first meaningful text lines
// ---------------------------------------------------------------------------

function extractConcept(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  // Skip lines that look like headers/meta (pure numbers, dates, labels)
  const meaningful = lines.filter(
    (l) =>
      !/^\d+[/\-.]/.test(l) &&
      !/^(?:factura|invoice|fecha|date|total|subtotal|iva|rfc|nit|tel|cédula|#|no\.)/i.test(
        l,
      ) &&
      !/^[\d\s.,₡$%]+$/.test(l),
  );

  if (meaningful.length > 0) {
    // Return up to first 2 meaningful lines, capped at 80 chars
    return meaningful.slice(0, 2).join(" — ").slice(0, 80);
  }

  // Fallback: first non-empty line
  return lines[0]?.slice(0, 80) ?? "Factura escaneada";
}

// ---------------------------------------------------------------------------
// Main OCR function
// ---------------------------------------------------------------------------

let cachedWorker: Worker | null = null;

export async function recogniseInvoice(
  imageFile: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<InvoiceData> {
  // Create / reuse worker
  if (!cachedWorker) {
    cachedWorker = await createWorker("spa", undefined, {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
  }

  const {
    data: { text },
  } = await cachedWorker.recognize(imageFile);

  return {
    concept: extractConcept(text),
    amount: extractAmount(text),
    date: extractDate(text),
    rawText: text,
  };
}

export async function terminateWorker() {
  if (cachedWorker) {
    await cachedWorker.terminate();
    cachedWorker = null;
  }
}
