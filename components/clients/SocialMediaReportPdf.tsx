"use client";

import { DownloadIcon, FilePdfIcon } from "@phosphor-icons/react/dist/ssr";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Button from "@/components/public/Button";
import SocialMediaReportPdfDocument, {
  type ReportData,
} from "./SocialMediaReportPdfDocument";

// Dynamically import PDFDownloadLink with SSR disabled
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false },
);

interface Props {
  data: ReportData;
}

export default function SocialMediaReportPdf({ data }: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const documentNode = <SocialMediaReportPdfDocument data={data} />;
  const cleanCompany = (data.companyName || data.clientName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 16);
  const cleanMonth = data.monthYear
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_");
  const fileName = `reporte_${cleanCompany}_${cleanMonth}.pdf`;

  return (
    <div className="space-y-4 font-sans">
      {/* HEADER DOWNLOAD CARD */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 gap-3">
        <div className="flex items-center gap-3">
          <FilePdfIcon
            size={28}
            className="text-red-9 shrink-0"
            weight="fill"
          />
          <div>
            <h4 className="text-xs font-mono font-bold text-grayscale-12 truncate max-w-xs sm:max-w-md">
              {fileName}
            </h4>
            <p className="text-[11px] text-grayscale-10 font-mono">
              Reporte oficial en PDF ({data.monthYear})
            </p>
          </div>
        </div>

        {isMounted ? (
          <PDFDownloadLink document={documentNode} fileName={fileName}>
            {({ loading }) => (
              <Button className="px-4 py-2 text-xs shrink-0 font-medium">
                <DownloadIcon size={16} />
                {loading ? "Generando PDF..." : "Descargar reporte PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        ) : (
          <Button disabled className="px-4 py-2 text-xs opacity-60 shrink-0">
            Cargando...
          </Button>
        )}
      </div>

      {/* REPORT SUMMARY MATRIX CARD */}
      <div className="p-4 rounded-xl border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2 space-y-4">
        <div className="flex items-center justify-between border-b border-grayscale-3 pb-3 dark:border-grayscale-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Cliente
            </span>
            <span className="text-xs font-bold text-grayscale-12">
              {data.companyName || data.clientName}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Periodo
            </span>
            <span className="text-xs font-bold font-mono text-grayscale-12">
              {data.monthYear}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-grayscale-2 dark:bg-grayscale-3 border border-grayscale-3 dark:border-grayscale-4">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Total Posts
            </span>
            <span className="text-base font-bold font-mono text-grayscale-12">
              {data.publishedPosts} / {data.targetPosts}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-grayscale-2 dark:bg-grayscale-3 border border-grayscale-3 dark:border-grayscale-4">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Reels
            </span>
            <span className="text-base font-bold font-mono text-grayscale-12">
              {data.publishedReels} / {data.targetReels}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-grayscale-2 dark:bg-grayscale-3 border border-grayscale-3 dark:border-grayscale-4">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Carruseles
            </span>
            <span className="text-base font-bold font-mono text-grayscale-12">
              {data.publishedCarousels} / {data.targetCarousels}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-grayscale-2 dark:bg-grayscale-3 border border-grayscale-3 dark:border-grayscale-4">
            <span className="text-[10px] font-mono uppercase text-grayscale-9 block">
              Historias
            </span>
            <span className="text-base font-bold font-mono text-grayscale-12">
              {data.publishedStories} / {data.targetStories}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ReportData };
