import { NextResponse } from "next/server";
import zlib from "zlib";

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const rawStr = buffer.toString("latin1");
  const extractedLines: string[] = [];

  // Find all PDF streams
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;

  while ((match = streamRegex.exec(rawStr)) !== null) {
    const streamStart = match.index + match[0].indexOf("stream") + 6;
    const streamEnd = match.index + match[0].lastIndexOf("endstream");
    const streamData = buffer.subarray(
      streamStart > match.index ? streamStart : match.index,
      streamEnd > streamStart ? streamEnd : buffer.length
    );

    let decompressed: string = "";

    try {
      const decomp = zlib.inflateSync(streamData);
      decompressed = decomp.toString("utf-8");
    } catch {
      try {
        const decomp = zlib.unzipSync(streamData);
        decompressed = decomp.toString("utf-8");
      } catch {
        decompressed = streamData.toString("latin1");
      }
    }

    // Extract text in parentheses (text) Tj or TJ
    const tjMatches = decompressed.match(/\(([^()]+)\)\s*(?:Tj|TJ|\'|\")/g) || [];
    for (const m of tjMatches) {
      const clean = m.replace(/^\(/, "").replace(/\)\s*(?:Tj|TJ|\'|\")$/, "").trim();
      if (
        clean.length > 0 &&
        !clean.startsWith("/") &&
        !clean.startsWith("Font") &&
        !clean.startsWith("MediaBox") &&
        !clean.startsWith("ProcSet")
      ) {
        extractedLines.push(clean);
      }
    }
  }

  // Fallback: search raw string if stream extraction yielded no text
  if (extractedLines.length === 0) {
    const rawMatches = rawStr.match(/\(([^()]{2,})\)\s*(?:Tj|TJ|\'|\")/g) || [];
    for (const m of rawMatches) {
      const clean = m.replace(/^\(/, "").replace(/\)\s*(?:Tj|TJ|\'|\")$/, "").trim();
      if (
        clean.length > 1 &&
        !clean.startsWith("/") &&
        !clean.startsWith("Font") &&
        !clean.startsWith("MediaBox")
      ) {
        extractedLines.push(clean);
      }
    }
  }

  return extractedLines.join("\n");
}

export async function POST(request: Request) {
  try {
    const { pdfBase64 } = await request.json();
    if (!pdfBase64) {
      return NextResponse.json({ error: "Sin datos de PDF" }, { status: 400 });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const extractedText = extractTextFromPdfBuffer(buffer);

    return NextResponse.json({ text: extractedText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
