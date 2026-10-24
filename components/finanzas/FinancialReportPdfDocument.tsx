import {
  Circle,
  Document,
  G,
  Line,
  Page,
  Path,
  Polygon,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

export interface FinancialReportData {
  periodLabel: string; // e.g. "Octubre 2026"
  year: number;
  month: number;
  monthName: string; // "Octubre"
  generatedAt: string;
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  profitMargin: number;
  transactionsCount: number;
  incomeCount: number;
  expenseCount: number;
  categories: {
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  dailyTimeline: {
    day: number;
    income: number;
    expense: number;
    cumulative: number;
  }[];
  transactions: {
    date: string;
    concept: string;
    entity?: string;
    category: string;
    type: "income" | "expense";
    amount: number;
    status: string;
  }[];
}

// Vector paths for UMP Logo
const UMP_LOGO_PATHS = [
  "M756.95,85.28c6.43-5,12.96-19.05,22.03-19.32,18.41.26,36.85,4.78,53.02,13.67,17.44,8.58,8.19,24.18-3.19,33.1-3.27,2.85-6.21,3.57-3.51,4.84,17.81,7.86,32.9,20.67,47.66,32.84,0,0,0,0,0,0,15.74-15.07,26.15-36.44,24.5-58.42-7.38-75.23-130.83-103.82-181.58-56.91-13.15,12.17-14.61,22.29-26.85,35.38",
  "M297.17,240.5s100.08-151.57,100.08-151.57c-23.93,3.66-47.45,10.31-69.69,19.88s-40.37,22.34-60.88,33.11c-47.02,24.7-97.73,47.15-150.97,51.05-26.8.98-41.69-2.8-28.31-33.46,7.74-24.19,104.11-129.6,113.48-152.04-1.8,1.12-65.87-7.48-65.87-7.48,0,0-6.49,8.25-6.28,9.2-24.46,33.03-64.93,85.81-90.25,118.08-15.85,21.77-52.08,67.63-33.1,96.37,4.84,7.32,13.77,10.76,22.37,12.5,42.75,8.65,90.62-5.58,130.3-20.72,21.38-8.16,42-18.15,62.25-28.79,13.83-7.26,27.5-14.83,41.19-22.34,5.3-2.9,11.7-5.01,15.14-10.32-12.99,22.11-29.6,42.55-44.59,63.32-5.67,7.85-11.64,15.58-16.95,23.68",
  "M661.43,67.22c7.35-9.86,5.85-32.35-.72-42.29-21.63-32.75-92.87-7.92-120.08.67-10.52-16.72-49.68-16.59-67.48-15.46-73.36,6.76-148.88,46.04-209.4,86.89l3.89-5.11c.12-.73,62.11-80.34,61.56-81.27-.66-1.13-69.69-.05-70.67-.43.72.99-117.57,150.46-113.77,151.16,96.03-16.97,173.02-92.03,270.88-103.54,8.89-1.36,18.34-2.05,27.33-1.2,9.76-.67,20.94,5.09,19.19,16.73-5.32,37.7-93.53,134.77-113.33,166.85l69.68,1.2,9.85-16.36c21.57-28.56,54.2-71.84,76.3-99.7,13.42-17.06,31.91-45.5,37.41-66.85,3.17-12.2,45.05,1.39,49,9.88",
  "M578.85,96.96c-12.73,18.34-97.62,126.32-111.05,143.44h71.12l12.72-18.84c28.85-39.48,70.23-84.2,96.35-125.4-18.48.08-45.75-2.29-65.77-3.42",
  "M646.54,241.92c82.98-94.7,16.28-52.44,110.49-48.27,29.19-.12,67.8-7.39,94.39-20.03-16.05-17.03-38.81-30.28-58.08-43.41-3.08-2.05-10.31.79-13.5,1.47-4.19.89-42.31,3.34-41.91-4.72.15-2.91,4.69-8.21,5.98-10.98.84-1.8-29.45-8.85-32.24-9.33-11.64-1.99-23.47-2.83-35.27-2.52-9.82.26-15.51,9.61-20.99,16.74-17.28,22.5-34.57,45.01-51.85,67.51-11.29,14.57-27.46,38.21-38.91,52.7",
];

// Helper to format currency using the cent/colón glyph (\u00A2)
// In Latin-1 / WinAnsi (standard PDF Helvetica), \u00A2 encodes to byte 0xA2 (cent sign),
// which displays as the clean currency stroke symbol instead of \u20A1 which turns into inverted exclamation (¡).
function formatCurrencyCRC(num: number): string {
  const rounded = Math.round(num);
  const parts = Math.abs(rounded).toString().split("");
  let res = "";
  let count = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    res = parts[i] + res;
    count++;
    if (count % 3 === 0 && i !== 0) {
      res = "." + res;
    }
  }
  const sign = rounded < 0 ? "- " : "";
  return `${sign}\u00A2 ${res}`;
}

// Clean percentage formatter: strictly 1 decimal place (e.g. 50.0%)
function formatPct(num: number): string {
  if (isNaN(num)) return "0.0%";
  return `${num.toFixed(1)}%`;
}

// Format date strictly in dd/mm/aaaa
function formatDateDDMMAAAA(dateStr: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Slice calculator for SVG Pie Chart
function calculatePieSlices(
  categories: { name: string; amount: number; percentage: number; color: string }[],
  cx: number,
  cy: number,
  radius: number
) {
  let currentAngle = -90; // Start at top
  const validCategories = categories.filter((c) => c.percentage > 0);
  if (validCategories.length === 0) return [];

  return validCategories.map((cat, idx) => {
    const sliceAngle = Math.min(Math.max((cat.percentage / 100) * 360, 2), 359.9);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return {
      ...cat,
      pathData,
      key: `slice-${idx}`,
    };
  });
}

const styles = StyleSheet.create({
  // Page base
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 40,
    flexDirection: "column",
  },
  // Cover page - Vibrant Pantone Royal Blue matching reference image
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: "#1A56DB",
    color: "#FFFFFF",
    padding: 48,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverBrandText: {
    fontSize: 8.5,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#E0E7FF",
    textTransform: "uppercase",
  },
  coverCenter: {
    marginTop: 110,
    marginBottom: 110,
  },
  coverYear: {
    fontSize: 54,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 1.15,
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#BFDBFE",
    lineHeight: 1.15,
  },
  coverBottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
    paddingTop: 18,
  },
  coverDescription: {
    fontSize: 9.5,
    color: "#E0E7FF",
    lineHeight: 1.5,
    maxWidth: 440,
    marginBottom: 10,
  },
  coverFooterText: {
    fontSize: 7.5,
    color: "rgba(255, 255, 255, 0.65)",
  },

  // Running Header
  runningHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1A56DB",
    marginBottom: 18,
  },
  runningHeaderLeft: {
    flexDirection: "column",
  },
  runningHeaderTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1A56DB",
  },
  runningHeaderSubtitle: {
    fontSize: 7.5,
    color: "#64748B",
    marginTop: 2,
  },
  runningHeaderPage: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1A56DB",
  },

  // Running Footer
  runningFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.8,
    borderTopColor: "#E2E8F0",
    paddingTop: 6,
  },
  runningFooterText: {
    fontSize: 7,
    color: "#94A3B8",
  },

  // Section Headers
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 12,
  },

  // Overview Page (Page 2)
  overviewTopGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  chartContainer: {
    flex: 3,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 10,
  },
  heroMetricCard: {
    flex: 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    borderRadius: 6,
    padding: 14,
    justifyContent: "space-between",
  },
  heroMetricTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1A56DB",
    marginBottom: 6,
  },
  heroMetricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A56DB",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroMetricBadge: {
    fontSize: 8,
    color: "#059669",
    fontWeight: "bold",
    marginBottom: 8,
  },
  heroMetricDescription: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.45,
  },

  // 2-column bottom layout on page 2
  overviewBottomGrid: {
    flexDirection: "row",
    gap: 16,
  },
  bottomColumn: {
    flex: 1,
  },

  // KPI Highlight box
  kpiHighlightBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiHighlightLabel: {
    fontSize: 8,
    color: "#64748B",
  },
  kpiHighlightVal: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Tables
  tableContainer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1A56DB",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontSize: 7.5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "flex-start",
    borderBottomWidth: 0.8,
    borderBottomColor: "#E2E8F0",
  },
  tableRowZebra: {
    backgroundColor: "#F8FAFC",
  },
  tableRowHighlight: {
    backgroundColor: "#EFF6FF",
    borderTopWidth: 1,
    borderTopColor: "#93C5FD",
  },
  tableCell: {
    fontSize: 7.5,
    color: "#1E293B",
  },
  tableCellBold: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Badges
  badgeIncome: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: 6.5,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    textAlign: "center",
  },
  badgeExpense: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    fontSize: 6.5,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    textAlign: "center",
  },

  // Category page styles
  categoryLayout: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  categoryHeroCol: {
    flex: 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    borderRadius: 6,
    padding: 14,
    justifyContent: "space-between",
  },
  categoryPieCol: {
    flex: 3,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pieLegendContainer: {
    flex: 1,
    marginLeft: 14,
  },
  pieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pieLegendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    marginRight: 6,
  },
  pieLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  pieLegendName: {
    fontSize: 7.5,
    color: "#334155",
  },
  pieLegendPct: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#0F172A",
    flexShrink: 0,
  },

  // Category progress bars
  categoryBarRow: {
    marginBottom: 8,
  },
  categoryBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  categoryBarName: {
    fontSize: 8,
    color: "#334155",
    fontWeight: "bold",
  },
  categoryBarValue: {
    fontSize: 8,
    color: "#0F172A",
    fontWeight: "bold",
  },
  categoryBarTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: 3,
  },
});

