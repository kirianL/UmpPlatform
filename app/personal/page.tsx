"use client";

import {
  CheckCircleIcon,
  FilmStripIcon,
  IdentificationCardIcon,
  ImageSquareIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
  UserCheckIcon,
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
import { Tabs } from "@/components/public/Tabs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

function compressImage(file: File, maxWidth = 600, maxHeight = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
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

const EMPTY_ACTOR = {
  name: "",
  characterName: "",
  characterBio: "",
  photoUrl: "",
  phone: "",
  email: "",
  status: "active" as const,
  episodeCount: 0,
};



export default function PersonalPage() {
  // Employees (Staff)
  const employees = useQuery(api.employees.get) ?? [];
  const createEmployee = useMutation(api.employees.create);
  const updateEmployee = useMutation(api.employees.update);
  const removeEmployee = useMutation(api.employees.remove);

  // Actors
  const actors = useQuery(api.actors.get) ?? [];
  const createActor = useMutation(api.actors.create);
  const updateActor = useMutation(api.actors.update);
  const removeActor = useMutation(api.actors.remove);

  const [search, setSearch] = useState("");

  // Employee Modal State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE);

  // Actor Modal State
  const [actorModalOpen, setActorModalOpen] = useState(false);
  const [editingActorId, setEditingActorId] = useState<string | null>(null);
  const [actorForm, setActorForm] = useState(EMPTY_ACTOR);

  // Ficha Personaje Modal State
  const [selectedFichaActor, setSelectedFichaActor] = useState<any | null>(null);
  const [fichaModalOpen, setFichaModalOpen] = useState(false);

  // Staff Filters
  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  );

  // Actors Filters
  const filteredActors = actors.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.characterName.toLowerCase().includes(search.toLowerCase()) ||
      (a.characterBio && a.characterBio.toLowerCase().includes(search.toLowerCase()))
  );

  const activeEmpCount = employees.filter((e) => e.status === "active").length;
  const activeActorCount = actors.filter((a) => a.status === "active").length;
  const totalEpisodes = employees.reduce((s, e) => s + e.episodeCount, 0) + actors.reduce((s, a) => s + a.episodeCount, 0);

  // Staff Form Handlers
  function openCreateEmp() {
    setEditingEmpId(null);
    setEmpForm(EMPTY_EMPLOYEE);
    setEmpModalOpen(true);
  }

  function openEditEmp(e: any) {
    setEditingEmpId(e._id);
    setEmpForm({
      name: e.name,
      role: e.role,
      phone: e.phone,
      email: e.email,
      salary: e.salary,
      status: e.status,
      episodeCount: e.episodeCount,
    });
    setEmpModalOpen(true);
  }

  function handleSaveEmp() {
    const name = empForm.name.trim() || "Empleado Sin Nombre";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const payload = {
      ...empForm,
      name,
      role: empForm.role.trim() || "Sin Rol Especificado",
      avatarInitials: initials,
    };

    if (editingEmpId) {
      updateEmployee({
        id: editingEmpId as any,
        ...payload,
      });
    } else {
      createEmployee(payload);
    }
    setEmpModalOpen(false);
  }

  // Actor Form Handlers
  function openCreateActor() {
    setEditingActorId(null);
    setActorForm(EMPTY_ACTOR);
    setActorModalOpen(true);
  }

  function openEditActor(a: any) {
    setEditingActorId(a._id);
    setActorForm({
      name: a.name,
      characterName: a.characterName,
      characterBio: a.characterBio || "",
      photoUrl: a.photoUrl || "",
      phone: a.phone || "",
      email: a.email || "",
      status: a.status || "active",
      episodeCount: a.episodeCount || 0,
    });
    setActorModalOpen(true);
  }

  const [copiedLinkActorId, setCopiedLinkActorId] = useState<string | null>(null);

  function copyActorPublicLink(actorName: string, id: string) {
    const slug = actorName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const url = `${window.location.origin}/calendario-actores/public/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkActorId(id);
    setTimeout(() => setCopiedLinkActorId(null), 2500);
  }

  function handleSaveActor() {
    const actorName = actorForm.name.trim() || "Actor Sin Nombre";
    const shareToken = actorName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20) + "-" + Math.random().toString(36).substring(2, 7);

    const payload = {
      ...actorForm,
      name: actorName,
      characterName: actorForm.characterName.trim() || "Personaje Sin Nombre",
      shareToken,
    };

    if (editingActorId) {
      updateActor({
        id: editingActorId as any,
        ...payload,
      });
    } else {
      createActor(payload);
    }
    setActorModalOpen(false);
  }

  const empColumns: Column<any>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (e) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-grayscale-12">{e.name}</span>
          <span className="text-xs text-grayscale-9">{e.role}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto",
      className: "hidden sm:table-cell",
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-xs font-mono text-grayscale-11">{e.email}</span>
          <span className="text-xs text-grayscale-9">{e.phone}</span>
        </div>
      ),
    },
    {
      key: "salary",
      header: "Salario",
      className: "hidden md:table-cell",
      render: (e) => <span className="text-sm font-medium text-grayscale-12">{formatCurrency(e.salary)}</span>,
    },
    {
      key: "episodes",
      header: "Capítulos",
      className: "hidden md:table-cell",
      render: (e) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-grayscale-11">
          <FilmStripIcon size={14} className="text-grayscale-8" />
          <span>{e.episodeCount}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
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
            onClick={() => openEditEmp(e)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => removeEmployee({ id: e._id })}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 hover:bg-red-3 hover:text-red-11"
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
            Gestión del equipo de producción y elenco de actores
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Equipo de Producción"
            value={employees.length}
            detail={`${activeEmpCount} miembros activos`}
            icon={<UsersIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Elenco de Actores"
            value={actors.length}
            detail={`${activeActorCount} actores activos`}
            icon={<UserCheckIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="Participación Total"
            value={totalEpisodes}
            detail="Capítulos acumulados"
            icon={<FilmStripIcon size={18} weight="fill" />}
            index={2}
          />
        </div>

        {/* Tabs System (Igual a la línea de Finanzas) */}
        <Tabs.Root defaultValue="staff" className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              <Tabs.Tab value="staff" className="font-mono text-[10px] font-bold uppercase py-1.5 px-3">
                Equipo de Producción ({employees.length})
              </Tabs.Tab>
              <Tabs.Tab value="actors" className="font-mono text-[10px] font-bold uppercase py-1.5 px-3">
                Elenco & Personajes ({actors.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </div>

          {/* Tab 1: Equipo de Producción */}
          <Tabs.Panel value="staff">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o puesto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-72"
                  />
                </div>
                <Button variant="primary" className="text-xs" onClick={openCreateEmp}>
                  <PlusIcon size={16} weight="bold" />
                  Agregar Empleado
                </Button>
              </div>

              <DataTable
                columns={empColumns}
                data={filteredEmployees}
                keyExtractor={(e) => e._id}
                emptyState={
                  <EmptyState
                    icon={<UsersIcon size={40} weight="duotone" />}
                    title="Sin empleados"
                    description={search ? "Sin resultados para la búsqueda." : "No hay empleados registrados."}
                    action={
                      !search && (
                        <Button variant="primary" className="text-xs" onClick={openCreateEmp}>
                          <PlusIcon size={16} weight="bold" />
                          Agregar Empleado
                        </Button>
                      )
                    }
                  />
                }
              />
            </div>
          </Tabs.Panel>

          {/* Tab 2: Elenco & Personajes (Tarjetas Minimalistas Modernas con Foto Destacada) */}
          <Tabs.Panel value="actors">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8" />
                  <input
                    type="text"
                    placeholder="Buscar actor, personaje o biografía..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                  />
                </div>
                <Button variant="primary" className="text-xs" onClick={openCreateActor}>
                  <PlusIcon size={16} weight="bold" />
                  Agregar Actor / Personaje
                </Button>
              </div>

              {/* Grid de Tarjetas de Elenco a 2 Columnas en Móviles y 3-4 en Pantallas Grandes */}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {filteredActors.map((actor) => (
                  <div
                    key={actor._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-1 p-2.5 sm:p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-xl dark:border-grayscale-4/80 dark:bg-grayscale-2"
                  >
                    <div className="flex flex-col gap-2.5 sm:gap-3">
                      {/* Vertical Portrait Photo Frame (Clean 3:4 aspect ratio) */}
                      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner">
                        {actor.photoUrl ? (
                          <img
                            src={actor.photoUrl}
                            alt={actor.characterName}
                            className="size-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center font-mono text-xl sm:text-2xl font-bold text-accent-11 bg-accent-3">
                            {actor.characterName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Character & Actor Name Block */}
                      <div className="flex flex-col gap-0.5 px-0.5">
                        <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-accent-10 dark:text-accent-9 truncate">
                          {actor.characterName}
                        </span>
                        <h3 className="text-xs sm:text-base font-extrabold tracking-tight text-grayscale-12 dark:text-grayscale-12 truncate">
                          {actor.name}
                        </h3>
                        {actor.characterBio ? (
                          <p className="text-[11px] sm:text-xs text-grayscale-10 dark:text-grayscale-11 leading-snug line-clamp-2 mt-0.5 sm:mt-1">
                            {actor.characterBio}
                          </p>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-grayscale-8 italic mt-0.5 sm:mt-1">
                            Sin descripción.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Metadata & Action Buttons */}
                    <div className="mt-2.5 sm:mt-3 flex items-center justify-between border-t border-grayscale-3 pt-2 sm:pt-3 dark:border-grayscale-4/60">
                      <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs text-grayscale-12 dark:text-grayscale-11 font-bold">
                        <FilmStripIcon size={14} className="text-sky-500 dark:text-sky-400 shrink-0" />
                        <span>{actor.episodeCount} <span className="hidden sm:inline">cap.</span></span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFichaActor(actor);
                            setFichaModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-grayscale-3 bg-grayscale-2 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-mono font-bold text-grayscale-12 hover:border-accent-6 hover:text-accent-11 transition-all cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:text-grayscale-12 dark:hover:bg-grayscale-4 dark:hover:border-accent-6"
                          title="Ver Ficha Completa del Personaje"
                        >
                          <IdentificationCardIcon size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />
                          <span>Ficha</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditActor(actor)}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:text-grayscale-8 dark:hover:bg-grayscale-4 dark:hover:text-grayscale-12 transition-colors"
                          title="Editar actor"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeActor({ id: actor._id })}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 dark:text-grayscale-8 dark:hover:bg-red-4/30 dark:hover:text-red-11 transition-colors"
                          title="Eliminar actor"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredActors.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<UserCheckIcon size={40} weight="duotone" />}
                      title="Sin actores en el elenco"
                      description={search ? "Sin resultados para la búsqueda." : "Aún no has registrado actores ni personajes."}
                      action={
                        !search && (
                          <Button variant="primary" className="text-xs" onClick={openCreateActor}>
                            <PlusIcon size={16} weight="bold" />
                            Agregar Primer Actor
                          </Button>
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>
        </Tabs.Root>

        {/* Modal Crear / Editar Empleado */}
        <Modal
          open={empModalOpen}
          onOpenChange={setEmpModalOpen}
          title={editingEmpId ? "Editar Empleado" : "Agregar Empleado de Producción"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEmp();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Nombre Completo"
              id="emp-name"
              value={empForm.name}
              onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Valeria Quirós"
            />

            <Input
              label="Puesto / Rol"
              id="emp-role"
              value={empForm.role}
              onChange={(e) => setEmpForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Ej: Directora de Fotografía"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Teléfono"
                id="emp-phone"
                value={empForm.phone}
                onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+506 8888-0000"
              />
              <Input
                label="Correo Electrónico"
                id="emp-email"
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Salario (CRC ₡)"
                id="emp-salary"
                type="number"
                value={empForm.salary}
                onChange={(e) => setEmpForm((f) => ({ ...f, salary: Number(e.target.value) }))}
              />
              <Input
                label="Capítulos de Participación"
                id="emp-episodes"
                type="number"
                value={empForm.episodeCount}
                onChange={(e) => setEmpForm((f) => ({ ...f, episodeCount: Number(e.target.value) }))}
              />
            </div>

            <Select
              label="Estado"
              id="emp-status"
              value={empForm.status}
              onChange={(e) => setEmpForm((f) => ({ ...f, status: e.target.value as any }))}
              options={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
              ]}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" className="text-xs" type="button" onClick={() => setEmpModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" className="text-xs" type="submit">
                {editingEmpId ? "Guardar Cambios" : "Agregar Empleado"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Crear / Editar Actor */}
        <Modal
          open={actorModalOpen}
          onOpenChange={setActorModalOpen}
          title={editingActorId ? "Editar Actor / Personaje" : "Agregar Actor al Elenco"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveActor();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre Real del Actor"
                id="actor-name-real"
                value={actorForm.name}
                onChange={(e) => setActorForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Carlos Rivera"
              />
              <Input
                label="Nombre del Personaje"
                id="actor-character"
                value={actorForm.characterName}
                onChange={(e) => setActorForm((f) => ({ ...f, characterName: e.target.value }))}
                placeholder="Ej: Inspector Morales"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Fotografía del Actor / Retrato
              </label>
              {actorForm.photoUrl ? (
                <div className="flex items-center gap-4 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/60">
                  <div className="relative w-20 h-28 shrink-0 overflow-hidden rounded-lg border border-grayscale-4 shadow-sm bg-grayscale-3">
                    <img
                      src={actorForm.photoUrl}
                      alt="Vista previa"
                      className="size-full object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-col justify-between h-28 py-1 min-w-0 flex-1">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-emerald-11 bg-emerald-2/40 border border-green-4/30 px-2 py-0.5 rounded-full inline-block mb-1">
                        Retrato Cargado
                      </span>
                      <p className="text-xs font-semibold text-grayscale-12 truncate">Fotografía seleccionada</p>
                      <p className="text-[11px] text-grayscale-8">Optimizada para pantalla</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-1.5 text-xs font-mono font-semibold text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file);
                                setActorForm((f) => ({ ...f, photoUrl: compressed }));
                              } catch {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setActorForm((f) => ({ ...f, photoUrl: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <PencilSimpleIcon size={14} />
                        <span>Cambiar Foto</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setActorForm((f) => ({ ...f, photoUrl: "" }))}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-3 bg-red-2/30 px-2.5 py-1.5 text-xs font-mono font-semibold text-red-11 hover:bg-red-3/40 transition-colors cursor-pointer"
                        title="Quitar foto"
                      >
                        <TrashIcon size={14} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-4 bg-grayscale-1 p-6 text-center dark:border-grayscale-5 dark:bg-grayscale-3/40 hover:border-accent-7 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setActorForm((f) => ({ ...f, photoUrl: compressed }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setActorForm((f) => ({ ...f, photoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />
                  <ImageSquareIcon size={32} className="text-accent-9 mb-1.5" />
                  <p className="text-xs font-bold text-grayscale-12">
                    Subir foto de retrato del actor
                  </p>
                  <p className="text-[11px] text-grayscale-8 mt-0.5">
                    Haz clic o arrastra un archivo JPG, PNG o WEBP
                  </p>
                </div>
              )}
            </div>



            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Biografía / Ficha Técnica del Personaje
              </label>
              <textarea
                value={actorForm.characterBio}
                onChange={(e) => setActorForm((f) => ({ ...f, characterBio: e.target.value }))}
                placeholder="Detalles sobre la psicología del personaje, contexto en la trama o llamado de rodaje..."
                rows={3}
                className="w-full rounded-xl border border-grayscale-4 bg-grayscale-1 p-3 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Teléfono"
                id="actor-phone"
                value={actorForm.phone}
                onChange={(e) => setActorForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+506 8700-0000"
              />
              <Input
                label="Correo Electrónico"
                id="actor-email"
                type="email"
                value={actorForm.email}
                onChange={(e) => setActorForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="actor@ejemplo.com"
              />
            </div>

            <Input
              label="Capítulos de Participación"
              id="actor-episodes"
              type="number"
              value={actorForm.episodeCount}
              onChange={(e) => setActorForm((f) => ({ ...f, episodeCount: Number(e.target.value) }))}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" className="text-xs" type="button" onClick={() => setActorModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" className="text-xs" type="submit">
                {editingActorId ? "Guardar Cambios" : "Agregar Actor"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Ficha Completa del Personaje (Diseño Dossier Cinematográfico Minimalista) */}
        {selectedFichaActor && (
          <Modal
            open={fichaModalOpen}
            onOpenChange={setFichaModalOpen}
            title="Ficha del Personaje"
          >
            <div className="flex flex-col gap-6 pt-1">
              {/* Header Grid: Large Portrait Photo + Character Details */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Large Hero Portrait Photo */}
                <div className="relative w-full sm:w-52 aspect-[3/4] shrink-0 overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4/80 shadow-md">
                  {selectedFichaActor.photoUrl ? (
                    <img
                      src={selectedFichaActor.photoUrl}
                      alt={selectedFichaActor.characterName}
                      className="size-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center font-mono text-3xl font-bold text-accent-11 bg-accent-3">
                      {selectedFichaActor.characterName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Main Information */}
                <div className="flex flex-col justify-between flex-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-accent-10 dark:text-accent-9">
                      {selectedFichaActor.characterName}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-grayscale-12 dark:text-grayscale-12">
                      Interpretado por {selectedFichaActor.name}
                    </h2>
                  </div>

                  {/* Badges / Quick Stats */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-4/40 bg-sky-2/60 dark:border-sky-7/30 dark:bg-sky-9/20 px-3 py-1 font-mono text-xs font-bold text-sky-11 dark:text-sky-300">
                      <FilmStripIcon size={14} className="text-sky-500 dark:text-sky-400" />
                      {selectedFichaActor.episodeCount} Capítulos
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-4/40 bg-emerald-2/60 dark:border-emerald-7/30 dark:bg-emerald-9/20 px-3 py-1 font-mono text-xs font-bold text-emerald-11 dark:text-emerald-300">
                      Elenco {selectedFichaActor.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyActorPublicLink(selectedFichaActor.name, selectedFichaActor._id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent-6/40 bg-accent-2/10 px-3 py-1 font-mono text-xs font-bold text-accent-11 hover:bg-accent-2/30 transition-colors cursor-pointer"
                    >
                      {copiedLinkActorId === selectedFichaActor._id ? (
                        <>
                          <CheckCircleIcon size={14} className="text-green-9" />
                          <span>¡Enlace Copiado!</span>
                        </>
                      ) : (
                        <>
                          <ShareNetworkIcon size={14} className="text-accent-9" />
                          <span>Copiar Enlace de Agenda</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Biografía Preview inside Header */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-8">
                      Biografía & Perfil Psicológico
                    </span>
                    <p className="text-xs text-grayscale-11 dark:text-grayscale-11 leading-relaxed rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 dark:border-grayscale-4/70 dark:bg-grayscale-3/40">
                      {selectedFichaActor.characterBio || "Sin descripción de biografía registrada para este personaje."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Data Section */}
              <div className="flex flex-col gap-2 border-t border-grayscale-3 pt-4 dark:border-grayscale-4/60">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-8">
                  Datos de Contacto del Actor
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5 rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 dark:border-grayscale-4/70 dark:bg-grayscale-3/40">
                    <span className="text-[10px] font-mono font-bold uppercase text-grayscale-8">Teléfono</span>
                    <span className="text-xs font-mono font-semibold text-grayscale-12 dark:text-grayscale-11">
                      {selectedFichaActor.phone || "No registrado"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 dark:border-grayscale-4/70 dark:bg-grayscale-3/40">
                    <span className="text-[10px] font-mono font-bold uppercase text-grayscale-8">Correo Electrónico</span>
                    <span className="text-xs font-mono font-semibold text-grayscale-12 dark:text-grayscale-11 truncate">
                      {selectedFichaActor.email || "No registrado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageContainer>
  );
}
