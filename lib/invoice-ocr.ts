// =============================================================================
// Invoice OCR — Gemini Flash AI extraction via API route
// =============================================================================

export type InvoiceItem = {
  description: string;
  amount: number;
};

export type InvoiceData = {
  vendor: string;
  date: string | null; // ISO YYYY-MM-DD
  type: "income" | "expense";
  items: InvoiceItem[];
  total: number | null;
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
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Error al procesar la imagen");
  }

  const data = await res.json();
  onProgress?.(100);

  return {
    vendor: data.vendor ?? "",
    date: data.date ?? null,
    type: data.type === "income" ? "income" : "expense",
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === "number" ? data.total : null,
    rawText: data.rawText ?? "",
  };
}
