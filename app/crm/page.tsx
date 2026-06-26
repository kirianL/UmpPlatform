"use client";

import {
  CurrencyDollarIcon,
  FunnelIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TrendUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import PageContainer from "@/components/public/PageContainer";
import { cn } from "@/helpers/classname-helper";
import {
  type Deal,
  type DealPriority,
  type DealStage,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  MOCK_DEALS,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  });
}

const STAGE_DOT_COLORS: Record<DealStage, string> = {
  lead: "bg-grayscale-8",
  proposal: "bg-accent-9",
  negotiation: "bg-orange-9",
  won: "bg-green-9",
  lost: "bg-red-9",
};

const PRIORITY_BORDER: Record<DealPriority, string> = {
  low: "border-l-[3px] border-l-green-9 dark:border-l-green-8",
  medium: "border-l-[3px] border-l-orange-9 dark:border-l-orange-8",
  high: "border-l-[3px] border-l-red-9 dark:border-l-red-8",
};

const PRIORITY_LABEL: Record<DealPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const PRIORITY_BADGE_VARIANT: Record<DealPriority, "green" | "orange" | "red"> = {
  low: "green",
  medium: "orange",
  high: "red",
};

const EMPTY_DEAL: Omit<Deal, "id"> = {
  title: "",
  client: "",
  value: 0,
  stage: "lead",
  priority: "medium",
  createdAt: new Date().toISOString().slice(0, 10),
  expectedClose: "",
  description: "",
  contactEmail: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [form, setForm] = useState(EMPTY_DEAL);
  
  // Mobile stage view state to prevent horizontal scroll on small screens
  const [activeMobileStage, setActiveMobileStage] = useState<DealStage>("lead");
  
  // Track recently moved card to apply pulse animation
  const [lastMovedId, setLastMovedId] = useState<string | null>(null);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = {
      lead: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    for (const deal of deals) {
      map[deal.stage].push(deal);
    }
    return map;
  }, [deals]);

  // Pipeline stats (exclude lost and won for active pipeline value)
  const pipelineValue = deals
    .filter((d) => d.stage !== "lost" && d.stage !== "won")
    .reduce((s, d) => s + d.value, 0);
  const wonValue = deals
    .filter((d) => d.stage === "won")
    .reduce((s, d) => s + d.value, 0);
  const activeDeals = deals.filter(
    (d) => d.stage !== "lost" && d.stage !== "won",
  ).length;

  function openCreate() {
    setEditingDeal(null);
    setForm(EMPTY_DEAL);
    setModalOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditingDeal(deal);
    setForm({
      title: deal.title,
      client: deal.client,
      value: deal.value,
      stage: deal.stage,
      priority: deal.priority,
      createdAt: deal.createdAt,
      expectedClose: deal.expectedClose,
      description: deal.description,
      contactEmail: deal.contactEmail,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;

    if (editingDeal) {
      setDeals((prev) =>
        prev.map((d) => (d.id === editingDeal.id ? { ...d, ...form } : d)),
      );
    } else {
      setDeals((prev) => [{ id: String(Date.now()), ...form }, ...prev]);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  function moveStage(dealId: string, newStage: DealStage) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );
    setLastMovedId(dealId);
    // Clear animation after duration (600ms)
    setTimeout(() => {
      setLastMovedId((current) => (current === dealId ? null : current));
    }, 600);
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            CRM
          </h1>
          <p className="text-sm text-grayscale-10">
            Pipeline de proyectos y oportunidades
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Pipeline Activo"
            value={formatCurrency(pipelineValue)}
            detail={`${activeDeals} oportunidades`}
            icon={<FunnelIcon size={18} weight="fill" />}
          />
          <StatCard
            label="Ganados"
            value={formatCurrency(wonValue)}
            detail={`${dealsByStage.won.length} cerrados`}
            icon={<TrendUpIcon size={18} weight="bold" className="text-green-9" />}
          />
          <StatCard
            label="Total Deals"
            value={deals.length}
            detail={`${dealsByStage.lost.length} perdidos`}
            icon={<CurrencyDollarIcon size={18} weight="fill" />}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          {/* Mobile stage switcher tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-lg bg-grayscale-2 p-1 dark:bg-grayscale-2 md:hidden max-w-[calc(100vw-8rem)]">
            {DEAL_STAGE_ORDER.map((stage) => {
              const count = dealsByStage[stage].length;
              const isSelected = activeMobileStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setActiveMobileStage(stage)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer",
                    isSelected
                      ? "bg-grayscale-1 text-grayscale-12 shadow-sm dark:bg-grayscale-3"
                      : "text-grayscale-9 hover:text-grayscale-11"
                  )}
                >
                  <span>{DEAL_STAGE_LABELS[stage]}</span>
                  <span className="opacity-70 font-sans font-normal text-[8px]">({count})</span>
                </button>
              );
            })}
          </div>
          
          <Button variant="primary" className="text-xs ml-auto" onClick={openCreate}>
            <PlusIcon size={16} weight="bold" />
            Nuevo Deal
          </Button>
        </div>

        {/* Kanban Board Container */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DEAL_STAGE_ORDER.map((stage) => {
            const stageDeals = dealsByStage[stage];
            const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
            const isVisibleMobile = activeMobileStage === stage;

            return (
              <div
                key={stage}
                className={cn(
                  "flex flex-col gap-2.5",
                  isVisibleMobile ? "flex" : "hidden md:flex"
                )}
              >
                {/* Column Header */}
                <div className="flex flex-col gap-1 pb-2 border-b border-grayscale-3 dark:border-grayscale-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", STAGE_DOT_COLORS[stage])} />
                      <span className="font-mono text-xs font-bold uppercase text-grayscale-12 tracking-wide">
                        {DEAL_STAGE_LABELS[stage]}
                      </span>
                    </div>
                    <span className="rounded-md bg-grayscale-2 px-1.5 py-0.5 text-[9px] font-bold font-mono text-grayscale-9 dark:bg-grayscale-3">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-grayscale-9 font-semibold">
                    {formatCurrency(stageTotal)}
                  </p>
                </div>

                {/* Cards Column */}
                <div className="flex flex-col gap-2 min-h-[300px]">
                  {stageDeals.map((deal) => {
                    const currentIdx = DEAL_STAGE_ORDER.indexOf(deal.stage);

                    return (
                      <div
                        key={deal.id}
                        className={cn(
                          "group relative flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-md active:scale-[0.98] transform-gpu dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-accent-7",
                          lastMovedId === deal.id && "animate-card-move"
                        )}
                      >
                        {/* Top Row: Client Info and Priority dot */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-grayscale-3 text-[8px] font-mono font-bold text-grayscale-11 dark:bg-grayscale-4">
                              {deal.client.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-grayscale-10">
                              {deal.client}
                            </span>
                          </div>
                          
                          {/* Priority dot indicator */}
                          <div className="flex items-center gap-1">
                            <span className={cn("size-1.5 rounded-full", 
                              deal.priority === "high" ? "bg-red-9" : deal.priority === "medium" ? "bg-orange-9" : "bg-green-9"
                            )} />
                            <span className="text-[9px] font-mono text-grayscale-9 uppercase">
                              {PRIORITY_LABEL[deal.priority]}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Title */}
                        <button
                          type="button"
                          onClick={() => openEdit(deal)}
                          className="cursor-pointer text-left focus:outline-none"
                        >
                          <h4 className="text-xs font-bold text-grayscale-12 leading-tight group-hover:text-accent-9 transition-colors tracking-tight line-clamp-2">
                            {deal.title}
                          </h4>
                        </button>

                        {/* Description */}
                        {deal.description && (
                          <p className="text-[10px] text-grayscale-9 line-clamp-1 leading-normal">
                            {deal.description}
                          </p>
                        )}

                        {/* Budget Highlight Block */}
                        <div className="flex items-center justify-between rounded-lg bg-grayscale-2 px-2 py-1.5 dark:bg-grayscale-4/30">
                          <span className="text-[9px] font-mono text-grayscale-9 uppercase font-medium">Valor</span>
                          <span className="font-mono text-xs font-bold text-grayscale-12">
                            {formatCurrency(deal.value)}
                          </span>
                        </div>

                        {/* Expected Close Date and Stage Actions */}
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <div className="flex flex-col">
                            {deal.expectedClose ? (
                              <>
                                <span className="text-[8px] font-mono text-grayscale-9 uppercase">Cierre</span>
                                <span className="font-mono font-semibold text-grayscale-11">
                                  {formatDate(deal.expectedClose)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[8px] font-mono text-grayscale-8 uppercase">Cierre —</span>
                            )}
                          </div>

                          {/* Quick Stage Actions & Edit/Delete Panel */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-grayscale-3 dark:border-grayscale-4 rounded bg-grayscale-2 dark:bg-grayscale-4/60 overflow-hidden">
                              {currentIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveStage(deal.id, DEAL_STAGE_ORDER[currentIdx - 1])}
                                  className="flex size-5 items-center justify-center text-[10px] font-bold text-grayscale-10 hover:bg-grayscale-3 hover:text-grayscale-12 dark:hover:bg-grayscale-5 transition-colors cursor-pointer border-r border-grayscale-3 dark:border-grayscale-4"
                                  title={`Mover a ${DEAL_STAGE_LABELS[DEAL_STAGE_ORDER[currentIdx - 1]]}`}
                                >
                                  ‹
                                </button>
                              )}
                              {currentIdx < 4 && (
                                <button
                                  type="button"
                                  onClick={() => moveStage(deal.id, DEAL_STAGE_ORDER[currentIdx + 1])}
                                  className="flex size-5 items-center justify-center text-[10px] font-bold text-grayscale-10 hover:bg-grayscale-3 hover:text-grayscale-12 dark:hover:bg-grayscale-5 transition-colors cursor-pointer"
                                  title={`Mover a ${DEAL_STAGE_LABELS[DEAL_STAGE_ORDER[currentIdx + 1]]}`}
                                >
                                  ›
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 border-l border-grayscale-3 dark:border-grayscale-4 pl-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(deal)}
                                className="flex size-5 cursor-pointer items-center justify-center rounded text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11 dark:hover:bg-grayscale-4"
                                title="Editar"
                              >
                                <PencilSimpleIcon size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(deal.id)}
                                className="flex size-5 cursor-pointer items-center justify-center rounded text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
                                title="Eliminar"
                              >
                                <TrashIcon size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-10 dark:border-grayscale-4 bg-grayscale-2/10">
                      <p className="text-[10px] font-mono uppercase font-bold text-grayscale-8">Sin deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingDeal ? "Editar Deal" : "Nuevo Deal"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Título del Proyecto"
              id="deal-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ej: Serie 'Nuevos Horizontes' — T2"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Cliente"
                id="deal-client"
                value={form.client}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client: e.target.value }))
                }
                placeholder="Nombre del cliente"
                required
              />
              <Input
                label="Email de Contacto"
                id="deal-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactEmail: e.target.value }))
                }
                placeholder="correo@cliente.com"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Valor (MXN)"
                id="deal-value"
                type="number"
                value={form.value || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: Number(e.target.value) }))
                }
                placeholder="0"
                required
              />
              <Select
                label="Etapa"
                id="deal-stage"
                value={form.stage}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stage: e.target.value as DealStage,
                  }))
                }
                options={DEAL_STAGE_ORDER.map((s) => ({
                  value: s,
                  label: DEAL_STAGE_LABELS[s],
                }))}
              />
              <Select
                label="Prioridad"
                id="deal-priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as DealPriority,
                  }))
                }
                options={[
                  { value: "low", label: "Baja" },
                  { value: "medium", label: "Media" },
                  { value: "high", label: "Alta" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha de Creación"
                id="deal-created"
                type="date"
                value={form.createdAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, createdAt: e.target.value }))
                }
              />
              <Input
                label="Cierre Esperado"
                id="deal-close"
                type="date"
                value={form.expectedClose}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedClose: e.target.value }))
                }
              />
            </div>
            <Input
              label="Descripción"
              id="deal-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Detalles del proyecto..."
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
                {editingDeal ? "Guardar Cambios" : "Crear Deal"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
