import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://apis.gometa.org/tdc/tdc.json", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) throw new Error("Failed to fetch exchange rate");
    const data = await res.json();
    return NextResponse.json({
      compra: data.compra,
      venta: data.venta,
      updated: data.updated,
    });
  } catch (err) {
    console.error("Exchange rate fetch error:", err);
    // Return fallback rates
    return NextResponse.json({
      compra: 500,
      venta: 515,
      fallback: true,
    });
  }
}
