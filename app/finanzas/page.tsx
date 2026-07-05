"use client";

import {
  CameraIcon,
  CurrencyDollarIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrendDownIcon,
  TrendUpIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import DataTable, { type Column } from "@/components/public/DataTable";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import { Tabs } from "@/components/public/Tabs";
import type { InvoiceData } from "@/lib/invoice-ocr";
import InvoiceScanner from "@/components/InvoiceScanner";
import PageContainer from "@/components/public/PageContainer";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export default function FinanzasPage() {
  const transactions = useQuery(api.transactions.get) ?? [];
  const createTransaction = useMutation(api.transactions.create);
  const updateTransaction = useMutation(api.transactions.update);
  const removeTransaction = useMutation(api.transactions.remove);

  const [modalOpen, setModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TRANSACTION);

  const income = transactions
    .filter((t) => t.type === "income" && t.status !== "cancelled")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense" && t.status !== "cancelled")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const incomeData = transactions.filter((t) => t.type === "income");
  const expenseData = transactions.filter((t) => t.type === "expense");

  function openCreate(type: "income" | "expense" = "income") {
    setEditingId(null);
    setForm({ ...EMPTY_TRANSACTION, type });
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
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.concept.trim()) return;

    if (editingId) {
      updateTransaction({
        id: editingId as any,
        ...form,
      });
    } else {
      createTransaction(form);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeTransaction({ id: id as any });
  }

  async function handleScanComplete(data: InvoiceData) {
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const type = data.type ?? "expense";
    const isForeign = data.currency !== "CRC";

    if (data.items.length <= 1) {
      const item = data.items[0];
      const amount = item 
        ? (isForeign ? (item.convertedAmount ?? Math.round(item.amount * data.exchangeRate)) : item.amount)
        : (data.total ? (isForeign ? (data.convertedTotal ?? Math.round(data.total * data.exchangeRate)) : data.total) : 0);
      
      const conceptPrefix = isForeign && item 
        ? `[${data.currency} ${item.amount.toFixed(2)} @ T.C. ₡${data.exchangeRate}] `
        : (isForeign && data.total 
            ? `[${data.currency} ${data.total.toFixed(2)} @ T.C. ₡${data.exchangeRate}] `
            : ""
          );

      setEditingId(null);
      setForm({
        ...EMPTY_TRANSACTION,
        type,
        concept: item ? `${conceptPrefix}${item.description}` : (data.total ? `${conceptPrefix}Compra` : ""),
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
        err instanceof Error ? err.message : "Error al registrar las transacciones",
      );
    }
  }

  const statusBadge = (status: any) => {
    const map = {
      paid: { variant: "green" as const, label: "Pagado" },
      pending: { variant: "orange" as const, label: "Pendiente" },
      cancelled: { variant: "red" as const, label: "Cancelado" },
    };
    const { variant, label } = map[status as "paid" | "pending" | "cancelled"] || map.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const makeColumns = (): Column<any>[] => [
    {
      key: "concept",
      header: "Concepto",
      render: (t) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-grayscale-12 truncate max-w-[200px]">
            {t.concept}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-grayscale-9">{t.category}</span>
            {t.local && (
              <>
                <span className="text-grayscale-6 text-[10px]">•</span>
                <span className="text-xs font-mono text-grayscale-10 bg-grayscale-2 px-1 rounded truncate max-w-[120px]" title={t.local}>
                  {t.local}
                </span>
              </>
            )}
          </div>
        </div>
      ),
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
      filterOptions: [
        { label: "Pagados", value: "paid" },
        { label: "Pendientes", value: "pending" },
        { label: "Cancelados", value: "cancelled" },
      ],
      getFilterValue: (t) => t.status,
      render: (t) => statusBadge(t.status),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (t) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(t)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(t._id)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
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
            Control de ingresos, gastos y facturación
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            icon={<TrendUpIcon size={18} weight="bold" className="text-green-9" />}
            index={1}
          />
          <StatCard
            label="Egresos Totales"
            value={formatCurrency(expenses)}
            detail={`${expenseData.length} transacciones`}
            icon={<TrendDownIcon size={18} weight="bold" className="text-red-9" />}
            index={2}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="primary" className="text-xs" onClick={() => openCreate("income")}>
              <PlusIcon size={16} weight="bold" />
              Registrar Ingreso
            </Button>
            <Button variant="secondary" className="text-xs" onClick={() => openCreate("expense")}>
              <PlusIcon size={16} weight="bold" />
              Registrar Gasto
            </Button>
          </div>

          <Button
            variant="primary"
            className="text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white border-transparent flex items-center gap-1.5 dark:bg-[#1e293b] dark:hover:bg-[#334155]"
            onClick={() => setScanModalOpen(true)}
          >
            <CameraIcon size={16} weight="bold" />
            Escanear Factura
          </Button>
        </div>

        {/* Tabs */}
        <Tabs.Component
          items={[
            {
              value: "all",
              label: "Todos",
              content: (
                <DataTable
                  columns={makeColumns()}
                  data={transactions}
                  keyExtractor={(t) => t._id}
                  emptyState={
                    <EmptyState
                      icon={<CurrencyDollarIcon size={40} weight="duotone" />}
                      title="Sin transacciones"
                      description="Aún no hay ingresos o egresos registrados en este periodo."
                    />
                  }
                />
              ),
            },
            {
              value: "income",
              label: "Ingresos",
              content: (
                <DataTable
                  columns={makeColumns()}
                  data={incomeData}
                  keyExtractor={(t) => t._id}
                  emptyState={
                    <EmptyState
                      icon={<TrendUpIcon size={40} weight="duotone" />}
                      title="Sin ingresos"
                      description="Aún no hay transacciones de tipo ingreso registradas."
                    />
                  }
                />
              ),
            },
            {
              value: "expenses",
              label: "Egresos",
              content: (
                <DataTable
                  columns={makeColumns()}
                  data={expenseData}
                  keyExtractor={(t) => t._id}
                  emptyState={
                    <EmptyState
                      icon={<TrendDownIcon size={40} weight="duotone" />}
                      title="Sin egresos"
                      description="Aún no hay transacciones de tipo egreso registradas."
                    />
                  }
                />
              ),
            },
          ]}
        />

        {/* Modal: Create/Edit */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={
            editingId
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
            className="flex flex-col gap-4"
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
              />
              <Input
                label="Local / Establecimiento"
                id="tx-local"
                value={form.local}
                onChange={(e) =>
                  setForm((f) => ({ ...f, local: e.target.value }))
                }
                placeholder="Ej: Walmart, Starbucks, etc."
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
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" className="text-xs" type="submit">
                {editingId ? "Guardar Cambios" : "Registrar"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* OCR Scanner */}
        <InvoiceScanner
          open={scanModalOpen}
          onOpenChange={setScanModalOpen}
          onScanComplete={handleScanComplete}
        />
      </div>
    </PageContainer>
  );
}
