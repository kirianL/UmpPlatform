"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AddressBookIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  CheckSquareOffsetIcon,
  CurrencyDollarIcon,
  FilmSlateIcon,
  FoldersIcon,
  GlobeSimpleIcon,
  HandshakeIcon,
  KeyIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ScrollIcon,
  SquaresFourIcon,
  TrashIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import PageContainer from "@/components/public/PageContainer";
import Modal from "@/components/public/Modal";
import ConfirmModal from "@/components/public/ConfirmModal";
import Input from "@/components/public/Input";
import Button from "@/components/public/Button";
import Select from "@/components/public/Select";
import Badge from "@/components/public/Badge";
import Tabs from "@/components/public/Tabs";
import { Switch } from "@/components/public/Switch";
import { cn } from "@/helpers/classname-helper";

interface RouteOption {
  href: string;
  name: string;
  category: "Operación" | "Comercial" | "General";
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string; weight?: any }>;
}

const AVAILABLE_ROUTES: RouteOption[] = [
  {
    href: "/",
    name: "Dashboard",
    category: "General",
    description: "Métricas principales, estadísticas consolidadas y actividad reciente.",
    Icon: SquaresFourIcon,
  },
  {
    href: "/tareas",
    name: "Tareas",
    category: "Operación",
    description: "Tablero de asignaciones, checklists, subtareas y entregables.",
    Icon: CheckSquareOffsetIcon,
  },
  {
    href: "/notas",
    name: "Proyectos",
    category: "Operación",
    description: "Kanban por proyecto, notas de producción y archivos compartidos.",
    Icon: FoldersIcon,
  },
  {
    href: "/personal",
    name: "Personal",
    category: "Operación",
    description: "Directorio de colaboradores, equipo técnico, elenco y tarifas.",
    Icon: UsersIcon,
  },
  {
    href: "/guiones",
    name: "Guiones",
    category: "Operación",
    description: "Librería de guiones, control de versiones y estado de lectura.",
    Icon: ScrollIcon,
  },
  {
    href: "/calendario-actores",
    name: "Agenda Actores",
    category: "Operación",
    description: "Disponibilidad de elenco, turnos de grabación y contactos.",
    Icon: UserCheckIcon,
  },
  {
    href: "/calendario",
    name: "Calendario",
    category: "Operación",
    description: "Cronograma maestro de rodajes, fechas de entrega y eventos.",
    Icon: CalendarDotsIcon,
  },
  {
    href: "/inventario",
    name: "Inventario",
    category: "Operación",
    description: "Catálogo de cámaras, ópticas, luces y equipo en préstamo.",
    Icon: FilmSlateIcon,
  },
  {
    href: "/finanzas",
    name: "Finanzas",
    category: "Comercial",
    description: "Control de ingresos, gastos operativos, balance y reportes.",
    Icon: CurrencyDollarIcon,
  },
  {
    href: "/clientes",
    name: "Clientes",
    category: "Comercial",
    description: "Fichas de clientes, historial de cobros y servicios contratados.",
    Icon: AddressBookIcon,
  },
  {
    href: "/aliados",
    name: "Aliados",
    category: "Comercial",
    description: "Alianzas estratégicas, descuentos y beneficios del ecosistema.",
    Icon: HandshakeIcon,
  },
  {
    href: "/noticias",
    name: "Página Web",
    category: "Comercial",
    description: "Publicaciones del portal, noticias de prensa y blog público.",
    Icon: GlobeSimpleIcon,
  },
  {
    href: "/permisos",
    name: "Permisos",
    category: "General",
    description: "Gestión de accesos, roles y módulos autorizados por usuario.",
    Icon: KeyIcon,
  },
];

const PRESET_ROLES = [
  { value: "admin", label: "Administrador (Total)" },
  { value: "programador", label: "Programador / Dev" },
  { value: "produccion", label: "Producción" },
  { value: "directorio", label: "Directorio" },
  { value: "actores", label: "Actores / Elenco" },
  { value: "ventas", label: "Comercial / Ventas" },
  { value: "bryan", label: "Bryan (Personalizado)" },
  { value: "personalizado", label: "Personalizado" },
];

