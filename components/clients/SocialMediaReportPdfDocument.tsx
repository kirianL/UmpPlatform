import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDateDDMMYYYY } from "@/helpers/date-format";

// Re-export for backwards compatibility
export { formatDateDDMMYYYY };

export interface ReportPostItem {
  _id?: string;
  title: string;
  platform: string;
  contentType: string;
  scheduledDate: string;
  status: string;
  postUrl?: string;
  caption?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface ReportData {
  clientName: string;
  companyName: string;
  email?: string;
  logoUrl?: string;
  monthYear: string;
  targetPosts: number;
  publishedPosts: number;
  targetReels?: number;
  publishedReels?: number;
  targetStories?: number;
  publishedStories?: number;
  targetCarousels?: number;
  publishedCarousels?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  posts: ReportPostItem[];
  notes?: string;
}

const STATUS_LABELS: Record<string, string> = {
  planificado: "Planificado",
  en_proceso: "En Proceso",
  publicado: "Publicado",
  cancelado: "Cancelado",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "#0f172a",
    textTransform: "uppercase",
  },
  brandSub: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "right",
  },
  headerDate: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 3,
    textAlign: "right",
  },
  clientBanner: {
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    padding: 2,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  clientLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  clientCol: {
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
  },
  clientSub: {
    fontSize: 9,
    color: "#475569",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statTarget: {
    fontSize: 8,
    color: "#94a3b8",
  },
  darkMetricsBox: {
    backgroundColor: "#0f172a",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  darkMetricCol: {
    flex: 1,
  },
  darkMetricLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  darkMetricValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 8,
    color: "#1e293b",
  },
  colDate: { width: "18%" },
  colTitle: { width: "42%" },
  colPlatform: { width: "16%" },
  colType: { width: "12%" },
  colStatus: { width: "12%", textAlign: "center" },
  badgePublished: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  badgeProcess: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  badgeOther: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  notesBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.4,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

export default function SocialMediaReportPdfDocument({
  data,
}: {
  data: ReportData;
}) {
  const percentage =
    data.targetPosts > 0
      ? Math.min(
          100,
          Math.round((data.publishedPosts / data.targetPosts) * 100),
        )
      : 0;

  return (
    <Document
      title={`Reporte Social Media - ${data.companyName} (${data.monthYear})`}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>UMP PLATFORM</Text>
            <Text style={styles.brandSub}>
              Reporte Ejecutivo de Social Media
            </Text>
          </View>
          <View>
            <Text style={styles.headerBadge}>{data.monthYear}</Text>
            <Text style={styles.headerDate}>
              Generado: {new Date().toLocaleDateString("es-CR")}
            </Text>
          </View>
        </View>

        {/* CLIENT BANNER */}
        <View style={styles.clientBanner}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {data.logoUrl ? (
              <View style={styles.clientLogoContainer}>
                <Image src={data.logoUrl} style={styles.clientLogo} />
              </View>
            ) : null}
            <View style={styles.clientCol}>
              <Text style={styles.sectionLabel}>Cliente / Empresa</Text>
              <Text style={styles.clientName}>{data.companyName}</Text>
              <Text style={styles.clientSub}>{data.clientName}</Text>
              {data.email ? (
                <Text style={styles.clientSub}>{data.email}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.clientCol, { alignItems: "flex-end" }]}>
            <Text style={styles.sectionLabel}>Servicio Contratado</Text>
            <Text style={[styles.clientSub, { fontWeight: "bold" }]}>
              Gestión de Social Media
            </Text>
            <Text
              style={[styles.clientSub, { marginTop: 4, fontWeight: "bold" }]}
            >
              Cumplimiento: {percentage}% de Meta
            </Text>
          </View>
        </View>

        {/* STATS GRID */}
        <Text style={styles.sectionTitle}>Resumen Ejecutivo de Contenido</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Publicaciones Totales</Text>
            <Text style={styles.statValue}>{data.publishedPosts}</Text>
            <Text style={styles.statTarget}>Meta: {data.targetPosts}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Reels / Shorts</Text>
            <Text style={styles.statValue}>{data.publishedReels ?? 0}</Text>
            <Text style={styles.statTarget}>
              Meta: {data.targetReels ?? "-"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Carruseles & Imágenes</Text>
            <Text style={styles.statValue}>{data.publishedCarousels ?? 0}</Text>
            <Text style={styles.statTarget}>
              Meta: {data.targetCarousels ?? "-"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Historias</Text>
            <Text style={styles.statValue}>{data.publishedStories ?? 0}</Text>
            <Text style={styles.statTarget}>
              Meta: {data.targetStories ?? "-"}
            </Text>
          </View>
        </View>

        {/* GLOBAL METRICS */}
        {data.totalViews ||
        data.totalLikes ||
        data.totalComments ||
        data.totalShares ? (
          <View style={styles.darkMetricsBox}>
            <View style={styles.darkMetricCol}>
              <Text style={styles.darkMetricLabel}>Visualizaciones</Text>
              <Text style={styles.darkMetricValue}>
                {(data.totalViews ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.darkMetricCol}>
              <Text style={styles.darkMetricLabel}>Me Gusta / Likes</Text>
              <Text style={styles.darkMetricValue}>
                {(data.totalLikes ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.darkMetricCol}>
              <Text style={styles.darkMetricLabel}>Comentarios</Text>
              <Text style={styles.darkMetricValue}>
                {(data.totalComments ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.darkMetricCol}>
              <Text style={styles.darkMetricLabel}>Compartidos</Text>
              <Text style={styles.darkMetricValue}>
                {(data.totalShares ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>
        ) : null}

        {/* TABLE OF POSTS */}
        <Text style={styles.sectionTitle}>Desglose de Publicaciones</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Fecha</Text>
            <Text style={[styles.tableHeaderCell, styles.colTitle]}>
              Título
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colPlatform]}>
              Plataforma
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colType]}>Tipo</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>
              Estado
            </Text>
          </View>

          {data.posts.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  {
                    flex: 1,
                    textAlign: "center",
                    fontStyle: "italic",
                    color: "#94a3b8",
                  },
                ]}
              >
                Sin contenido registrado en este periodo.
              </Text>
            </View>
          ) : (
            data.posts.map((p, idx) => (
              <View key={p._id || idx} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {formatDateDDMMYYYY(p.scheduledDate)}
                </Text>

                <Text
                  style={[
                    styles.tableCell,
                    styles.colTitle,
                    { fontWeight: "bold" },
                  ]}
                >
                  {p.title}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colPlatform,
                    { textTransform: "capitalize" },
                  ]}
                >
                  {p.platform}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colType,
                    { textTransform: "capitalize" },
                  ]}
                >
                  {p.contentType}
                </Text>
                <View style={styles.colStatus}>
                  <Text
                    style={
                      p.status === "publicado"
                        ? styles.badgePublished
                        : p.status === "en_proceso"
                          ? styles.badgeProcess
                          : styles.badgeOther
                    }
                  >
                    {STATUS_LABELS[p.status] || p.status.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* NOTES */}
        {data.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.sectionLabel}>Observaciones del Equipo</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text>UMP Platform — Documentación Confidencial</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
