"use client";

import {
  CameraIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  EyeIcon,
  HourglassIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import InvoiceScanner from "@/components/InvoiceScanner";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import DataTable, { type Column } from "@/components/public/DataTable";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import PageContainer from "@/components/public/PageContainer";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import { Tabs } from "@/components/public/Tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { InvoiceData } from "@/lib/invoice-ocr";

type BudgetStatus = "pending" | "in_progress" | "completed" | "cancelled";
type FinanceTab = "all" | "income" | "expense" | "presupuesto";
type BudgetItem = Doc<"budgetItems">;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  const dateStr = iso.slice(0, 10);
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseLinkedConcept(concept: string, fallbackLocal?: string) {
  let title = String(concept ?? "").replace(/\s+/g, " ").trim();
  let serviceName = "";
  let clientName = fallbackLocal?.trim() || "";

  const tagged = title.match(/^(.*?)\s*\[([^\]]+)\]\s*\((.+)\)\s*$/);
  if (tagged) {
    title = tagged[1].trim();
    serviceName = tagged[2].trim();
    clientName = tagged[3].trim() || clientName;
  } else {
    const withClient = title.match(/^(.*) \((.+)\)$/);
    if (withClient) {
      title = withClient[1].trim();
      clientName = withClient[2].trim() || clientName;
    }
  }

  if (serviceName && title.endsWith(` - ${serviceName}`)) {
    title = title.slice(0, -(serviceName.length + 3)).trim();
  }

  const abono = title.match(/^(.*?Abono servicio)\s+-\s+(.+)$/i);
  if (abono) {
    title = abono[1].trim();
    serviceName = serviceName || abono[2].trim();
  }

  return { title, serviceName, clientName };
}

function getClientFinanceSource(t: {
  source?: string;
  concept?: string;
}): "client_receivable" | "client_payment" | null {
  if (t.source === "client_receivable" || t.source === "client_payment") {
    return t.source;
  }

  const concept = String(t.concept ?? "");
  if (/^Saldo pendiente\b/i.test(concept)) return "client_receivable";
  if (
    /Abono servicio/i.test(concept) ||
    /Pago de cliente/i.test(concept) ||
    /\[[^\]]+\]\s*\([^)]+\)\s*$/.test(concept)
  ) {
    return "client_payment";
  }

  return null;
}

function clientLinkedHeading(
  source: string | undefined,
  parsedTitle: string,
) {
  if (source === "client_receivable") return "Saldo pendiente";

  const percentMatch = parsedTitle.match(/^(\d+(?:[.,]\d+)?)\s*%/);
  const percent = percentMatch ? `${percentMatch[1]}% ` : "";

  if (/abono/i.test(parsedTitle)) return `${percent}Abono`.trim();
  if (/pago/i.test(parsedTitle)) return `${percent}Pago de cliente`.trim();
  return parsedTitle;
}

const CATEGORIES = [
  "Producción",
  "Comercial",
  "Nómina",
  "Locaciones",
  "Alquiler",
  "Mantenimiento",
  "Software",
  "Otro",
];

const EMPTY_TRANSACTION = {
  concept: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  category: "Producción",
  type: "income" as "income" | "expense",
  status: "pending" as const,
  local: "",
};

const EMPTY_BUDGET = {
  concept: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  category: "Mantenimiento",
  status: "pending" as BudgetStatus,
  notes: "",
};

