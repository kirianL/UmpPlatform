import { NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const { pdfBase64, fileName } = await request.json();
    if (!pdfBase64) {
      return NextResponse.json({ error: "Sin datos de archivo" }, { status: 400 });
    }

    const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const name = (fileName || "").toLowerCase();

    // Si es DOCX / DOC
    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      try {
        const { value } = await mammoth.extractRawText({ buffer });
        return NextResponse.json({ text: value.trim() });
      } catch (docErr: any) {
        console.warn("Could not extract DOCX text:", docErr);
      }
    }

    // Por defecto o si es PDF: extraer con pdfjs-dist
    const uint8Array = new Uint8Array(buffer);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .filter((str: string) => str.length > 0);

      if (pageStrings.length > 0) {
        pageTexts.push(pageStrings.join(" "));
      }
    }

    const extractedText = pageTexts.join("\n\n");
    return NextResponse.json({ text: extractedText });
  } catch (err: any) {
    console.error("Error extracting document text:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar archivo" },
      { status: 500 }
    );
  }
}
