"use client";

import {
  CheckCircleIcon,
  CheckSquareOffsetIcon,
  CircleIcon,
  ClockIcon,
  HourglassIcon,
  ImageIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import PageContainer from "@/components/public/PageContainer";
import StatCard from "@/components/public/StatCard";
import { Tabs } from "@/components/public/Tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const CATEGORIES = [
  "General",
  "Ideas",
  "Producción",
  "Contenido",
  "Finanzas",
  "Clientes",
  "Guiones",
];

interface AssignedUser {
  email: string;
  name: string;
}

const EMPTY_TASK = {
  title: "",
  description: "",
  category: "General",
  priority: "media" as "baja" | "media" | "alta",
  pinned: false,
  imageUrl: "",
  assignedToUsers: [] as AssignedUser[],
};

function formatDate(isoStr?: string): string {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const SYSTEM_ACCOUNTS = [
  { email: "admin@ultimate.cr", name: "Administrador UMP", role: "admin" },
  { email: "michelle@ultimate.cr", name: "Michelle", role: "directorio" },
  { email: "tatiana@ultimate.cr", name: "Tatiana", role: "actores" },
  { email: "eymar@ultimate.cr", name: "Eymar", role: "produccion" },
  { email: "kirian@ultimate.cr", name: "Kirian", role: "programador" },
];

function compressImage(
  file: File,
  maxWidth = 1000,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Error al procesar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function TareasPage() {
  const { userRole, userEmail } = useAuth();
  const isAdmin =
    userRole === "admin" || userEmail?.toLowerCase() === "admin@ultimate.cr";

  const allTasks = useQuery(api.tasks.get) ?? [];
  const dbUsers = useQuery(api.users.list);

  const systemUsers = useMemo(() => {
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers;
    }
    return SYSTEM_ACCOUNTS;
  }, [dbUsers]);

  const currentUser = useMemo(() => {
    return systemUsers.find(
      (u) => u.email.toLowerCase() === userEmail?.toLowerCase(),
    );
  }, [systemUsers, userEmail]);

  const currentUserName = currentUser?.name || userEmail || "Usuario";

  // Filtrar tareas según permisos del usuario
  const tasks = useMemo(() => {
    if (isAdmin || !userEmail) {
      return allTasks;
    }
    const normalized = userEmail.trim().toLowerCase();
    return allTasks.filter((t) => {
      const created = t.createdBy?.trim().toLowerCase();

      // Check if user is in assignedToUsers or legacy assignedTo string
      const isAssigned =
        (t.assignedToUsers &&
          t.assignedToUsers.some(
            (u: any) => u.email?.toLowerCase() === normalized,
          )) ||
        (t.assignedTo &&
          t.assignedTo
            .toLowerCase()
            .split(",")
            .map((e: string) => e.trim())
            .includes(normalized));

      const hasNoAssignee =
        (!t.assignedToUsers || t.assignedToUsers.length === 0) && !t.assignedTo;

      return (
        isAssigned ||
        created === normalized ||
        (hasNoAssignee && !created)
      );
    });
  }, [allTasks, isAdmin, userEmail]);

  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const toggleStatus = useMutation(api.tasks.toggleStatus);
  const togglePinned = useMutation(api.tasks.togglePinned);
  const removeTask = useMutation(api.tasks.remove);

  // States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tasks"> | null>(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [taskToDeleteId, setTaskToDeleteId] = useState<Id<"tasks"> | null>(
    null,
  );

  // Modal to preview full image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Clear selection and active element focus on ESC key press
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setSelectedImage(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Filter tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "pendiente");
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "realizada");
  }, [tasks]);

  const pinnedCount = useMemo(() => {
    return tasks.filter((t) => t.pinned).length;
  }, [tasks]);

  function filterList(list: typeof tasks) {
    const queryStr = search.toLowerCase().trim();
    return list.filter((t) => {
      const assignedNames =
        t.assignedToUsers && t.assignedToUsers.length > 0
          ? t.assignedToUsers.map((u: any) => u.name).join(" ")
          : t.assignedToName || "";

      const matchesSearch =
        !queryStr ||
        t.title.toLowerCase().includes(queryStr) ||
        (t.description && t.description.toLowerCase().includes(queryStr)) ||
        (t.category && t.category.toLowerCase().includes(queryStr)) ||
        assignedNames.toLowerCase().includes(queryStr) ||
        (t.createdByName && t.createdByName.toLowerCase().includes(queryStr));

      const matchesCategory =
        categoryFilter === "all" || t.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;

      const matchesUser =
        !isAdmin ||
        userFilter === "all" ||
        (t.assignedToUsers &&
          t.assignedToUsers.some(
            (u: any) => u.email.toLowerCase() === userFilter.toLowerCase(),
          )) ||
        (t.assignedTo &&
          t.assignedTo
            .toLowerCase()
            .split(",")
            .map((e: string) => e.trim())
            .includes(userFilter.toLowerCase())) ||
        t.createdBy?.toLowerCase() === userFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesPriority && matchesUser;
    });
  }

  const filteredPending = useMemo(
    () => filterList(pendingTasks),
    [pendingTasks, search, categoryFilter, priorityFilter, userFilter, isAdmin],
  );

  const filteredCompleted = useMemo(
    () => filterList(completedTasks),
    [completedTasks, search, categoryFilter, priorityFilter, userFilter, isAdmin],
  );

  const filteredAll = useMemo(
    () => filterList(tasks),
    [tasks, search, categoryFilter, priorityFilter, userFilter, isAdmin],
  );

  // Handlers
  function openCreate() {
    setEditingId(null);
    setSaveError(null);
    setIsSaving(false);

    const defaultUsers: AssignedUser[] = [];
    if (userEmail) {
      defaultUsers.push({
        email: userEmail,
        name: currentUserName,
      });
    }

    setForm({
      ...EMPTY_TASK,
      assignedToUsers: defaultUsers,
    });
    setModalOpen(true);
  }

  function openEdit(t: any) {
    setEditingId(t._id);
    setSaveError(null);
    setIsSaving(false);

    let users: AssignedUser[] = [];
    if (Array.isArray(t.assignedToUsers) && t.assignedToUsers.length > 0) {
      users = t.assignedToUsers;
    } else if (t.assignedTo) {
      const emails = t.assignedTo
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);
      users = emails.map((email: string) => {
        const found = systemUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );
        return {
          email,
          name: found?.name || email,
        };
      });
    }

    setForm({
      title: t.title,
      description: t.description || "",
      category: t.category || "General",
      priority: t.priority || "media",
      pinned: t.pinned || false,
      imageUrl: t.imageUrl || "",
      assignedToUsers: users,
    });
    setModalOpen(true);
  }

  async function handleSaveTask(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }
    const cleanTitle = form.title.trim();
    if (!cleanTitle) {
      setSaveError("Por favor ingresa un título para la tarea o idea.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const assignedEmails =
        form.assignedToUsers.length > 0
          ? form.assignedToUsers.map((u) => u.email).join(",")
          : undefined;
      const assignedNames =
        form.assignedToUsers.length > 0
          ? form.assignedToUsers.map((u) => u.name).join(", ")
          : undefined;

      const payload = {
        title: cleanTitle,
        description: form.description.trim() || undefined,
        category: form.category || "General",
        priority: form.priority,
        pinned: form.pinned,
        imageUrl: form.imageUrl.trim() || undefined,
        assignedTo: assignedEmails,
        assignedToName: assignedNames,
        assignedToUsers:
          form.assignedToUsers.length > 0 ? form.assignedToUsers : undefined,
      };

      if (editingId) {
        await updateTask({
          id: editingId,
          ...payload,
        });
      } else {
        await createTask({
          ...payload,
          createdBy: userEmail || undefined,
          createdByName: currentUserName || undefined,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("Error al guardar la tarea:", err);
      setSaveError(
        err?.message || "Ocurrió un error al guardar la tarea. Intenta nuevamente.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(id: Id<"tasks">) {
    await toggleStatus({ id });
  }

  async function handleTogglePinned(id: Id<"tasks">) {
    await togglePinned({ id });
  }

  async function handleDeleteTask() {
    if (taskToDeleteId) {
      await removeTask({ id: taskToDeleteId });
      setTaskToDeleteId(null);
    }
  }

  function renderPriorityBadge(priority?: string) {
    switch (priority) {
      case "alta":
        return <Badge variant="red">Prioridad Alta</Badge>;
      case "media":
        return <Badge variant="orange">Prioridad Media</Badge>;
      case "baja":
        return <Badge variant="gray">Prioridad Baja</Badge>;
      default:
        return null;
    }
  }

  function renderTaskList(items: typeof tasks, isCompletedTab = false) {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={<CheckSquareOffsetIcon size={40} weight="duotone" />}
          title={
            isCompletedTab ? "Sin tareas realizadas" : "Sin pendientes ni ideas"
          }
          description={
            search ||
            categoryFilter !== "all" ||
            priorityFilter !== "all" ||
            (isAdmin && userFilter !== "all")
              ? "No se encontraron tareas con los filtros seleccionados."
              : isCompletedTab
                ? "Aún no has marcado ninguna tarea como realizada."
                : "No tienes tareas ni ideas pendientes. Agrega una nueva para comenzar."
          }
          action={
            !isCompletedTab && (
              <Button
                variant="primary"
                className="text-xs"
                onClick={openCreate}
              >
                <PlusIcon size={16} weight="bold" />
                Agregar tarea / idea
              </Button>
            )
          }
        />
      );
    }

    return (
      <div className="flex flex-col gap-2.5">
        {items.map((t) => {
          const isDone = t.status === "realizada";
          const assignedLabel = t.assignedToName || t.assignedTo;
          const createdLabel = t.createdByName || t.createdBy;

          return (
            <div
              key={t._id}
              className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
                isDone
                  ? "border-grayscale-3 bg-grayscale-2/60 dark:border-grayscale-4 dark:bg-grayscale-3/40"
                  : t.pinned
                    ? "border-accent-6 bg-accent-2/30 shadow-xs dark:border-accent-6/50 dark:bg-accent-3/20"
                    : "border-grayscale-4 bg-grayscale-1 hover:border-grayscale-5 dark:border-grayscale-5 dark:bg-grayscale-2"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Status Checkbox Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(t._id)}
                    className="mt-0.5 shrink-0 text-grayscale-8 transition-colors hover:text-accent-9 dark:hover:text-accent-10"
                    title={
                      isDone ? "Marcar como pendiente" : "Marcar como realizada"
                    }
                  >
                    {isDone ? (
                      <CheckCircleIcon
                        size={22}
                        weight="fill"
                        className="text-green-11"
                      />
                    ) : (
                      <CircleIcon
                        size={22}
                        className="text-grayscale-8 hover:text-accent-10"
                      />
                    )}
                  </button>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium text-sm text-grayscale-12 ${
                          isDone ? "line-through text-grayscale-9" : ""
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.pinned && (
                        <Badge
                          variant="accent"
                          className="flex items-center gap-1 text-[10px]"
                        >
                          <PushPinIcon size={10} weight="fill" />
                          Fijada
                        </Badge>
                      )}
                      {/* Badges de usuarios asignados */}
                      {t.assignedToUsers && t.assignedToUsers.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {t.assignedToUsers.map((u: any) => (
                            <span
                              key={u.email}
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-accent-11 bg-accent-3/60 dark:bg-accent-4/40 px-2 py-0.5 rounded-md border border-accent-6/40"
                            >
                              <UserIcon size={11} />
                              {u.name}
                            </span>
                          ))}
                        </div>
                      ) : assignedLabel ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-accent-11 bg-accent-3/60 dark:bg-accent-4/40 px-2 py-0.5 rounded-md border border-accent-6/40">
                          <UserIcon size={11} />
                          {assignedLabel}
                        </span>
                      ) : null}
                      {!isAdmin && t.createdBy && t.createdBy !== userEmail && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-grayscale-9 bg-grayscale-3 dark:bg-grayscale-4 px-2 py-0.5 rounded-md">
                          Asignada por: {createdLabel || "Admin"}
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p
                        className={`text-xs text-grayscale-10 whitespace-pre-wrap ${
                          isDone ? "text-grayscale-8" : ""
                        }`}
                      >
                        {t.description}
                      </p>
                    )}

                    {/* Foto / Imagen adjunta */}
                    {t.imageUrl && (
                      <div className="mt-1.5 max-w-xs overflow-hidden rounded-lg border border-grayscale-4 bg-white dark:border-grayscale-5 dark:bg-grayscale-2">
                        <img
                          src={t.imageUrl}
                          alt={t.title}
                          className="max-h-40 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(t.imageUrl || null)}
                          title="Haz clic para ver imagen completa"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-grayscale-8">
                      {t.category && (
                        <span className="inline-flex items-center gap-1 font-mono text-grayscale-9 bg-grayscale-3 dark:bg-grayscale-4 px-2 py-0.5 rounded-md">
                          <TagIcon size={11} />
                          {t.category}
                        </span>
                      )}
                      {renderPriorityBadge(t.priority)}
                      <span className="font-mono text-grayscale-8">
                        {isDone
                          ? `Realizada: ${formatDate(t.completedAt)}`
                          : `Creada: ${formatDate(t.createdAt)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title={t.pinned ? "Desmarcar fijada" : "Fijar al inicio"}
                    onClick={() => handleTogglePinned(t._id)}
                    className={`flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                      t.pinned
                        ? "text-accent-11 bg-accent-3 dark:bg-accent-4"
                        : "text-grayscale-8 hover:bg-grayscale-3 hover:text-grayscale-11"
                    }`}
                  >
                    {t.pinned ? (
                      <PushPinIcon size={15} weight="fill" />
                    ) : (
                      <PushPinSlashIcon size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Editar tarea"
                    onClick={() => openEdit(t)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-8 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
                  >
                    <PencilSimpleIcon size={14} />
                  </button>
                  <button
                    type="button"
                    title="Eliminar tarea"
                    onClick={() => setTaskToDeleteId(t._id)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-8 transition-colors hover:bg-red-3 hover:text-red-11"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
              Tareas e Ideas
            </h1>
            <p className="text-sm text-grayscale-10">
              Registra pendientes, ideas y recordatorios sin fecha específica
              para que no se olviden.
            </p>
          </div>
          <Button
            variant="primary"
            className="text-xs shrink-0"
            onClick={openCreate}
          >
            <PlusIcon size={16} weight="bold" />
            Agregar tarea / idea
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pendientes e Ideas"
            value={pendingTasks.length}
            detail="Notas activas"
            icon={<HourglassIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Realizadas"
            value={completedTasks.length}
            detail="Tareas completadas"
            icon={<CheckCircleIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="Ideas Fijadas"
            value={pinnedCount}
            detail="Destacadas al inicio"
            icon={<StarIcon size={18} weight="fill" />}
            index={2}
          />
          <StatCard
            label="Total Registros"
            value={tasks.length}
            detail="Histórico acumulado"
            icon={<ListChecksIcon size={18} weight="fill" />}
            index={3}
          />
        </div>

        {/* Filters & Tabs */}
        <Tabs.Root
          defaultValue="pendientes"
          className="w-full flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              <Tabs.Tab
                value="pendientes"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Pendientes e Ideas ({pendingTasks.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="realizadas"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Realizadas ({completedTasks.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="todas"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Todas ({tasks.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>

            {/* Controls: Search, Category, Priority, and User filter (for admin) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <MagnifyingGlassIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                />
                <input
                  type="text"
                  placeholder="Buscar idea o tarea..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 pl-9 pr-3 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
                />
              </div>

              {/* Filtro por usuario para Admin */}
              {isAdmin && systemUsers.length > 0 && (
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="rounded-lg border border-accent-6/50 bg-accent-2/40 dark:bg-accent-3/20 px-2.5 py-1.5 text-xs text-accent-12 outline-none font-mono cursor-pointer font-semibold"
                >
                  <option value="all">Todos los usuarios</option>
                  {systemUsers.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 text-xs text-grayscale-12 outline-none dark:border-grayscale-5 dark:bg-grayscale-3 font-mono cursor-pointer"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 text-xs text-grayscale-12 outline-none dark:border-grayscale-5 dark:bg-grayscale-3 font-mono cursor-pointer"
              >
                <option value="all">Todas las prioridades</option>
                <option value="alta">Prioridad Alta</option>
                <option value="media">Prioridad Media</option>
                <option value="baja">Prioridad Baja</option>
              </select>
            </div>
          </div>

          {/* Tab 1: Pendientes */}
          <Tabs.Panel value="pendientes">
            {renderTaskList(filteredPending, false)}
          </Tabs.Panel>

          {/* Tab 2: Realizadas */}
          <Tabs.Panel value="realizadas">
            {renderTaskList(filteredCompleted, true)}
          </Tabs.Panel>

          {/* Tab 3: Todas */}
          <Tabs.Panel value="todas">
            {renderTaskList(filteredAll, false)}
          </Tabs.Panel>
        </Tabs.Root>

        {/* Modal: Crear / Editar Tarea o Idea */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingId ? "Editar tarea / idea" : "Registrar tarea o idea"}
          className="max-w-[95vw] sm:max-w-lg max-h-[96vh]"
        >
          <form
            onSubmit={handleSaveTask}
            className="flex flex-col gap-2.5 sm:gap-3"
          >
            {saveError && (
              <div className="rounded-lg border border-red-5 bg-red-2 p-2.5 text-xs text-red-11 dark:border-red-6 dark:bg-red-3/30">
                {saveError}
              </div>
            )}

            <Input
              label="Título o idea principal"
              id="task-title"
              value={form.title}
              onChange={(e) => {
                setSaveError(null);
                setForm((f) => ({ ...f, title: e.target.value }));
              }}
              placeholder="Ej: Idea para video o revisar equipo"
              required
            />

            {/* Asignación de tarea a una o varias personas */}
            {systemUsers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                    Asignar tarea a ({form.assignedToUsers.length}{" "}
                    {form.assignedToUsers.length === 1 ? "persona" : "personas"})
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assignedToUsers: systemUsers.map((u) => ({
                            email: u.email,
                            name: u.name,
                          })),
                        }))
                      }
                      className="text-accent-10 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-grayscale-7">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assignedToUsers: [],
                        }))
                      }
                      className="text-grayscale-9 hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-grayscale-4 bg-grayscale-2/40 dark:border-grayscale-5 dark:bg-grayscale-3/30">
                  {systemUsers.map((u) => {
                    const isSelected = form.assignedToUsers.some(
                      (au) => au.email.toLowerCase() === u.email.toLowerCase(),
                    );
                    return (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => {
                          setForm((f) => {
                            const exists = f.assignedToUsers.some(
                              (au) =>
                                au.email.toLowerCase() === u.email.toLowerCase(),
                            );
                            const nextUsers = exists
                              ? f.assignedToUsers.filter(
                                  (au) =>
                                    au.email.toLowerCase() !==
                                    u.email.toLowerCase(),
                                )
                              : [
                                  ...f.assignedToUsers,
                                  { email: u.email, name: u.name },
                                ];
                            return {
                              ...f,
                              assignedToUsers: nextUsers,
                            };
                          });
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-accent-3 border-accent-7 text-accent-12 dark:bg-accent-4/60 dark:border-accent-6 font-semibold shadow-xs"
                            : "bg-grayscale-1 border-grayscale-4 text-grayscale-10 hover:border-grayscale-6 hover:text-grayscale-12 dark:bg-grayscale-2 dark:border-grayscale-5"
                        }`}
                      >
                        <UserIcon
                          size={12}
                          className={
                            isSelected ? "text-accent-11" : "text-grayscale-8"
                          }
                        />
                        <span>{u.name}</span>
                        <span className="text-[10px] text-grayscale-8 font-normal">
                          ({u.role})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-description"
                className="font-mono text-[11px] font-semibold uppercase text-grayscale-11"
              >
                Notas o especificaciones (opcional)
              </label>
              <textarea
                id="task-description"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Escribe detalles adicionales de la idea..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>

            {/* Categoría — Opciones en Grid Móvil Compacto */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                Categoría (selecciona una)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = form.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`rounded-md px-2 py-1 text-[11px] font-mono font-medium transition-all duration-150 cursor-pointer text-center truncate ${
                        isSelected
                          ? "bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-5 dark:text-grayscale-12 shadow-xs font-bold"
                          : "bg-grayscale-2 text-grayscale-10 hover:bg-grayscale-3 hover:text-grayscale-12 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prioridad — 3 Botones Compactos */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                Prioridad
              </span>
              <div className="flex gap-1.5">
                {[
                  {
                    value: "baja",
                    label: "Baja",
                    color:
                      "border-grayscale-4 text-grayscale-11 hover:bg-grayscale-3 dark:border-grayscale-5",
                  },
                  {
                    value: "media",
                    label: "Media",
                    color:
                      "border-orange-5 text-orange-11 hover:bg-orange-3 dark:border-orange-6",
                  },
                  {
                    value: "alta",
                    label: "Alta",
                    color:
                      "border-red-5 text-red-11 hover:bg-red-3 dark:border-red-6",
                  },
                ].map((p) => {
                  const isSelected = form.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          priority: p.value as "baja" | "media" | "alta",
                        }))
                      }
                      className={`flex-1 rounded-md border py-1 px-2 text-[11px] font-mono font-bold transition-all duration-150 cursor-pointer text-center ${
                        isSelected
                          ? p.value === "alta"
                            ? "bg-red-9 text-white border-red-9 shadow-xs"
                            : p.value === "media"
                              ? "bg-orange-9 text-white border-orange-9 shadow-xs"
                              : "bg-grayscale-11 text-white border-grayscale-11 shadow-xs"
                          : p.color
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Foto / Imagen Adjunta — Diseño Compacto para Móvil */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-2/60 p-2.5 dark:border-grayscale-5 dark:bg-grayscale-3/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-grayscale-12 font-mono uppercase">
                  Foto o imagen (opcional)
                </span>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="inline-flex items-center gap-1 text-[11px] text-red-11 hover:underline cursor-pointer"
                  >
                    <TrashIcon size={12} />
                    Quitar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {form.imageUrl ? (
                  <div className="relative size-10 shrink-0 rounded border border-grayscale-4 bg-white overflow-hidden dark:border-grayscale-5">
                    <img
                      src={form.imageUrl}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <label
                    className={`cursor-pointer inline-flex shrink-0 items-center gap-1 rounded-md border border-grayscale-4 bg-grayscale-1 px-2.5 py-1 text-[11px] font-medium text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 ${
                      isUploadingImage ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <UploadSimpleIcon size={13} />
                    <span>{isUploadingImage ? "Comprimiendo..." : "Subir foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsUploadingImage(true);
                            setSaveError(null);
                            const compressedBase64 = await compressImage(file, 1000, 0.75);
                            setForm((f) => ({
                              ...f,
                              imageUrl: compressedBase64,
                            }));
                          } catch (err: any) {
                            console.error("Error al procesar imagen:", err);
                            setSaveError("No se pudo procesar la imagen seleccionada.");
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="o pega URL..."
                    className="w-full rounded-md border border-grayscale-4 bg-grayscale-1 py-1 px-2 text-[11px] text-grayscale-12 placeholder:text-grayscale-8 outline-none dark:border-grayscale-5 dark:bg-grayscale-3"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] font-mono text-grayscale-11 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pinned: e.target.checked }))
                }
                className="rounded border-grayscale-4 text-accent-9 focus:ring-accent-8"
              />
              <span>Fijar / Destacar al inicio de la lista</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1 px-3"
                disabled={isSaving || isUploadingImage}
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="text-xs py-1 px-3"
                disabled={isSaving || isUploadingImage}
              >
                {isSaving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear tarea / idea"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Vista Completa de Imagen */}
        <Modal
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
          title="Vista previa de imagen"
        >
          <div className="flex flex-col items-center justify-center p-2">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Imagen amplia"
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </Modal>

        {/* Confirm Delete Modal */}
        <ConfirmModal
          open={!!taskToDeleteId}
          onOpenChange={(open) => !open && setTaskToDeleteId(null)}
          title="Eliminar tarea o idea"
          description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={handleDeleteTask}
        />
      </div>
    </PageContainer>
  );
}
