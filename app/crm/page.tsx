"use client";

import {
  CurrencyDollarIcon,
  FunnelIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TrendUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import PageContainer from "@/components/public/PageContainer";
import { cn } from "@/helpers/classname-helper";
import {
  type DealStage,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
} from "@/lib/mock-data";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_EXCHANGE_RATE = 515;

function formatCurrency(n: number, currency: string = "CRC"): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

type SimplifiedStage = "contact" | "negotiating" | "closed";

const SIMPLIFIED_STAGE_LABELS: Record<SimplifiedStage, string> = {
  contact: "Contacto / Leads",
  negotiating: "Propuesta / Negociación",
  closed: "Cerrado (Ganado / Perdido)",
};

const SIMPLIFIED_STAGE_ORDER: SimplifiedStage[] = ["contact", "negotiating", "closed"];

const COLUMN_COLORS: Record<SimplifiedStage, string> = {
  contact: "bg-grayscale-8",
  negotiating: "bg-accent-9",
  closed: "bg-green-9",
};

const PRIORITY_LABEL = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const EMPTY_DEAL = {
  title: "",
  client: "",
  value: 0,
  currency: "CRC",
  stage: "lead" as DealStage,
  priority: "medium" as const,
  createdAt: new Date().toISOString().slice(0, 10),
  expectedClose: "",
  description: "",
  contactEmail: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMPage() {
  const deals = useQuery(api.deals.get) ?? [];
  const createDeal = useMutation(api.deals.create);
  const updateDeal = useMutation(api.deals.update);
  const removeDeal = useMutation(api.deals.remove);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_DEAL);
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((res) => res.json())
      .then((data) => {
        if (data.venta) {
          setExchangeRate(data.venta);
        }
      })
      .catch((err) => console.error("Error fetching exchange rate:", err));
  }, []);
  
  // Mobile stage view state
  const [activeMobileStage, setActiveMobileStage] = useState<SimplifiedStage>("contact");
  
  // Track recently moved card to apply pulse animation
  const [lastMovedId, setLastMovedId] = useState<string | null>(null);

  // Pointer-event drag-and-drop state
  const [draggedDeal, setDraggedDeal] = useState<any | null>(null);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [hoveredCol, setHoveredCol] = useState<SimplifiedStage | null>(null);

  // Group deals by simplified stage
  const dealsByStage = useMemo(() => {
    const map: Record<SimplifiedStage, any[]> = {
      contact: [],
      negotiating: [],
      closed: [],
    };
    for (const deal of deals) {
      if (deal.stage === "lead") {
        map.contact.push(deal);
      } else if (deal.stage === "proposal" || deal.stage === "negotiation") {
        map.negotiating.push(deal);
      } else {
        map.closed.push(deal);
      }
    }
    return map;
  }, [deals]);

  // Pipeline stats (exclude lost and won for active pipeline value)
  const pipelineValue = deals
    .filter((d) => d.stage !== "lost" && d.stage !== "won")
    .reduce((s, d) => s + (d.currency === "USD" ? d.value * exchangeRate : d.value), 0);
  const wonValue = deals
    .filter((d) => d.stage === "won")
    .reduce((s, d) => s + (d.currency === "USD" ? d.value * exchangeRate : d.value), 0);
  const activeDeals = deals.filter(
    (d) => d.stage !== "lost" && d.stage !== "won",
  ).length;

  function openCreate() {
    setEditingDeal(null);
    setForm(EMPTY_DEAL);
    setModalOpen(true);
  }

  function openEdit(deal: any) {
    setEditingDeal(deal);
    setForm({
      title: deal.title,
      client: deal.client,
      value: deal.value,
      currency: deal.currency || "CRC",
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
      updateDeal({
        id: editingDeal._id,
        ...form,
      });
    } else {
      createDeal(form);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeDeal({ id: id as any });
  }

  function moveStage(dealId: string, newStage: DealStage) {
    const deal = deals.find(d => d._id === dealId);
    if (!deal) return;

    const update = () => {
      updateDeal({
        id: dealId as any,
        title: deal.title,
        client: deal.client,
        value: deal.value,
        currency: deal.currency || "CRC",
        stage: newStage,
        priority: deal.priority as any,
        createdAt: deal.createdAt,
        expectedClose: deal.expectedClose,
        description: deal.description,
        contactEmail: deal.contactEmail,
      });
      setLastMovedId(dealId);
      // Clear animation after duration (600ms)
      setTimeout(() => {
        setLastMovedId((current) => (current === dealId ? null : current));
      }, 600);
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as any).startViewTransition(update);
    } else {
      update();
    }
  }

  // Pointer event handlers for starting the drag
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, deal: any) => {
    if (e.button !== 0) return; // Only primary button
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, inputs, or edit buttons
    if (target.closest("button") || target.closest("a") || target.closest("input")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setPointerOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setPointerPos({
      x: e.clientX,
      y: e.clientY,
    });
    setDraggedDeal(deal);
  };

  // Global window listeners for drag move and drop
  useEffect(() => {
    if (!draggedDeal) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      setPointerPos({
        x: e.clientX,
        y: e.clientY,
      });

      // Find the column elements under the cursor
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const columnEl = element?.closest("[data-column]");
      if (columnEl) {
        const stage = columnEl.getAttribute("data-column") as SimplifiedStage;
        setHoveredCol(stage);
      } else {
        setHoveredCol(null);
      }
    };

    const handleWindowPointerUp = () => {
      if (hoveredCol) {
        let newStage: DealStage = "lead";
        if (hoveredCol === "contact") {
          newStage = "lead";
        } else if (hoveredCol === "negotiating") {
          newStage = (draggedDeal.stage === "proposal" || draggedDeal.stage === "negotiation")
            ? draggedDeal.stage
            : "negotiation";
        } else if (hoveredCol === "closed") {
          newStage = (draggedDeal.stage === "won" || draggedDeal.stage === "lost")
            ? draggedDeal.stage
            : "won";
        }
        moveStage(draggedDeal._id, newStage);
      }

      setDraggedDeal(null);
      setHoveredCol(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [draggedDeal, hoveredCol, deals]);

  return (
    <PageContainer size="wide">
      <div className={cn("flex flex-col gap-8", draggedDeal && "select-none")}>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Pipeline Activo"
            value={formatCurrency(pipelineValue)}
            detail={`${activeDeals} oportunidades`}
            icon={<FunnelIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Ganados"
            value={formatCurrency(wonValue)}
            detail={`${dealsByStage.closed.filter(d => d.stage === "won").length} cerrados`}
            icon={<TrendUpIcon size={18} weight="bold" className="text-green-9" />}
            index={1}
          />
          <StatCard
            label="Total Deals"
            value={deals.length}
            detail={`${dealsByStage.closed.filter(d => d.stage === "lost").length} perdidos`}
            icon={<CurrencyDollarIcon size={18} weight="fill" />}
            index={2}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Mobile stage switcher tabs */}
          <div className="flex w-full sm:w-auto items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-grayscale-2 p-1 dark:bg-grayscale-3 md:hidden">
            {SIMPLIFIED_STAGE_ORDER.map((stage) => {
              const count = dealsByStage[stage].length;
              const isSelected = activeMobileStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setActiveMobileStage(stage)}
                  className={cn(
                    "flex-1 sm:flex-initial flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 font-mono text-[11px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer",
                    isSelected
                      ? "bg-grayscale-1 text-grayscale-12 shadow-xs dark:bg-grayscale-4"
                      : "text-grayscale-9 hover:text-grayscale-11"
                  )}
                >
                  <span>{SIMPLIFIED_STAGE_LABELS[stage].split(" ")[0]}</span>
                  <span className="opacity-70 font-sans font-normal text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          <Button variant="primary" className="w-full sm:w-auto text-xs justify-center py-2.5 px-4" onClick={openCreate}>
            <PlusIcon size={16} weight="bold" />
            Nuevo deal
          </Button>
        </div>

        {/* Kanban Board Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SIMPLIFIED_STAGE_ORDER.map((stage) => {
            const stageDeals = dealsByStage[stage];
            const stageTotal = stageDeals.reduce((s, d) => s + (d.currency === "USD" ? d.value * exchangeRate : d.value), 0);
            const isVisibleMobile = activeMobileStage === stage;

            return (
              <div
                key={stage}
                data-column={stage}
                className={cn(
                  "flex flex-col gap-4 rounded-xl p-4 transition-all duration-300 min-h-[500px]",
                  hoveredCol === stage
                    ? "bg-grayscale-3/50 border border-dashed border-accent-9/70 shadow-inner"
                    : "bg-grayscale-2/20 border border-grayscale-3/40 dark:border-grayscale-4/30",
                  isVisibleMobile ? "flex" : "hidden md:flex"
                )}
              >
                {/* Column Header */}
                <div className="flex flex-col gap-1.5 pb-3 border-b border-grayscale-3 dark:border-grayscale-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", COLUMN_COLORS[stage])} />
                      <span className="font-mono text-sm font-bold uppercase text-grayscale-12 tracking-wide">
                        {SIMPLIFIED_STAGE_LABELS[stage]}
                      </span>
                    </div>
                    <span className="rounded-md bg-grayscale-2 px-2.5 py-0.5 text-xs font-bold font-mono text-grayscale-9 dark:bg-grayscale-3">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-grayscale-9 font-semibold">
                    {formatCurrency(stageTotal)}
                  </p>
                </div>

                {/* Cards Column */}
                <div className="flex flex-col gap-4 min-h-[400px]">
                  {stageDeals.map((deal) => {
                    const isDragged = draggedDeal?._id === deal._id;

                    return (
                      <div
                        key={deal._id}
                        onPointerDown={(e) => handlePointerDown(e, deal)}
                        style={{
                          viewTransitionName: lastMovedId === deal._id ? `card-${deal._id}` : undefined,
                        }}
                        className={cn(
                          "group relative flex flex-col gap-4 rounded-xl border border-grayscale-3 bg-grayscale-1 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent-6 hover:shadow-md cursor-grab active:cursor-grabbing transform-gpu dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-accent-7 touch-none select-none",
                          isDragged && "opacity-30 border-dashed",
                          lastMovedId === deal._id && "animate-card-move"
                        )}
                      >
                        {/* Top Row: Client Info and Stage/Priority Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-grayscale-3 text-[10px] font-mono font-bold text-grayscale-11 dark:bg-grayscale-4">
                              {deal.client.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                              {deal.client}
                            </span>
                          </div>
                          
                          {/* Priority dot indicator */}
                          <div className="flex items-center gap-1.5">
                            <span className={cn("size-2 rounded-full", 
                              deal.priority === "high" ? "bg-red-9" : deal.priority === "medium" ? "bg-orange-9" : "bg-green-9"
                            )} />
                            <span className="text-[10px] font-mono text-grayscale-9 uppercase">
                              {PRIORITY_LABEL[deal.priority as "medium"]}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <button
                            type="button"
                            onClick={() => openEdit(deal)}
                            className="cursor-pointer text-left focus:outline-none"
                          >
                            <h4 className="text-sm font-bold text-grayscale-12 leading-snug group-hover:text-accent-9 transition-colors tracking-tight line-clamp-2">
                              {deal.title}
                            </h4>
                          </button>
                        </div>

                        {/* Description */}
                        {deal.description && (
                          <p className="text-xs text-grayscale-9 leading-relaxed">
                            {deal.description}
                          </p>
                        )}

                        {/* Budget Highlight Block */}
                        <div className="flex items-center justify-between rounded-lg bg-grayscale-2 px-3 py-2 dark:bg-grayscale-4/30">
                          <span className="text-[10px] font-mono text-grayscale-9 uppercase font-medium">Valor</span>
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-sm font-bold text-grayscale-12">
                              {formatCurrency(deal.value, deal.currency || "CRC")}
                            </span>
                            {(deal.currency === "USD") && (
                              <span className="font-mono text-[10px] text-grayscale-9 leading-none mt-0.5">
                                ({formatCurrency(deal.value * exchangeRate, "CRC")})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expected Close Date and Stage Actions */}
                        <div className="mt-1 flex items-center justify-between text-xs border-t border-grayscale-2 dark:border-grayscale-4/50 pt-3">
                          <div className="flex flex-col">
                            {deal.expectedClose ? (
                              <>
                                <span className="text-[9px] font-mono text-grayscale-9 uppercase">Cierre</span>
                                <span className="font-mono font-semibold text-grayscale-11">
                                  {formatDate(deal.expectedClose)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[9px] font-mono text-grayscale-8 uppercase">Cierre —</span>
                            )}
                          </div>

                          {/* Close status indicator inside closed column or edit actions */}
                          <div className="flex items-center gap-2">
                            {deal.stage === "won" && (
                              <Badge variant="green" className="text-[9px]">Ganado</Badge>
                            )}
                            {deal.stage === "lost" && (
                              <Badge variant="red" className="text-[9px]">Perdido</Badge>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(deal)}
                                className="flex size-6 cursor-pointer items-center justify-center rounded text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11 dark:hover:bg-grayscale-4"
                                title="Editar"
                              >
                                <PencilSimpleIcon size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(deal._id)}
                                className="flex size-6 cursor-pointer items-center justify-center rounded text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
                                title="Eliminar"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-14 dark:border-grayscale-4 bg-grayscale-2/10">
                      <p className="text-xs font-mono uppercase font-bold text-grayscale-8">Sin deals</p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Select
                label="Moneda"
                id="deal-currency"
                value={form.currency || "CRC"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                options={[
                  { value: "CRC", label: "Colones (₡)" },
                  { value: "USD", label: "Dólares ($)" },
                ]}
              />
              <div className="flex flex-col gap-1">
                <Input
                  label="Monto"
                  id="deal-value"
                  type="number"
                  value={form.value || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value: Number(e.target.value) }))
                  }
                  placeholder="0"
                  required
                />
                {form.currency === "USD" && form.value > 0 && (
                  <span className="text-[10px] font-mono text-grayscale-9 mt-0.5 pl-1">
                    Equivale a: {formatCurrency(form.value * exchangeRate, "CRC")}
                  </span>
                )}
              </div>
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
                    priority: e.target.value as any,
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
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                className="w-full sm:w-auto text-xs justify-center"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" className="w-full sm:w-auto text-xs justify-center" type="submit">
                {editingDeal ? "Guardar Cambios" : "Crear Deal"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>

      {/* Custom GPU-accelerated Pointer Drag Floating Card */}
      {draggedDeal && (
        <div
          className="pointer-events-none fixed z-[999] opacity-90 border-2 border-accent-9 shadow-2xl rounded-xl bg-grayscale-1 p-5 w-72 dark:bg-grayscale-3 dark:border-accent-8 select-none will-change-transform"
          style={{
            transform: `translate3d(${pointerPos.x - pointerOffset.x}px, ${pointerPos.y - pointerOffset.y}px, 0) rotate(2.5deg) scale(1.035)`,
            left: 0,
            top: 0,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-bold uppercase text-grayscale-10">{draggedDeal.client}</span>
            <span className={cn("size-2 rounded-full", 
              draggedDeal.priority === "high" ? "bg-red-9" : draggedDeal.priority === "medium" ? "bg-orange-9" : "bg-green-9"
            )} />
          </div>
          <h4 className="text-sm font-bold text-grayscale-12 line-clamp-2">{draggedDeal.title}</h4>
          <div className="mt-3 flex items-center justify-between rounded bg-grayscale-2 px-2.5 py-1.5 dark:bg-grayscale-4/30">
            <span className="text-[10px] font-mono text-grayscale-9 uppercase">Valor</span>
            <div className="flex flex-col items-end">
              <span className="font-mono text-sm font-bold text-grayscale-12">
                {formatCurrency(draggedDeal.value, draggedDeal.currency || "CRC")}
              </span>
              {draggedDeal.currency === "USD" && (
                <span className="font-mono text-[10px] text-grayscale-9 leading-none mt-0.5">
                  ({formatCurrency(draggedDeal.value * exchangeRate, "CRC")})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
