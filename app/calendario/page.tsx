"use client";

import {
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import { EVENT_TYPE_LABELS } from "@/lib/mock-data";
import PageContainer from "@/components/public/PageContainer";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/helpers/classname-helper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const EVENT_COLORS = {
  shooting: "bg-red-9",
  "pre-production": "bg-orange-9",
  "post-production": "bg-violet-9",
  meeting: "bg-accent-9",
  delivery: "bg-green-9",
};

const EVENT_BADGE_VARIANT = {
  shooting: "red" as const,
  "pre-production": "orange" as const,
  "post-production": "accent" as const,
  meeting: "accent" as const,
  delivery: "green" as const,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0 .. Sun=6)
  return day === 0 ? 6 : day - 1;
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_EVENT = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  type: "meeting" as const,
  description: "",
  status: "upcoming" as const,
};

export default function CalendarioPage() {
  const events = useQuery(api.events.get) ?? [];
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateString(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Group events by date for rendering in calendar cells
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Previous month details for filling grid padding
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthDays = getDaysInMonth(prevMonthYear, prevMonthIndex);

  const calendarCells = useMemo(() => {
    const cells: {
      dateString: string;
      dayNum: number;
      isCurrentMonth: boolean;
    }[] = [];

    // Padding for previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      cells.push({
        dateString: toDateString(prevMonthYear, prevMonthIndex, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateString: toDateString(year, month, d),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Padding for next month days (up to next multiple of 7, standard 42-day calendar sheet)
    const totalSlots = cells.length;
    const remaining = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    const nextMonthIndex = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;

    for (let d = 1; d <= remaining; d++) {
      cells.push({
        dateString: toDateString(nextMonthYear, nextMonthIndex, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDay, prevMonthDays, prevMonthIndex, prevMonthYear]);

  function handlePrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_EVENT,
      date: selectedDate || new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(ev: any) {
    setEditingId(ev._id);
    setForm({
      title: ev.title,
      date: ev.date,
      time: ev.time,
      type: ev.type,
      description: ev.description,
      status: ev.status,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;

    if (editingId) {
      updateEvent({
        id: editingId as any,
        ...form,
      });
    } else {
      createEvent(form);
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeEvent({ id: id as any });
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Calendario
          </h1>
          <p className="text-sm text-grayscale-10">
            Agenda de rodajes, reuniones y post-producción
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar Grid Section */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                {formatMonthYear(year, month)}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-11 transition-colors hover:bg-grayscale-3"
                >
                  <CaretLeftIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setYear(today.getFullYear());
                    setMonth(today.getMonth());
                    setSelectedDate(toDateString(today.getFullYear(), today.getMonth(), today.getDate()));
                  }}
                  className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1 text-xs font-mono font-medium uppercase text-grayscale-11 transition-colors hover:bg-grayscale-3"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-11 transition-colors hover:bg-grayscale-3"
                >
                  <CaretRightIcon size={14} />
                </button>
              </div>
            </div>

            {/* Calendar Sheet */}
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-1 dark:border-grayscale-4">
              <div className="grid grid-cols-7 text-center font-mono text-[10px] font-bold uppercase text-grayscale-9 py-2 border-b border-grayscale-3 dark:border-grayscale-4/50">
                {WEEKDAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-1">
                {calendarCells.map(({ dateString, dayNum, isCurrentMonth }) => {
                  const dayEvents = eventsByDate[dateString] || [];
                  const isSelected = selectedDate === dateString;
                  const isToday = toDateString(now.getFullYear(), now.getMonth(), now.getDate()) === dateString;

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => setSelectedDate(dateString)}
                      className={cn(
                        "relative flex flex-col gap-1 rounded-lg border p-1 text-left min-h-[72px] transition-all cursor-pointer transform-gpu hover:scale-[1.02] hover:z-10",
                        isCurrentMonth
                          ? isSelected
                            ? "border-accent-7 bg-accent-2/10 shadow-sm"
                            : "border-transparent bg-grayscale-1 hover:border-grayscale-4 dark:bg-grayscale-3"
                          : "border-transparent bg-grayscale-2/40 text-grayscale-7 hover:border-grayscale-3 dark:bg-grayscale-3/20 dark:text-grayscale-9",
                        isToday && !isSelected && "ring-1 ring-accent-9/50 bg-accent-2/5 dark:bg-accent-2/5",
                      )}
                    >
                      <span className={cn(
                        "font-mono text-xs font-bold leading-none p-0.5 rounded",
                        isToday ? "text-accent-9 bg-accent-2/20 font-bold" : "text-grayscale-11"
                      )}>
                        {dayNum}
                      </span>
                      {/* Render mini color bars for events in calendar cells */}
                      <div className="flex flex-col gap-0.5 mt-auto w-full overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev._id}
                            className={cn(
                              "h-1 w-full rounded-[1px] opacity-90",
                              EVENT_COLORS[ev.type as "meeting"] || EVENT_COLORS.meeting
                            )}
                            title={ev.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] font-mono font-bold leading-none text-grayscale-8 pl-0.5">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agenda / Events List for Selected Day */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                Agenda {selectedDate && `· ${formatDate(selectedDate)}`}
              </h2>
              <Button variant="primary" className="text-xs" onClick={openCreate}>
                <PlusIcon size={14} weight="bold" />
                Evento
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto no-scrollbar pt-1.5">
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev._id}
                  className="group relative flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-6 dark:border-grayscale-4 dark:bg-grayscale-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-grayscale-9">{ev.time}</span>
                    <Badge variant={EVENT_BADGE_VARIANT[ev.type as "meeting"] || EVENT_BADGE_VARIANT.meeting}>
                      {EVENT_TYPE_LABELS[ev.type as "meeting"] || ev.type}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-grayscale-12 tracking-tight group-hover:text-accent-9 transition-colors">
                    {ev.title}
                  </h4>
                  {ev.description && (
                    <p className="text-xs text-grayscale-9 leading-relaxed">{ev.description}</p>
                  )}
                  <div className="flex items-center justify-end gap-1.5 border-t border-grayscale-2 dark:border-grayscale-4/30 pt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11 dark:hover:bg-grayscale-4"
                      title="Editar"
                    >
                      <PencilSimpleIcon size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev._id)}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
                      title="Eliminar"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {selectedDayEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-16 text-center dark:border-grayscale-4">
                  <CalendarDotsIcon size={32} className="text-grayscale-8 mb-2" />
                  <p className="text-xs font-mono uppercase font-bold text-grayscale-8">Sin eventos</p>
                  <p className="text-[11px] text-grayscale-9 mt-1">No hay tareas o rodajes para este día.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingId ? "Editar Evento" : "Crear Evento"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4 w-full min-w-0"
          >
            <Input
              label="Título del Evento / Tarea"
              id="ev-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ej: Rodaje Escenas de Exterior"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha"
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
              <Input
                label="Hora"
                id="ev-time"
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, time: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Tipo de Evento"
                id="ev-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as any,
                  }))
                }
                options={[
                  { value: "shooting", label: "Rodaje" },
                  { value: "pre-production", label: "Pre-producción" },
                  { value: "post-production", label: "Post-producción" },
                  { value: "meeting", label: "Reunión" },
                  { value: "delivery", label: "Entrega / Delivery" },
                ]}
              />
              <Select
                label="Estado"
                id="ev-status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
                options={[
                  { value: "upcoming", label: "Próximo" },
                  { value: "completed", label: "Completado" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>
            <Input
              label="Descripción / Detalles"
              id="ev-desc"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Notas sobre el llamado, locación o integrantes..."
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
                {editingId ? "Guardar Cambios" : "Crear Evento"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
