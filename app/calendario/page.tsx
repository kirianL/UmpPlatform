"use client";

import {
  ArrowSquareOutIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  FunnelSimpleIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
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
// Helpers & Types
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const EVENT_COLORS = {
  shooting: "bg-red-9",
  "pre-production": "bg-orange-9",
  "post-production": "bg-violet-9",
  meeting: "bg-accent-9",
  delivery: "bg-green-9",
  actor: "bg-indigo-9",
};

const EVENT_BADGE_VARIANT = {
  shooting: "red" as const,
  "pre-production": "orange" as const,
  "post-production": "accent" as const,
  meeting: "accent" as const,
  delivery: "green" as const,
};

const ACTOR_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "accent" | "green" | "orange" | "red" | "gray" }
> = {
  scheduled: { label: "Programado", variant: "accent" },
  filmed: { label: "Grabado", variant: "green" },
  rescheduled: { label: "Reprogramado", variant: "orange" },
  cancelled: { label: "Cancelado", variant: "red" },
};

function format12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (
    trimmed.toLowerCase().includes("am") ||
    trimmed.toLowerCase().includes("pm")
  ) {
    return trimmed.toUpperCase();
  }
  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return trimmed;

  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${formattedHours}:${minutes} ${period}`;
}

function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const trimmed = timeStr.trim().toLowerCase();
  const isPM = trimmed.includes("pm");
  const isAM = trimmed.includes("am");
  const clean = trimmed.replace(/[^\d:]/g, "");
  const parts = clean.split(":");
  if (parts.length === 0 || !parts[0]) return 9999;
  let hours = parseInt(parts[0], 10);
  const minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (isNaN(hours)) return 9999;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

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

type UnifiedCalendarItem =
  | {
      id: string;
      source: "event";
      title: string;
      date: string;
      time: string;
      type:
        | "shooting"
        | "pre-production"
        | "post-production"
        | "meeting"
        | "delivery";
      description: string;
      status: "upcoming" | "completed" | "cancelled";
      raw: any;
    }
  | {
      id: string;
      source: "actor";
      title: string;
      date: string;
      time: string;
      callTime: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      actorName: string;
      characterName?: string;
      sceneDetails?: string;
      status: string;
      actorId?: string;
      shareToken?: string;
      raw: any;
    };

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
  const actorSchedules = useQuery(api.actorSchedules.get) ?? [];

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
  const [activeFilter, setActiveFilter] = useState<"all" | "events" | "actors">(
    "all",
  );

  // Combine events and actor schedules based on filter
  const combinedItems = useMemo(() => {
    const list: UnifiedCalendarItem[] = [];

    if (activeFilter === "all" || activeFilter === "events") {
      for (const ev of events) {
        list.push({
          id: ev._id,
          source: "event",
          title: ev.title,
          date: ev.date,
          time: ev.time,
          type: ev.type,
          description: ev.description,
          status: ev.status,
          raw: ev,
        });
      }
    }

    if (activeFilter === "all" || activeFilter === "actors") {
      for (const s of actorSchedules) {
        list.push({
          id: s._id,
          source: "actor",
          title: s.title,
          date: s.date,
          time: s.callTime || s.startTime || "08:00",
          callTime: s.callTime,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          actorName: s.actorName,
          characterName: s.characterName,
          sceneDetails: s.sceneDetails,
          status: s.status,
          actorId: s.actorId,
          shareToken: s.shareToken,
          raw: s,
        });
      }
    }

    return list;
  }, [events, actorSchedules, activeFilter]);

  // Group items by date for rendering in calendar cells
  const itemsByDate = useMemo(() => {
    const map: Record<string, UnifiedCalendarItem[]> = {};
    for (const item of combinedItems) {
      if (!map[item.date]) {
        map[item.date] = [];
      }
      map[item.date].push(item);
    }
    for (const date in map) {
      map[date].sort((a, b) => {
        const tA = timeToMinutes(a.time);
        const tB = timeToMinutes(b.time);
        if (tA !== tB) return tA - tB;
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [combinedItems]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return itemsByDate[selectedDate] || [];
  }, [selectedDate, itemsByDate]);

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
  }, [
    year,
    month,
    daysInMonth,
    firstDay,
    prevMonthDays,
    prevMonthIndex,
    prevMonthYear,
  ]);

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
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Calendario
          </h1>
          <p className="text-sm text-grayscale-10">
            Agenda general de rodajes, llamados de actores, reuniones y post-producción
          </p>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-grayscale-3 bg-grayscale-2 p-3 dark:border-grayscale-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-xs font-bold uppercase text-grayscale-10 shrink-0">
              <FunnelSimpleIcon size={14} />
              Filtrar:
            </span>
            <div className="inline-flex rounded-lg border border-grayscale-4 bg-grayscale-1 p-0.5 dark:border-grayscale-5 dark:bg-grayscale-3">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  activeFilter === "all"
                    ? "bg-grayscale-12 text-grayscale-1 font-bold shadow-xs dark:bg-grayscale-1 dark:text-grayscale-12"
                    : "text-grayscale-10 hover:text-grayscale-12",
                )}
              >
                Todos ({events.length + actorSchedules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("events")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  activeFilter === "events"
                    ? "bg-grayscale-12 text-grayscale-1 font-bold shadow-xs dark:bg-grayscale-1 dark:text-grayscale-12"
                    : "text-grayscale-10 hover:text-grayscale-12",
                )}
              >
                Eventos ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("actors")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  activeFilter === "actors"
                    ? "bg-grayscale-12 text-grayscale-1 font-bold shadow-xs dark:bg-grayscale-1 dark:text-grayscale-12"
                    : "text-grayscale-10 hover:text-grayscale-12",
                )}
              >
                Agenda Actores ({actorSchedules.length})
              </button>
            </div>
          </div>

          <Link
            href="/calendario-actores"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
          >
            <UsersThreeIcon size={14} />
            <span>Gestionar Agenda de Actores</span>
            <ArrowSquareOutIcon size={12} className="text-grayscale-9" />
          </Link>
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
                    setSelectedDate(
                      toDateString(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                      ),
                    );
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
                  const dayItems = itemsByDate[dateString] || [];
                  const isSelected = selectedDate === dateString;
                  const isToday =
                    toDateString(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate(),
                    ) === dateString;

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
                        isToday &&
                          !isSelected &&
                          "ring-1 ring-accent-9/50 bg-accent-2/5 dark:bg-accent-2/5",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs font-bold leading-none p-0.5 rounded",
                          isToday
                            ? "text-accent-9 bg-accent-2/20 font-bold"
                            : "text-grayscale-11",
                        )}
                      >
                        {dayNum}
                      </span>
                      {/* Render mini color bars for events & actor schedules */}
                      <div className="flex flex-col gap-0.5 mt-auto w-full overflow-hidden">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={`${item.source}-${item.id}`}
                            className={cn(
                              "h-1 w-full rounded-[1px] opacity-90",
                              item.source === "actor"
                                ? EVENT_COLORS.actor
                                : EVENT_COLORS[item.type as "meeting"] ||
                                    EVENT_COLORS.meeting,
                            )}
                            title={
                              item.source === "actor"
                                ? `[Actor: ${item.actorName}] ${item.title}`
                                : item.title
                            }
                          />
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[8px] font-mono font-bold leading-none text-grayscale-8 pl-0.5">
                            +{dayItems.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-grayscale-10">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-9" />
                <span>Rodaje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-orange-9" />
                <span>Pre-producción</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-violet-9" />
                <span>Post-producción</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-accent-9" />
                <span>Reunión</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-9" />
                <span>Entrega</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-indigo-9" />
                <span className="font-semibold text-indigo-11 dark:text-indigo-9">
                  Agenda Actores
                </span>
              </div>
            </div>
          </div>

          {/* Agenda / Events List for Selected Day */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                Agenda {selectedDate && `· ${formatDate(selectedDate)}`}
              </h2>
              <Button
                variant="primary"
                className="text-xs"
                onClick={openCreate}
              >
                <PlusIcon size={14} weight="bold" />
                Evento
              </Button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto no-scrollbar pt-1.5">
              {selectedDayItems.map((item) => {
                if (item.source === "actor") {
                  return (
                    <div
                      key={`actor-${item.id}`}
                      className="group relative flex flex-col gap-2.5 rounded-xl border border-indigo-6/40 bg-indigo-2/15 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-6 dark:border-indigo-5/30 dark:bg-indigo-3/10"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-indigo-4/30 pb-2 dark:border-indigo-5/20">
                        <span className="font-mono text-xs font-bold text-indigo-11 dark:text-indigo-9 flex items-center gap-1">
                          <ClockIcon size={14} />
                          Llamado: {format12Hour(item.callTime || item.time)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-indigo-6/40 bg-indigo-3/70 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-indigo-11 dark:bg-indigo-4/30 dark:text-indigo-9">
                            Actor
                          </span>
                          <span className="rounded-md border border-grayscale-4 bg-grayscale-1 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 dark:border-grayscale-5 dark:bg-grayscale-3">
                            {ACTOR_STATUS_CONFIG[item.status]?.label ||
                              item.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-sm font-bold text-grayscale-12 tracking-tight group-hover:text-indigo-11 transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                          <span className="font-bold text-grayscale-12">
                            {item.actorName}
                          </span>
                          {item.characterName && (
                            <span className="text-indigo-10 dark:text-indigo-9 font-semibold">
                              ({item.characterName})
                            </span>
                          )}
                        </div>
                      </div>

                      {(item.location || item.sceneDetails) && (
                        <div className="flex flex-col gap-1 text-xs rounded-lg bg-grayscale-1/70 p-2 dark:bg-grayscale-4/30 border border-grayscale-3/50 dark:border-grayscale-4/40">
                          {item.location && (
                            <p className="flex items-center gap-1.5 font-mono text-[11px] text-grayscale-11">
                              <MapPinIcon
                                size={13}
                                className="text-red-9 shrink-0"
                              />
                              <span className="truncate">{item.location}</span>
                            </p>
                          )}
                          {item.sceneDetails && (
                            <p className="text-[11px] text-grayscale-10 pt-1 border-t border-grayscale-3/40 dark:border-grayscale-4/30 leading-relaxed">
                              {item.sceneDetails}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-indigo-4/20 pt-2.5 mt-0.5">
                        <span className="font-mono text-[10px] text-grayscale-9">
                          {item.startTime && item.endTime
                            ? `Rodaje: ${format12Hour(item.startTime)} - ${format12Hour(item.endTime)}`
                            : "Llamado de elenco"}
                        </span>
                        <Link
                          href="/calendario-actores"
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-indigo-11 hover:text-indigo-12 hover:underline dark:text-indigo-9"
                        >
                          <span>Ver en Agenda</span>
                          <ArrowSquareOutIcon size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-6 dark:border-grayscale-4 dark:bg-grayscale-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-grayscale-9">
                        {item.time}
                      </span>
                      <Badge
                        variant={
                          EVENT_BADGE_VARIANT[item.type as "meeting"] ||
                          EVENT_BADGE_VARIANT.meeting
                        }
                      >
                        {EVENT_TYPE_LABELS[item.type as "meeting"] || item.type}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-grayscale-12 tracking-tight group-hover:text-accent-9 transition-colors">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-grayscale-9 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-1.5 border-t border-grayscale-2 dark:border-grayscale-4/30 pt-3">
                      <button
                        type="button"
                        onClick={() => openEdit(item.raw)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11 dark:hover:bg-grayscale-4"
                        title="Editar"
                      >
                        <PencilSimpleIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
                        title="Eliminar"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedDayItems.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-16 text-center dark:border-grayscale-4">
                  <CalendarDotsIcon
                    size={32}
                    className="text-grayscale-8 mb-2"
                  />
                  <p className="text-xs font-mono uppercase font-bold text-grayscale-8">
                    Sin eventos
                  </p>
                  <p className="text-[11px] text-grayscale-9 mt-1">
                    No hay eventos o llamados de actores para este día.
                  </p>
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
                {editingId ? "Guardar cambios" : "Crear evento"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
