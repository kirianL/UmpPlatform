"use client";

import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  EnvelopeSimpleIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import PageContainer from "@/components/public/PageContainer";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type AllyRecord = {
  _id: Id<"allies">;
  _creationTime: number;
  fullName: string;
  idCard: string;
  phone: string;
  email: string;
  whatsappOptIn: boolean;
  package: "elite" | "vip";
  packageAmount: number;
  status?: "pendiente" | "activo" | "inactivo";
  paymentStatus?: "pendiente" | "pagado" | "cancelado";
  code?: string;
  notes?: string;
  createdAt: string;
};

function formatCurrency(n: number): string {
  const formatted = new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 0,
  }).format(n);
  return `₡ ${formatted}`;
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  const dateStr = iso.slice(0, 10);
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getWhatsAppLink(
  phone: string,
  fullName: string,
  pkg: string,
  code?: string,
): string {
  if (!phone) return "#";
  let clean = phone.replace(/[^\d]/g, "");
  if (clean.length === 8) {
    clean = `506${clean}`;
  }
  const idText = code ? ` [ID: ${code}]` : "";
  const text = encodeURIComponent(
    `Hola ${fullName}${idText}, te saludamos de Producciones UMP respecto a tu membresía como Aliado (Paquete ${pkg.toUpperCase()}).`,
  );
  return `https://wa.me/${clean}?text=${text}`;
}

