"use client";

import {
  AddressBookIcon,
  ArrowsLeftRightIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  HouseLineIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ReceiptIcon,
  ShareNetworkIcon,
  TrashIcon,
  UserPlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import ClientSocialMediaModal from "@/components/clients/ClientSocialMediaModal";
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

function getWhatsAppLink(phone: string): string {
  if (!phone) return "#";
  let cleanNumber = phone.replace(/[^\d]/g, "");
  if (cleanNumber.length === 8) {
    cleanNumber = `506${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}`;
}

const EMPTY_CLIENT = {
  name: "",
  company: "",
  address: "",
  phone: "",
  email: "",
  type: "activo" as "activo" | "potencial",
  lastInteraction: new Date().toISOString().slice(0, 10),
  projectCount: 0,
  notes: "",
};

const EMPTY_INITIAL_SERVICE = {
  serviceName: "",
  amount: 0,
  paymentStatus: "pendiente" as "pagado" | "pendiente" | "parcial" | "sin_pago",
};

const EMPTY_SERVICE = {
  serviceName: "",
  amount: 0,
  paymentStatus: "pendiente" as "pagado" | "pendiente" | "parcial" | "sin_pago",
  contractDate: new Date().toISOString().slice(0, 10),
};

const EMPTY_PAYMENT = {
  serviceId: "",
  concept: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  status: "paid" as "paid" | "pending",
};

export default function ClientesPage() {
  const clients = useQuery(api.clients.get) ?? [];
  const allServices = useQuery(api.clientServices.listAll) ?? [];
  const allPayments = useQuery(api.clientPayments.listAll) ?? [];

  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const updateClientType = useMutation(api.clients.updateType);
  const removeClient = useMutation(api.clients.remove);

  const createService = useMutation(api.clientServices.create);
  const removeService = useMutation(api.clientServices.remove);

  const createPayment = useMutation(api.clientPayments.createPayment);
  const removePayment = useMutation(api.clientPayments.removePayment);

  // Clear selection and active element focus on ESC key press
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // States
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [initialService, setInitialService] = useState(EMPTY_INITIAL_SERVICE);

  // Management Modal (Services & Payments for a client)
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [modalDefaultTab, setModalDefaultTab] = useState<
    "services" | "payments"
  >("services");

  // Sub-forms inside Manage Modal
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  // Social Media & Credentials Vault Modal State
  const [socialMediaModalOpen, setSocialMediaModalOpen] = useState(false);
  const [socialMediaClient, setSocialMediaClient] = useState<any | null>(null);
  const [socialMediaDefaultTab, setSocialMediaDefaultTab] = useState<
    "overview" | "credentials" | "calendar" | "report"
  >("overview");
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

  function openSocialMediaModal(
    c: any,
    tab: "overview" | "credentials" | "calendar" | "report" = "overview",
  ) {
    setSocialMediaClient(c);
    setSocialMediaDefaultTab(tab);
    setSocialMediaModalOpen(true);
  }

  // Separate active vs potential clients
  const activeClients = useMemo(
    () => clients.filter((c: any) => (c.type ?? "activo") === "activo"),
    [clients],
  );
  const potentialClients = useMemo(
    () => clients.filter((c: any) => c.type === "potencial"),
    [clients],
  );

  // Filtered lists by search
  const filteredActive = useMemo(() => {
    const s = search.toLowerCase();
    return activeClients.filter(
      (c: any) =>
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        (c.address && c.address.toLowerCase().includes(s)),
    );
  }, [activeClients, search]);

  const filteredPotential = useMemo(() => {
    const s = search.toLowerCase();
    return potentialClients.filter(
      (c: any) =>
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        (c.address && c.address.toLowerCase().includes(s)),
    );
  }, [potentialClients, search]);

  const totalProjects = useMemo(() => {
    return allServices.length > 0
      ? allServices.length
      : clients.reduce((s: number, c: any) => s + (c.projectCount || 0), 0);
  }, [allServices, clients]);

  // Handlers for Client Modal
  function openCreate(defaultType: "activo" | "potencial" = "activo") {
    setEditingId(null);
    setForm({ ...EMPTY_CLIENT, type: defaultType });
    setInitialService(EMPTY_INITIAL_SERVICE);
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c._id);
    setForm({
      name: c.name,
      company: c.company,
      address: c.address || "",
      phone: c.phone,
      email: c.email,
      type: c.type || "activo",
      lastInteraction:
        c.lastInteraction || new Date().toISOString().slice(0, 10),
      projectCount: c.projectCount || 0,
      notes: c.notes || "",
    });
    setInitialService(EMPTY_INITIAL_SERVICE);
    setModalOpen(true);
  }

  async function handleSaveClient() {
    if (!form.name.trim()) return;

    if (editingId) {
      await updateClient({
        id: editingId as any,
        ...form,
      });
    } else {
      const newClientId = await createClient(form);
      if (initialService.serviceName.trim() && newClientId) {
        await createService({
          clientId: newClientId,
          serviceName: initialService.serviceName.trim(),
          amount: Number(initialService.amount) || 0,
          paymentStatus: initialService.paymentStatus,
          contractDate:
            form.lastInteraction || new Date().toISOString().slice(0, 10),
        });
      }
    }
    setModalOpen(false);
  }

  function handleDeleteClient(id: string) {
    setClientToDeleteId(id);
  }

  function handleToggleType(c: any) {
    const newType = (c.type ?? "activo") === "activo" ? "potencial" : "activo";
    updateClientType({
      id: c._id,
      type: newType,
    });
  }

  // Handlers for Manage Services & Payments
  function openManageModal(
    c: any,
    initialTab: "services" | "payments" = "services",
  ) {
    setSelectedClient(c);
    setServiceForm(EMPTY_SERVICE);
    setPaymentForm(EMPTY_PAYMENT);
    setModalDefaultTab(initialTab);
    setManageModalOpen(true);
  }

  function handleAddService() {
    if (!selectedClient || !serviceForm.serviceName.trim()) return;
    createService({
      clientId: selectedClient._id,
      serviceName: serviceForm.serviceName.trim(),
      amount: Number(serviceForm.amount) || 0,
      paymentStatus: serviceForm.paymentStatus,
      contractDate: serviceForm.contractDate,
    });
    setServiceForm(EMPTY_SERVICE);
  }

  function handleDeleteService(id: string) {
    removeService({ id: id as any });
  }

  function handleAddPayment() {
    if (!selectedClient || !paymentForm.amount || paymentForm.amount <= 0)
      return;
    createPayment({
      clientId: selectedClient._id,
      serviceId: paymentForm.serviceId
        ? (paymentForm.serviceId as any)
        : undefined,
      amount: Number(paymentForm.amount),
      date: paymentForm.date,
      concept: paymentForm.concept.trim() || `Pago de ${selectedClient.name}`,
      status: paymentForm.status,
    });
    setPaymentForm(EMPTY_PAYMENT);
  }

  function handleDeletePayment(id: string) {
    removePayment({ id: id as any });
  }

  function handlePrepareServicePayment(s: any) {
    setPaymentForm({
      serviceId: s._id,
      concept: `Abono servicio - ${s.serviceName}`,
      amount: Math.max(0, s.amount - getServiceTotalPaid(s._id)),
      date: new Date().toISOString().slice(0, 10),
      status: "paid",
    });
    setModalDefaultTab("payments");
  }

  // Services and Payments for selected client
  const clientServices = useMemo(() => {
    if (!selectedClient) return [];
    return allServices.filter((s: any) => s.clientId === selectedClient._id);
  }, [allServices, selectedClient]);

  const clientPayments = useMemo(() => {
    if (!selectedClient) return [];
    return allPayments.filter((p: any) => p.clientId === selectedClient._id);
  }, [allPayments, selectedClient]);

  // Financial calculations for selected client
  function getServiceTotalPaid(serviceId: string): number {
    return allPayments
      .filter((p: any) => p.serviceId === serviceId && p.status === "paid")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  const clientTotalContracted = useMemo(() => {
    return clientServices.reduce(
      (sum: number, s: any) => sum + (s.amount || 0),
      0,
    );
  }, [clientServices]);

  const clientTotalPaid = useMemo(() => {
    return clientPayments
      .filter((p: any) => p.status === "paid")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [clientPayments]);

  const clientTotalBalance = useMemo(() => {
    return Math.max(0, clientTotalContracted - clientTotalPaid);
  }, [clientTotalContracted, clientTotalPaid]);

  // Helper to compute client payment status badge
  function renderClientPaymentStatus(clientId: string) {
    const services = allServices.filter((s: any) => s.clientId === clientId);
    const payments = allPayments.filter((p: any) => p.clientId === clientId);

    if (services.length === 0 && payments.length === 0) {
      return <Badge variant="gray">Sin servicios</Badge>;
    }

    const hasPendingService = services.some(
      (s: any) => s.paymentStatus !== "pagado",
    );
    const hasPendingPayment = payments.some((p: any) => p.status === "pending");

    if (
      !hasPendingService &&
      !hasPendingPayment &&
      (services.length > 0 || payments.length > 0)
    ) {
      return <Badge variant="green">Al día</Badge>;
    }

    return <Badge variant="orange">Pendiente</Badge>;
  }

  // Columns definition for DataTable
  const getColumns = (type: "activo" | "potencial"): Column<any>[] => [
    {
      key: "name",
      header: "Cliente / empresa",
      render: (c) => (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-grayscale-12 truncate">
              {c.name}
            </span>
            <Badge variant={c.type === "potencial" ? "accent" : "gray"}>
              {c.type === "potencial" ? "Potencial" : "Activo"}
            </Badge>
          </div>
          <span className="text-xs text-grayscale-9 font-medium">
            {c.company}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto y dirección",
      className: "hidden sm:table-cell",
      render: (c) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-grayscale-11 font-mono">{c.email}</span>
          {c.phone ? (
            <a
              href={getWhatsAppLink(c.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-grayscale-9 hover:text-green-11 hover:underline transition-colors font-mono"
              title="Abrir chat de WhatsApp"
            >
              {c.phone}
            </a>
          ) : (
            <span className="text-grayscale-8">Sin teléfono</span>
          )}
          {c.address && (
            <div className="flex items-center gap-1 text-[11px] text-grayscale-8 mt-0.5">
              <HouseLineIcon size={12} className="shrink-0" />
              <span className="truncate max-w-[180px]">{c.address}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "services",
      header: "Servicios contratados",
      className: "hidden md:table-cell",
      render: (c) => {
        const services = allServices.filter((s: any) => s.clientId === c._id);
        const count =
          services.length > 0 ? services.length : c.projectCount || 0;
        const totalValue = services.reduce(
          (acc: number, s: any) => acc + s.amount,
          0,
        );

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-grayscale-11">
              <BriefcaseIcon size={14} className="text-grayscale-8" />
              <span className="font-medium">
                {count} {count === 1 ? "servicio" : "servicios"}
              </span>
            </div>
            {totalValue > 0 && (
              <span className="text-[11px] text-accent-10 font-mono font-semibold">
                {formatCurrency(totalValue)}
              </span>
            )}
            <button
              type="button"
              onClick={() => openManageModal(c, "services")}
              className="text-[11px] text-accent-10 font-medium hover:underline flex items-center gap-1 mt-0.5 text-left cursor-pointer"
            >
              <PlusIcon size={12} weight="bold" />
              Agregar servicio
            </button>
          </div>
        );
      },
    },
    {
      key: "paymentStatus",
      header: "Estado de pago",
      className: "hidden md:table-cell",
      render: (c) => renderClientPaymentStatus(c._id),
    },
    {
      key: "lastInteraction",
      header: "Primera interacción",
      className: "hidden lg:table-cell",
      render: (c) => (
        <span className="text-xs text-grayscale-10 font-mono">
          {formatDate(c.lastInteraction)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="Social Media, Contraseñas y Reporte PDF"
            onClick={() => openSocialMediaModal(c, "overview")}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-accent-10 transition-colors hover:bg-accent-3 hover:text-accent-11"
          >
            <ShareNetworkIcon size={16} />
          </button>
          <button
            type="button"
            title="Gestionar servicios y pagos"
            onClick={() => openManageModal(c, "services")}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <ReceiptIcon size={16} />
          </button>
          <button
            type="button"
            title={
              c.type === "potencial"
                ? "Mover a cliente activo"
                : "Mover a potencial"
            }
            onClick={() => handleToggleType(c)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
          >
            <ArrowsLeftRightIcon size={15} />
          </button>
          <button
            type="button"
            title="Editar cliente"
            onClick={() => openEdit(c)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            title="Eliminar cliente"
            onClick={() => handleDeleteClient(c._id)}
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
            Directorio de clientes
          </h1>
          <p className="text-sm text-grayscale-10">
            Administra clientes activos, potenciales clientes, sus servicios
            contratados y registro de pagos sincronizado con finanzas.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Clientes activos"
            value={activeClients.length}
            detail="Clientes confirmados"
            icon={<AddressBookIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Potenciales clientes"
            value={potentialClients.length}
            detail="Oportunidades en prospección"
            icon={<UserPlusIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="Servicios contratados"
            value={totalProjects}
            detail="Total de proyectos / servicios"
            icon={<BriefcaseIcon size={18} weight="fill" />}
            index={2}
          />
        </div>

        {/* Tabs System (Igual a la estructura de Personal) */}
        <Tabs.Root
          defaultValue="activos"
          className="w-full flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              <Tabs.Tab
                value="activos"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Clientes ({activeClients.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="potenciales"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Potenciales clientes ({potentialClients.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </div>

          {/* Tab 1: Clientes activos */}
          <Tabs.Panel value="activos">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar cliente, empresa o dirección..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                  />
                </div>
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={() => openCreate("activo")}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar cliente activo
                </Button>
              </div>

              <DataTable
                columns={getColumns("activo")}
                data={filteredActive}
                keyExtractor={(c) => c._id}
                emptyState={
                  <EmptyState
                    icon={<AddressBookIcon size={40} weight="duotone" />}
                    title="Sin clientes activos"
                    description={
                      search
                        ? "No se encontraron clientes activos con esa búsqueda."
                        : "Aún no hay clientes activos registrados."
                    }
                    action={
                      !search && (
                        <Button
                          variant="primary"
                          className="text-xs"
                          onClick={() => openCreate("activo")}
                        >
                          <PlusIcon size={16} weight="bold" />
                          Agregar cliente activo
                        </Button>
                      )
                    }
                  />
                }
              />
            </div>
          </Tabs.Panel>

          {/* Tab 2: Potenciales clientes */}
          <Tabs.Panel value="potenciales">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar cliente potencial, empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                  />
                </div>
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={() => openCreate("potencial")}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar cliente potencial
                </Button>
              </div>

              <DataTable
                columns={getColumns("potencial")}
                data={filteredPotential}
                keyExtractor={(c) => c._id}
                emptyState={
                  <EmptyState
                    icon={<UserPlusIcon size={40} weight="duotone" />}
                    title="Sin clientes potenciales"
                    description={
                      search
                        ? "No se encontraron potenciales clientes con esa búsqueda."
                        : "Aún no hay clientes potenciales registrados."
                    }
                    action={
                      !search && (
                        <Button
                          variant="primary"
                          className="text-xs"
                          onClick={() => openCreate("potencial")}
                        >
                          <PlusIcon size={16} weight="bold" />
                          Agregar cliente potencial
                        </Button>
                      )
                    }
                  />
                }
              />
            </div>
          </Tabs.Panel>
        </Tabs.Root>

        {/* Modal: Crear / editar cliente */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingId ? "Editar cliente" : "Registrar cliente"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveClient();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre del cliente"
                id="client-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Laura Sánchez"
                required
              />
              <Input
                label="Empresa / compañía"
                id="client-company"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                placeholder="Ej: Streaming MX"
                required
              />
            </div>

            <Input
              label="Dirección física"
              id="client-address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Ej: Av. Reforma #120, Piso 4, San José"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Correo electrónico"
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
                label="Teléfono de contacto"
                id="client-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="555-0100"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Clasificación de cliente"
                id="client-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as "activo" | "potencial",
                  }))
                }
                options={[
                  { value: "activo", label: "Cliente activo" },
                  { value: "potencial", label: "Cliente potencial" },
                ]}
              />

              <Input
                label="Primera interacción"
                id="client-date"
                type="date"
                value={form.lastInteraction}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastInteraction: e.target.value }))
                }
                required
              />
            </div>

            {/* Servicio contratado inicial (opcional al crear cliente) */}
            {!editingId && (
              <div className="flex flex-col gap-3 border-t border-grayscale-3 dark:border-grayscale-4 pt-3">
                <span className="text-xs font-bold font-mono uppercase text-grayscale-11">
                  Servicio contratado inicial (opcional)
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="Nombre del servicio"
                    id="init-service-name"
                    value={initialService.serviceName}
                    onChange={(e) =>
                      setInitialService((s) => ({
                        ...s,
                        serviceName: e.target.value,
                      }))
                    }
                    placeholder="Ej: Producción de comercial"
                  />
                  <Input
                    label="Monto pactado (CRC)"
                    id="init-service-amount"
                    type="number"
                    min="0"
                    value={initialService.amount || ""}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setInitialService((s) => ({ ...s, amount: val }));
                    }}
                    placeholder="0"
                  />
                  <Select
                    label="Estado de pago"
                    id="init-service-status"
                    value={initialService.paymentStatus}
                    onChange={(e) =>
                      setInitialService((s) => ({
                        ...s,
                        paymentStatus: e.target.value as any,
                      }))
                    }
                    options={[
                      { value: "pendiente", label: "Pendiente de pago" },
                      { value: "pagado", label: "Pagado completamente" },
                      { value: "parcial", label: "Pago parcial" },
                      { value: "sin_pago", label: "Sin pago" },
                    ]}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="client-notes"
                className="text-xs font-medium text-grayscale-11"
              >
                Notas / observaciones
              </label>
              <textarea
                id="client-notes"
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Detalles sobre requerimientos o estado de negociación..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" className="text-xs" type="submit">
                {editingId ? "Guardar cambios" : "Registrar cliente"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Administrar servicios y pagos del cliente */}
        <Modal
          open={manageModalOpen}
          onOpenChange={setManageModalOpen}
          title={
            selectedClient
              ? `Servicios y pagos: ${selectedClient.name} (${selectedClient.company})`
              : "Gestión de servicios y pagos"
          }
        >
          {selectedClient && (
            <div className="flex flex-col gap-6">
              {/* Client Summary Header */}
              <div className="rounded-lg border border-grayscale-3 dark:border-grayscale-4 bg-grayscale-2 dark:bg-grayscale-3 p-3.5 flex flex-col gap-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-grayscale-12 text-sm sm:text-base">
                      {selectedClient.name}
                    </span>
                    <Badge
                      variant={
                        selectedClient.type === "potencial" ? "accent" : "gray"
                      }
                    >
                      {selectedClient.type === "potencial"
                        ? "Cliente potencial"
                        : "Cliente activo"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-grayscale-10 border-b border-grayscale-4 dark:border-grayscale-5 pb-2">
                  <span>Empresa: {selectedClient.company}</span>
                  <span>Correo: {selectedClient.email}</span>
                  <span>Teléfono: {selectedClient.phone}</span>
                  {selectedClient.address && (
                    <span>Dirección: {selectedClient.address}</span>
                  )}
                </div>

                {/* Balance Summary Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <div className="flex flex-col p-2 rounded-md bg-grayscale-1 dark:bg-grayscale-4 border border-grayscale-4 dark:border-grayscale-5">
                    <span className="text-[10px] font-mono uppercase text-grayscale-10">
                      Total contratado
                    </span>
                    <span className="font-mono text-sm font-bold text-grayscale-12">
                      {formatCurrency(clientTotalContracted)}
                    </span>
                  </div>
                  <div className="flex flex-col p-2 rounded-md bg-grayscale-1 dark:bg-grayscale-4 border border-grayscale-4 dark:border-grayscale-5">
                    <span className="text-[10px] font-mono uppercase text-grayscale-10">
                      Total abonado
                    </span>
                    <span className="font-mono text-sm font-bold text-green-11">
                      {formatCurrency(clientTotalPaid)}
                    </span>
                  </div>
                  <div className="flex flex-col p-2 rounded-md bg-grayscale-1 dark:bg-grayscale-4 border border-grayscale-4 dark:border-grayscale-5">
                    <span className="text-[10px] font-mono uppercase text-grayscale-10">
                      Saldo pendiente
                    </span>
                    <span
                      className={`font-mono text-sm font-bold ${clientTotalBalance > 0 ? "text-orange-11" : "text-grayscale-11"}`}
                    >
                      {formatCurrency(clientTotalBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs System en el Modal de Gestión */}
              <Tabs.Root
                defaultValue={modalDefaultTab}
                key={modalDefaultTab}
                className="w-full flex flex-col gap-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
                  <Tabs.List className="border-0 pb-0 gap-1.5">
                    <Tabs.Tab
                      value="services"
                      className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
                    >
                      Servicios contratados ({clientServices.length})
                    </Tabs.Tab>
                    <Tabs.Tab
                      value="payments"
                      className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
                    >
                      Pagos y finanzas ({clientPayments.length})
                    </Tabs.Tab>
                    <Tabs.Indicator />
                  </Tabs.List>
                </div>

                {/* Tab Panel 1: Servicios contratados */}
                <Tabs.Panel value="services">
                  <div className="flex flex-col gap-5">
                    {/* Form to add service */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddService();
                      }}
                      className="flex flex-col gap-3 rounded-lg border border-grayscale-4 bg-grayscale-1 dark:bg-grayscale-2 p-3"
                    >
                      <span className="text-xs font-bold text-grayscale-11 uppercase font-mono">
                        Contratar nuevo servicio
                      </span>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Nombre del servicio"
                          id="service-name"
                          value={serviceForm.serviceName}
                          onChange={(e) =>
                            setServiceForm((f) => ({
                              ...f,
                              serviceName: e.target.value,
                            }))
                          }
                          placeholder="Ej: Desarrollo web / Manejo de redes"
                          required
                        />
                        <Input
                          label="Monto pactado (CRC)"
                          id="service-amount"
                          type="number"
                          min="0"
                          value={serviceForm.amount || ""}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Number(e.target.value) || 0,
                            );
                            setServiceForm((f) => ({ ...f, amount: val }));
                          }}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                          label="Estado inicial del servicio"
                          id="service-status"
                          value={serviceForm.paymentStatus}
                          onChange={(e) =>
                            setServiceForm((f) => ({
                              ...f,
                              paymentStatus: e.target.value as any,
                            }))
                          }
                          options={[
                            { value: "pendiente", label: "Pendiente de pago" },
                            { value: "pagado", label: "Pagado completamente" },
                            { value: "parcial", label: "Pago parcial" },
                            { value: "sin_pago", label: "Sin pago" },
                          ]}
                        />
                        <Input
                          label="Fecha de contrato"
                          id="service-date"
                          type="date"
                          value={serviceForm.contractDate}
                          onChange={(e) =>
                            setServiceForm((f) => ({
                              ...f,
                              contractDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="primary"
                          className="text-xs"
                          type="submit"
                        >
                          <PlusIcon size={14} weight="bold" />
                          Agregar servicio
                        </Button>
                      </div>
                    </form>

                    {/* List of services */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-grayscale-11 font-mono uppercase">
                        Historial de servicios
                      </span>
                      {clientServices.length === 0 ? (
                        <div className="text-xs text-grayscale-9 italic p-3 text-center border border-dashed border-grayscale-4 rounded-lg">
                          No hay servicios contratados aún para este cliente.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                          {clientServices.map((s: any) => {
                            const paidForService = getServiceTotalPaid(s._id);
                            const balanceService = Math.max(
                              0,
                              s.amount - paidForService,
                            );
                            const percentPaid =
                              s.amount > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (paidForService / s.amount) * 100,
                                    ),
                                  )
                                : 0;

                            return (
                              <div
                                key={s._id}
                                className="flex flex-col gap-3 p-4 rounded-xl border border-grayscale-4 dark:border-grayscale-5 bg-grayscale-2/60 dark:bg-grayscale-3/60 transition-all hover:border-grayscale-6"
                              >
                                {/* Header: Title, Date, Badge, Actions */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-bold text-sm text-grayscale-12 truncate">
                                      {s.serviceName}
                                    </span>
                                    <span className="text-xs text-grayscale-9 font-mono">
                                      Fecha de contrato:{" "}
                                      {formatDate(s.contractDate)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge
                                      variant={
                                        s.paymentStatus === "pagado"
                                          ? "green"
                                          : s.paymentStatus === "parcial"
                                            ? "orange"
                                            : s.paymentStatus === "pendiente"
                                              ? "orange"
                                              : "gray"
                                      }
                                    >
                                      {s.paymentStatus === "pagado"
                                        ? "Pagado"
                                        : s.paymentStatus === "parcial"
                                          ? "Pago parcial"
                                          : s.paymentStatus === "pendiente"
                                            ? "Pendiente"
                                            : "Sin pago"}
                                    </Badge>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteService(s._id)}
                                      className="p-1 rounded text-grayscale-8 hover:text-red-11 hover:bg-red-3 transition-colors cursor-pointer"
                                      title="Eliminar servicio"
                                    >
                                      <TrashIcon size={15} />
                                    </button>
                                  </div>
                                </div>

                                {/* Financial Metrics Grid */}
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-grayscale-1/80 dark:bg-grayscale-4/50 border border-grayscale-3 dark:border-grayscale-5 text-xs">
                                  <div className="flex flex-col justify-between h-full min-w-0">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-grayscale-10 leading-tight min-h-[24px] flex items-end">
                                      Monto pactado
                                    </span>
                                    <span className="font-mono font-bold text-grayscale-12 mt-1 truncate">
                                      {formatCurrency(s.amount)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col justify-between h-full min-w-0">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-grayscale-10 leading-tight min-h-[24px] flex items-end">
                                      Abonado
                                    </span>
                                    <span className="font-mono font-bold text-green-11 mt-1 truncate">
                                      {formatCurrency(paidForService)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col justify-between h-full min-w-0">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-grayscale-10 leading-tight min-h-[24px] flex items-end">
                                      Saldo pendiente
                                    </span>
                                    <span
                                      className={`font-mono font-bold mt-1 truncate ${balanceService > 0 ? "text-orange-11" : "text-grayscale-11"}`}
                                    >
                                      {formatCurrency(balanceService)}
                                    </span>
                                  </div>
                                </div>

                                {/* Progress Bar & Registrar Pago Action */}
                                <div className="flex flex-col gap-2 pt-0.5">
                                  <div className="flex items-center justify-between text-[11px] text-grayscale-10 font-mono">
                                    <span>Progreso de pago</span>
                                    <span>{percentPaid}%</span>
                                  </div>
                                  <div className="w-full bg-grayscale-4 dark:bg-grayscale-5 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-green-11 h-full transition-all duration-300 rounded-full"
                                      style={{ width: `${percentPaid}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePrepareServicePayment(s)
                                      }
                                      className="text-xs font-semibold text-accent-10 hover:text-accent-11 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-accent-3/50 cursor-pointer"
                                    >
                                      <PlusIcon size={14} weight="bold" />
                                      Registrar pago a este servicio
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs.Panel>

                {/* Tab Panel 2: Pagos & Sincronización con Finanzas */}
                <Tabs.Panel value="payments">
                  <div className="flex flex-col gap-5">
                    {/* Form to add payment */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddPayment();
                      }}
                      className="flex flex-col gap-3 rounded-lg border border-grayscale-4 bg-grayscale-1 dark:bg-grayscale-2 p-3"
                    >
                      <span className="text-xs font-bold text-grayscale-11 uppercase font-mono">
                        Registrar nuevo pago
                      </span>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                          label="Servicio asociado"
                          id="payment-service-id"
                          value={paymentForm.serviceId}
                          onChange={(e) =>
                            setPaymentForm((f) => ({
                              ...f,
                              serviceId: e.target.value,
                            }))
                          }
                          options={[
                            {
                              value: "",
                              label: "General / sin servicio específico",
                            },
                            ...clientServices.map((s: any) => ({
                              value: s._id,
                              label: `${s.serviceName} (Pactado: ${formatCurrency(s.amount)})`,
                            })),
                          ]}
                        />
                        <Input
                          label="Concepto / recibo"
                          id="payment-concept"
                          value={paymentForm.concept}
                          onChange={(e) =>
                            setPaymentForm((f) => ({
                              ...f,
                              concept: e.target.value,
                            }))
                          }
                          placeholder="Ej: Abono 50% desarrollo web"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                          label="Monto pagado (CRC)"
                          id="payment-amount"
                          type="number"
                          min="0"
                          value={paymentForm.amount || ""}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Number(e.target.value) || 0,
                            );
                            setPaymentForm((f) => ({ ...f, amount: val }));
                          }}
                          placeholder="0"
                          required
                        />
                        <Input
                          label="Fecha del pago"
                          id="payment-date"
                          type="date"
                          value={paymentForm.date}
                          onChange={(e) =>
                            setPaymentForm((f) => ({
                              ...f,
                              date: e.target.value,
                            }))
                          }
                          required
                        />
                        <Select
                          label="Estado del pago"
                          id="payment-status"
                          value={paymentForm.status}
                          onChange={(e) =>
                            setPaymentForm((f) => ({
                              ...f,
                              status: e.target.value as "paid" | "pending",
                            }))
                          }
                          options={[
                            { value: "paid", label: "Pagado / confirmado" },
                            { value: "pending", label: "Pendiente de cobro" },
                          ]}
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          variant="primary"
                          className="text-xs"
                          type="submit"
                        >
                          <CurrencyDollarIcon size={16} weight="bold" />
                          Registrar pago en clientes y finanzas
                        </Button>
                      </div>
                    </form>

                    {/* List of payments */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-grayscale-11 font-mono uppercase">
                        Historial de pagos registrados
                      </span>
                      {clientPayments.length === 0 ? (
                        <div className="text-xs text-grayscale-9 italic p-3 text-center border border-dashed border-grayscale-4 rounded-lg">
                          No se han registrado pagos para este cliente.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                          {clientPayments.map((p: any) => {
                            const linkedService = allServices.find(
                              (s: any) => s._id === p.serviceId,
                            );

                            return (
                              <div
                                key={p._id}
                                className="flex flex-col gap-2 p-3 rounded-xl border border-grayscale-4 dark:border-grayscale-5 bg-grayscale-1 dark:bg-grayscale-3/60 transition-colors hover:border-grayscale-6"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-xs sm:text-sm text-grayscale-12 truncate">
                                      {p.concept}
                                    </span>
                                    {linkedService && (
                                      <span className="text-[11px] font-medium text-grayscale-10 truncate mt-0.5">
                                        Servicio: {linkedService.serviceName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-bold font-mono text-grayscale-12 bg-grayscale-2 dark:bg-grayscale-4 px-2 py-0.5 rounded border border-grayscale-4 dark:border-grayscale-5">
                                      {formatCurrency(p.amount)}
                                    </span>
                                    <Badge
                                      variant={
                                        p.status === "paid" ? "green" : "orange"
                                      }
                                    >
                                      {p.status === "paid"
                                        ? "Pagado"
                                        : "Pendiente"}
                                    </Badge>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(p._id)}
                                      className="p-1 rounded text-grayscale-8 hover:text-red-11 hover:bg-red-3 transition-colors cursor-pointer"
                                      title="Eliminar pago"
                                    >
                                      <TrashIcon size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-grayscale-9 border-t border-grayscale-3/60 dark:border-grayscale-5/40 pt-1.5 mt-0.5">
                                  <span>
                                    Fecha de pago: {formatDate(p.date)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs.Panel>
              </Tabs.Root>
            </div>
          )}
        </Modal>

        {/* Social Media & Credentials Vault Modal */}
        <ClientSocialMediaModal
          open={socialMediaModalOpen}
          onOpenChange={setSocialMediaModalOpen}
          client={socialMediaClient}
          defaultTab={socialMediaDefaultTab}
        />

        {/* Confirm Delete Client Modal */}
        <ConfirmModal
          open={!!clientToDeleteId}
          onOpenChange={(open) => !open && setClientToDeleteId(null)}
          title="¿Eliminar Cliente?"
          description="¿Estás seguro de que deseas eliminar este cliente y todos sus datos asociados? Esta acción no se puede deshacer."
          confirmText="Eliminar Cliente"
          onConfirm={async () => {
            if (clientToDeleteId) {
              await removeClient({ id: clientToDeleteId as any });
              if (selectedClient?._id === clientToDeleteId) {
                setManageModalOpen(false);
                setSelectedClient(null);
              }
              setClientToDeleteId(null);
            }
          }}
        />
      </div>
    </PageContainer>
  );
}