export default function PermisosPage() {
  const { userEmail: currentEmail } = useAuth();
  const rawUsers = useQuery(api.users.list) ?? [];

  const employees = useQuery(api.employees.get) ?? [];
  const actors = useQuery(api.actors.get) ?? [];
  const castingLeads = useQuery(api.castingLeads.get) ?? [];
  const potentialCollaborators = useQuery(api.potentialCollaborators.get) ?? [];
  const potentialContacts = useQuery(api.potentialContacts.get) ?? [];

  const updatePermissionsMutation = useMutation(api.users.updatePermissions);
  const removeUserMutation = useMutation(api.users.remove);

  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"users"> | null>(
    null
  );

  // Forms
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("produccion");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const users = useMemo(() => {
    return rawUsers.filter((u) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    });
  }, [rawUsers, search]);

  const activeUser = useMemo(() => {
    if (selectedUserId) {
      const found = rawUsers.find((u) => u._id === selectedUserId);
      if (found) return found;
    }
    return rawUsers[0] || null;
  }, [rawUsers, selectedUserId]);

  const personalTabOptions = useMemo(
    () => [
      {
        id: "staff",
        name: "Equipo de producción",
        description: "Miembros del equipo técnico, roles, contactos y salarios.",
        count: employees.length,
        Icon: UsersIcon,
      },
      {
        id: "actors",
        name: "Elenco y personajes",
        description: "Actores del elenco, personajes asignados, tallas y redes.",
        count: actors.length,
        Icon: UserCheckIcon,
      },
      {
        id: "leads",
        name: "Interesados en grabar",
        description: "Candidatos registrados en prospección y casting.",
        count: castingLeads.length,
        Icon: UserPlusIcon,
      },
      {
        id: "collaborators",
        name: "Colaboradores potenciales",
        description: "Aliados externos, editores, freelancers e influencers.",
        count: potentialCollaborators.length,
        Icon: HandshakeIcon,
      },
      {
        id: "contacts",
        name: "Contactos potenciales",
        description: "Contactos de la industria, marcas y agencias en seguimiento.",
        count: potentialContacts.length,
        Icon: AddressBookIcon,
      },
    ],
    [
      employees.length,
      actors.length,
      castingLeads.length,
      potentialCollaborators.length,
      potentialContacts.length,
    ]
  );

  const activePersonalTabs = useMemo<string[]>(() => {
    if (!activeUser) return [];
    if (activeUser.personalTabs && Array.isArray(activeUser.personalTabs)) {
      return activeUser.personalTabs;
    }
    if (activeUser.role === "admin" || activeUser.role === "programador") {
      return ["staff", "actors", "leads", "collaborators", "contacts"];
    }
    if (
      activeUser.role === "actores" ||
      activeUser.role === "directorio" ||
      activeUser.email.toLowerCase().includes("michelle")
    ) {
      return ["actors", "leads", "collaborators", "contacts"];
    }
    return ["staff", "actors", "leads", "collaborators", "contacts"];
  }, [activeUser]);

  const activeRoutes = useMemo(() => {
    if (!activeUser) return [];
    if (activeUser.allowedRoutes && Array.isArray(activeUser.allowedRoutes)) {
      return activeUser.allowedRoutes;
    }
    if (activeUser.role === "admin" || activeUser.role === "programador") {
      return AVAILABLE_ROUTES.map((r) => r.href);
    }
    if (activeUser.role === "actores") {
      return ["/calendario-actores", "/personal", "/tareas", "/notas"];
    }
    if (activeUser.role === "ventas") {
      return ["/clientes", "/calendario", "/calendario-actores", "/noticias"];
    }
    if (activeUser.role === "directorio") {
      return [
        "/clientes",
        "/personal",
        "/calendario-actores",
        "/inventario",
        "/tareas",
        "/notas",
      ];
    }
    if (activeUser.email.toLowerCase().includes("bryan")) {
      return ["/calendario", "/notas", "/inventario", "/tareas"];
    }
    return [
      "/inventario",
      "/calendario",
      "/guiones",
      "/calendario-actores",
      "/tareas",
      "/notas",
      "/brainstorm",
    ];
  }, [activeUser]);

  const displayedRoutes = useMemo(() => {
    if (selectedCategory === "all") return AVAILABLE_ROUTES;
    return AVAILABLE_ROUTES.filter((r) => r.category === selectedCategory);
  }, [selectedCategory]);

  const accessPercent = Math.round(
    (activeRoutes.length / AVAILABLE_ROUTES.length) * 100
  );

  async function handleToggleRoute(href: string) {
    if (!activeUser) return;
    const isCurrentlyAllowed = activeRoutes.includes(href);
    const updatedRoutes = isCurrentlyAllowed
      ? activeRoutes.filter((r) => r !== href)
      : [...activeRoutes, href];

    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: updatedRoutes,
        personalTabs: activePersonalTabs,
      });
      setSaveStatus("Guardado");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleGrantAll() {
    if (!activeUser) return;
    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: AVAILABLE_ROUTES.map((r) => r.href),
        personalTabs: activePersonalTabs,
      });
      setSaveStatus("Acceso total");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleRevokeAll() {
    if (!activeUser) return;
    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: [],
        personalTabs: activePersonalTabs,
      });
      setSaveStatus("Accesos removidos");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleRoleChange(newRole: string) {
    if (!activeUser) return;
    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        role: newRole,
        allowedRoutes: activeRoutes,
        personalTabs: activePersonalTabs,
      });
      setSaveStatus("Rol actualizado");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleTogglePersonalTab(tabId: string) {
    if (!activeUser) return;
    const isCurrentlyAllowed = activePersonalTabs.includes(tabId);
    const updatedTabs = isCurrentlyAllowed
      ? activePersonalTabs.filter((t) => t !== tabId)
      : [...activePersonalTabs, tabId];

    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: activeRoutes,
        personalTabs: updatedTabs,
      });
      setSaveStatus("Guardado");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleGrantAllPersonalTabs() {
    if (!activeUser) return;
    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: activeRoutes,
        personalTabs: [
          "staff",
          "actors",
          "leads",
          "collaborators",
          "contacts",
        ],
      });
      setSaveStatus("Secciones habilitadas");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleRevokeAllPersonalTabs() {
    if (!activeUser) return;
    try {
      await updatePermissionsMutation({
        userId: activeUser._id as Id<"users">,
        allowedRoutes: activeRoutes,
        personalTabs: [],
      });
      setSaveStatus("Secciones removidas");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/users/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName,
          role: newUserRole,
          allowedRoutes:
            newUserRole === "admin" ? AVAILABLE_ROUTES.map((r) => r.href) : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el usuario");
      }

      setCreateModalOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("produccion");
      setSaveStatus("Usuario creado");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      setCreateError(err.message || "Error al crear");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser) return;
    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const res = await fetch("/api/users/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePassword",
          userId: activeUser._id,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar");
      }

      setPasswordModalOpen(false);
      setNewPassword("");
      setSaveStatus("Contraseña actualizada");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      setPasswordError(err.message || "Error");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      await removeUserMutation({ userId: deleteConfirmId });
      if (activeUser?._id === deleteConfirmId) {
        setSelectedUserId(null);
      }
      setDeleteConfirmId(null);
      setSaveStatus("Usuario eliminado");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function getUserInitials(nameOrEmail: string): string {
    const clean = nameOrEmail.split("@")[0].trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-5">
        {/* Header Superior Compacto */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-mono text-xl font-bold uppercase tracking-wide text-grayscale-12">
              Permisos del Sistema
            </h1>
            <p className="text-xs text-grayscale-10">
              Control modular de accesos y visibilidad para miembros del equipo.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {saveStatus && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-green-11">
                <CheckCircleIcon size={14} weight="fill" />
                {saveStatus}
              </span>
            )}
            <Button
              variant="primary"
              onClick={() => {
                setCreateError(null);
                setCreateModalOpen(true);
              }}
            >
              <PlusIcon size={14} weight="bold" />
              <span>Nuevo usuario</span>
            </Button>
          </div>
        </div>

        {/* Layout Principal: 2 Columnas Optimizadas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Columna Izquierda: Directorio de Usuarios */}
          <div className="lg:col-span-4 flex flex-col rounded-xl border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-2 overflow-hidden shadow-xs">
            <div className="p-3 border-b border-grayscale-3 dark:border-grayscale-2 bg-grayscale-2/30">
              <div className="relative">
                <MagnifyingGlassIcon
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8"
                />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 pl-8 pr-3 font-mono text-xs text-grayscale-12 placeholder:text-grayscale-8 focus:border-grayscale-7 focus:outline-none dark:border-grayscale-3"
                />
              </div>
            </div>

            <div className="divide-y divide-grayscale-3 dark:divide-grayscale-2 max-h-[580px] overflow-y-auto">
              {users.map((u) => {
                const isSelected = activeUser?._id === u._id;
                const userAllowedCount =
                  u.allowedRoutes && Array.isArray(u.allowedRoutes)
                    ? u.allowedRoutes.length
                    : u.role === "admin"
                      ? AVAILABLE_ROUTES.length
                      : 4;

                const initials = getUserInitials(u.name || u.email);

                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => setSelectedUserId(u._id)}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-3 cursor-pointer",
                      isSelected
                        ? "bg-grayscale-3 dark:bg-grayscale-3"
                        : "hover:bg-grayscale-2/60 dark:hover:bg-grayscale-2/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "size-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0 border",
                          isSelected
                            ? "bg-grayscale-12 text-grayscale-1 border-grayscale-12 dark:bg-grayscale-12 dark:text-grayscale-1"
                            : "bg-grayscale-2 text-grayscale-11 border-grayscale-4 dark:bg-grayscale-3 dark:border-grayscale-4"
                        )}
                      >
                        {initials}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-xs font-semibold text-grayscale-12 truncate leading-tight">
                          {u.name || u.email.split("@")[0]}
                        </span>
                        <span className="text-[11px] text-grayscale-9 truncate">
                          {u.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={u.role === "admin" ? "green" : "gray"}>
                        {u.role || "produccion"}
                      </Badge>
                      <span className="font-mono text-[10px] text-grayscale-9">
                        {userAllowedCount}/{AVAILABLE_ROUTES.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Panel de Configuración de Accesos */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {activeUser ? (
              <div className="flex flex-col rounded-xl border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-2 p-4 shadow-xs gap-4">
                {/* Header del Usuario Activo */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-grayscale-3 dark:border-grayscale-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-5 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      {getUserInitials(activeUser.name || activeUser.email)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-grayscale-12 truncate">
                          {activeUser.name || activeUser.email}
                        </span>
                        <Badge variant="gray">{activeUser.email}</Badge>
                      </div>
                      <span className="text-[11px] text-grayscale-9 font-mono">
                        {activeRoutes.length} de {AVAILABLE_ROUTES.length} módulos habilitados ({accessPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPasswordError(null);
                        setNewPassword("");
                        setPasswordModalOpen(true);
                      }}
                    >
                      <LockKeyIcon size={14} />
                      <span>Clave</span>
                    </Button>

                    {activeUser.email !== "admin@ultimate.cr" &&
                      activeUser.email !== currentEmail && (
                        <button
                          type="button"
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 text-grayscale-9 transition-colors hover:border-red-6 hover:bg-red-3 hover:text-red-11 dark:border-grayscale-3"
                          onClick={() =>
                            setDeleteConfirmId(activeUser._id as Id<"users">)
                          }
                          title="Eliminar usuario"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                  </div>
                </div>

                {/* Rol y Cobertura en barra horizontal compacta */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-lg border border-grayscale-3 bg-grayscale-2/40 dark:border-grayscale-3">
                  <div className="sm:col-span-7 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-medium uppercase text-grayscale-10">
                        Cobertura de accesos
                      </span>
                      <span className="text-[11px] font-mono text-grayscale-11">
                        {accessPercent}%
                      </span>
                    </div>
                    {/* Barra de progreso segmentada compacta */}
                    <div className="flex gap-1">
                      {AVAILABLE_ROUTES.map((_, i) => {
                        const isFilled = i < activeRoutes.length;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "h-1.5 flex-1 rounded-xs transition-all",
                              isFilled
                                ? "bg-grayscale-12 dark:bg-grayscale-6"
                                : "bg-grayscale-4 dark:bg-grayscale-3"
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-5 flex items-center gap-2 sm:pl-3 sm:border-l border-grayscale-3 dark:border-grayscale-3">
                    <span className="text-xs font-mono uppercase text-grayscale-10 shrink-0">
                      Rol:
                    </span>
                    <div className="w-full">
                      <Select
                        options={PRESET_ROLES}
                        value={activeUser.role || "produccion"}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabs del Componente Public Tabs y Acciones */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-grayscale-3 dark:border-grayscale-2 pb-2">
                  <Tabs.Root
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <Tabs.List className="border-0 pb-0 gap-1">
                      <Tabs.Tab
                        value="all"
                        className="font-mono text-xs font-semibold uppercase py-1 px-2.5"
                      >
                        Todos
                      </Tabs.Tab>
                      <Tabs.Tab
                        value="Operación"
                        className="font-mono text-xs font-semibold uppercase py-1 px-2.5"
                      >
                        Operación
                      </Tabs.Tab>
                      <Tabs.Tab
                        value="Comercial"
                        className="font-mono text-xs font-semibold uppercase py-1 px-2.5"
                      >
                        Comercial
                      </Tabs.Tab>
                      <Tabs.Tab
                        value="General"
                        className="font-mono text-xs font-semibold uppercase py-1 px-2.5"
                      >
                        General
                      </Tabs.Tab>
                      <Tabs.Indicator />
                    </Tabs.List>
                  </Tabs.Root>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className="cursor-pointer text-xs font-mono font-medium text-grayscale-10 hover:text-grayscale-12 transition-colors"
                    >
                      Habilitar todo
                    </button>
                    <span className="text-grayscale-4">|</span>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="cursor-pointer text-xs font-mono font-medium text-red-10 hover:text-red-11 transition-colors"
                    >
                      Deshabilitar todo
                    </button>
                  </div>
                </div>

                {/* Grilla Compacta: 2 Columnas de Módulos con Switch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {displayedRoutes.map((route) => {
                    const isAllowed = activeRoutes.includes(route.href);
                    const RouteIcon = route.Icon;

                    return (
                      <div
                        key={route.href}
                        onClick={() => handleToggleRoute(route.href)}
                        className={cn(
                          "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer select-none active:scale-[0.99]",
                          isAllowed
                            ? "border-grayscale-5 bg-grayscale-2/60 dark:border-grayscale-4 dark:bg-grayscale-2/40"
                            : "border-grayscale-3 bg-grayscale-1 hover:border-grayscale-4 hover:bg-grayscale-2/30 dark:border-grayscale-3 dark:bg-grayscale-1/40 dark:hover:bg-grayscale-2/20"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                              isAllowed
                                ? "border-grayscale-12 bg-grayscale-12 text-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-5 dark:text-grayscale-12"
                                : "border-grayscale-4 bg-grayscale-2 text-grayscale-9 dark:border-grayscale-3 dark:bg-grayscale-2"
                            )}
                          >
                            <RouteIcon size={15} weight={isAllowed ? "bold" : "regular"} />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-grayscale-12 truncate">
                                {route.name}
                              </span>
                              <span className="font-mono text-[10px] text-grayscale-8">
                                {route.href}
                              </span>
                            </div>
                            <span className="text-[11px] text-grayscale-9 truncate">
                              {route.description}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pointer-events-none">
                          <Switch.Composed checked={isAllowed} readOnly />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secciones Específicas de Personal */}
                <div className="flex flex-col gap-3 pt-3 border-t border-grayscale-3 dark:border-grayscale-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-grayscale-4 bg-grayscale-2 text-grayscale-11 dark:border-grayscale-3 dark:bg-grayscale-3">
                        <UsersIcon size={14} weight="bold" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-grayscale-12">
                          Secciones de Personal
                        </span>
                        <Badge variant={activePersonalTabs.length > 0 ? "accent" : "gray"}>
                          {activePersonalTabs.length} de {personalTabOptions.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGrantAllPersonalTabs}
                        className="cursor-pointer text-xs font-mono font-medium text-grayscale-10 hover:text-grayscale-12 transition-colors"
                      >
                        Habilitar todas
                      </button>
                      <span className="text-grayscale-4">|</span>
                      <button
                        type="button"
                        onClick={handleRevokeAllPersonalTabs}
                        className="cursor-pointer text-xs font-mono font-medium text-red-10 hover:text-red-11 transition-colors"
                      >
                        Deshabilitar todas
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-grayscale-9">
                    Selecciona qué pestañas específicas puede visualizar este usuario cuando ingresa a Personal (/personal):
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {personalTabOptions.map((tab) => {
                      const isAllowed = activePersonalTabs.includes(tab.id);
                      const TabIcon = tab.Icon;

                      return (
                        <div
                          key={tab.id}
                          onClick={() => handleTogglePersonalTab(tab.id)}
                          className={cn(
                            "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer select-none active:scale-[0.99]",
                            isAllowed
                              ? "border-grayscale-5 bg-grayscale-2/60 dark:border-grayscale-4 dark:bg-grayscale-2/40"
                              : "border-grayscale-3 bg-grayscale-1 hover:border-grayscale-4 hover:bg-grayscale-2/30 dark:border-grayscale-3 dark:bg-grayscale-1/40 dark:hover:bg-grayscale-2/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                            <div
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                                isAllowed
                                  ? "border-grayscale-12 bg-grayscale-12 text-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-5 dark:text-grayscale-12"
                                  : "border-grayscale-4 bg-grayscale-2 text-grayscale-9 dark:border-grayscale-3 dark:bg-grayscale-2"
                              )}
                            >
                              <TabIcon size={15} weight={isAllowed ? "bold" : "regular"} />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-grayscale-12 truncate">
                                  {tab.name} ({tab.count})
                                </span>
                              </div>
                              <span className="text-[11px] text-grayscale-9 truncate">
                                {tab.description}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 pointer-events-none">
                            <Switch.Composed checked={isAllowed} readOnly />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal: Crear Usuario */}
      <Modal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Crear nuevo usuario"
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <Input
            label="Nombre completo"
            id="newUserName"
            placeholder="Ej: Bryan Rodriguez"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            required
          />

          <Input
            label="Correo electrónico / Usuario"
            id="newUserEmail"
            type="email"
            placeholder="usuario@ultimate.cr"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
          />

          <Input
            label="Contraseña inicial"
            id="newUserPassword"
            type="password"
            placeholder="••••••••"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            required
          />

          <Select
            label="Rol de usuario"
            options={PRESET_ROLES}
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
          />

          {createError && (
            <div className="flex items-center gap-2 rounded-md bg-red-3/40 border border-red-5 p-2 text-xs text-red-11">
              <WarningCircleIcon size={14} />
              <span>{createError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createLoading}>
              {createLoading ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cambiar Contraseña */}
      <Modal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        title={`Cambiar contraseña de ${activeUser?.name || activeUser?.email}`}
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            label="Nueva contraseña"
            id="newPassword"
            type="password"
            placeholder="Introduce la nueva clave"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          {passwordError && (
            <div className="flex items-center gap-2 rounded-md bg-red-3/40 border border-red-5 p-2 text-xs text-red-11">
              <WarningCircleIcon size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPasswordModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={passwordLoading}>
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Borrado */}
      <ConfirmModal
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
        title="Eliminar usuario"
        description="¿Seguro que deseas eliminar esta cuenta? Esta acción removerá el acceso al sistema de forma permanente."
        confirmText="Eliminar usuario"
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}