export default function AliadosPage() {
  const rawAllies = useQuery(api.allies.getAll);
  const createAlly = useMutation(api.allies.create);
  const updateAlly = useMutation(api.allies.update);
  const removeAlly = useMutation(api.allies.remove);

  const allies: AllyRecord[] = useMemo(() => {
    return (rawAllies as AllyRecord[]) || [];
  }, [rawAllies]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [whatsappFilter, setWhatsappFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Copy Link & ID States
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAlly, setSelectedAlly] = useState<AllyRecord | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    fullName: "",
    idCard: "",
    phone: "",
    email: "",
    whatsappOptIn: true,
    package: "elite" as "elite" | "vip",
    packageAmount: 10000,
    status: "pendiente" as "pendiente" | "activo" | "inactivo",
    paymentStatus: "pendiente" as "pendiente" | "pagado" | "cancelado",
    code: "",
    notes: "",
  });

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Copy registration link
  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/aliados/public`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy individual Ally ID
  const handleCopyId = (code: string) => {
    if (typeof window === "undefined" || !code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      fullName: "",
      idCard: "",
      phone: "",
      email: "",
      whatsappOptIn: true,
      package: "elite",
      packageAmount: 10000,
      status: "pendiente",
      paymentStatus: "pendiente",
      code: "",
      notes: "",
    });
    setFormError("");
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (ally: AllyRecord) => {
    setSelectedAlly(ally);
    setFormData({
      fullName: ally.fullName,
      idCard: ally.idCard,
      phone: ally.phone,
      email: ally.email,
      whatsappOptIn: ally.whatsappOptIn,
      package: ally.package,
      packageAmount: ally.packageAmount,
      status: ally.status || "pendiente",
      paymentStatus: ally.paymentStatus || "pendiente",
      code: ally.code || "",
      notes: ally.notes || "",
    });
    setFormError("");
    setEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (ally: AllyRecord) => {
    setSelectedAlly(ally);
    setDeleteModalOpen(true);
  };

  // Handle Save Create
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.fullName.trim()) {
      setFormError("El nombre completo es requerido.");
      return;
    }
    if (!formData.idCard.trim()) {
      setFormError("La cédula o identificación es requerida.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("El celular es requerido.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("El correo electrónico es requerido.");
      return;
    }

    setSaving(true);
    try {
      await createAlly({
        fullName: formData.fullName.trim(),
        idCard: formData.idCard.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsappOptIn: formData.whatsappOptIn,
        package: formData.package,
        packageAmount: formData.package === "vip" ? 12000 : 10000,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        code: formData.code.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Error al crear el aliado.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlly) return;
    setFormError("");

    if (!formData.fullName.trim()) {
      setFormError("El nombre completo es requerido.");
      return;
    }
    if (!formData.idCard.trim()) {
      setFormError("La cédula o identificación es requerida.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("El celular es requerido.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("El correo electrónico es requerido.");
      return;
    }

    setSaving(true);
    try {
      await updateAlly({
        id: selectedAlly._id,
        fullName: formData.fullName.trim(),
        idCard: formData.idCard.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsappOptIn: formData.whatsappOptIn,
        package: formData.package,
        packageAmount: formData.package === "vip" ? 12000 : 10000,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        code: formData.code.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setEditModalOpen(false);
      setSelectedAlly(null);
    } catch (err: any) {
      setFormError(err?.message || "Error al actualizar el aliado.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedAlly) return;
    try {
      await removeAlly({ id: selectedAlly._id });
      setDeleteModalOpen(false);
      setSelectedAlly(null);
    } catch (err: any) {
      console.error("Error al eliminar aliado:", err);
    }
  };

  // Filtered Allies
  const filteredAllies = useMemo(() => {
    return allies.filter((item) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        item.fullName.toLowerCase().includes(s) ||
        item.idCard.toLowerCase().includes(s) ||
        item.phone.toLowerCase().includes(s) ||
        item.email.toLowerCase().includes(s) ||
        item.code?.toLowerCase().includes(s);

      const matchPackage =
        packageFilter === "all" || item.package === packageFilter;

      const matchWhatsapp =
        whatsappFilter === "all" ||
        (whatsappFilter === "yes" && item.whatsappOptIn) ||
        (whatsappFilter === "no" && !item.whatsappOptIn);

      const matchStatus =
        statusFilter === "all" || (item.status || "pendiente") === statusFilter;

      return matchSearch && matchPackage && matchWhatsapp && matchStatus;
    });
  }, [allies, search, packageFilter, whatsappFilter, statusFilter]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = allies.length;
    const eliteCount = allies.filter((a) => a.package === "elite").length;
    const vipCount = allies.filter((a) => a.package === "vip").length;
    const whatsappCount = allies.filter((a) => a.whatsappOptIn).length;
    const totalProjected = allies.reduce(
      (acc, a) =>
        acc + (a.packageAmount || (a.package === "vip" ? 12000 : 10000)),
      0,
    );

    return {
      total,
      eliteCount,
      vipCount,
      whatsappCount,
      totalProjected,
    };
  }, [allies]);

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HandshakeIcon
                size={26}
                weight="bold"
                className="text-grayscale-12"
              />
              <h1 className="text-xl font-bold tracking-tight text-grayscale-12 sm:text-2xl font-mono uppercase">
                Aliados
              </h1>
            </div>
            <p className="text-xs text-grayscale-10 mt-1">
              Gestión de miembros y registros del formulario de afiliación con
              ID único.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* COPY PUBLIC FORM LINK BUTTON */}
            <Button
              variant="secondary"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs"
            >
              {copiedLink ? (
                <>
                  <CheckIcon
                    size={16}
                    weight="bold"
                    className="text-green-600 dark:text-green-400"
                  />
                  <span className="text-green-600 dark:text-green-400">
                    Link Copiado
                  </span>
                </>
              ) : (
                <>
                  <CopyIcon size={16} weight="bold" />
                  <span>Copiar Link Registro</span>
                </>
              )}
            </Button>

            {/* OPEN PUBLIC FORM IN NEW TAB */}
            <a
              href="/aliados/public"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-grayscale-4 bg-transparent px-3 py-1.5 text-xs font-semibold text-grayscale-11 hover:bg-grayscale-2 dark:hover:bg-grayscale-3 transition-colors"
            >
              <ArrowSquareOutIcon size={15} weight="bold" />
              <span>Ver Formulario</span>
            </a>

            {/* ADD ALLY BUTTON */}
            <Button
              variant="primary"
              onClick={openCreateModal}
              className="gap-1.5 text-xs"
            >
              <PlusIcon size={16} weight="bold" />
              <span>Nuevo Aliado</span>
            </Button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Aliados"
            value={stats.total}
            icon={<UsersIcon size={20} />}
          />
          <StatCard
            label="Paquete Élite"
            value={stats.eliteCount}
            detail="₡10.000 / mes"
            icon={<ShieldCheckIcon size={20} />}
          />
          <StatCard
            label="Paquete VIP"
            value={stats.vipCount}
            detail="₡12.000 / mes"
            icon={<CrownIcon size={20} />}
          />
          <StatCard
            label="WhatsApp Activo"
            value={stats.whatsappCount}
            detail={`${stats.total > 0 ? Math.round((stats.whatsappCount / stats.total) * 100) : 0}% del total`}
            icon={<WhatsappLogoIcon size={20} />}
          />
          <StatCard
            label="Recaudación Est."
            value={formatCurrency(stats.totalProjected)}
            detail="Proyección total"
            icon={<HandshakeIcon size={20} />}
          />
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-grayscale-3 dark:bg-grayscale-2">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-grayscale-8">
              <MagnifyingGlassIcon size={16} />
            </div>
            <input
              type="text"
              aria-label="Buscar aliados"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, nombre, cédula, celular, correo..."
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 pl-9 pr-3 py-1.5 text-xs text-grayscale-12 placeholder:text-grayscale-8 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-grayscale-4 dark:bg-grayscale-3"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* PACKAGE FILTER */}
            <select
              aria-label="Filtrar por paquete"
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 text-xs text-grayscale-12 focus:border-accent focus:outline-none dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              <option value="all">Todos los Paquetes</option>
              <option value="elite">Élite (₡10.000)</option>
              <option value="vip">VIP (₡12.000)</option>
            </select>

            {/* WHATSAPP FILTER */}
            <select
              aria-label="Filtrar por recepción de WhatsApp"
              value={whatsappFilter}
              onChange={(e) => setWhatsappFilter(e.target.value)}
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 text-xs text-grayscale-12 focus:border-accent focus:outline-none dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              <option value="all">WhatsApp: Todos</option>
              <option value="yes">WhatsApp: Sí</option>
              <option value="no">WhatsApp: No</option>
            </select>

            {/* STATUS FILTER */}
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 text-xs text-grayscale-12 focus:border-accent focus:outline-none dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              <option value="all">Todos los Estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* ALLIES DATA TABLE */}
        {rawAllies === undefined ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-3 dark:bg-grayscale-2">
            <span className="text-xs font-mono text-grayscale-9 animate-pulse">
              Cargando aliados...
            </span>
          </div>
        ) : filteredAllies.length === 0 ? (
          <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 p-8 dark:border-grayscale-3 dark:bg-grayscale-2">
            <EmptyState
              title={
                search || packageFilter !== "all" || whatsappFilter !== "all"
                  ? "No se encontraron resultados"
                  : "Aún no hay aliados registrados"
              }
              description={
                search || packageFilter !== "all" || whatsappFilter !== "all"
                  ? "Intenta modificando los filtros o la búsqueda."
                  : "Comparte el enlace público de registro para recibir las primeras afiliaciones con ID asignado."
              }
              action={
                search ||
                packageFilter !== "all" ||
                whatsappFilter !== "all" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setPackageFilter("all");
                      setWhatsappFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Restablecer Filtros
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleCopyLink}>
                    Copiar Enlace de Registro
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-grayscale-3 bg-grayscale-1 shadow-sm dark:border-grayscale-3 dark:bg-grayscale-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-grayscale-11">
                <thead className="border-b border-grayscale-3 bg-grayscale-2 text-[11px] font-mono uppercase tracking-wider text-grayscale-9 dark:border-grayscale-3 dark:bg-grayscale-3/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      ID Aliado
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Nombre Completo
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Cédula
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Contacto
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Paquete
                    </th>
                    <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
                      WhatsApp Exclusivo
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Fecha Registro
                    </th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">
                      Estado
                    </th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grayscale-3 dark:divide-grayscale-3">
                  {filteredAllies.map((item) => {
                    const isVip = item.package === "vip";
                    const status = item.status || "pendiente";

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-grayscale-2/60 transition-colors dark:hover:bg-grayscale-3/40"
                      >
                        {/* ID CODE */}
                        <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                          {item.code ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.code) handleCopyId(item.code);
                              }}
                              title="Copiar ID"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold text-xs bg-grayscale-3 text-grayscale-12 hover:bg-accent/15 hover:text-accent border border-grayscale-4 dark:border-grayscale-5 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <span className="whitespace-nowrap">
                                {item.code}
                              </span>
                              {copiedId === item.code ? (
                                <CheckIcon
                                  size={12}
                                  weight="bold"
                                  className="text-green-600 dark:text-green-400"
                                />
                              ) : (
                                <CopyIcon
                                  size={12}
                                  className="text-grayscale-8"
                                />
                              )}
                            </button>
                          ) : (
                            <span className="text-grayscale-8">N/A</span>
                          )}
                        </td>

                        {/* NOMBRE */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-grayscale-12 whitespace-nowrap">
                            {item.fullName}
                          </div>
                          {item.notes && (
                            <p
                              className="text-[11px] text-grayscale-9 truncate max-w-xs mt-0.5"
                              title={item.notes}
                            >
                              Nota: {item.notes}
                            </p>
                          )}
                        </td>

                        {/* CEDULA */}
                        <td className="px-4 py-3.5 font-mono text-grayscale-12 whitespace-nowrap">
                          {item.idCard}
                        </td>

                        {/* CONTACTO */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-grayscale-12 whitespace-nowrap">
                              <PhoneIcon
                                size={13}
                                className="text-grayscale-8 shrink-0"
                              />
                              <span className="whitespace-nowrap">
                                {item.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-grayscale-9 text-[11px] whitespace-nowrap">
                              <EnvelopeSimpleIcon
                                size={13}
                                className="text-grayscale-8 shrink-0"
                              />
                              <span className="truncate max-w-[160px] whitespace-nowrap">
                                {item.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* PAQUETE */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isVip ? (
                            <Badge
                              variant="accent"
                              className="font-mono inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <CrownIcon size={12} weight="bold" />
                              <span className="whitespace-nowrap">
                                VIP (₡12k)
                              </span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="gray"
                              className="font-mono inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <ShieldCheckIcon size={12} weight="bold" />
                              <span className="whitespace-nowrap">
                                Élite (₡10k)
                              </span>
                            </Badge>
                          )}
                        </td>

                        {/* WHATSAPP EXCLUSIVO */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {item.whatsappOptIn ? (
                            <Badge
                              variant="green"
                              className="font-mono whitespace-nowrap"
                            >
                              Sí
                            </Badge>
                          ) : (
                            <Badge
                              variant="gray"
                              className="font-mono whitespace-nowrap"
                            >
                              No
                            </Badge>
                          )}
                        </td>

                        {/* FECHA REGISTRO */}
                        <td className="px-4 py-3.5 font-mono text-grayscale-10 whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>

                        {/* ESTADO */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              status === "activo"
                                ? "green"
                                : status === "inactivo"
                                  ? "red"
                                  : "orange"
                            }
                            className="capitalize font-mono whitespace-nowrap"
                          >
                            {status}
                          </Badge>
                        </td>

                        {/* ACCIONES */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* WHATSAPP DIRECT MESSAGE */}
                            <a
                              href={getWhatsAppLink(
                                item.phone,
                                item.fullName,
                                item.package,
                                item.code,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir chat en WhatsApp con ${item.fullName}`}
                              title="Abrir chat en WhatsApp"
                              className="flex size-7 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                            >
                              <WhatsappLogoIcon size={15} weight="fill" />
                            </a>

                            {/* EDIT BUTTON */}
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`Editar aliado ${item.fullName}`}
                              title="Editar aliado"
                              className="flex size-7 items-center justify-center rounded-lg border border-grayscale-4 bg-transparent text-grayscale-11 hover:bg-grayscale-2 dark:hover:bg-grayscale-3 transition-colors"
                            >
                              <PencilSimpleIcon size={14} />
                            </button>

                            {/* DELETE BUTTON */}
                            <button
                              type="button"
                              onClick={() => openDeleteModal(item)}
                              aria-label={`Eliminar aliado ${item.fullName}`}
                              title="Eliminar aliado"
                              className="flex size-7 items-center justify-center rounded-lg border border-red-500/30 bg-transparent text-red-600 hover:bg-red-500/10 transition-colors"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Nuevo Aliado"
      >
        <form onSubmit={handleSaveCreate} className="p-4 sm:p-6 space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                id="create-fullName"
                label="Nombre Completo *"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Ej. Kirian Luna Quiros"
                required
              />
            </div>
            <div>
              <Input
                id="create-code"
                label="ID / Código (Opcional)"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Auto (AL-XXXXXX)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-idCard"
              label="Cédula *"
              value={formData.idCard}
              onChange={(e) =>
                setFormData({ ...formData, idCard: e.target.value })
              }
              placeholder="Ej. 1-1234-0567"
              required
            />

            <Input
              id="create-phone"
              label="Celular *"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Ej. 8888-8888"
              required
            />
          </div>

          <Input
            id="create-email"
            label="Correo Electrónico *"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="nombre@ejemplo.com"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="create-package"
              label="Paquete *"
              value={formData.package}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  package: e.target.value as "elite" | "vip",
                  packageAmount: e.target.value === "vip" ? 12000 : 10000,
                })
              }
              options={[
                { value: "elite", label: "Élite (₡10.000)" },
                { value: "vip", label: "VIP (₡12.000)" },
              ]}
            />

            <Select
              id="create-status"
              label="Estado *"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "pendiente" | "activo" | "inactivo",
                })
              }
              options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />
          </div>

          <div className="rounded-lg border border-grayscale-3 bg-grayscale-2/50 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/40">
            <label
              htmlFor="create-whatsappOptIn"
              className="flex items-center gap-2 cursor-pointer text-xs font-medium text-grayscale-12"
            >
              <input
                id="create-whatsappOptIn"
                type="checkbox"
                checked={formData.whatsappOptIn}
                onChange={(e) =>
                  setFormData({ ...formData, whatsappOptIn: e.target.checked })
                }
                className="size-4 text-accent rounded border-grayscale-4 focus:ring-accent"
              />
              <span>Desea recibir contenido exclusivo por WhatsApp</span>
            </label>
          </div>

          <div>
            <label
              htmlFor="create-notes"
              className="block text-xs font-mono font-semibold uppercase text-grayscale-10 mb-1"
            >
              Notas adicionales
            </label>
            <textarea
              id="create-notes"
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notas opcionales..."
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-xs text-grayscale-12 placeholder:text-grayscale-8 focus:border-accent focus:outline-none dark:border-grayscale-4 dark:bg-grayscale-3 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Aliado"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Editar Aliado"
      >
        <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                id="edit-fullName"
                label="Nombre Completo *"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Input
                id="edit-code"
                label="ID / Código"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="AL-XXXXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="edit-idCard"
              label="Cédula *"
              value={formData.idCard}
              onChange={(e) =>
                setFormData({ ...formData, idCard: e.target.value })
              }
              required
            />

            <Input
              id="edit-phone"
              label="Celular *"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>

          <Input
            id="edit-email"
            label="Correo Electrónico *"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              id="edit-package"
              label="Paquete *"
              value={formData.package}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  package: e.target.value as "elite" | "vip",
                  packageAmount: e.target.value === "vip" ? 12000 : 10000,
                })
              }
              options={[
                { value: "elite", label: "Élite (₡10.000)" },
                { value: "vip", label: "VIP (₡12.000)" },
              ]}
            />

            <Select
              id="edit-status"
              label="Estado *"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "pendiente" | "activo" | "inactivo",
                })
              }
              options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />
          </div>

          <div className="rounded-lg border border-grayscale-3 bg-grayscale-2/50 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/40">
            <label
              htmlFor="edit-whatsappOptIn"
              className="flex items-center gap-2 cursor-pointer text-xs font-medium text-grayscale-12"
            >
              <input
                id="edit-whatsappOptIn"
                type="checkbox"
                checked={formData.whatsappOptIn}
                onChange={(e) =>
                  setFormData({ ...formData, whatsappOptIn: e.target.checked })
                }
                className="size-4 text-accent rounded border-grayscale-4 focus:ring-accent"
              />
              <span>Desea recibir contenido exclusivo por WhatsApp</span>
            </label>
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="block text-xs font-mono font-semibold uppercase text-grayscale-10 mb-1"
            >
              Notas adicionales
            </label>
            <textarea
              id="edit-notes"
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-xs text-grayscale-12 placeholder:text-grayscale-8 focus:border-accent focus:outline-none dark:border-grayscale-4 dark:bg-grayscale-3 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Guardando..." : "Actualizar Aliado"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Eliminar Aliado"
        description={`¿Estás seguro de que deseas eliminar a "${selectedAlly?.fullName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}