const BUDGET_STATUS_OPTIONS: { value: BudgetStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

export default function FinanzasPage() {
  const transactions = useQuery(api.transactions.get) ?? [];
  const createTransaction = useMutation(api.transactions.create);
  const updateTransaction = useMutation(api.transactions.update);
  const removeTransaction = useMutation(api.transactions.remove);

  const budgetItems = useQuery(api.budgetItems.get) ?? [];
  const createBudgetItem = useMutation(api.budgetItems.create);
  const updateBudgetItem = useMutation(api.budgetItems.update);
  const removeBudgetItem = useMutation(api.budgetItems.remove);

  const [activeTab, setActiveTab] = useState<FinanceTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TRANSACTION);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] =
    useState<Id<"budgetItems"> | null>(null);
  const [budgetForm, setBudgetForm] = useState(EMPTY_BUDGET);
  const [isBudgetViewOnly, setIsBudgetViewOnly] = useState(false);
  const [budgetSearch, setBudgetSearch] = useState("");
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>("all");
  const [deleteBudgetId, setDeleteBudgetId] =
    useState<Id<"budgetItems"> | null>(null);

  const isBudgetTab = activeTab === "presupuesto";

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter (concept, local/vendor, category, formatted date or YYYY-MM-DD date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const formattedDate = formatDate(t.date).toLowerCase();
        const rawDate = t.date.toLowerCase();
        const matchesConcept = t.concept.toLowerCase().includes(q);
        const matchesLocal = t.local
          ? t.local.toLowerCase().includes(q)
          : false;
        const matchesCategory = t.category.toLowerCase().includes(q);
        const matchesDate = formattedDate.includes(q) || rawDate.includes(q);

        if (
          !matchesConcept &&
          !matchesLocal &&
          !matchesCategory &&
          !matchesDate
        ) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== "all" && t.status !== filterStatus) {
        return false;
      }

      // Date range filter
      if (filterDateRange !== "all") {
        const txDate = new Date(t.date + "T00:00:00");
        const today = new Date();
        const txTime = txDate.getTime();

        if (filterDateRange === "7days") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (txTime < sevenDaysAgo.getTime()) return false;
        } else if (filterDateRange === "thisMonth") {
          if (
            txDate.getFullYear() !== today.getFullYear() ||
            txDate.getMonth() !== today.getMonth()
          ) {
            return false;
          }
        } else if (filterDateRange === "lastMonth") {
          const firstOfThisMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          const firstOfLastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          if (
            txTime < firstOfLastMonth.getTime() ||
            txTime >= firstOfThisMonth.getTime()
          ) {
            return false;
          }
        } else if (filterDateRange === "thisYear") {
          if (txDate.getFullYear() !== today.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [transactions, searchQuery, filterStatus, filterDateRange]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return sortOrder === "desc" ? dateCompare : -dateCompare;
    });
  }, [filteredTransactions, sortOrder]);

  const incomeData = useMemo(() => {
    return sortedTransactions.filter(
      (t) =>
        t.type === "income" &&
        t.status !== "cancelled" &&
        t.source !== "client_receivable" &&
        !(t.source === "client_payment" && t.status === "pending"),
    );
  }, [sortedTransactions]);

  const income = incomeData.reduce((s, t) => s + t.amount, 0);
  const expenses = sortedTransactions
    .filter((t) => t.type === "expense" && t.status !== "cancelled")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const pendingIncome = sortedTransactions
    .filter(
      (t) =>
        t.type === "income" &&
        t.status === "pending" &&
        (t.source === "client_receivable" || t.source === "client_payment"),
    )
    .reduce((s, t) => s + t.amount, 0);

  const expenseData = useMemo(() => {
    return sortedTransactions.filter((t) => t.type === "expense");
  }, [sortedTransactions]);

  function openCreate(type: "income" | "expense" = "income") {
    setEditingId(null);
    setForm({ ...EMPTY_TRANSACTION, type });
    setIsViewOnly(false);
    setModalOpen(true);
  }

  function openEdit(t: any) {
    setEditingId(t._id);
    setForm({
      concept: t.concept,
      amount: t.amount,
      date: t.date,
      category: t.category,
      type: t.type,
      status: t.status,
      local: t.local ?? "",
    });
    setIsViewOnly(false);
    setModalOpen(true);
  }

  function openView(t: any) {
    setEditingId(null);
    setForm({
      concept: t.concept,
      amount: t.amount,
      date: t.date,
      category: t.category,
      type: t.type,
      status: t.status,
      local: t.local ?? "",
    });
    setIsViewOnly(true);
    setModalOpen(true);
  }

  function handleSave() {
    const payload = {
      ...form,
      concept: form.concept.trim() || "Transacción sin concepto",
    };

    if (editingId) {
      updateTransaction({
        id: editingId as any,
        ...payload,
      });
    } else {
      createTransaction(payload);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeTransaction({ id: id as any });
  }

  const filteredBudgetItems = useMemo(() => {
    return budgetItems.filter((item) => {
      if (budgetSearch.trim()) {
        const q = budgetSearch.toLowerCase().trim();
        const formattedDate = formatDate(item.date).toLowerCase();
        const matchesConcept = item.concept.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesNotes = item.notes
          ? item.notes.toLowerCase().includes(q)
          : false;
        const matchesDate =
          formattedDate.includes(q) || item.date.toLowerCase().includes(q);

        if (
          !matchesConcept &&
          !matchesCategory &&
          !matchesNotes &&
          !matchesDate
        ) {
          return false;
        }
      }

      if (budgetStatusFilter !== "all" && item.status !== budgetStatusFilter) {
        return false;
      }

      return true;
    });
  }, [budgetItems, budgetSearch, budgetStatusFilter]);

  const sortedBudgetItems = useMemo(() => {
    return [...filteredBudgetItems].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [filteredBudgetItems]);

  const activeBudgetItems = sortedBudgetItems.filter(
    (item) => item.status !== "cancelled",
  );
  const budgetTotal = activeBudgetItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const budgetPending = activeBudgetItems
    .filter(
      (item) => item.status === "pending" || item.status === "in_progress",
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const budgetCompleted = activeBudgetItems
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);

  function openCreateBudget() {
    setEditingBudgetId(null);
    setBudgetForm({ ...EMPTY_BUDGET });
    setIsBudgetViewOnly(false);
    setBudgetModalOpen(true);
  }

  function openEditBudget(item: BudgetItem) {
    setEditingBudgetId(item._id);
    setBudgetForm({
      concept: item.concept,
      amount: item.amount,
      date: item.date,
      category: item.category,
      status: item.status,
      notes: item.notes ?? "",
    });
    setIsBudgetViewOnly(false);
    setBudgetModalOpen(true);
  }

  function openViewBudget(item: BudgetItem) {
    setEditingBudgetId(null);
    setBudgetForm({
      concept: item.concept,
      amount: item.amount,
      date: item.date,
      category: item.category,
      status: item.status,
      notes: item.notes ?? "",
    });
    setIsBudgetViewOnly(true);
    setBudgetModalOpen(true);
  }

  function handleSaveBudget() {
    const payload = {
      concept: budgetForm.concept.trim() || "Ítem sin concepto",
      amount: budgetForm.amount,
      date: budgetForm.date,
      category: budgetForm.category,
      status: budgetForm.status,
      notes: budgetForm.notes.trim() || undefined,
    };

    if (editingBudgetId) {
      updateBudgetItem({ id: editingBudgetId, ...payload });
    } else {
      createBudgetItem(payload);
    }
    setBudgetModalOpen(false);
  }

  async function handleConfirmDeleteBudget() {
    if (!deleteBudgetId) return;
    await removeBudgetItem({ id: deleteBudgetId });
    setDeleteBudgetId(null);
  }

  const budgetStatusBadge = (status: BudgetStatus) => {
    const map = {
      pending: { variant: "orange" as const, label: "Pendiente" },
      in_progress: { variant: "accent" as const, label: "En proceso" },
      completed: { variant: "green" as const, label: "Completado" },
      cancelled: { variant: "red" as const, label: "Cancelado" },
    };
    const { variant, label } = map[status] || map.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  async function handleScanComplete(data: InvoiceData) {
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const type = data.type ?? "expense";
    const isForeign = data.currency !== "CRC";

    if (data.items.length <= 1) {
      const item = data.items[0];
      const amount = item
        ? isForeign
          ? (item.convertedAmount ??
            Math.round(item.amount * data.exchangeRate))
          : item.amount
        : data.total
          ? isForeign
            ? (data.convertedTotal ??
              Math.round(data.total * data.exchangeRate))
            : data.total
          : 0;

      const conceptPrefix =
        isForeign && item
          ? `[${data.currency} ${item.amount.toFixed(2)} @ T.C. ₡${data.exchangeRate}] `
          : isForeign && data.total
            ? `[${data.currency} ${data.total.toFixed(2)} @ T.C. ₡${data.exchangeRate}] `
            : "";

      setEditingId(null);
      setForm({
        ...EMPTY_TRANSACTION,
        type,
        concept: item
          ? `${conceptPrefix}${item.description}`
          : data.total
            ? `${conceptPrefix}Compra`
            : "",
        local: data.vendor ?? "",
        amount,
        date,
      });
      setScanModalOpen(false);
      // Wait for focus restoration / modal transition animation to complete
      setTimeout(() => {
        setModalOpen(true);
      }, 250);
      return;
    }

    // Multiple items → batch create all transactions at once
    const newTransactions = data.items.map((item) => {
      const amount = isForeign
        ? (item.convertedAmount ?? Math.round(item.amount * data.exchangeRate))
        : item.amount;

      const conceptPrefix = isForeign
        ? `[${data.currency} ${item.amount.toFixed(2)} @ T.C. ₡${data.exchangeRate}] `
        : "";

      return {
        concept: `${conceptPrefix}${item.description}`,
        local: data.vendor ?? "",
        amount,
        date,
        category: "Otro",
        type,
        status: "pending" as const,
      };
    });

    try {
      const promises = newTransactions.map((tx) => createTransaction(tx));
      await Promise.all(promises);
    } catch (err) {
      console.error("Error creating transactions from scanned invoice:", err);
      throw new Error(
        err instanceof Error
          ? err.message
          : "Error al registrar las transacciones",
      );
    }
  }

  const statusBadge = (status: any) => {
    const map = {
      paid: { variant: "green" as const, label: "Pagado" },
      pending: { variant: "orange" as const, label: "Pendiente" },
      cancelled: { variant: "red" as const, label: "Anulado" },
    };
    const { variant, label } =
      map[status as "paid" | "pending" | "cancelled"] || map.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const makeColumns = (): Column<any>[] => [
    {
      key: "concept",
      header: "Concepto",
      render: (t) => {
        const linkedSource = getClientFinanceSource(t);

        if (linkedSource) {
          const parsed = parseLinkedConcept(t.concept, t.local);
          const heading = clientLinkedHeading(linkedSource, parsed.title);
          const isPendingReceivable =
            linkedSource === "client_receivable" || t.status === "pending";
          const metaLabel = isPendingReceivable ? "Por cobrar" : "Abonado";
          const metaClass = isPendingReceivable
            ? "text-xs text-orange-11"
            : "text-xs text-green-11";

          return (
            <div className="min-w-0 max-w-[280px]">
              <p className="text-sm font-medium text-grayscale-12">{heading}</p>
              {parsed.clientName ? (
                <p className="text-xs font-medium text-grayscale-12 mt-0.5 whitespace-normal wrap-break-word">
                  {parsed.clientName}
                </p>
              ) : null}
              {parsed.serviceName ? (
                <p className="text-xs text-grayscale-10 mt-0.5 whitespace-normal wrap-break-word">
                  {parsed.serviceName}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-xs text-grayscale-9">{t.category}</span>
                <span className="text-grayscale-6 text-[10px]">•</span>
                <span className={metaClass}>{metaLabel}</span>
              </div>
            </div>
          );
        }

        return (
          <div className="min-w-0 max-w-[280px]">
            <p className="text-sm font-medium text-grayscale-12 whitespace-normal wrap-break-word">
              {t.concept}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs text-grayscale-9">{t.category}</span>
              {t.local && (
                <>
                  <span className="text-grayscale-6 text-[10px]">•</span>
                  <span className="text-xs font-mono text-grayscale-10 bg-grayscale-2 px-1 rounded whitespace-normal wrap-break-word">
                    {t.local}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Monto",
      render: (t) => (
        <span
          className={`text-sm font-medium ${
            t.type === "income" ? "text-green-11" : "text-red-11"
          }`}
        >
          {t.type === "income" ? "+" : "-"}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      className: "hidden sm:table-cell",
      render: (t) => (
        <span className="text-sm text-grayscale-11">{formatDate(t.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      className: "hidden md:table-cell",
      render: (t) => statusBadge(t.status),
    },
    {
      key: "actions",
      header: "",
      className: "w-24", // increased from w-20 to fit three buttons
      render: (t) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openView(t)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Ver Detalles"
          >
            <EyeIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => openEdit(t)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Editar"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(t._id)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-grayscale-9"
            title={
              t.source === "client_receivable"
                ? "Este saldo se gestiona desde Clientes"
                : "Eliminar"
            }
            disabled={t.source === "client_receivable"}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ),
    },
  ];

  const budgetColumns = (): Column<BudgetItem>[] => [
    {
      key: "concept",
      header: "Ítem / Inversión",
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-grayscale-12 whitespace-normal wrap-break-word max-w-[280px]">
            {item.concept}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-xs text-grayscale-9">{item.category}</span>
            {item.status === "completed" && item.transactionId && (
              <>
                <span className="text-grayscale-6 text-[10px]">•</span>
                <span className="text-xs text-green-11">En finanzas</span>
              </>
            )}
            {item.notes && (
              <>
                <span className="text-grayscale-6 text-[10px]">•</span>
                <span className="text-xs text-grayscale-10 whitespace-normal wrap-break-word max-w-[280px]">
                  {item.notes}
                </span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Inversión",
      render: (item) => (
        <span className="text-sm font-medium text-grayscale-12">
          {formatCurrency(item.amount)}
        </span>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      className: "hidden sm:table-cell",
      render: (item) => (
        <span className="text-sm text-grayscale-11">
          {formatDate(item.date)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      className: "hidden md:table-cell",
      render: (item) => budgetStatusBadge(item.status),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (item) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openViewBudget(item)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Ver Detalles"
          >
            <EyeIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => openEditBudget(item)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Editar"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteBudgetId(item._id)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
            title="Eliminar"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Finanzas
          </h1>
          <p className="text-sm text-grayscale-10">
            Control de ingresos, gastos, facturación y presupuesto
          </p>
        </div>

        {/* Stats */}
        {isBudgetTab ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Inversión total"
              value={formatCurrency(budgetTotal)}
              detail={`${activeBudgetItems.length} ítems activos`}
              icon={<WalletIcon size={18} weight="fill" />}
              index={0}
            />
            <StatCard
              label="Pendiente"
              value={formatCurrency(budgetPending)}
              detail="Planificado: no descuenta de Finanzas"
              icon={
                <HourglassIcon
                  size={18}
                  weight="bold"
                  className="text-orange-9"
                />
              }
              index={1}
            />
            <StatCard
              label="Completado"
              value={formatCurrency(budgetCompleted)}
              detail="Ya descontado de Finanzas"
              icon={
                <CheckCircleIcon
                  size={18}
                  weight="bold"
                  className="text-green-9"
                />
              }
              index={2}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Balance Neto"
              value={formatCurrency(balance)}
              detail="Ingresos menos egresos"
              icon={<CurrencyDollarIcon size={18} weight="fill" />}
              index={0}
            />
            <StatCard
              label="Ingresos Totales"
              value={formatCurrency(income)}
              detail={`${incomeData.length} transacciones`}
              icon={
                <TrendUpIcon size={18} weight="bold" className="text-green-9" />
              }
              index={1}
            />
            <StatCard
              label="Por cobrar"
              value={formatCurrency(pendingIncome)}
              detail="Saldos de clientes, no se suman"
              icon={
                <HourglassIcon
                  size={18}
                  weight="bold"
                  className="text-orange-9"
                />
              }
              index={2}
            />
            <StatCard
              label="Egresos Totales"
              value={formatCurrency(expenses)}
              detail={`${expenseData.length} transacciones`}
              icon={
                <TrendDownIcon size={18} weight="bold" className="text-red-9" />
              }
              index={3}
            />
          </div>
        )}

        {/* Toolbar */}
        {isBudgetTab ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="primary"
              className="text-xs"
              onClick={openCreateBudget}
            >
              <PlusIcon size={16} weight="bold" />
              Agregar ítem de presupuesto
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="text-xs"
                onClick={() => openCreate("income")}
              >
                <PlusIcon size={16} weight="bold" />
                Registrar ingreso
              </Button>
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => openCreate("expense")}
              >
                <PlusIcon size={16} weight="bold" />
                Registrar gasto
              </Button>
            </div>

            <Button
              variant="primary"
              className="text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white border-transparent flex items-center gap-1.5 dark:bg-[#1e293b] dark:hover:bg-[#334155]"
              onClick={() => setScanModalOpen(true)}
            >
              <CameraIcon size={16} weight="bold" />
              Escanear factura
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as FinanceTab)}
          className="w-full flex flex-col"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              <Tabs.Tab
                value="all"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Todos
              </Tabs.Tab>
              <Tabs.Tab
                value="income"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Ingresos
              </Tabs.Tab>
              <Tabs.Tab
                value="expense"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Egresos
              </Tabs.Tab>
              <Tabs.Tab
                value="presupuesto"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Presupuesto
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>

            {/* Filtering and Sorting controls */}
            {isBudgetTab ? (
              <div className="flex flex-wrap items-center gap-2.5 mt-2 sm:mt-0">
                <div className="relative flex-1 sm:w-64 sm:flex-initial">
                  <MagnifyingGlassIcon
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar ítem o concepto..."
                    value={budgetSearch}
                    onChange={(e) => setBudgetSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-3 bg-grayscale-1 py-1.5 pl-8 pr-3 font-mono text-[11px] text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all focus:border-accent-8 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Estado:
                  </span>
                  <select
                    value={budgetStatusFilter}
                    onChange={(e) => setBudgetStatusFilter(e.target.value)}
                    className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 transform-gpu"
                  >
                    <option value="all">Todos</option>
                    {BUDGET_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 mt-2 sm:mt-0">
                {/* Search input for Invoices / Transactions */}
                <div className="relative flex-1 sm:w-64 sm:flex-initial">
                  <MagnifyingGlassIcon
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar factura o concepto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-3 bg-grayscale-1 py-1.5 pl-8 pr-3 font-mono text-[11px] text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all focus:border-accent-8 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                  />
                </div>

                {/* Date range filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Periodo:
                  </span>
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 transform-gpu"
                  >
                    <option value="all">Todos</option>
                    <option value="7days">Últimos 7 días</option>
                    <option value="thisMonth">Este Mes</option>
                    <option value="lastMonth">Mes Anterior</option>
                    <option value="thisYear">Este Año</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Estado:
                  </span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 transform-gpu"
                  >
                    <option value="all">Todos</option>
                    <option value="paid">Pagados</option>
                    <option value="pending">Pendientes</option>
                    <option value="cancelled">Anulados</option>
                  </select>
                </div>

                {/* Sorting order */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Orden:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-1 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 transition-all hover:bg-grayscale-2 active:scale-95 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 transform-gpu"
                  >
                    <span>
                      {sortOrder === "desc" ? "Recientes" : "Antiguos"}
                    </span>
                    <span className="text-grayscale-9 text-xs leading-none mt-[-1px]">
                      {sortOrder === "desc" ? "↓" : "↑"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <Tabs.Panel value="all" className="mt-4">
            <DataTable
              columns={makeColumns()}
              data={sortedTransactions}
              keyExtractor={(t) => t._id}
              emptyState={
                <EmptyState
                  icon={
                    searchQuery ? (
                      <MagnifyingGlassIcon size={40} weight="duotone" />
                    ) : (
                      <CurrencyDollarIcon size={40} weight="duotone" />
                    )
                  }
                  title={searchQuery ? "Sin resultados" : "Sin transacciones"}
                  description={
                    searchQuery
                      ? `No se encontraron facturas que coincidan con "${searchQuery}".`
                      : "Aún no hay ingresos o egresos registrados en este periodo."
                  }
                />
              }
            />
          </Tabs.Panel>
          <Tabs.Panel value="income" className="mt-4">
            <DataTable
              columns={makeColumns()}
              data={incomeData}
              keyExtractor={(t) => t._id}
              emptyState={
                <EmptyState
                  icon={
                    searchQuery ? (
                      <MagnifyingGlassIcon size={40} weight="duotone" />
                    ) : (
                      <TrendUpIcon size={40} weight="duotone" />
                    )
                  }
                  title={searchQuery ? "Sin resultados" : "Sin ingresos"}
                  description={
                    searchQuery
                      ? `No se encontraron ingresos que coincidan con "${searchQuery}".`
                      : "Aún no hay transacciones de tipo ingreso registradas."
                  }
                />
              }
            />
          </Tabs.Panel>
          <Tabs.Panel value="expense" className="mt-4">
            <DataTable
              columns={makeColumns()}
              data={expenseData}
              keyExtractor={(t) => t._id}
              emptyState={
                <EmptyState
                  icon={
                    searchQuery ? (
                      <MagnifyingGlassIcon size={40} weight="duotone" />
                    ) : (
                      <TrendDownIcon size={40} weight="duotone" />
                    )
                  }
                  title={searchQuery ? "Sin resultados" : "Sin egresos"}
                  description={
                    searchQuery
                      ? `No se encontraron egresos o facturas que coincidan con "${searchQuery}".`
                      : "Aún no hay transacciones de tipo egreso registradas."
                  }
                />
              }
            />
          </Tabs.Panel>
          <Tabs.Panel value="presupuesto" className="mt-4">
            <DataTable
              columns={budgetColumns()}
              data={sortedBudgetItems}
              keyExtractor={(item) => item._id}
              emptyState={
                <EmptyState
                  icon={
                    budgetSearch ? (
                      <MagnifyingGlassIcon size={40} weight="duotone" />
                    ) : (
                      <ClipboardTextIcon size={40} weight="duotone" />
                    )
                  }
                  title={
                    budgetSearch ? "Sin resultados" : "Sin ítems de presupuesto"
                  }
                  description={
                    budgetSearch
                      ? `No se encontraron ítems que coincidan con "${budgetSearch}".`
                      : "Registra inversiones planificadas, como pintar verjas o comprar equipo."
                  }
                  action={
                    !budgetSearch ? (
                      <Button
                        variant="primary"
                        className="text-xs"
                        onClick={openCreateBudget}
                      >
                        <PlusIcon size={16} weight="bold" />
                        Agregar ítem
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          </Tabs.Panel>
        </Tabs.Root>

        {/* Modal: Create/Edit/View */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={
            isViewOnly
              ? "Detalle de Transacción"
              : editingId
                ? "Editar Transacción"
                : form.type === "income"
                  ? "Registrar Ingreso"
                  : "Registrar Gasto"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4 w-full min-w-0"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Concepto / Detalle"
                id="tx-concept"
                value={form.concept}
                onChange={(e) =>
                  setForm((f) => ({ ...f, concept: e.target.value }))
                }
                placeholder="Ej: Pago de cliente o Compra de disco duro"
                required
                disabled={isViewOnly}
              />
              <Input
                label="Local / Establecimiento"
                id="tx-local"
                value={form.local}
                onChange={(e) =>
                  setForm((f) => ({ ...f, local: e.target.value }))
                }
                placeholder="Ej: Walmart, Starbucks, etc."
                disabled={isViewOnly}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Monto (CRC)"
                id="tx-amount"
                type="number"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                }
                placeholder="0"
                required
                disabled={isViewOnly}
              />
              <Input
                label="Fecha"
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
                disabled={isViewOnly}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Categoría"
                id="tx-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                disabled={isViewOnly}
              />
              <Select
                label="Tipo"
                id="tx-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as "income" | "expense",
                  }))
                }
                options={[
                  { value: "income", label: "Ingreso" },
                  { value: "expense", label: "Egreso" },
                ]}
                disabled={isViewOnly}
              />
              <Select
                label="Estado"
                id="tx-status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
                options={[
                  { value: "paid", label: "Pagado" },
                  { value: "pending", label: "Pendiente" },
                  { value: "cancelled", label: "Anulado" },
                ]}
                disabled={isViewOnly}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                {isViewOnly ? "Cerrar" : "Cancelar"}
              </Button>
              {!isViewOnly && (
                <Button variant="primary" className="text-xs" type="submit">
                  {editingId ? "Guardar cambios" : "Registrar"}
                </Button>
              )}
            </div>
          </form>
        </Modal>

        {/* OCR Scanner */}
        <InvoiceScanner
          open={scanModalOpen}
          onOpenChange={setScanModalOpen}
          onScanComplete={handleScanComplete}
        />

        {/* Modal: Presupuesto */}
        <Modal
          open={budgetModalOpen}
          onOpenChange={setBudgetModalOpen}
          title={
            isBudgetViewOnly
              ? "Detalle de presupuesto"
              : editingBudgetId
                ? "Editar ítem de presupuesto"
                : "Nuevo ítem de presupuesto"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveBudget();
            }}
            className="flex flex-col gap-4 w-full min-w-0"
          >
            <Input
              label="Concepto / Qué se ocupa"
              id="budget-concept"
              value={budgetForm.concept}
              onChange={(e) =>
                setBudgetForm((f) => ({ ...f, concept: e.target.value }))
              }
              placeholder="Ej: Pintar verjas"
              required
              disabled={isBudgetViewOnly}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Inversión total (CRC)"
                id="budget-amount"
                type="number"
                min={0}
                value={budgetForm.amount || ""}
                onChange={(e) =>
                  setBudgetForm((f) => ({
                    ...f,
                    amount: Number(e.target.value),
                  }))
                }
                placeholder="15000"
                required
                disabled={isBudgetViewOnly}
              />
              <Input
                label="Fecha"
                id="budget-date"
                type="date"
                value={budgetForm.date}
                onChange={(e) =>
                  setBudgetForm((f) => ({ ...f, date: e.target.value }))
                }
                required
                disabled={isBudgetViewOnly}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Categoría"
                id="budget-category"
                value={budgetForm.category}
                onChange={(e) =>
                  setBudgetForm((f) => ({ ...f, category: e.target.value }))
                }
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                disabled={isBudgetViewOnly}
              />
              <Select
                label="Estado"
                id="budget-status"
                value={budgetForm.status}
                onChange={(e) =>
                  setBudgetForm((f) => ({
                    ...f,
                    status: e.target.value as BudgetStatus,
                  }))
                }
                options={BUDGET_STATUS_OPTIONS}
                disabled={isBudgetViewOnly}
              />
            </div>
            <p className="text-xs text-grayscale-9 -mt-2">
              {budgetForm.status === "completed"
                ? "Al guardar como Completado, el monto se registra como egreso en Finanzas."
                : "Este ítem no descuenta del balance hasta marcarlo como Completado."}
            </p>
            <div className="flex flex-col gap-1.5 w-full min-w-0">
              <label
                htmlFor="budget-notes"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Notas
              </label>
              <textarea
                id="budget-notes"
                value={budgetForm.notes}
                onChange={(e) =>
                  setBudgetForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Detalle opcional de la inversión"
                rows={3}
                disabled={isBudgetViewOnly}
                className="w-full min-w-0 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 disabled:opacity-60 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setBudgetModalOpen(false)}
              >
                {isBudgetViewOnly ? "Cerrar" : "Cancelar"}
              </Button>
              {!isBudgetViewOnly && (
                <Button variant="primary" className="text-xs" type="submit">
                  {editingBudgetId ? "Guardar cambios" : "Agregar ítem"}
                </Button>
              )}
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={deleteBudgetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteBudgetId(null);
          }}
          title="Eliminar ítem de presupuesto"
          description="Este ítem se eliminará del presupuesto. Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={handleConfirmDeleteBudget}
        />
      </div>
    </PageContainer>
  );
}
