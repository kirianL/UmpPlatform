"use client";

import {
  FilmStripIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
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

const EMPTY_EMPLOYEE = {
  name: "",
  role: "",
  phone: "",
  email: "",
  salary: 0,
  status: "active" as const,
  episodeCount: 0,
};

export default function PersonalPage() {
  const employees = useQuery(api.employees.get) ?? [];
  const createEmployee = useMutation(api.employees.create);
  const updateEmployee = useMutation(api.employees.update);
  const removeEmployee = useMutation(api.employees.remove);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_EMPLOYEE);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = employees.filter((e) => e.status === "active").length;
  const totalEpisodes = employees.reduce((s, e) => s + e.episodeCount, 0);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_EMPLOYEE);
    setModalOpen(true);
  }

  function openEdit(emp: any) {
    setEditingId(emp._id);
    setForm({
      name: emp.name,
      role: emp.role,
      phone: emp.phone,
      email: emp.email,
      salary: emp.salary,
      status: emp.status,
      episodeCount: emp.episodeCount,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    const avatarInitials = form.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    if (editingId) {
      updateEmployee({
        id: editingId as any,
        ...form,
        avatarInitials,
      });
    } else {
      createEmployee({
        ...form,
        avatarInitials,
      });
    }

    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeEmployee({ id: id as any });
  }

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-3 text-[10px] font-bold text-accent-11">
            {e.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-grayscale-12 truncate">
              {e.name}
            </p>
            <p className="text-xs text-grayscale-9">{e.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto",
      className: "hidden sm:table-cell",
      render: (e) => (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-grayscale-11">{e.email}</p>
          <p className="text-xs text-grayscale-9">{e.phone}</p>
        </div>
      ),
    },
    {
      key: "salary",
      header: "Salario",
      className: "hidden md:table-cell",
      render: (e) => (
        <span className="text-sm font-medium text-grayscale-12">
          {formatCurrency(e.salary)}
        </span>
      ),
    },
    {
      key: "episodes",
      header: "Capítulos",
      className: "hidden md:table-cell",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <FilmStripIcon size={14} className="text-grayscale-8" />
          <span className="text-sm text-grayscale-11">{e.episodeCount}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      filterOptions: [
        { label: "Activos", value: "active" },
        { label: "Inactivos", value: "inactive" },
      ],
      getFilterValue: (e) => e.status,
      render: (e) => (
        <Badge variant={e.status === "active" ? "green" : "gray"}>
          {e.status === "active" ? "Activo" : "Inactivo"}
        </Badge>
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
            onClick={() => handleDelete(e._id)}
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
            Personal
          </h1>
          <p className="text-sm text-grayscale-10">
            Gestión del equipo de producción
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={employees.length}
            icon={<UsersIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Activos"
            value={activeCount}
            detail={`${employees.length - activeCount} inactivos`}
            icon={<UsersIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="Total Capítulos"
            value={totalEpisodes}
            detail="Participaciones acumuladas"
            icon={<FilmStripIcon size={18} weight="fill" />}
            index={2}
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
              placeholder="Buscar por nombre o puesto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-72"
            />
          </div>
          <Button variant="primary" className="text-xs" onClick={openCreate}>
            <PlusIcon size={16} weight="bold" />
            Agregar Empleado
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(e) => e._id}
          emptyState={
            <EmptyState
              icon={<UsersIcon size={40} weight="duotone" />}
              title="Sin resultados"
              description={
                search
                  ? "No se encontraron empleados con esa búsqueda."
                  : "Aún no hay empleados registrados."
              }
              action={
                !search && (
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={openCreate}
                  >
                    <PlusIcon size={16} weight="bold" />
                    Agregar Empleado
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
          title={editingId ? "Editar Empleado" : "Agregar Empleado"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Nombre Completo"
              id="emp-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Juan Pérez"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Puesto / Rol"
                id="emp-role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                placeholder="Ej: Editor"
                required
              />
              <Input
                label="Salario Mensual"
                id="emp-salary"
                type="number"
                value={form.salary || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salary: Number(e.target.value) }))
                }
                placeholder="0"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Correo Electrónico"
                id="emp-email"
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
                id="emp-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="8888-8888"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Estado"
                id="emp-status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
              <Input
                label="Participación en Capítulos"
                id="emp-episodes"
                type="number"
                value={form.episodeCount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    episodeCount: Number(e.target.value),
                  }))
                }
                required
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
                {editingId ? "Guardar Cambios" : "Agregar Empleado"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
