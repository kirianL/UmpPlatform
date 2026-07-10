"use client";

import {
  AddressBookIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import Button from "@/components/public/Button";
import DataTable, { type Column } from "@/components/public/DataTable";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import StatCard from "@/components/public/StatCard";
import PageContainer from "@/components/public/PageContainer";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_CLIENT = {
  name: "",
  company: "",
  phone: "",
  email: "",
  lastInteraction: new Date().toISOString().slice(0, 10),
  projectCount: 0,
};

export default function ClientesPage() {
  const clients = useQuery(api.clients.get) ?? [];
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const removeClient = useMutation(api.clients.remove);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CLIENT);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()),
  );

  const totalProjects = clients.reduce((s, c) => s + c.projectCount, 0);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_CLIENT);
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c._id);
    setForm({
      name: c.name,
      company: c.company,
      phone: c.phone,
      email: c.email,
      lastInteraction: c.lastInteraction,
      projectCount: c.projectCount,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    if (editingId) {
      updateClient({
        id: editingId as any,
        ...form,
      });
    } else {
      createClient(form);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeClient({ id: id as any });
  }

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (c) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-grayscale-12 truncate">
            {c.name}
          </p>
          <p className="text-xs text-grayscale-9">{c.company}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto",
      className: "hidden sm:table-cell",
      render: (c) => (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-grayscale-11">{c.email}</p>
          <p className="text-xs text-grayscale-9">{c.phone}</p>
        </div>
      ),
    },
    {
      key: "projects",
      header: "Proyectos",
      className: "hidden md:table-cell",
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <BriefcaseIcon size={14} className="text-grayscale-8" />
          <span className="text-sm text-grayscale-11">{c.projectCount}</span>
        </div>
      ),
    },
    {
      key: "lastInteraction",
      header: "Última Interacción",
      className: "hidden md:table-cell",
      render: (c) => (
        <span className="text-sm text-grayscale-11">
          {formatDate(c.lastInteraction)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (c) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(c)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c._id)}
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
            Clientes
          </h1>
          <p className="text-sm text-grayscale-10">
            Directorio de clientes y proyectos asociados
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Clientes Registrados"
            value={clients.length}
            icon={<AddressBookIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Proyectos Totales"
            value={totalProjects}
            icon={<BriefcaseIcon size={18} weight="fill" />}
            index={1}
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
              placeholder="Buscar por nombre o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-72"
            />
          </div>
          <Button variant="primary" className="text-xs" onClick={openCreate}>
            <PlusIcon size={16} weight="bold" />
            Agregar cliente
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(c) => c._id}
          emptyState={
            <EmptyState
              icon={<AddressBookIcon size={40} weight="duotone" />}
              title="Sin resultados"
              description={
                search
                  ? "No se encontraron clientes con esa búsqueda."
                  : "Aún no hay clientes registrados."
              }
              action={
                !search && (
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={openCreate}
                  >
                    <PlusIcon size={16} weight="bold" />
                    Agregar cliente
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
          title={editingId ? "Editar Cliente" : "Agregar Cliente"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Nombre del Cliente"
              id="client-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Laura Sánchez"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Empresa / Compañía"
                id="client-company"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                placeholder="Ej: Streaming MX"
                required
              />
              <Input
                label="Proyectos Asociados"
                id="client-projects"
                type="number"
                value={form.projectCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    projectCount: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Correo Electrónico"
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="correo@ejemplo.com"
                required
              />
              <Input
                label="Teléfono"
                id="client-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="555-0100"
                required
              />
            </div>
            <Input
              label="Última Interacción"
              id="client-date"
              type="date"
              value={form.lastInteraction}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastInteraction: e.target.value }))
              }
              required
            />
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
                {editingId ? "Guardar cambios" : "Agregar cliente"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
