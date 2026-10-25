"use client";

import {
  CalendarDotsIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";

import Button from "@/components/public/Button";
import Modal from "@/components/public/Modal";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";
import FinancialReportPdfDocument, {
  type FinancialReportData,
} from "./FinancialReportPdfDocument";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CATEGORY_COLORS = [
  "#1A56DB",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#0284C7",
  "#0D9488",
  "#F59E0B",
  "#64748B",
  "#475569",
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

interface FinancialReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Doc<"transactions">[];
  fixedExpenses?: any[];
  budgetItems?: Doc<"budgetItems">[];
}

export default function FinancialReportModal({
  open,
  onOpenChange,
  transactions,
}: FinancialReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1,
  );

  const years = useMemo(() => {
    const list: number[] = [];
    const currentY = new Date().getFullYear();
    for (let y = currentY + 1; y >= currentY - 3; y--) {
      list.push(y);
    }
    return list;
  }, []);

  function setMonthOffset(offset: number) {
    const target = new Date();
    target.setMonth(target.getMonth() + offset);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth() + 1);
  }

  // Precomputed synchronously without layout delays so modal never jumps on open
  const reportData = useMemo<FinancialReportData>(() => {
    const monthStr = String(selectedMonth).padStart(2, "0");
    const prefix = `${selectedYear}-${monthStr}`;
    const monthName = MONTH_NAMES[selectedMonth - 1] || "Mes";
    const periodLabel = `${monthName} ${selectedYear}`;

    const monthAllTx = transactions
      .filter((t) => t.date && t.date.startsWith(prefix))
      .filter((t) => t.status !== "cancelled");

    // Any receivable or pending income from clients (strictly excluded from totals and balance)
    const isReceivable = (t: Doc<"transactions">) =>
      t.source === "client_receivable" ||
      (t.source === "client_payment" && t.status === "pending") ||
      (t.type === "income" && t.status === "pending") ||
      (t.type === "income" &&
        t.status !== "paid" &&
        /saldo pendiente|por cobrar|cobro pendiente/i.test(t.concept || ""));

    // Strictly effective transactions (real collected incomes and operative expenses)
    const monthTransactions = monthAllTx
      .filter((t) => !isReceivable(t))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Por cobrar (strictly informative, never added to income or balance)
    const pendingIncome = monthAllTx
      .filter((t) => isReceivable(t))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netBalance = totalIncome - totalExpenses;
    const profitMargin =
      totalIncome > 0
        ? Number(((netBalance / totalIncome) * 100).toFixed(1))
        : 0;

    // Categories Breakdown strictly from expense transactions
    const catMap = new Map<string, number>();
    for (const t of monthTransactions.filter((tx) => tx.type === "expense")) {
      const cat = t.category || "Otro";
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    }

    const categories = Array.from(catMap.entries())
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage:
          totalExpenses > 0
            ? Number(((amount / totalExpenses) * 100).toFixed(1))
            : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily Timeline for Chart
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyMap = new Map<number, { income: number; expense: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap.set(d, { income: 0, expense: 0 });
    }

    for (const t of monthTransactions) {
      const day = parseInt(t.date.split("-")[2], 10);
      if (day >= 1 && day <= daysInMonth) {
        const item = dailyMap.get(day)!;
        if (t.type === "income") item.income += t.amount;
        else if (t.type === "expense") item.expense += t.amount;
      }
    }

    let runningCumulative = 0;
    const dailyTimeline = Array.from(dailyMap.entries()).map(([day, val]) => {
      runningCumulative += val.income - val.expense;
      return {
        day,
        income: val.income,
        expense: val.expense,
        cumulative: runningCumulative,
      };
    });

    const formattedDate = new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());

    return {
      periodLabel,
      year: selectedYear,
      month: selectedMonth,
      monthName,
      generatedAt: formattedDate,
      currency: "CRC",
      totalIncome,
      pendingIncome,
      totalExpenses,
      netBalance,
      profitMargin,
      transactionsCount: monthTransactions.length,
      incomeCount: monthTransactions.filter((t) => t.type === "income").length,
      expenseCount: monthTransactions.filter((t) => t.type === "expense").length,
      categories,
      dailyTimeline,
      transactions: monthTransactions.map((t) => ({
        date: t.date,
        concept: t.concept,
        entity: t.local || undefined,
        category: t.category,
        type: t.type,
        amount: t.amount,
        status: t.status,
      })),
    };
  }, [selectedYear, selectedMonth, transactions]);

  const cleanMonthName = MONTH_NAMES[selectedMonth - 1] || "Mes";
  const fileName = `Reporte_Financiero_UMP_${cleanMonthName}_${selectedYear}.pdf`;

  // On-demand PDF download without background compilation blocking the UI
  async function handleDownloadPdf() {
    if (isGenerating || !reportData) return;
    setIsGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <FinancialReportPdfDocument data={reportData} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al generar el reporte PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Descargar reporte financiero"
      className="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs text-grayscale-11">
            Genera un informe financiero ejecutivo en formato PDF con gráficos
            de flujo de caja, distribución de gastos y balance del mes
            seleccionado.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-col gap-2 rounded-xl border border-grayscale-4 bg-grayscale-2/40 p-3.5 dark:bg-grayscale-3/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase text-grayscale-11 flex items-center gap-1.5">
              <CalendarDotsIcon size={14} />
              Periodo a consultar
            </span>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMonthOffset(0)}
                className="font-mono text-[11px] font-semibold text-grayscale-11 hover:text-grayscale-12 cursor-pointer transition-colors"
              >
                Mes actual
              </button>
              <span className="text-grayscale-6 text-[10px]">·</span>
              <button
                type="button"
                onClick={() => setMonthOffset(-1)}
                className="font-mono text-[11px] font-semibold text-grayscale-11 hover:text-grayscale-12 cursor-pointer transition-colors"
              >
                Mes anterior
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="report-month-select"
                className="font-mono text-[10px] font-bold uppercase text-grayscale-10"
              >
                Mes
              </label>
              <select
                id="report-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 text-xs font-medium text-grayscale-12 outline-none focus:border-accent-8 dark:bg-grayscale-2"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="report-year-select"
                className="font-mono text-[10px] font-bold uppercase text-grayscale-10"
              >
                Año
              </label>
              <select
                id="report-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 text-xs font-medium text-grayscale-12 outline-none focus:border-accent-8 dark:bg-grayscale-2"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Period Preview - Always rendered to guarantee zero height jump */}
        <div className="flex flex-col gap-2.5 min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-10">
              Resumen del periodo ({reportData.periodLabel})
            </span>
            <span className="font-mono text-[11px] text-grayscale-11 font-medium">
              {reportData.transactionsCount}{" "}
              {reportData.transactionsCount === 1
                ? "transacción"
                : "transacciones"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 dark:bg-grayscale-2">
              <span className="font-mono text-[10px] text-green-11 font-bold uppercase block">
                Ingresos
              </span>
              <span className="text-sm font-bold text-grayscale-12 truncate block">
                {formatCurrency(reportData.totalIncome)}
              </span>
            </div>

            <div className="rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 dark:bg-grayscale-2">
              <span className="font-mono text-[10px] text-red-11 font-bold uppercase block">
                Gastos Totales
              </span>
              <span className="text-sm font-bold text-grayscale-12 truncate block">
                {formatCurrency(reportData.totalExpenses)}
              </span>
            </div>

            <div className="rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 dark:bg-grayscale-2">
              <span className="font-mono text-[10px] text-accent-11 font-bold uppercase block">
                Balance Neto
              </span>
              <span
                className={cn(
                  "text-sm font-bold truncate block",
                  reportData.netBalance >= 0
                    ? "text-grayscale-12"
                    : "text-red-11",
                )}
              >
                {formatCurrency(reportData.netBalance)}
              </span>
            </div>
          </div>

          {Boolean(reportData.pendingIncome && reportData.pendingIncome > 0) && (
            <div className="flex items-center justify-between rounded-lg border border-orange-6/30 bg-orange-2/30 px-3 py-1.5 text-xs text-orange-11">
              <span className="font-mono text-[10px] font-bold uppercase">
                Por cobrar: {formatCurrency(reportData.pendingIncome ?? 0)}
              </span>
              <span className="text-[10px] text-orange-10">
                Saldos de clientes, no se suman al balance
              </span>
            </div>
          )}

          {reportData.transactionsCount === 0 && (
            <p className="rounded-lg border border-orange-6/40 bg-orange-2/40 p-2 text-center text-xs text-orange-11">
              No hay movimientos registrados en este mes. El reporte se
              generará con balance en cero.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-grayscale-3 dark:border-grayscale-4">
          <div className="flex items-center gap-2 text-xs font-mono text-grayscale-10 truncate">
            <FilePdfIcon size={16} className="text-red-9 shrink-0" />
            <span className="truncate max-w-[220px]">{fileName}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-3.5 cursor-pointer rounded-lg border border-grayscale-4 text-xs font-semibold text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
            >
              Cancelar
            </button>

            <Button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex h-9 items-center gap-1.5 px-4 text-xs font-semibold cursor-pointer"
            >
              {isGenerating ? (
                <SpinnerGapIcon size={14} className="animate-spin" />
              ) : (
                <DownloadSimpleIcon size={14} weight="bold" />
              )}
              <span>{isGenerating ? "Generando..." : "Descargar PDF"}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
