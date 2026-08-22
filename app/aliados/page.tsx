"use client";

import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  CurrencyDollarIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  HandshakeIcon,
  IdentificationCardIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  TagIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { CarnetModal } from "@/components/CarnetModal";
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
  status?: "pagado" | "no_pagado" | "pendiente" | "activo" | "inactivo";
  paymentStatus?: "pagado" | "no_pagado" | "pendiente" | "cancelado";
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
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function getWhatsAppLink(
  phone: string,
  fullName: string,
  pkg: string,
  code?: string,
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("506")
    ? cleanPhone
    : `506${cleanPhone}`;
  const codeInfo = code ? ` (ID: ${code})` : "";
  const message = `Hola ${fullName}${codeInfo}, te contactamos desde Producciones UMP respecto a tu membresía ${pkg.toUpperCase()}.`;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

export default function AliadosPage() {
  // 1. Data queries
  const rawAllies = useQuery(api.allies.getAll) ?? [];
  const benefits = useQuery(api.benefits.getBenefits) ?? [];
  const businesses = useQuery(api.benefits.getBusinesses) ?? [];
  const redemptions = useQuery(api.benefits.getRedemptions) ?? [];

  // Mutations
  const createAlly = useMutation(api.allies.create);
  const updateAlly = useMutation(api.allies.update);
  const removeAlly = useMutation(api.allies.remove);
  const generateToken = useMutation(api.allies.generateToken);

  const createBenefitMutation = useMutation(api.benefits.createBenefit);
  const updateBenefitMutation = useMutation(api.benefits.updateBenefit);
  const removeBenefitMutation = useMutation(api.benefits.removeBenefit);

  const createBusinessMutation = useMutation(api.benefits.createBusiness);
  const updateBusinessMutation = useMutation(api.benefits.updateBusiness);
  const removeBusinessMutation = useMutation(api.benefits.removeBusiness);

  const allies: AllyRecord[] = useMemo(() => {
    return rawAllies as AllyRecord[];
  }, [rawAllies]);

  // Filters & Search for Allies
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [whatsappFilter, setWhatsappFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Search for other tabs
  const [searchBenefit, setSearchBenefit] = useState("");
  const [searchBusiness, setSearchBusiness] = useState("");
  const [searchRedemption, setSearchRedemption] = useState("");

  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals for Allies
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [carnetModalOpen, setCarnetModalOpen] = useState(false);
  const [carnetAlly, setCarnetAlly] = useState<AllyRecord | null>(null);
  const [selectedAlly, setSelectedAlly] = useState<AllyRecord | null>(null);

  // Modals for Benefits
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [editingBenefitId, setEditingBenefitId] = useState<Id<"allyBenefits"> | null>(null);
  const [benefitToDeleteId, setBenefitToDeleteId] = useState<Id<"allyBenefits"> | null>(null);
  const [benefitForm, setBenefitForm] = useState<{
    businessId?: Id<"partnerBusinesses">;
    businessName: string;
    title: string;
    description: string;
    applicablePackage: "all" | "vip" | "elite";
    frequency: "monthly" | "once" | "unlimited";
    active: boolean;
  }>({
    businessName: "",
    title: "",
    description: "",
    applicablePackage: "all",
    frequency: "monthly",
    active: true,
  });

  // Modals for Businesses
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [editingBusinessId, setEditingBusinessId] = useState<Id<"partnerBusinesses"> | null>(null);
  const [businessToDeleteId, setBusinessToDeleteId] = useState<Id<"partnerBusinesses"> | null>(null);
  const [businessForm, setBusinessForm] = useState<{
    name: string;
    pin: string;
    category: string;
    status: "activo" | "inactivo";
  }>({
    name: "",
    pin: "",
    category: "",
    status: "activo",
  });

  // Form State for Ally Create/Edit
  const [formData, setFormData] = useState<{
    fullName: string;
    idCard: string;
    phone: string;
    email: string;
    whatsappOptIn: boolean;
    package: "elite" | "vip";
    packageAmount: number;
    status: "pagado" | "no_pagado";
    paymentStatus: "pagado" | "no_pagado";
    code: string;
    notes: string;
  }>({
    fullName: "",
    idCard: "",
    phone: "",
    email: "",
    whatsappOptIn: true,
    package: "elite",
    packageAmount: 10000,
    status: "no_pagado",
    paymentStatus: "no_pagado",
    code: "",
    notes: "",
  });

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Copy registration link
  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    setGeneratingLink(true);
    try {
      const res = await generateToken({});
      const link = `${window.location.origin}/aliados/public?token=${res.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Error al generar token:", err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyId = (code: string) => {
    if (typeof window === "undefined" || !code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Modals
  const openCarnetModal = (ally: AllyRecord) => {
    setCarnetAlly(ally);
    setCarnetModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      fullName: "",
      idCard: "",
      phone: "",
      email: "",
      whatsappOptIn: true,
      package: "elite",
      packageAmount: 10000,
      status: "no_pagado",
      paymentStatus: "no_pagado",
      code: "",
      notes: "",
    });
    setFormError("");
    setCreateModalOpen(true);
  };

  const openEditModal = (ally: AllyRecord) => {
    setSelectedAlly(ally);
    const isPaid = ally.status === "pagado" || ally.paymentStatus === "pagado";
    setFormData({
      fullName: ally.fullName,
      idCard: ally.idCard,
      phone: ally.phone,
      email: ally.email,
      whatsappOptIn: ally.whatsappOptIn,
      package: ally.package,
      packageAmount: ally.packageAmount,
      status: isPaid ? "pagado" : "no_pagado",
      paymentStatus: isPaid ? "pagado" : "no_pagado",
      code: ally.code || "",
      notes: ally.notes || "",
    });
    setFormError("");
    setEditModalOpen(true);
  };

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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlly) return;
    setFormError("");

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
    } catch (err: any) {
      setFormError(err?.message || "Error al actualizar el aliado.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlly = async () => {
    if (!selectedAlly) return;
    try {
      await removeAlly({ id: selectedAlly._id });
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Error al eliminar aliado:", err);
    }
  };

  // Benefit Handlers
  const openCreateBenefit = () => {
    setEditingBenefitId(null);
    setBenefitForm({
      businessName: businesses[0]?.name || "",
      businessId: businesses[0]?._id,
      title: "",
      description: "",
      applicablePackage: "all",
      frequency: "monthly",
      active: true,
    });
    setBenefitModalOpen(true);
  };

  const openEditBenefit = (b: any) => {
    setEditingBenefitId(b._id);
    setBenefitForm({
      businessId: b.businessId,
      businessName: b.businessName,
      title: b.title,
      description: b.description || "",
      applicablePackage: b.applicablePackage || "all",
      frequency: b.frequency || "monthly",
      active: b.active ?? true,
    });
    setBenefitModalOpen(true);
  };

  const handleSaveBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benefitForm.title.trim() || !benefitForm.businessName.trim()) return;

    try {
      if (editingBenefitId) {
        await updateBenefitMutation({
          id: editingBenefitId,
          businessId: benefitForm.businessId,
          businessName: benefitForm.businessName,
          title: benefitForm.title,
          description: benefitForm.description || undefined,
          applicablePackage: benefitForm.applicablePackage,
          frequency: benefitForm.frequency,
          active: benefitForm.active,
        });
      } else {
        await createBenefitMutation({
          businessId: benefitForm.businessId,
          businessName: benefitForm.businessName,
          title: benefitForm.title,
          description: benefitForm.description || undefined,
          applicablePackage: benefitForm.applicablePackage,
          frequency: benefitForm.frequency,
          active: benefitForm.active,
        });
      }
      setBenefitModalOpen(false);
    } catch (err) {
      console.error("Error al guardar beneficio:", err);
    }
  };

  const handleDeleteBenefit = async () => {
    if (!benefitToDeleteId) return;
    try {
      await removeBenefitMutation({ id: benefitToDeleteId });
      setBenefitToDeleteId(null);
    } catch (err) {
      console.error("Error al eliminar beneficio:", err);
    }
  };

  // Business Handlers
  const openCreateBusiness = () => {
    setEditingBusinessId(null);
    setBusinessForm({
      name: "",
      pin: "",
      category: "",
      status: "activo",
    });
    setBusinessModalOpen(true);
  };

  const openEditBusiness = (biz: any) => {
    setEditingBusinessId(biz._id);
    setBusinessForm({
      name: biz.name,
      pin: biz.pin,
      category: biz.category || "",
      status: biz.status || "activo",
    });
    setBusinessModalOpen(true);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessForm.name.trim() || !businessForm.pin.trim()) return;

    try {
      if (editingBusinessId) {
        await updateBusinessMutation({
          id: editingBusinessId,
          name: businessForm.name,
          pin: businessForm.pin,
          category: businessForm.category || undefined,
          status: businessForm.status,
        });
      } else {
        await createBusinessMutation({
          name: businessForm.name,
          pin: businessForm.pin,
          category: businessForm.category || undefined,
          status: businessForm.status,
        });
      }
      setBusinessModalOpen(false);
    } catch (err) {
      console.error("Error al guardar comercio:", err);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessToDeleteId) return;
    try {
      await removeBusinessMutation({ id: businessToDeleteId });
      setBusinessToDeleteId(null);
    } catch (err) {
      console.error("Error al eliminar comercio:", err);
    }
  };

  // Filtered Allies
  const filteredAllies = useMemo(() => {
    return allies.filter((ally) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = ally.fullName.toLowerCase().includes(q);
        const matchesCard = ally.idCard.toLowerCase().includes(q);
        const matchesPhone = ally.phone.toLowerCase().includes(q);
        const matchesEmail = ally.email.toLowerCase().includes(q);
        const matchesCode = ally.code?.toLowerCase().includes(q) || false;
        if (
          !matchesName &&
          !matchesCard &&
          !matchesPhone &&
          !matchesEmail &&
          !matchesCode
        ) {
          return false;
        }
      }
      if (packageFilter !== "all" && ally.package !== packageFilter) {
        return false;
      }
      if (whatsappFilter === "yes" && !ally.whatsappOptIn) return false;
      if (whatsappFilter === "no" && ally.whatsappOptIn) return false;
      if (statusFilter !== "all") {
        const isPaid =
          ally.status === "pagado" || ally.paymentStatus === "pagado";
        if (statusFilter === "pagado" && !isPaid) return false;
        if (statusFilter === "no_pagado" && isPaid) return false;
      }
      return true;
    });
  }, [allies, search, packageFilter, whatsappFilter, statusFilter]);

  // Filtered Benefits
  const filteredBenefits = useMemo(() => {
    if (!searchBenefit.trim()) return benefits;
    const q = searchBenefit.toLowerCase().trim();
    return benefits.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.businessName.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q),
    );
  }, [benefits, searchBenefit]);

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    if (!searchBusiness.trim()) return businesses;
    const q = searchBusiness.toLowerCase().trim();
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q),
    );
  }, [businesses, searchBusiness]);

  // Filtered Redemptions
  const filteredRedemptions = useMemo(() => {
    if (!searchRedemption.trim()) return redemptions;
    const q = searchRedemption.toLowerCase().trim();
    return redemptions.filter(
      (r) =>
        r.allyName.toLowerCase().includes(q) ||
        r.allyCode.toLowerCase().includes(q) ||
        r.benefitTitle.toLowerCase().includes(q) ||
        r.businessName.toLowerCase().includes(q),
    );
  }, [redemptions, searchRedemption]);

  // Stats calculation
  const totalRevenue = useMemo(() => {
    return allies
      .filter((a) => a.status === "pagado" || a.paymentStatus === "pagado")
      .reduce((acc, a) => acc + (a.packageAmount || 0), 0);
  }, [allies]);

  const vipCount = useMemo(() => {
    return allies.filter((a) => a.package === "vip").length;
  }, [allies]);

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* HEADER */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Comunidad de Aliados y Beneficios
          </h1>
          <p className="text-sm text-grayscale-10">
            Gestión de miembros afiliados, carnet digital, comercios y canje de
            descuentos.
          </p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Afiliados"
            value={allies.length}
            detail={`${vipCount} VIP · ${allies.length - vipCount} Élite`}
            icon={<UsersIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Recaudación Membresías"
            value={formatCurrency(totalRevenue)}
            detail="Ingresos por afiliaciones"
            icon={<CurrencyDollarIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="Comercios Asociados"
            value={businesses.length}
            detail={`${benefits.filter((b) => b.active).length} beneficios activos`}
            icon={<StorefrontIcon size={18} weight="fill" />}
            index={2}
          />
          <StatCard
            label="Canjes Realizados"
            value={redemptions.length}
            detail="Descuentos aplicados en locales"
            icon={<TagIcon size={18} weight="fill" />}
            index={3}
          />
        </div>

        {/* MAIN TABS ROOT */}
        <Tabs.Root defaultValue="allies" className="w-full flex flex-col">
          {/* TAB BAR & GLOBAL ACTIONS */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              <Tabs.Tab
                value="allies"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Afiliados ({allies.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="benefits"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Beneficios y Descuentos ({benefits.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="businesses"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Comercios Asociados ({businesses.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="redemptions"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Historial de Canjes ({redemptions.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="text-xs font-mono font-bold"
                onClick={handleCopyLink}
                disabled={generatingLink}
              >
                {copiedLink ? (
                  <>
                    <CheckIcon size={14} weight="bold" />
                    <span>Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} weight="bold" />
                    <span>Copiar link registro</span>
                  </>
                )}
              </Button>

              <Button
                variant="primary"
                className="text-xs font-mono font-bold"
                onClick={openCreateModal}
              >
                <PlusIcon size={14} weight="bold" />
                <span>Nuevo afiliado</span>
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: AFILIADOS */}
          {/* ========================================================================= */}
          <Tabs.Panel value="allies" className="mt-4 flex flex-col gap-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <MagnifyingGlassIcon
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none"
                />
                <input
                  type="text"
                  id="search-ally"
                  placeholder="Buscar por nombre, cédula, celular, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 pl-8 pr-3 font-mono text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all focus:border-grayscale-12 dark:border-grayscale-4 dark:bg-grayscale-3"
                />
              </div>

              {/* Filter selects */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Paquete:
                  </span>
                  <select
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                    className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 font-mono text-xs font-semibold text-grayscale-12 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                  >
                    <option value="all">Todos</option>
                    <option value="vip">VIP (₡12.000)</option>
                    <option value="elite">Élite (₡10.000)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9 select-none">
                    Estado:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-1.5 font-mono text-xs font-semibold text-grayscale-12 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                  >
                    <option value="all">Todos</option>
                    <option value="pagado">Pagados</option>
                    <option value="no_pagado">Pendientes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredAllies.length === 0 ? (
              <EmptyState
                icon={<UsersIcon size={32} />}
                title="No se encontraron afiliados"
                description="No hay miembros que coincidan con los filtros aplicados o aún no se han registrado."
                action={
                  <Button variant="primary" onClick={openCreateModal}>
                    Registrar primer afiliado
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 overflow-hidden dark:border-grayscale-4 shadow-xs">
                <DataTable
                  data={filteredAllies}
                  keyExtractor={(a) => a._id}
                  columns={[
                    {
                      key: "code",
                      header: "ID Oficial",
                      className: "w-28",
                      render: (a) => (
                        <button
                          type="button"
                          onClick={() => a.code && handleCopyId(a.code)}
                          className="font-mono text-xs font-bold text-grayscale-12 hover:underline cursor-pointer flex items-center gap-1"
                          title="Copiar ID"
                        >
                          <span>#{a.code || "AL-000000"}</span>
                          {copiedId === a.code ? (
                            <CheckIcon size={12} className="text-emerald-500" />
                          ) : null}
                        </button>
                      ),
                    },
                    {
                      key: "fullName",
                      header: "Nombre y Documento",
                      render: (a) => (
                        <div>
                          <p className="font-semibold text-sm text-grayscale-12">
                            {a.fullName}
                          </p>
                          <p className="font-mono text-xs text-grayscale-10">
                            Cédula: {a.idCard}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "package",
                      header: "Membresía",
                      render: (a) => (
                        <div>
                          {a.package === "vip" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25 shadow-2xs">
                              <CrownIcon
                                size={13}
                                weight="fill"
                                className="text-amber-500"
                              />
                              <span>VIP</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider bg-grayscale-3 text-grayscale-12 border border-grayscale-4 dark:bg-grayscale-3/70 dark:text-grayscale-12 dark:border-grayscale-4 shadow-2xs">
                              <ShieldCheckIcon
                                size={13}
                                className="text-grayscale-11"
                              />
                              <span>Élite</span>
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "contact",
                      header: "Contacto",
                      className: "hidden md:table-cell",
                      render: (a) => (
                        <div className="flex items-center gap-2">
                          <a
                            href={getWhatsAppLink(
                              a.phone,
                              a.fullName,
                              a.package,
                              a.code,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-grayscale-11 hover:text-emerald-600 flex items-center gap-1"
                          >
                            <PhoneIcon size={12} />
                            <span>{a.phone}</span>
                          </a>
                          <span className="text-grayscale-6 text-xs">•</span>
                          <span className="text-xs text-grayscale-10 truncate max-w-[140px]">
                            {a.email}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "status",
                      header: "Pago",
                      render: (a) => {
                        const isPaid =
                          a.status === "pagado" || a.paymentStatus === "pagado";
                        return isPaid ? (
                          <Badge variant="green">Pagado</Badge>
                        ) : (
                          <Badge variant="orange">Pendiente</Badge>
                        );
                      },
                    },
                    {
                      key: "createdAt",
                      header: "Fecha",
                      className: "hidden lg:table-cell w-24",
                      render: (a) => (
                        <span className="font-mono text-xs text-grayscale-10">
                          {formatDate(a.createdAt)}
                        </span>
                      ),
                    },
                    {
                      key: "actions",
                      header: "",
                      className: "w-28 text-right",
                      render: (a) => (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openCarnetModal(a)}
                            className="p-1.5 text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 rounded-lg transition-colors cursor-pointer"
                            title="Ver Carnet"
                          >
                            <IdentificationCardIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            className="p-1.5 text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <PencilSimpleIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAlly(a);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-grayscale-10 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Tabs.Panel>

          {/* ========================================================================= */}
          {/* TAB 2: BENEFICIOS Y DESCUENTOS */}
          {/* ========================================================================= */}
          <Tabs.Panel value="benefits" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Input
                  id="search-benefit"
                  placeholder="Buscar beneficio o comercio..."
                  value={searchBenefit}
                  onChange={(e) => setSearchBenefit(e.target.value)}
                  className="pl-8 text-xs font-mono"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none">
                  <MagnifyingGlassIcon size={14} />
                </div>
              </div>

              <Button
                variant="primary"
                className="text-xs font-mono font-bold"
                onClick={openCreateBenefit}
              >
                <PlusIcon size={14} weight="bold" />
                <span>Nuevo beneficio</span>
              </Button>
            </div>

            {filteredBenefits.length === 0 ? (
              <EmptyState
                icon={<TagIcon size={32} />}
                title="No hay beneficios registrados"
                description="Agrega los descuentos aplicables para los miembros en los comercios aliados."
                action={
                  <Button variant="primary" onClick={openCreateBenefit}>
                    Crear primer beneficio
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 overflow-hidden dark:border-grayscale-4 shadow-xs">
                <DataTable
                  data={filteredBenefits}
                  keyExtractor={(b) => b._id}
                  columns={[
                    {
                      key: "title",
                      header: "Beneficio",
                      render: (b) => (
                        <div>
                          <p className="font-semibold text-sm text-grayscale-12">
                            {b.title}
                          </p>
                          {b.description && (
                            <p className="text-xs text-grayscale-10 line-clamp-1">
                              {b.description}
                            </p>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "businessName",
                      header: "Comercio",
                      render: (b) => (
                        <div className="flex items-center gap-1.5">
                          <StorefrontIcon size={14} className="text-grayscale-10" />
                          <span className="font-mono text-xs font-bold text-grayscale-12">
                            {b.businessName}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "applicablePackage",
                      header: "Aplica para",
                      render: (b) => (
                        <div>
                          {b.applicablePackage === "vip" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25">
                              <CrownIcon
                                size={11}
                                weight="fill"
                                className="text-amber-500"
                              />
                              <span>Solo VIP</span>
                            </span>
                          ) : b.applicablePackage === "elite" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-grayscale-3 text-grayscale-11 border border-grayscale-4 dark:bg-grayscale-3/60 dark:text-grayscale-12 dark:border-grayscale-4">
                              <ShieldCheckIcon
                                size={11}
                                className="text-grayscale-10"
                              />
                              <span>Solo Élite</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <span>Todos</span>
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "frequency",
                      header: "Frecuencia",
                      render: (b) => (
                        <span className="font-mono text-xs text-grayscale-11">
                          {b.frequency === "monthly"
                            ? "1 vez al mes"
                            : b.frequency === "once"
                              ? "Uso único"
                              : "Ilimitado por visita"}
                        </span>
                      ),
                    },
                    {
                      key: "active",
                      header: "Estado",
                      render: (b) => (
                        <Badge variant={b.active ? "green" : "gray"}>
                          {b.active ? "Activo" : "Pausado"}
                        </Badge>
                      ),
                    },
                    {
                      key: "actions",
                      header: "",
                      className: "w-24 text-right",
                      render: (b) => (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBenefit(b)}
                            className="p-1.5 text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <PencilSimpleIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBenefitToDeleteId(b._id)}
                            className="p-1.5 text-grayscale-10 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Tabs.Panel>

          {/* ========================================================================= */}
          {/* TAB 3: COMERCIOS ASOCIADOS */}
          {/* ========================================================================= */}
          <Tabs.Panel value="businesses" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Input
                  id="search-biz"
                  placeholder="Buscar comercio o categoría..."
                  value={searchBusiness}
                  onChange={(e) => setSearchBusiness(e.target.value)}
                  className="pl-8 text-xs font-mono"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none">
                  <MagnifyingGlassIcon size={14} />
                </div>
              </div>

              <Button
                variant="primary"
                className="text-xs font-mono font-bold"
                onClick={openCreateBusiness}
              >
                <PlusIcon size={14} weight="bold" />
                <span>Nuevo comercio</span>
              </Button>
            </div>

            {filteredBusinesses.length === 0 ? (
              <EmptyState
                icon={<StorefrontIcon size={32} />}
                title="No hay comercios asociados"
                description="Registra los establecimientos participantes y asígnales su PIN de 4 dígitos para autorizar canjes."
                action={
                  <Button variant="primary" onClick={openCreateBusiness}>
                    Registrar primer comercio
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 overflow-hidden dark:border-grayscale-4 shadow-xs">
                <DataTable
                  data={filteredBusinesses}
                  keyExtractor={(b) => b._id}
                  columns={[
                    {
                      key: "name",
                      header: "Comercio",
                      render: (b) => (
                        <div>
                          <p className="font-semibold text-sm text-grayscale-12">
                            {b.name}
                          </p>
                          <p className="font-mono text-xs text-grayscale-10">
                            {b.category || "General"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "pin",
                      header: "PIN de Caja",
                      render: (b) => (
                        <div className="flex items-center gap-1.5">
                          <KeyIcon size={14} className="text-grayscale-10" />
                          <span className="font-mono font-bold text-xs bg-grayscale-2 dark:bg-grayscale-3 px-2 py-1 rounded border border-grayscale-4">
                            {b.pin}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "status",
                      header: "Estado",
                      render: (b) => (
                        <Badge variant={b.status === "inactivo" ? "gray" : "green"}>
                          {b.status === "inactivo" ? "Inactivo" : "Activo"}
                        </Badge>
                      ),
                    },
                    {
                      key: "createdAt",
                      header: "Registrado",
                      className: "hidden sm:table-cell w-28",
                      render: (b) => (
                        <span className="font-mono text-xs text-grayscale-10">
                          {formatDate(b.createdAt)}
                        </span>
                      ),
                    },
                    {
                      key: "actions",
                      header: "",
                      className: "w-24 text-right",
                      render: (b) => (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBusiness(b)}
                            className="p-1.5 text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <PencilSimpleIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setBusinessToDeleteId(b._id)}
                            className="p-1.5 text-grayscale-10 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Tabs.Panel>

          {/* ========================================================================= */}
          {/* TAB 4: HISTORIAL DE CANJES */}
          {/* ========================================================================= */}
          <Tabs.Panel value="redemptions" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Input
                  id="search-redemption"
                  placeholder="Buscar por afiliado, beneficio o comercio..."
                  value={searchRedemption}
                  onChange={(e) => setSearchRedemption(e.target.value)}
                  className="pl-8 text-xs font-mono"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none">
                  <MagnifyingGlassIcon size={14} />
                </div>
              </div>

              <span className="font-mono text-xs text-grayscale-10">
                Total de canjes auditados: {redemptions.length}
              </span>
            </div>

            {filteredRedemptions.length === 0 ? (
              <EmptyState
                icon={<TagIcon size={32} />}
                title="Sin canjes registrados"
                description="Aquí aparecerá el historial en tiempo real cada vez que un comercio aplique un beneficio a un afiliado."
              />
            ) : (
              <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 overflow-hidden dark:border-grayscale-4 shadow-xs">
                <DataTable
                  data={filteredRedemptions}
                  keyExtractor={(r) => r._id}
                  columns={[
                    {
                      key: "redeemedAt",
                      header: "Fecha y Hora",
                      className: "w-36",
                      render: (r) => (
                        <span className="font-mono text-xs font-bold text-grayscale-12">
                          {formatDateTime(r.redeemedAt)}
                        </span>
                      ),
                    },
                    {
                      key: "allyName",
                      header: "Afiliado",
                      render: (r) => (
                        <div>
                          <p className="font-semibold text-sm text-grayscale-12">
                            {r.allyName}
                          </p>
                          <p className="font-mono text-xs text-grayscale-10">
                            #{r.allyCode}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "benefitTitle",
                      header: "Beneficio Canjeado",
                      render: (r) => (
                        <span className="font-semibold text-sm text-grayscale-12">
                          {r.benefitTitle}
                        </span>
                      ),
                    },
                    {
                      key: "businessName",
                      header: "Comercio",
                      render: (r) => (
                        <div className="flex items-center gap-1.5">
                          <StorefrontIcon size={14} className="text-grayscale-10" />
                          <span className="font-mono text-xs text-grayscale-11">
                            {r.businessName}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "period",
                      header: "Periodo",
                      className: "w-24 text-right font-mono text-xs text-grayscale-10",
                      render: (r) => r.period,
                    },
                  ]}
                />
              </div>
            )}
          </Tabs.Panel>
        </Tabs.Root>

        {/* MODALS */}
        {/* Create Ally Modal */}
        <Modal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          title="Nuevo Afiliado"
        >
          <form onSubmit={handleSaveCreate} className="flex flex-col gap-4">
            {formError && (
              <p className="text-xs font-mono text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo"
                id="ally-name"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Ej: Daniel Castillo"
              />
              <Input
                label="Cédula / Documento"
                id="ally-idcard"
                required
                value={formData.idCard}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, idCard: e.target.value }))
                }
                placeholder="Ej: 1-1234-0567"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Celular / WhatsApp"
                id="ally-phone"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="Ej: 8888-8888"
              />
              <Input
                label="Correo electrónico"
                id="ally-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Paquete"
                value={formData.package}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    package: e.target.value as "vip" | "elite",
                  }))
                }
                options={[
                  { value: "vip", label: "VIP — ₡12.000" },
                  { value: "elite", label: "Élite — ₡10.000" },
                ]}
              />
              <Select
                label="Estado de Pago"
                value={formData.status}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    status: e.target.value as "pagado" | "no_pagado",
                    paymentStatus: e.target.value as "pagado" | "no_pagado",
                  }))
                }
                options={[
                  { value: "no_pagado", label: "Pendiente de pago" },
                  { value: "pagado", label: "Pagado y activo" },
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Guardando..." : "Crear afiliado"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Ally Modal */}
        <Modal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          title="Editar Afiliado"
        >
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
            {formError && (
              <p className="text-xs font-mono text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo"
                id="edit-ally-name"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, fullName: e.target.value }))
                }
              />
              <Input
                label="Cédula / Documento"
                id="edit-ally-idcard"
                required
                value={formData.idCard}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, idCard: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Celular / WhatsApp"
                id="edit-ally-phone"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, phone: e.target.value }))
                }
              />
              <Input
                label="Correo electrónico"
                id="edit-ally-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Paquete"
                value={formData.package}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    package: e.target.value as "vip" | "elite",
                  }))
                }
                options={[
                  { value: "vip", label: "VIP — ₡12.000" },
                  { value: "elite", label: "Élite — ₡10.000" },
                ]}
              />
              <Select
                label="Estado de Pago"
                value={formData.status}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    status: e.target.value as "pagado" | "no_pagado",
                    paymentStatus: e.target.value as "pagado" | "no_pagado",
                  }))
                }
                options={[
                  { value: "pagado", label: "Pagado y activo" },
                  { value: "no_pagado", label: "Pendiente de pago" },
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Ally Modal */}
        <ConfirmModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          title="Eliminar Afiliado"
          description={`¿Estás seguro de que deseas eliminar a ${selectedAlly?.fullName}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          onConfirm={handleDeleteAlly}
        />

        {/* Carnet Modal */}
        <CarnetModal
          open={carnetModalOpen}
          onOpenChange={setCarnetModalOpen}
          ally={carnetAlly}
        />

        {/* Create/Edit Benefit Modal */}
        <Modal
          open={benefitModalOpen}
          onOpenChange={setBenefitModalOpen}
          title={editingBenefitId ? "Editar Beneficio" : "Nuevo Beneficio"}
        >
          <form onSubmit={handleSaveBenefit} className="flex flex-col gap-4">
            <Input
              label="Título del Descuento / Beneficio"
              id="benefit-title"
              required
              placeholder="Ej: 20% de descuento en consumo general"
              value={benefitForm.title}
              onChange={(e) =>
                setBenefitForm((f) => ({ ...f, title: e.target.value }))
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9 mb-1 block">
                  Comercio Asociado
                </label>
                {businesses.length > 0 ? (
                  <select
                    value={benefitForm.businessName}
                    onChange={(e) => {
                      const selected = businesses.find(
                        (biz) => biz.name === e.target.value,
                      );
                      setBenefitForm((f) => ({
                        ...f,
                        businessName: e.target.value,
                        businessId: selected?._id,
                      }));
                    }}
                    className="w-full bg-grayscale-1 border border-grayscale-4 rounded-xl px-3 py-2 text-xs font-mono text-grayscale-12 dark:bg-grayscale-3"
                  >
                    {businesses.map((biz) => (
                      <option key={biz._id} value={biz.name}>
                        {biz.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="benefit-bizname"
                    required
                    placeholder="Nombre del local"
                    value={benefitForm.businessName}
                    onChange={(e) =>
                      setBenefitForm((f) => ({
                        ...f,
                        businessName: e.target.value,
                      }))
                    }
                  />
                )}
              </div>

              <Select
                label="Membresías Aplicables"
                value={benefitForm.applicablePackage}
                onChange={(e) =>
                  setBenefitForm((f) => ({
                    ...f,
                    applicablePackage: e.target.value as
                      | "all"
                      | "vip"
                      | "elite",
                  }))
                }
                options={[
                  { value: "all", label: "Todos los Afiliados" },
                  { value: "vip", label: "Solo VIP" },
                  { value: "elite", label: "Solo Élite" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Frecuencia de Canje"
                value={benefitForm.frequency}
                onChange={(e) =>
                  setBenefitForm((f) => ({
                    ...f,
                    frequency: e.target.value as
                      | "monthly"
                      | "once"
                      | "unlimited",
                  }))
                }
                options={[
                  { value: "monthly", label: "1 vez por mes de membresía" },
                  { value: "once", label: "1 solo canje por afiliado" },
                  { value: "unlimited", label: "Ilimitado en cada visita" },
                ]}
              />

              <Select
                label="Estado"
                value={benefitForm.active ? "active" : "inactive"}
                onChange={(e) =>
                  setBenefitForm((f) => ({
                    ...f,
                    active: e.target.value === "active",
                  }))
                }
                options={[
                  { value: "active", label: "Activo (Disponible)" },
                  { value: "inactive", label: "Pausado (No disponible)" },
                ]}
              />
            </div>

            <Input
              label="Términos y condiciones (opcional)"
              id="benefit-desc"
              placeholder="Ej: No aplica con otras promociones. Válido de lunes a jueves."
              value={benefitForm.description}
              onChange={(e) =>
                setBenefitForm((f) => ({ ...f, description: e.target.value }))
              }
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBenefitModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Guardar beneficio
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Benefit Confirm */}
        <ConfirmModal
          open={Boolean(benefitToDeleteId)}
          onOpenChange={(o) => !o && setBenefitToDeleteId(null)}
          title="Eliminar Beneficio"
          description="¿Estás seguro de eliminar este beneficio? No se borrarán los canjes ya registrados."
          confirmText="Eliminar"
          variant="danger"
          onConfirm={handleDeleteBenefit}
        />

        {/* Create/Edit Business Modal */}
        <Modal
          open={businessModalOpen}
          onOpenChange={setBusinessModalOpen}
          title={editingBusinessId ? "Editar Comercio" : "Nuevo Comercio Asociado"}
        >
          <form onSubmit={handleSaveBusiness} className="flex flex-col gap-4">
            <Input
              label="Nombre Comercial"
              id="biz-name"
              required
              placeholder="Ej: Café y Bistro Central"
              value={businessForm.name}
              onChange={(e) =>
                setBusinessForm((f) => ({ ...f, name: e.target.value }))
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Categoría"
                id="biz-cat"
                placeholder="Ej: Restaurante, Cine, Tienda"
                value={businessForm.category}
                onChange={(e) =>
                  setBusinessForm((f) => ({ ...f, category: e.target.value }))
                }
              />

              <Input
                label="PIN de Caja (4 dígitos)"
                id="biz-pin"
                required
                maxLength={8}
                placeholder="Ej: 4821"
                value={businessForm.pin}
                onChange={(e) =>
                  setBusinessForm((f) => ({ ...f, pin: e.target.value }))
                }
              />
            </div>

            <Select
              label="Estado"
              value={businessForm.status}
              onChange={(e) =>
                setBusinessForm((f) => ({
                  ...f,
                  status: e.target.value as "activo" | "inactivo",
                }))
              }
              options={[
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBusinessModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Guardar comercio
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Business Confirm */}
        <ConfirmModal
          open={Boolean(businessToDeleteId)}
          onOpenChange={(o) => !o && setBusinessToDeleteId(null)}
          title="Eliminar Comercio"
          description="¿Estás seguro de eliminar este comercio asociado?"
          confirmText="Eliminar"
          variant="danger"
          onConfirm={handleDeleteBusiness}
        />
      </div>
    </PageContainer>
  );
}
