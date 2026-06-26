// =============================================================================
// Invoice OCR — Gemini Flash AI extraction via API route
// =============================================================================

export type InvoiceItem = {
  description: string;
  amount: number;
  convertedAmount: number;
};

export type InvoiceData = {
  vendor: string;
  date: string | null; // ISO YYYY-MM-DD
  type: "income" | "expense";
  currency: string;
  exchangeRate: number;
  items: InvoiceItem[];
  total: number | null;
  convertedTotal: number | null;
  rawText: string;
};

export async function recogniseInvoice(
  imageFile: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<InvoiceData> {
  onProgress?.(10);

  const formData = new FormData();
  formData.append("image", imageFile);

  onProgress?.(30);

  const res = await fetch("/api/scan-invoice", {
    method: "POST",
    body: formData,
  });

  onProgress?.(90);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `Error del servidor (${res.status})`);
  }

  const data = await res.json();
  onProgress?.(100);

  return {
    vendor: data.vendor ?? "",
    date: data.date ?? null,
    type: data.type === "income" ? "income" : "expense",
    currency: data.currency ?? "CRC",
    exchangeRate: typeof data.exchangeRate === "number" ? data.exchangeRate : 1.0,
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === "number" ? data.total : null,
    convertedTotal: typeof data.convertedTotal === "number" ? data.convertedTotal : null,
    rawText: data.rawText ?? "",
  };
}
