import { GoogleGenAI } from "@google/genai";
import { type NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.0-flash";

const SYSTEM_PROMPT = `Eres un asistente que extrae datos de facturas e imágenes de comprobantes de pago.
Analiza la imagen y extrae CADA LÍNEA/ÍTEM de la factura por separado, además del resumen general.

Responde con el siguiente formato JSON:

{
  "vendor": "Nombre del proveedor/negocio (máximo 40 caracteres)",
  "date": "YYYY-MM-DD",
  "type": "expense",
  "items": [
    { "description": "Descripción del producto/servicio", "amount": 1500 },
    { "description": "Otro producto/servicio", "amount": 2300 }
  ],
  "total": 3800
}

Reglas:
- "vendor": nombre del comercio, proveedor o empresa que emite la factura. Si no se detecta, usa "".
- "date": fecha de la factura en formato ISO (YYYY-MM-DD). Si no la encuentras, usa null.
- "type": "expense" si es un gasto/compra, "income" si es un ingreso/venta/cobro.
- "items": array con CADA producto o servicio individual. Cada ítem tiene:
  - "description": nombre/descripción corta del ítem (máximo 60 caracteres).
  - "amount": precio/monto del ítem como número entero sin decimales. Si un ítem tiene cantidad (ej: "3x Tornillo"), incluye el subtotal, no el precio unitario.
- "total": monto total de la factura como número entero. Si hay un campo "Total" en la factura, usa ese valor.
- Si la factura tiene un solo ítem, el array "items" tendrá un solo elemento.
- Si hay varias monedas, prefiere la moneda local (CRC/colones).
- Si no puedes detectar ítems individuales, crea un solo ítem con la descripción general y el total.

Responde SOLO con el JSON, sin markdown, sin explicación.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no configurada" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió imagen" },
        { status: 400 },
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: "Extrae los datos de esta factura/recibo." },
          ],
        },
      ],
    });

    const text = response.text?.trim() ?? "";

    // Parse JSON — strip markdown fences if present
    const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);

    // Normalise items
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((item: { description?: string; amount?: number }) => ({
          description: item.description ?? "",
          amount: typeof item.amount === "number" ? item.amount : 0,
        }))
      : [];

    return NextResponse.json({
      vendor: parsed.vendor ?? "",
      date: parsed.date ?? null,
      type: parsed.type ?? "expense",
      items,
      total: typeof parsed.total === "number" ? parsed.total : null,
      rawText: text,
    });
  } catch (error) {
    console.error("Gemini scan error:", error);
    return NextResponse.json(
      { error: "Error al procesar la imagen con IA" },
      { status: 500 },
    );
  }
}

