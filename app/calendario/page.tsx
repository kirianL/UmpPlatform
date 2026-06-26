"use client";

import {
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import {
  type CalendarEvent,
  EVENT_TYPE_LABELS,
  MOCK_EVENTS,
} from "@/lib/mock-data";
import PageContainer from "@/components/public/PageContainer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  shooting: "bg-red-9",
  "pre-production": "bg-orange-9",
  "post-production": "bg-violet-9",
  meeting: "bg-accent-9",
  delivery: "bg-green-9",
};

const EVENT_BADGE_VARIANT: Record<
  CalendarEvent["type"],
  "red" | "orange" | "accent" | "green"
> = {
  shooting: "red",
  "pre-production": "orange",
  "post-production": "accent",
  meeting: "accent",
  delivery: "green",
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_EVENT: Omit<CalendarEvent, "id"> = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  type: "meeting",
  description: "",
  status: "upcoming",
};

export default function CalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateString(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = toDateString(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  // Map of date → events
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDate
    ? (eventsByDate[selectedDate] || []).sort((a, b) =>
        a.time.localeCompare(b.time),
      )
    : [];

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function openCreate(date?: string) {
    setForm({
      ...EMPTY_EVENT,
      date: date || selectedDate || todayStr,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    setEvents((prev) => [{ id: String(Date.now()), ...form }, ...prev]);
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  // Build calendar grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
          Calendario
        </h1>
        <p className="text-sm text-grayscale-10">
          Agenda de producción y eventos
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 text-grayscale-10 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12 dark:border-grayscale-5 dark:hover:bg-grayscale-4"
          >
            <CaretLeftIcon size={16} weight="bold" />
          </button>
          <h2 className="min-w-[10rem] text-center font-mono text-sm font-semibold uppercase text-grayscale-12">
            {formatMonthYear(year, month)}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 text-grayscale-10 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12 dark:border-grayscale-5 dark:hover:bg-grayscale-4"
          >
            <CaretRightIcon size={16} weight="bold" />
          </button>
        </div>
        <Button
          variant="primary"
          className="text-xs"
          onClick={() => openCreate()}
        >
          <PlusIcon size={16} weight="bold" />
          Agregar Evento
        </Button>
      </div>

      {/* Calendar + Event Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Calendar Grid */}
        <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-1.5 dark:border-grayscale-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-2 text-center text-[11px] font-semibold font-mono uppercase text-grayscale-9"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div key={`empty-${i}`} className="aspect-square p-1" />
                );
              }

              const dateStr = toDateString(year, month, day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsByDate[dateStr] || [];

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex aspect-square cursor-pointer flex-col items-center gap-0.5 rounded-lg p-1 text-sm transition-colors ${
                    isSelected
                      ? "bg-accent-3 text-accent-12 dark:bg-accent-4"
                      : isToday
                        ? "bg-grayscale-3 text-grayscale-12 dark:bg-grayscale-4"
                        : "text-grayscale-11 hover:bg-grayscale-3 dark:hover:bg-grayscale-4"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      isToday && !isSelected ? "text-accent-9 font-bold" : ""
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={`size-1.5 rounded-full ${EVENT_COLORS[ev.type]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Detail Panel */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-xs font-semibold uppercase text-grayscale-10">
            {selectedDate
              ? new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "es-MX",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )
              : "Selecciona un día"}
          </h3>

          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-grayscale-4 bg-grayscale-2 px-4 py-8 text-center dark:border-grayscale-4">
              <CalendarDotsIcon
                size={32}
                weight="duotone"
                className="text-grayscale-7"
              />
              <p className="text-xs text-grayscale-9">
                Sin eventos para este día
              </p>
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => openCreate(selectedDate || undefined)}
              >
                <PlusIcon size={14} weight="bold" />
                Agregar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="small-shadow flex flex-col gap-2 rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium text-grayscale-12 truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-grayscale-9">{ev.time}h</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev.id)}
                      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-grayscale-10 leading-relaxed">
                      {ev.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={EVENT_BADGE_VARIANT[ev.type]}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </Badge>
                    <Badge
                      variant={
                        ev.status === "completed"
                          ? "green"
                          : ev.status === "cancelled"
                            ? "red"
                            : "gray"
                      }
                    >
                      {ev.status === "completed"
                        ? "Completado"
                        : ev.status === "cancelled"
                          ? "Cancelado"
                          : "Próximo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${EVENT_COLORS[type as CalendarEvent["type"]]}`}
            />
            <span className="text-[11px] text-grayscale-9">{label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nuevo Evento"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Título"
            id="ev-title"
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="Ej: Rodaje Ep. 8 — Horizontes"
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
            />
            <Input
              label="Hora"
              id="ev-time"
              type="time"
              value={form.time}
              onChange={(e) =>
                setForm((f) => ({ ...f, time: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo"
              id="ev-type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as CalendarEvent["type"],
                }))
              }
              options={Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
            <Select
              label="Estado"
              id="ev-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as CalendarEvent["status"],
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
            label="Descripción"
            id="ev-desc"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Detalles del evento..."
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
              Crear Evento
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    </PageContainer>
  );
}
