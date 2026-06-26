"use client";

import {
  FilmSlateIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  WrenchIcon,
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
import {
  type Equipment,
  type EquipmentCategory,
  type EquipmentStatus,
  EQUIPMENT_CATEGORY_LABELS,
  MOCK_EQUIPMENT,
} from "@/lib/mock-data";
import PageContainer from "@/components/public/PageContainer";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<
  EquipmentStatus,
  { label: string; variant: "green" | "accent" | "orange" }
> = {
  available: { label: "Disponible", variant: "green" },
  "in-use": { label: "En Uso", variant: "accent" },
  maintenance: { label: "Mantenimiento", variant: "orange" },
};

const EMPTY_EQUIPMENT: Omit<Equipment, "id"> = {
  name: "",
  serialNumber: "",
  category: "camera",
  status: "available",
  location: "",
  acquisitionDate: new Date().toISOString().slice(0, 10),
};

export default function InventarioPage() {
  const [equipment, setEquipment] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_EQUIPMENT);

  const filtered = equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      EQUIPMENT_CATEGORY_LABELS[e.category]
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const available = equipment.filter((e) => e.status === "available").length;
  const inUse = equipment.filter((e) => e.status === "in-use").length;
  const maintenance = equipment.filter(
    (e) => e.status === "maintenance",
  ).length;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_EQUIPMENT);
    setModalOpen(true);
  }

  function openEdit(eq: Equipment) {
    setEditingId(eq.id);
    setForm({
      name: eq.name,
      serialNumber: eq.serialNumber,
      category: eq.category,
      status: eq.status,
      location: eq.location,
      acquisitionDate: eq.acquisitionDate,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    if (editingId) {
      setEquipment((prev) =>
        prev.map((e) => (e.id === editingId ? { ...e, ...form } : e)),
      );
    } else {
      setEquipment((prev) => [{ id: String(Date.now()), ...form }, ...prev]);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }

  const columns: Column<Equipment>[] = [
    {
      key: "name",
      header: "Equipo",
      render: (e) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-grayscale-12 truncate">
            {e.name}
          </p>
          <p className="text-xs text-grayscale-9 font-mono">{e.serialNumber}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoría",
      className: "hidden sm:table-cell",
      render: (e) => (
        <span className="text-sm text-grayscale-11">
          {EQUIPMENT_CATEGORY_LABELS[e.category]}
        </span>
      ),
    },
    {
      key: "location",
      header: "Ubicación",
      className: "hidden md:table-cell",
      render: (e) => (
        <span className="text-sm text-grayscale-11 truncate max-w-[150px] block">
          {e.location}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (e) => {
        const cfg = STATUS_CONFIG[e.status];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "date",
      header: "Adquisición",
      className: "hidden md:table-cell",
      render: (e) => (
        <span className="text-xs text-grayscale-9">
          {formatDate(e.acquisitionDate)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (e) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(e)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(e.id)}
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
          Inventario
        </h1>
        <p className="text-sm text-grayscale-10">
          Equipo de producción audiovisual
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total"
          value={equipment.length}
          icon={<FilmSlateIcon size={18} weight="fill" />}
        />
        <StatCard
          label="Disponible"
          value={available}
          icon={<FilmSlateIcon size={18} weight="fill" className="text-green-9" />}
        />
        <StatCard
          label="En Uso"
          value={inUse}
          icon={<FilmSlateIcon size={18} weight="fill" className="text-accent-9" />}
        />
        <StatCard
          label="Mantenimiento"
          value={maintenance}
          icon={<WrenchIcon size={18} weight="fill" className="text-orange-9" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <MagnifyingGlassIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
          />
          <input
            type="text"
            placeholder="Buscar equipo, serie o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-72"
          />
        </div>
        <Button variant="primary" className="text-xs" onClick={openCreate}>
          <PlusIcon size={16} weight="bold" />
          Agregar Equipo
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(e) => e.id}
        emptyState={
          <EmptyState
            icon={<FilmSlateIcon size={40} weight="duotone" />}
            title="Sin resultados"
            description={
              search
                ? "No se encontró equipo con esa búsqueda."
                : "Aún no hay equipo registrado."
            }
            action={
              !search && (
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={openCreate}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar Equipo
                </Button>
              )
            }
          />
        }
      />

      {/* Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Editar Equipo" : "Nuevo Equipo"}
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
              label="Nombre"
              id="eq-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Sony FX6"
              required
            />
            <Input
              label="Número de Serie"
              id="eq-serial"
              value={form.serialNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, serialNumber: e.target.value }))
              }
              placeholder="SN-XXX-000"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Categoría"
              id="eq-category"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as EquipmentCategory,
                }))
              }
              options={Object.entries(EQUIPMENT_CATEGORY_LABELS).map(
                ([v, l]) => ({ value: v, label: l }),
              )}
            />
            <Select
              label="Estado"
              id="eq-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as EquipmentStatus,
                }))
              }
              options={Object.entries(STATUS_CONFIG).map(([v, cfg]) => ({
                value: v,
                label: cfg.label,
              }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Ubicación"
              id="eq-location"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Ej: Bodega Central"
            />
            <Input
              label="Fecha de Adquisición"
              id="eq-date"
              type="date"
              value={form.acquisitionDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, acquisitionDate: e.target.value }))
              }
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
              {editingId ? "Guardar Cambios" : "Agregar Equipo"}
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageContainer>
  );
}
