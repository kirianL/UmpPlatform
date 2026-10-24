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
  currency: string; // "CRC"
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  profitMargin: number;
  transactionsCount: number;
  fixedExpensesCount: number;
  fixedExpensesTotal: number;
  fixedExpensesPaid: number;
  fixedExpensesPending: number;
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
  fixedExpenses: {
    concept: string;
    amount: number;
    category: string;
    dueDay: number;
    isPaid: boolean;
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

const UMP_LOGO_PATHS = [
  "M756.95,85.28c6.43-5,12.96-19.05,22.03-19.32,18.41.26,36.85,4.78,53.02,13.67,17.44,8.58,8.19,24.18-3.19,33.1-3.27,2.85-6.21,3.57-3.51,4.84,17.81,7.86,32.9,20.67,47.66,32.84,0,0,0,0,0,0,15.74-15.07,26.15-36.44,24.5-58.42-7.38-75.23-130.83-103.82-181.58-56.91-13.15,12.17-14.61,22.29-26.85,35.38",
  "M297.17,240.5s100.08-151.57,100.08-151.57c-23.93,3.66-47.45,10.31-69.69,19.88s-40.37,22.34-60.88,33.11c-47.02,24.7-97.73,47.15-150.97,51.05-26.8.98-41.69-2.8-28.31-33.46,7.74-24.19,104.11-129.6,113.48-152.04-1.8,1.12-65.87-7.48-65.87-7.48,0,0-6.49,8.25-6.28,9.2-24.46,33.03-64.93,85.81-90.25,118.08-15.85,21.77-52.08,67.63-33.1,96.37,4.84,7.32,13.77,10.76,22.37,12.5,42.75,8.65,90.62-5.58,130.3-20.72,21.38-8.16,42-18.15,62.25-28.79,13.83-7.26,27.5-14.83,41.19-22.34,5.3-2.9,11.7-5.01,15.14-10.32-12.99,22.11-29.6,42.55-44.59,63.32-5.67,7.85-11.64,15.58-16.95,23.68",
  "M661.43,67.22c7.35-9.86,5.85-32.35-.72-42.29-21.63-32.75-92.87-7.92-120.08.67-10.52-16.72-49.68-16.59-67.48-15.46-73.36,6.76-148.88,46.04-209.4,86.89l3.89-5.11c.12-.73,62.11-80.34,61.56-81.27-.66-1.13-69.69-.05-70.67-.43.72.99-117.57,150.46-113.77,151.16,96.03-16.97,173.02-92.03,270.88-103.54,8.89-1.36,18.34-2.05,27.33-1.2,9.76-.67,20.94,5.09,19.19,16.73-5.32,37.7-93.53,134.77-113.33,166.85l69.68,1.2,9.85-16.36c21.57-28.56,54.2-71.84,76.3-99.7,13.42-17.06,31.91-45.5,37.41-66.85,3.17-12.2,45.05,1.39,49,9.88",
  "M578.85,96.96c-12.73,18.34-97.62,126.32-111.05,143.44h71.12l12.72-18.84c28.85-39.48,70.23-84.2,96.35-125.4-18.48.08-45.75-2.29-65.77-3.42",
  "M646.54,241.92c82.98-94.7,16.28-52.44,110.49-48.27,29.19-.12,67.8-7.39,94.39-20.03-16.05-17.03-38.81-30.28-58.08-43.41-3.08-2.05-10.31.79-13.5,1.47-4.19.89-42.31,3.34-41.91-4.72.15-2.91,4.69-8.21,5.98-10.98.84-1.8-29.45-8.85-32.24-9.33-11.64-1.99-23.47-2.83-35.27-2.52-9.82.26-15.51,9.61-20.99,16.74-17.28,22.5-34.57,45.01-51.85,67.51-11.29,14.57-27.46,38.21-38.91,52.7",
];

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
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₡ ${res}`;
}

const styles = StyleSheet.create({
  // Base Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: "#0B2559",
    color: "#FFFFFF",
    padding: 44,
    justifyContent: "space-between",
  },
  // Cover Elements
  coverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverBrand: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#93C5FD",
    textTransform: "uppercase",
  },
  coverYear: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginTop: 60,
  },
  coverMonth: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#60A5FA",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 12,
    lineHeight: 1.5,
    maxWidth: 420,
  },
  coverMetricsBox: {
    marginTop: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverMetricItem: {
    flex: 1,
    paddingHorizontal: 6,
  },
  coverMetricLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#93C5FD",
    marginBottom: 4,
  },
  coverMetricValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverFooterText: {
    fontSize: 8,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },

  // Document Headers
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0B2559",
    paddingBottom: 8,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0B2559",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2,
  },
  headerTag: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1E40AF",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // Section titles
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 1.4,
  },

  // KPI Row
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#64748B",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  kpiBadge: {
    fontSize: 7.5,
    fontWeight: "bold",
    marginTop: 3,
  },

  // Charts container
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0F172A",
  },
  chartMeta: {
    fontSize: 7.5,
    color: "#64748B",
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0B2559",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  tableRowEven: {
    backgroundColor: "#F8FAFC",
  },
  tableCell: {
    fontSize: 7.5,
    color: "#334155",
  },
  tableCellBold: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#0F172A",
  },
  tableFooterRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
  },

  // Footer / Page Number
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: "#94A3B8",
  },
});

export default function FinancialReportPdfDocument({
  data,
}: {
  data: FinancialReportData;
}) {
  // SVG Area Chart points calculation
  const chartWidth = 515;
  const chartHeight = 90;
  const timeline = data.dailyTimeline;

  let maxCumulative = Math.max(...timeline.map((t) => t.cumulative), 1);
  let minCumulative = Math.min(...timeline.map((t) => t.cumulative), 0);
  if (maxCumulative === minCumulative) maxCumulative += 100;

  const points = timeline.map((pt, i) => {
    const x =
      timeline.length > 1
        ? (i / (timeline.length - 1)) * (chartWidth - 20) + 10
        : chartWidth / 2;
    const normalized =
      (pt.cumulative - minCumulative) / (maxCumulative - minCumulative);
    const y = chartHeight - 15 - normalized * (chartHeight - 30);
    return { x, y, day: pt.day, val: pt.cumulative };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const polygonStr = `${points[0]?.x.toFixed(1) || 10},${chartHeight - 8} ${polylineStr} ${points[points.length - 1]?.x.toFixed(1) || chartWidth - 10},${chartHeight - 8}`;

  // Key points to label
  const peakPoint = [...points].sort((a, b) => b.val - a.val)[0];
  const lastPoint = points[points.length - 1];

  return (
    <Document
      title={`Reporte Financiero UMP - ${data.periodLabel}`}
      author="Ultimate Media Productions"
      subject="Reporte Financiero Mensual"
      keywords="finanzas, balance, reporte, UMP"
    >
      {/* ============================================================== */}
      {/* PAGINA 1: PORTADA EJECUTIVA                                    */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.coverPage}>
        {/* Top Header */}
        <View style={styles.coverHeader}>
          <View style={{ width: 120, height: 32 }}>
            <Svg viewBox="0 0 897.63 241.92" width={120} height={32}>
              {UMP_LOGO_PATHS.map((path, idx) => (
                <Path key={idx} d={path} fill="#FFFFFF" />
              ))}
            </Svg>
          </View>
          <Text style={styles.coverBrand}>ULTIMATE MEDIA PRODUCTIONS</Text>
        </View>

        {/* Hero Title Block */}
        <View>
          <Text style={styles.coverYear}>{data.year}</Text>
          <Text style={styles.coverMonth}>{data.monthName}</Text>
          <Text style={styles.coverTitle}>Reporte Financiero{"\n"}Mensual</Text>
          <Text style={styles.coverSubtitle}>
            Informe ejecutivo de resultados, ingresos por servicios, compromisos
            operativos y balance neto correspondiente al periodo de {data.periodLabel}.
          </Text>

          {/* Highlights KPI Matrix */}
          <View style={styles.coverMetricsBox}>
            <View style={styles.coverMetricItem}>
              <Text style={styles.coverMetricLabel}>Ingresos</Text>
              <Text style={styles.coverMetricValue}>
                {formatCurrencyCRC(data.totalIncome)}
              </Text>
            </View>
            <View style={styles.coverMetricItem}>
              <Text style={styles.coverMetricLabel}>Gastos Totales</Text>
              <Text style={styles.coverMetricValue}>
                {formatCurrencyCRC(data.totalExpenses)}
              </Text>
            </View>
            <View style={styles.coverMetricItem}>
              <Text style={styles.coverMetricLabel}>Balance Neto</Text>
              <Text style={styles.coverMetricValue}>
                {formatCurrencyCRC(data.netBalance)}
              </Text>
            </View>
            <View style={styles.coverMetricItem}>
              <Text style={styles.coverMetricLabel}>Margen Op.</Text>
              <Text style={styles.coverMetricValue}>
                {data.profitMargin >= 0 ? "+" : ""}
                {data.profitMargin.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Metadata */}
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            Emitido el {data.generatedAt}
          </Text>
          <Text style={styles.coverFooterText}>
            CONFIDENCIAL • USO INTERNO EXCLUSIVO
          </Text>
        </View>
      </Page>

      {/* ============================================================== */}
      {/* PAGINA 2: RESUMEN EJECUTIVO Y GRAFICOS                         */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>
              Reporte Financiero UMP • {data.periodLabel}
            </Text>
            <Text style={styles.headerSubtitle}>
              Resumen ejecutivo de ingresos, egresos y análisis gráfico
            </Text>
          </View>
          <Text style={styles.headerTag}>PÁGINA 1 DE 3</Text>
        </View>

        {/* 3 Main Stat Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderColor: "#A7F3D0" }]}>
            <Text style={styles.kpiLabel}>Total Ingresos</Text>
            <Text style={[styles.kpiValue, { color: "#065F46" }]}>
              {formatCurrencyCRC(data.totalIncome)}
            </Text>
            <Text style={[styles.kpiBadge, { color: "#059669" }]}>
              {data.transactions.filter((t) => t.type === "income").length} cobros registrados
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#FECDD3" }]}>
            <Text style={styles.kpiLabel}>Total Gastos</Text>
            <Text style={[styles.kpiValue, { color: "#9F1239" }]}>
              {formatCurrencyCRC(data.totalExpenses)}
            </Text>
            <Text style={[styles.kpiBadge, { color: "#E11D48" }]}>
              Incluye fijos y operativos
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: "#BFDBFE" }]}>
            <Text style={styles.kpiLabel}>Balance Operativo</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: data.netBalance >= 0 ? "#1E40AF" : "#DC2626" },
              ]}
            >
              {formatCurrencyCRC(data.netBalance)}
            </Text>
            <Text
              style={[
                styles.kpiBadge,
                { color: data.netBalance >= 0 ? "#2563EB" : "#DC2626" },
              ]}
            >
              Rentabilidad: {data.profitMargin >= 0 ? "+" : ""}
              {data.profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Graphic 1: Cash Flow Evolution Area Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>
                Evolución del Flujo de Caja en el Mes
              </Text>
              <Text style={styles.chartMeta}>
                Balance acumulado diario durante {data.monthName} {data.year}
              </Text>
            </View>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#2563EB" }}>
              Cierre: {formatCurrencyCRC(data.netBalance)}
            </Text>
          </View>

          <View style={{ height: chartHeight, width: chartWidth }}>
            <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Background gridlines */}
              <Line x1={10} y1={20} x2={chartWidth - 10} y2={20} stroke="#F1F5F9" strokeWidth={1} />
              <Line x1={10} y1={50} x2={chartWidth - 10} y2={50} stroke="#F1F5F9" strokeWidth={1} />
              <Line x1={10} y1={chartHeight - 12} x2={chartWidth - 10} y2={chartHeight - 12} stroke="#CBD5E1" strokeWidth={1} />

              {/* Area Fill */}
              {points.length > 1 && (
                <Polygon points={polygonStr} fill="#DBEAFE" fillOpacity={0.6} />
              )}

              {/* Curve Stroke */}
              {points.length > 1 && (
                <Polyline points={polylineStr} stroke="#2563EB" strokeWidth={2.5} />
              )}

              {/* Peak Point and Last Point */}
              {peakPoint && (
                <G>
                  <Circle cx={peakPoint.x} cy={peakPoint.y} r={3.5} fill="#1D4ED8" />
                </G>
              )}
              {lastPoint && (
                <G>
                  <Circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill="#059669" />
                </G>
              )}
            </Svg>
          </View>

          {/* X Axis days */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 7, color: "#94A3B8" }}>Día 1</Text>
            <Text style={{ fontSize: 7, color: "#94A3B8" }}>Día 8</Text>
            <Text style={{ fontSize: 7, color: "#94A3B8" }}>Día 15</Text>
            <Text style={{ fontSize: 7, color: "#94A3B8" }}>Día 22</Text>
            <Text style={{ fontSize: 7, color: "#94A3B8" }}>Fin de mes</Text>
          </View>
        </View>

        {/* Graphic 2: Category Breakdown */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Distribución de Gastos por Categoría</Text>
              <Text style={styles.chartMeta}>
                Participación porcentual sobre el total de egresos
              </Text>
            </View>
          </View>

          {/* Horizontal multi-color bar */}
          <View
            style={{
              flexDirection: "row",
              height: 12,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 10,
              backgroundColor: "#F1F5F9",
            }}
          >
            {data.categories.length === 0 ? (
              <View style={{ flex: 1, backgroundColor: "#E2E8F0" }} />
            ) : (
              data.categories.map((cat, i) => (
                <View
                  key={i}
                  style={{
                    width: `${Math.max(cat.percentage, 2)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              ))
            )}
          </View>

          {/* Category Legend & Table */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {data.categories.map((cat, i) => (
              <View
                key={i}
                style={{
                  width: "48%",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 3,
                  paddingHorizontal: 6,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 4,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      backgroundColor: cat.color,
                    }}
                  />
                  <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#1E293B" }}>
                    {cat.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 7.5, color: "#475569" }}>
                  {formatCurrencyCRC(cat.amount)} ({cat.percentage.toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.pageFooter}>
          <Text style={styles.footerText}>
            Ultimate Media Productions • Reporte Financiero Mensual
          </Text>
          <Text style={styles.footerText}>Página 2</Text>
        </View>
      </Page>

      {/* ============================================================== */}
      {/* PAGINA 3: GASTOS FIJOS Y TRANSACCIONES DESTACADAS              */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>
              Gastos Fijos y Registro Operativo • {data.periodLabel}
            </Text>
            <Text style={styles.headerSubtitle}>
              Detalle de obligaciones recurrentes y principales movimientos
            </Text>
          </View>
          <Text style={styles.headerTag}>PÁGINA 2 DE 3</Text>
        </View>

        {/* Gastos Fijos Section */}
        <Text style={styles.sectionTitle}>Obligaciones y Gastos Fijos</Text>
        <Text style={styles.sectionSubtitle}>
          Compromisos mensuales estables: alquiler, plataformas, nómina y servicios.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Día</Text>
            <Text style={[styles.tableHeaderCell, { width: "38%" }]}>Concepto</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Categoría</Text>
            <Text style={[styles.tableHeaderCell, { width: "16%", textAlign: "right" }]}>Monto</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "center" }]}>Estado</Text>
          </View>

          {data.fixedExpenses.length === 0 ? (
            <View style={{ padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: "#94A3B8" }}>
                No se registraron gastos fijos activos para este periodo.
              </Text>
            </View>
          ) : (
            data.fixedExpenses.map((fe, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowEven : {},
                ]}
              >
                <Text style={[styles.tableCellBold, { width: "12%" }]}>
                  Día {fe.dueDay}
                </Text>
                <Text style={[styles.tableCellBold, { width: "38%" }]}>
                  {fe.concept}
                </Text>
                <Text style={[styles.tableCell, { width: "22%" }]}>
                  {fe.category}
                </Text>
                <Text style={[styles.tableCellBold, { width: "16%", textAlign: "right" }]}>
                  {formatCurrencyCRC(fe.amount)}
                </Text>
                <View style={{ width: "12%", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 6.5,
                      fontWeight: "bold",
                      color: fe.isPaid ? "#059669" : "#D97706",
                      backgroundColor: fe.isPaid ? "#ECFDF5" : "#FFFBEB",
                      paddingHorizontal: 4,
                      paddingVertical: 1.5,
                      borderRadius: 3,
                    }}
                  >
                    {fe.isPaid ? "PAGADO" : "PENDIENTE"}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.tableFooterRow}>
            <Text style={[styles.tableCellBold, { width: "72%" }]}>
              Total Gastos Fijos del Mes
            </Text>
            <Text style={[styles.tableCellBold, { width: "16%", textAlign: "right", color: "#0B2559" }]}>
              {formatCurrencyCRC(data.fixedExpensesTotal)}
            </Text>
            <Text style={{ width: "12%" }} />
          </View>
        </View>

        {/* Movimientos del Periodo */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
          Principales Transacciones del Mes
        </Text>
        <Text style={styles.sectionSubtitle}>
          Listado de ingresos recibidos y gastos operativos facturados en el periodo.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Fecha</Text>
            <Text style={[styles.tableHeaderCell, { width: "36%" }]}>Concepto / Cliente</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Categoría</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%", textAlign: "center" }]}>Tipo</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Monto</Text>
          </View>

          {data.transactions.slice(0, 15).map((t, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowEven : {},
              ]}
            >
              <Text style={[styles.tableCell, { width: "14%" }]}>{t.date}</Text>
              <View style={{ width: "36%" }}>
                <Text style={styles.tableCellBold}>{t.concept}</Text>
                {t.entity ? (
                  <Text style={{ fontSize: 6.5, color: "#64748B" }}>{t.entity}</Text>
                ) : null}
              </View>
              <Text style={[styles.tableCell, { width: "18%" }]}>{t.category}</Text>
              <View style={{ width: "12%", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 6.5,
                    fontWeight: "bold",
                    color: t.type === "income" ? "#059669" : "#DC2626",
                    backgroundColor: t.type === "income" ? "#ECFDF5" : "#FEF2F2",
                    paddingHorizontal: 4,
                    paddingVertical: 1.5,
                    borderRadius: 3,
                  }}
                >
                  {t.type === "income" ? "INGRESO" : "GASTO"}
                </Text>
              </View>
              <Text
                style={[
                  styles.tableCellBold,
                  {
                    width: "20%",
                    textAlign: "right",
                    color: t.type === "income" ? "#065F46" : "#991B1B",
                  },
                ]}
              >
                {t.type === "income" ? "+" : "-"} {formatCurrencyCRC(t.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.pageFooter}>
          <Text style={styles.footerText}>
            Ultimate Media Productions • Reporte Financiero Mensual
          </Text>
          <Text style={styles.footerText}>Página 3</Text>
        </View>
      </Page>
    </Document>
  );
}
