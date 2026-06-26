"use client";

import {
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
import { type Transaction, MOCK_TRANSACTIONS } from "@/lib/mock-data";
import PageContainer from "@/components/public/PageContainer";

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

const EMPTY_TRANSACTION: Omit<Transaction, "id"> = {
  concept: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  category: "Producción",
  type: "income",
  status: "pending",
};

export default function FinanzasPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [modalOpen, setModalOpen] = useState(false);
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

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({
      concept: t.concept,
      amount: t.amount,
      date: t.date,
      category: t.category,
      type: t.type,
      status: t.status,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.concept.trim()) return;

    if (editingId) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, ...form } : t)),
      );
    } else {
      setTransactions((prev) => [
        { id: String(Date.now()), ...form },
        ...prev,
      ]);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const statusBadge = (status: Transaction["status"]) => {
    const map = {
      paid: { variant: "green" as const, label: "Pagado" },
      pending: { variant: "orange" as const, label: "Pendiente" },
      cancelled: { variant: "red" as const, label: "Cancelado" },
    };
    const { variant, label } = map[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const makeColumns = (): Column<Transaction>[] => [
    {
      key: "concept",
      header: "Concepto",
      render: (t) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-grayscale-12 truncate max-w-[200px]">
            {t.concept}
          </p>
          <p className="text-xs text-grayscale-9">{t.category}</p>
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
            onClick={() => handleDelete(t.id)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ),
    },
  ];

  const tabContent = (data: Transaction[]) => (
    <div className="mt-4">
      <DataTable
        columns={makeColumns()}
        data={data.sort((a, b) => b.date.localeCompare(a.date))}
        keyExtractor={(t) => t.id}
        emptyState={
          <EmptyState
            icon={<CurrencyDollarIcon size={40} weight="duotone" />}
            title="Sin movimientos"
            description="No hay transacciones registradas en esta categoría."
            action={
              <Button
                variant="primary"
                className="text-xs"
                onClick={() => openCreate()}
              >
                <PlusIcon size={16} weight="bold" />
                Registrar Movimiento
              </Button>
            }
          />
        }
      />
    </div>
  );

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
          Finanzas
        </h1>
        <p className="text-sm text-grayscale-10">
          Control de ingresos y gastos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Ingresos"
          value={formatCurrency(income)}
          icon={<TrendUpIcon size={18} weight="bold" className="text-green-9" />}
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(expenses)}
          icon={
            <TrendDownIcon size={18} weight="bold" className="text-red-9" />
          }
        />
        <StatCard
          label="Balance"
          value={formatCurrency(balance)}
          detail={balance >= 0 ? "Positivo" : "Negativo"}
          icon={<CurrencyDollarIcon size={18} weight="fill" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button variant="primary" className="text-xs" onClick={() => openCreate()}>
          <PlusIcon size={16} weight="bold" />
          Registrar Movimiento
        </Button>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="all">
        <Tabs.List>
          <Tabs.Tab value="all">Todos</Tabs.Tab>
          <Tabs.Tab value="income">Ingresos</Tabs.Tab>
          <Tabs.Tab value="expenses">Gastos</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Panel value="all">{tabContent(transactions)}</Tabs.Panel>
        <Tabs.Panel value="income">{tabContent(incomeData)}</Tabs.Panel>
        <Tabs.Panel value="expenses">{tabContent(expenseData)}</Tabs.Panel>
      </Tabs.Root>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Editar Movimiento" : "Nuevo Movimiento"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Concepto"
            id="tx-concept"
            value={form.concept}
            onChange={(e) =>
              setForm((f) => ({ ...f, concept: e.target.value }))
            }
            placeholder="Descripción del movimiento"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Monto"
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
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                { value: "expense", label: "Gasto" },
              ]}
            />
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
              label="Estado"
              id="tx-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as Transaction["status"],
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
      </div>
    </PageContainer>
  );
}