interface FinancialReportPdfDocumentProps {
  data: FinancialReportData;
}

export default function FinancialReportPdfDocument({
  data,
}: FinancialReportPdfDocumentProps) {
  // Daily timeline 5 key points for the area chart
  const timeline = data.dailyTimeline || [];
  const daysCount = timeline.length;
  const sampleIndices = [
    0,
    Math.min(7, Math.max(0, daysCount - 1)),
    Math.min(14, Math.max(0, daysCount - 1)),
    Math.min(21, Math.max(0, daysCount - 1)),
    Math.max(0, daysCount - 1),
  ];

  const chartPoints = sampleIndices.map((idx, sampleIdx) => {
    const item = timeline[idx];
    const val = item ? item.cumulative : 0;
    return {
      label:
        sampleIdx === 0
          ? "Día 1"
          : sampleIdx === 1
            ? "Día 8"
            : sampleIdx === 2
              ? "Día 15"
              : sampleIdx === 3
                ? "Día 22"
                : "Fin de mes",
      value: val,
    };
  });

  // Calculate chart coordinates with generous padding
  const chartW = 340;
  const chartH = 120;
  const padLeft = 40;
  const padRight = 30;
  const padTop = 18;
  const padBottom = 26;

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const values = chartPoints.map((p) => p.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const valRange = maxVal - minVal || 1;

  const svgCoords = chartPoints.map((p, i) => {
    const x = padLeft + (i / (chartPoints.length - 1)) * plotW;
    const norm = (p.value - minVal) / valRange;
    const y = padTop + plotH - norm * plotH;
    return { ...p, x, y };
  });

  const pointsPolyline = svgCoords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const polygonPoints = `${padLeft},${padTop + plotH} ${pointsPolyline} ${
    padLeft + plotW
  },${padTop + plotH}`;

  // Pie chart calculation
  const pieSlices = calculatePieSlices(data.categories, 65, 65, 55);

  // Pagination for transactions: 14 rows per page to prevent collisions and overlap
  const TX_PER_PAGE = 14;
  const txList = data.transactions || [];
  const txPages: (typeof data.transactions)[] = [];
  if (txList.length === 0) {
    txPages.push([]);
  } else {
    for (let i = 0; i < txList.length; i += TX_PER_PAGE) {
      txPages.push(txList.slice(i, i + TX_PER_PAGE));
    }
  }

  // Total pages = 1 (Cover) + 1 (Overview) + 1 (Categories) + txPages.length
  const totalPagesCount = 3 + txPages.length;

  return (
    <Document
      title={`Reporte financiero UMP - ${data.monthName} ${data.year}`}
      author="Ultimate Media Productions"
      subject="Reporte Financiero Mensual"
    >
      {/* =========================================================================
          PAGE 1: PORTADA EJECUTIVA
          Fiel a la referencia: fondo azul real, logo, tipografía limpia y equilibrada
         ========================================================================= */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          <Svg width={90} height={28} viewBox="0 0 920 260">
            {UMP_LOGO_PATHS.map((pathD, idx) => (
              <Path key={idx} d={pathD} fill="#FFFFFF" />
            ))}
          </Svg>
          <Text style={styles.coverBrandText}>Ultimate Media Productions</Text>
        </View>

        <View style={styles.coverCenter}>
          <Text style={styles.coverYear}>{data.year}</Text>
          <Text style={styles.coverTitle}>Reporte financiero</Text>
          <Text style={styles.coverSubtitle}>Mensual • {data.monthName}</Text>
        </View>

        <View style={styles.coverBottom}>
          <Text style={styles.coverDescription}>
            Informe ejecutivo de resultados, facturación de ingresos, egresos
            operativos y balance neto correspondiente al periodo de{" "}
            {data.monthName} {data.year}.
          </Text>
          <Text style={styles.coverFooterText}>
            Emisión: {formatDateDDMMAAAA(data.generatedAt)} • Confidencial • Uso
            interno exclusivo
          </Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 2: RESUMEN EJECUTIVO Y EVOLUCIÓN ACUMULADA
          Fiel a la referencia: Gráfico de área superior, hero metric y tabla de pilares
         ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.runningHeader}>
          <View style={styles.runningHeaderLeft}>
            <Text style={styles.runningHeaderTitle}>
              Reporte financiero UMP • {data.monthName} {data.year}
            </Text>
            <Text style={styles.runningHeaderSubtitle}>
              Resumen ejecutivo de ingresos, egresos y evolución del flujo
            </Text>
          </View>
          <Text style={styles.runningHeaderPage}>
            Página 2 de {totalPagesCount}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Evolución acumulada del periodo</Text>
        <Text style={styles.sectionSubtitle}>
          Trayectoria del flujo de caja operativo registrado durante el mes
        </Text>

        <View style={styles.overviewTopGrid}>
          {/* Area Chart without edge clipping */}
          <View style={styles.chartContainer}>
            <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
              <Line
                x1={padLeft}
                y1={padTop}
                x2={padLeft + plotW}
                y2={padTop}
                stroke="#E2E8F0"
                strokeWidth={0.8}
              />
              <Line
                x1={padLeft}
                y1={padTop + plotH * 0.5}
                x2={padLeft + plotW}
                y2={padTop + plotH * 0.5}
                stroke="#E2E8F0"
                strokeWidth={0.8}
              />
              <Line
                x1={padLeft}
                y1={padTop + plotH}
                x2={padLeft + plotW}
                y2={padTop + plotH}
                stroke="#CBD5E1"
                strokeWidth={1}
              />

              <Polygon points={polygonPoints} fill="#DBEAFE" opacity={0.65} />

              <Polyline
                points={pointsPolyline}
                fill="none"
                stroke="#1A56DB"
                strokeWidth={2.2}
              />

              {svgCoords.map((c, i) => (
                <Circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={3}
                  fill="#1A56DB"
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
              ))}
            </Svg>

            {/* X-axis labels below SVG */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingLeft: padLeft - 10,
                paddingRight: padRight - 10,
                marginTop: 4,
              }}
            >
              {chartPoints.map((p, i) => (
                <Text key={i} style={{ fontSize: 7, color: "#64748B" }}>
                  {p.label}
                </Text>
              ))}
            </View>
          </View>

          {/* Hero Metric Box */}
          <View style={styles.heroMetricCard}>
            <View>
              <Text style={styles.heroMetricTitle}>Total de ingresos</Text>
              <Text style={styles.heroMetricValue}>
                {formatCurrencyCRC(data.totalIncome)}
              </Text>
              <Text style={styles.heroMetricBadge}>
                {data.incomeCount} cobros facturados
              </Text>
            </View>
            <Text style={styles.heroMetricDescription}>
              Cobros correspondientes a servicios de producción, manejo de redes y
              clientes activos, con un margen neto de {formatPct(data.profitMargin)}.
            </Text>
          </View>
        </View>

        {/* Bottom Section: Pilares financieros y Observaciones */}
        <View style={styles.overviewBottomGrid}>
          {/* Table of financial pillars */}
          <View style={styles.bottomColumn}>
            <Text style={styles.sectionTitle}>Pilares financieros</Text>
            <Text style={styles.sectionSubtitle}>
              Estructura consolidada del periodo
            </Text>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: "50%" }]}>
                  Concepto
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { width: "32%", textAlign: "right" },
                  ]}
                >
                  Monto
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { width: "18%", textAlign: "right" },
                  ]}
                >
                  Part.
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "50%" }]}>
                  Total de ingresos
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "32%", textAlign: "right", color: "#15803D" },
                  ]}
                >
                  {formatCurrencyCRC(data.totalIncome)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "18%", textAlign: "right" },
                  ]}
                >
                  100%
                </Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowZebra]}>
                <Text style={[styles.tableCell, { width: "50%" }]}>
                  Total de egresos
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "32%", textAlign: "right", color: "#B91C1C" },
                  ]}
                >
                  {formatCurrencyCRC(data.totalExpenses)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "18%", textAlign: "right" },
                  ]}
                >
                  100%
                </Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowHighlight]}>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "50%", color: "#1A56DB" },
                  ]}
                >
                  Balance operativo neto
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    {
                      width: "32%",
                      textAlign: "right",
                      color: data.netBalance >= 0 ? "#15803D" : "#B91C1C",
                    },
                  ]}
                >
                  {formatCurrencyCRC(data.netBalance)}
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "18%", textAlign: "right", color: "#1A56DB" },
                  ]}
                >
                  {formatPct(data.profitMargin)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right column: Observaciones */}
          <View style={styles.bottomColumn}>
            <Text style={styles.sectionTitle}>Observaciones del periodo</Text>
            <Text style={styles.sectionSubtitle}>
              Métricas clave de gestión y liquidez
            </Text>

            <View style={styles.kpiHighlightBox}>
              <Text style={styles.kpiHighlightLabel}>Margen operativo neto</Text>
              <Text
                style={[
                  styles.kpiHighlightVal,
                  { color: data.profitMargin >= 0 ? "#15803D" : "#B91C1C" },
                ]}
              >
                {formatPct(data.profitMargin)}
              </Text>
            </View>

            <View style={styles.kpiHighlightBox}>
              <Text style={styles.kpiHighlightLabel}>
                Actividad de movimientos
              </Text>
              <Text style={styles.kpiHighlightVal}>
                {data.incomeCount} cobros / {data.expenseCount} egresos
              </Text>
            </View>

            <View style={styles.kpiHighlightBox}>
              <Text style={styles.kpiHighlightLabel}>
                Egreso promedio diario
              </Text>
              <Text style={styles.kpiHighlightVal}>
                {formatCurrencyCRC(data.totalExpenses / 30)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.runningFooter}>
          <Text style={styles.runningFooterText}>
            Ultimate Media Productions • Reporte financiero mensual
          </Text>
          <Text style={styles.runningFooterText}>
            Página 2 de {totalPagesCount}
          </Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 3: DISTRIBUCIÓN DE EGRESOS Y CATEGORÍAS
          Fiel a la referencia: Hero stat de egresos, gráfico circular y barras
         ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.runningHeader}>
          <View style={styles.runningHeaderLeft}>
            <Text style={styles.runningHeaderTitle}>
              Reporte financiero UMP • {data.monthName} {data.year}
            </Text>
            <Text style={styles.runningHeaderSubtitle}>
              Distribución y estructura de costos por categoría
            </Text>
          </View>
          <Text style={styles.runningHeaderPage}>
            Página 3 de {totalPagesCount}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Estructura y distribución de gastos
        </Text>
        <Text style={styles.sectionSubtitle}>
          Participación porcentual y desglose de las principales áreas operativas
        </Text>

        <View style={styles.categoryLayout}>
          {/* Hero metric card for expenses */}
          <View style={styles.categoryHeroCol}>
            <View>
              <Text style={styles.heroMetricTitle}>Total de egresos</Text>
              <Text style={styles.heroMetricValue}>
                {formatCurrencyCRC(data.totalExpenses)}
              </Text>
              <Text style={[styles.heroMetricBadge, { color: "#B91C1C" }]}>
                {data.categories.length} categorías registradas
              </Text>
            </View>
            <Text style={styles.heroMetricDescription}>
              Comprende compras operativas para filmaciones, pagos de servicios,
              nómina del equipo y suministros del mes.
            </Text>
          </View>

          {/* Pie Chart and Legend */}
          <View style={styles.categoryPieCol}>
            <Svg width={130} height={130} viewBox="0 0 130 130">
              {pieSlices.length > 0 ? (
                pieSlices.map((slice) => (
                  <Path
                    key={slice.key}
                    d={slice.pathData}
                    fill={slice.color}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                ))
              ) : (
                <Circle cx={65} cy={65} r={55} fill="#E2E8F0" />
              )}
            </Svg>

            <View style={styles.pieLegendContainer}>
              {data.categories.slice(0, 6).map((cat, idx) => (
                <View key={idx} style={styles.pieLegendItem}>
                  <View style={styles.pieLegendLeft}>
                    <View
                      style={[
                        styles.pieLegendDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text style={styles.pieLegendName}>{cat.name}</Text>
                  </View>
                  <Text style={styles.pieLegendPct}>
                    {formatPct(cat.percentage)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Detailed category progress bars */}
        <Text style={styles.sectionTitle}>
          Participación por categoría de gasto
        </Text>
        <Text style={styles.sectionSubtitle}>
          Monto total y porcentaje representativo en el periodo
        </Text>

        <View style={{ marginTop: 4 }}>
          {data.categories.map((cat, idx) => (
            <View key={idx} style={styles.categoryBarRow}>
              <View style={styles.categoryBarHeader}>
                <Text style={styles.categoryBarName}>{cat.name}</Text>
                <Text style={styles.categoryBarValue}>
                  {formatCurrencyCRC(cat.amount)} ({formatPct(cat.percentage)})
                </Text>
              </View>
              <View style={styles.categoryBarTrack}>
                <View
                  style={[
                    styles.categoryBarFill,
                    {
                      width: `${Math.min(Math.max(cat.percentage, 2), 100)}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.runningFooter}>
          <Text style={styles.runningFooterText}>
            Ultimate Media Productions • Reporte financiero mensual
          </Text>
          <Text style={styles.runningFooterText}>
            Página 3 de {totalPagesCount}
          </Text>
        </View>
      </Page>

      {/* =========================================================================
          PAGE 4+: REGISTRO DE TRANSACCIONES DEL MES (INGRESOS Y EGRESOS)
          Páginas dedicadas con 14 transacciones por página, evitando desbordes o cortes
         ========================================================================= */}
      {txPages.map((pageChunk, pageIndex) => {
        const currentPageNumber = 4 + pageIndex;
        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            <View style={styles.runningHeader}>
              <View style={styles.runningHeaderLeft}>
                <Text style={styles.runningHeaderTitle}>
                  Reporte financiero UMP • {data.monthName} {data.year}
                </Text>
                <Text style={styles.runningHeaderSubtitle}>
                  Registro de transacciones
                  {txPages.length > 1
                    ? ` (parte ${pageIndex + 1} de ${txPages.length})`
                    : ""}
                </Text>
              </View>
              <Text style={styles.runningHeaderPage}>
                Página {currentPageNumber} de {totalPagesCount}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Registro de transacciones</Text>
            <Text style={styles.sectionSubtitle}>
              Listado de ingresos recibidos y compras operativas registradas en el mes
            </Text>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <View style={{ width: "13%" }}>
                  <Text style={styles.tableHeaderCell}>Fecha</Text>
                </View>
                <View style={{ width: "43%", paddingRight: 8 }}>
                  <Text style={styles.tableHeaderCell}>Concepto / Cliente</Text>
                </View>
                <View style={{ width: "19%", paddingRight: 6 }}>
                  <Text style={styles.tableHeaderCell}>Categoría</Text>
                </View>
                <View style={{ width: "11%", alignItems: "center" }}>
                  <Text style={[styles.tableHeaderCell, { textAlign: "center" }]}>
                    Tipo
                  </Text>
                </View>
                <View style={{ width: "14%", alignItems: "flex-end" }}>
                  <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>
                    Monto
                  </Text>
                </View>
              </View>

              {pageChunk.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "100%", textAlign: "center", color: "#94A3B8" },
                    ]}
                  >
                    No se registraron transacciones durante este periodo.
                  </Text>
                </View>
              ) : (
                pageChunk.map((tx, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.tableRow,
                      idx % 2 === 1 ? styles.tableRowZebra : undefined,
                    ]}
                  >
                    <View style={{ width: "13%" }}>
                      <Text style={styles.tableCell}>
                        {formatDateDDMMAAAA(tx.date)}
                      </Text>
                    </View>

                    <View style={{ width: "43%", paddingRight: 8 }}>
                      <Text style={styles.tableCellBold}>{tx.concept}</Text>
                      {tx.entity && (
                        <Text
                          style={[
                            styles.tableCell,
                            { color: "#64748B", fontSize: 6.5, marginTop: 1 },
                          ]}
                        >
                          {tx.entity}
                        </Text>
                      )}
                    </View>

                    <View style={{ width: "19%", paddingRight: 6 }}>
                      <Text style={styles.tableCell}>{tx.category}</Text>
                    </View>

                    <View style={{ width: "11%", alignItems: "center" }}>
                      <Text
                        style={
                          tx.type === "income"
                            ? styles.badgeIncome
                            : styles.badgeExpense
                        }
                      >
                        {tx.type === "income" ? "Ingreso" : "Gasto"}
                      </Text>
                    </View>

                    <View style={{ width: "14%", alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.tableCellBold,
                          {
                            textAlign: "right",
                            color: tx.type === "income" ? "#15803D" : "#B91C1C",
                          },
                        ]}
                      >
                        {tx.type === "income" ? "+ " : "- "}
                        {formatCurrencyCRC(tx.amount)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.runningFooter}>
              <Text style={styles.runningFooterText}>
                Ultimate Media Productions • Reporte financiero mensual
              </Text>
              <Text style={styles.runningFooterText}>
                Página {currentPageNumber} de {totalPagesCount}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
