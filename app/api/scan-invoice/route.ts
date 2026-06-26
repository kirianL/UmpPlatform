import { GoogleGenAI } from "@google/genai";
import { type NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de facturas e imágenes de comprobantes de pago.
Analiza la imagen y extrae CADA LÍNEA/ÍTEM de la factura por separado, además del resumen general.
Determina la moneda de la factura (colones CRC, dólares USD o euros EUR). Si es USD o EUR, investiga o estima el tipo de cambio oficial al colón costarricense (CRC) para la fecha de la factura.

Responde con el siguiente formato JSON:

{
  "vendor": "Nombre del proveedor/negocio (máximo 40 caracteres)",
  "date": "YYYY-MM-DD",
  "type": "expense",
  "currency": "USD", 
  "exchangeRate": 515.0,
  "items": [
    { 
      "description": "Descripción del producto/servicio", 
      "amount": 15.0,
      "convertedAmount": 7725
    },
    { 
      "description": "Otro producto/servicio", 
      "amount": 20.0,
      "convertedAmount": 10300
    }
  ],
  "total": 35.0,
  "convertedTotal": 18025
}

Reglas:
- "vendor": nombre del comercio, proveedor o empresa que emite la factura. Si no se detecta, usa "".
- "date": fecha de la factura en formato ISO (YYYY-MM-DD). Si no la encuentras, usa null.
- "type": "expense" si es un gasto/compra, "income" si es un ingreso/venta/cobro.
- "currency": la moneda detectada de la factura: "CRC", "USD" o "EUR".
- "exchangeRate": el tipo de cambio de la moneda detectada a colones (CRC) para la fecha de la factura. Si la moneda es CRC, el tipo de cambio es obligatoriamente 1. Si es USD o EUR, estima el tipo de cambio histórico para esa fecha específica (por ejemplo, aprox. 515 para USD, aprox. 550 para EUR si es reciente). Debe ser un número.
- "items": array con CADA producto o servicio individual. Cada ítem tiene:
  - "description": nombre/descripción corta del ítem (máximo 60 caracteres).
  - "amount": precio/monto FINAL del ítem en la moneda original (incluyendo IVA/impuestos y descuentos). IMPORTANTE: Escoge siempre el precio final cobrado con IVA incluido, nunca el precio antes de impuestos.
  - "convertedAmount": el monto del ítem convertido a colones (CRC) redondeado a número entero (amount * exchangeRate).
- "total": monto total neto final de la factura en la moneda original (incluyendo IVA y todos los cargos finales).
- "convertedTotal": total convertido a colones (CRC) redondeado a número entero (total * exchangeRate).
- Si la factura tiene un solo ítem, el array "items" tendrá un solo elemento.
- Si no puedes detectar ítems individuales, crea un solo ítem con la descripción general y el total final de la factura.

Responde SOLO con el JSON, sin markdown, sin explicación.`;

// Supported MIME types for Gemini vision
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no configurada en .env.local" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió archivo" },
        { status: 400 },
      );
    }

    // Determine MIME type
    let mimeType = file.type || "image/jpeg";

    // Normalise common mobile MIME types
    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    // Validate MIME type
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `Formato no soportado: ${mimeType}. Usa JPG, PNG, WebP, HEIC o PDF.`,
        },
        { status: 400 },
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: SYSTEM_PROMPT },
          ],
        },
      ],
    });

    const text = response.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "La IA no pudo leer contenido en la imagen." },
        { status: 422 },
      );
    }

    // Parse JSON — strip markdown fences if present
    const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", text);
      return NextResponse.json(
        { error: "La IA no devolvió un formato válido. Intenta de nuevo." },
        { status: 422 },
      );
    }

    const currency = typeof parsed.currency === "string" ? parsed.currency.toUpperCase() : "CRC";
    const exchangeRate = typeof parsed.exchangeRate === "number" ? parsed.exchangeRate : 1.0;

    // Normalise items
    const items = Array.isArray(parsed.items)
      ? (parsed.items as { description?: string; amount?: number; convertedAmount?: number }[]).map(
          (item) => {
            const amount = typeof item.amount === "number" ? item.amount : 0;
            const convertedAmount = typeof item.convertedAmount === "number" 
              ? item.convertedAmount 
              : Math.round(amount * exchangeRate);
            return {
              description: item.description ?? "",
              amount,
              convertedAmount,
            };
          }
        )
      : [];

    const total = typeof parsed.total === "number" ? parsed.total : null;
    const convertedTotal = typeof parsed.convertedTotal === "number" 
      ? parsed.convertedTotal 
      : (total !== null ? Math.round(total * exchangeRate) : null);

    return NextResponse.json({
      vendor: parsed.vendor ?? "",
      date: parsed.date ?? null,
      type: parsed.type ?? "expense",
      currency,
      exchangeRate,
      items,
      total,
      convertedTotal,
      rawText: text,
    });
  } catch (error: any) {
    const message = error?.message || "Error desconocido";
    console.error("Gemini scan error:", message, error);
    
    // Check if the error is a quota issue (429) or resource exhaustion
    if (
      message.includes("429") || 
      message.includes("RESOURCE_EXHAUSTED") || 
      message.includes("quota") ||
      message.includes("Quota exceeded")
    ) {
      return NextResponse.json(
        { error: "Límite de cuota gratuito de Gemini excedido. Por favor, espera un minuto e intenta de nuevo." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Error al procesar: ${message}` },
      { status: 500 },
    );
  }
}
