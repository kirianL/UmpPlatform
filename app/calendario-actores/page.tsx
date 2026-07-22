"use client";

import {
  CalendarCheckIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CopyIcon,
  ClockIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMemo, useState } from "react";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import PageContainer from "@/components/public/PageContainer";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/helpers/classname-helper";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const STATUS_BADGE = {
  scheduled: { label: "Programado", variant: "accent" as const },
  filmed: { label: "Grabado", variant: "green" as const },
  rescheduled: { label: "Reprogramado", variant: "orange" as const },
  cancelled: { label: "Cancelado", variant: "red" as const },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function format12Hour(timeStr?: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) {
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

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

const EMPTY_SCHEDULE = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "08:00",
  endTime: "13:00",
  callTime: "07:30",
  location: "Estudio Principal UMP",
  actorName: "",
  characterName: "",
  sceneDetails: "",
  status: "scheduled" as const,
};

export default function CalendarioActoresPage() {
  const actorSchedules = useQuery(api.actorSchedules.get) ?? [];
  const actors = useQuery(api.actors.get) ?? [];

  const createSchedule = useMutation(api.actorSchedules.create);
  const updateSchedule = useMutation(api.actorSchedules.update);
  const removeSchedule = useMutation(api.actorSchedules.remove);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateString(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedActorFilter, setSelectedActorFilter] = useState("all");

  const filteredSchedules = useMemo(() => {
    if (selectedActorFilter === "all") return actorSchedules;
    return actorSchedules.filter((s) => s.actorName === selectedActorFilter);
  }, [actorSchedules, selectedActorFilter]);

  const actorSelectOptions = useMemo(() => {
    const uniqueActors = Array.from(new Set(actors.map((a) => a.name).filter(Boolean)));
    const opts = uniqueActors.map((name) => ({ value: name, label: name }));
    return [{ value: "Elenco General", label: "Elenco General" }, ...opts];
  }, [actors]);

  const characterSelectOptions = useMemo(() => {
    let relevantActors = actors;
    if (form.actorName && form.actorName !== "Elenco General") {
      const filtered = actors.filter((a) => a.name === form.actorName);
      if (filtered.length > 0) relevantActors = filtered;
    }
    const uniqueChars = Array.from(new Set(relevantActors.map((a) => a.characterName).filter(Boolean)));
    const opts = uniqueChars.map((char) => ({ value: char, label: char }));
    return [{ value: "Personaje General", label: "Personaje General" }, ...opts];
  }, [actors, form.actorName]);

  // Group schedules by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of filteredSchedules) {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    }
    return map;
  }, [filteredSchedules]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const calendarCells = useMemo(() => {
    const cells: { dateString: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    const prevMonthDays = getDaysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      cells.push({
        dateString: toDateString(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateString: toDateString(year, month, d),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    const totalSlots = cells.length;
    const remaining = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        dateString: toDateString(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDay]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_SCHEDULE,
      date: selectedDate || new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(ev: any) {
    setEditingId(ev._id);
    setForm({
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      callTime: ev.callTime,
      location: ev.location,
      actorName: ev.actorName,
      characterName: ev.characterName,
      sceneDetails: ev.sceneDetails,
      status: ev.status,
    });
    setModalOpen(true);
  }

  function handleSave() {
    const title = form.title.trim() || "Llamado a Rodaje";
    const actorName = form.actorName.trim() || "Elenco General";
    const matchedActor = actors.find((a) => a.name === actorName);
    const shareToken = matchedActor?.shareToken || actorName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const payload = {
      ...form,
      title,
      actorName,
      shareToken,
    };

    if (editingId) {
      updateSchedule({
        id: editingId as any,
        ...payload,
      });
    } else {
      createSchedule({
        ...payload,
        actorId: matchedActor?._id,
      });
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeSchedule({ id: id as any });
  }

  function getSlug(text: string) {
    if (!text || text === "all" || text === "general") return "general";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function copyPublicLink(target: string) {
    const slug = getSlug(target);
    const url = `${window.location.origin}/calendario-actores/public/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(slug);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Agenda de Actores
          </h1>
          <p className="text-sm text-grayscale-10">
            Llamados de rodaje y fechas de grabación del elenco
          </p>
        </div>

        {/* Toolbar & Actor Share links */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-grayscale-3 bg-grayscale-2 p-4 dark:border-grayscale-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold uppercase text-grayscale-10 shrink-0">Filtrar por Actor:</span>
            <select
              value={selectedActorFilter}
              onChange={(e) => setSelectedActorFilter(e.target.value)}
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs text-grayscale-12 outline-none dark:border-grayscale-5 dark:bg-grayscale-3"
            >
              <option value="all">Todos los Actores</option>
              {actors.map((a) => (
                <option key={a._id} value={a.name}>
                  {a.name} ({a.characterName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {selectedActorFilter !== "all" && (
              <button
                type="button"
                onClick={() => copyPublicLink(selectedActorFilter)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent-6/40 bg-accent-2/10 px-3 py-2 text-xs font-mono font-bold text-accent-11 hover:bg-accent-2/20 transition-colors cursor-pointer"
              >
                {copiedToken === getSlug(selectedActorFilter) ? (
                  <>
                    <CheckCircleIcon size={14} className="text-green-9" />
                    <span>¡Enlace de {selectedActorFilter} Copiado!</span>
                  </>
                ) : (
                  <>
                    <ShareNetworkIcon size={14} className="text-accent-9" />
                    <span>Copiar Link de {selectedActorFilter}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => copyPublicLink("general")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-1 px-3 py-2 text-xs font-mono font-bold text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              {copiedToken === "general" ? (
                <>
                  <CheckCircleIcon size={14} className="text-green-9" />
                  <span>¡Enlace General Copiado!</span>
                </>
              ) : (
                <>
                  <ShareNetworkIcon size={14} className="text-grayscale-9" />
                  <span>Copiar Link General</span>
                </>
              )}
            </button>

            <Button variant="primary" className="w-full sm:w-auto text-xs justify-center" onClick={openCreate}>
              <PlusIcon size={14} weight="bold" />
              Agendar Llamado
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                {formatMonthYear(year, month)}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonth((m) => (m === 0 ? (setYear((y) => y - 1), 11) : m - 1))}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-11 hover:bg-grayscale-3"
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
                  className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1 text-xs font-mono font-medium uppercase text-grayscale-11 hover:bg-grayscale-3"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((m) => (m === 11 ? (setYear((y) => y + 1), 0) : m + 1))}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-11 hover:bg-grayscale-3"
                >
                  <CaretRightIcon size={14} />
                </button>
              </div>
            </div>

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
                        "relative flex flex-col gap-1 rounded-lg border p-1 text-left min-h-[76px] transition-all cursor-pointer transform-gpu hover:scale-[1.02]",
                        isCurrentMonth
                          ? isSelected
                            ? "border-accent-7 bg-accent-2/10 shadow-sm"
                            : "border-transparent bg-grayscale-1 hover:border-grayscale-4 dark:bg-grayscale-3"
                          : "border-transparent bg-grayscale-2/40 text-grayscale-7 hover:border-grayscale-3 dark:bg-grayscale-3/20 dark:text-grayscale-9",
                        isToday && !isSelected && "ring-1 ring-accent-9/50 bg-accent-2/5"
                      )}
                    >
                      <span className={cn(
                        "font-mono text-xs font-bold leading-none p-0.5 rounded",
                        isToday ? "text-accent-9 bg-accent-2/20 font-bold" : "text-grayscale-11"
                      )}>
                        {dayNum}
                      </span>
                      <div className="flex flex-col gap-1 mt-auto w-full overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev._id}
                            className="truncate rounded bg-accent-3/80 px-1 py-0.5 text-[9px] font-semibold text-accent-12"
                            title={`${ev.actorName} - ${ev.title}`}
                          >
                            {ev.actorName}: {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[8px] font-mono font-bold text-grayscale-8 pl-0.5">
                            +{dayEvents.length - 2} más
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agenda view for selected date */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10">
                Llamados {selectedDate && `· ${formatDate(selectedDate)}`}
              </h2>
            </div>

            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto no-scrollbar pt-1">
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev._id}
                  className="flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-4 shadow-sm transition-all hover:border-accent-6 dark:border-grayscale-4 dark:bg-grayscale-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-grayscale-3/60 pb-2 dark:border-grayscale-4/40">
                    <span className="font-mono text-[11px] font-bold text-accent-10 dark:text-accent-9 flex items-center gap-1">
                      <ClockIcon size={14} />
                      Citación: {format12Hour(ev.callTime)}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-11 dark:text-emerald-400 bg-emerald-2/60 dark:bg-emerald-9/20 border border-emerald-4/30 px-2 py-0.5 rounded-md">
                      {STATUS_BADGE[ev.status as "scheduled"]?.label || ev.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-bold text-grayscale-12 tracking-tight">{ev.title}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      <span className="font-bold text-grayscale-12">{ev.actorName}</span>
                      <span className="text-accent-10 dark:text-accent-9 font-semibold">({ev.characterName})</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs rounded-xl bg-grayscale-2/60 p-2.5 dark:bg-grayscale-4/40 border border-grayscale-3/60 dark:border-grayscale-4/40">
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-grayscale-11">
                      <MapPinIcon size={14} className="text-red-9 shrink-0" />
                      <span>{ev.location}</span>
                    </p>
                    {ev.sceneDetails && (
                      <p className="text-[11px] text-grayscale-10 pt-1.5 border-t border-grayscale-3/60 dark:border-grayscale-4/40 leading-relaxed">
                        {ev.sceneDetails}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-grayscale-2 pt-2.5 dark:border-grayscale-4/40">
                    <button
                      type="button"
                      onClick={() => copyPublicLink(ev.shareToken || "general")}
                      className="text-[11px] font-mono text-accent-9 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CopyIcon size={13} />
                      {copiedToken === ev.shareToken ? "¡Enlace copiado!" : "Copiar enlace del actor"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(ev)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-11"
                      >
                        <PencilSimpleIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev._id)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 hover:bg-red-3 hover:text-red-11"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {selectedDayEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-16 text-center dark:border-grayscale-4">
                  <CalendarCheckIcon size={36} className="text-grayscale-8 mb-2" />
                  <p className="text-xs font-mono uppercase font-bold text-grayscale-8">Sin rodajes programados</p>
                  <p className="text-[11px] text-grayscale-9 mt-1">No hay llamados de actores registrados para esta fecha.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Creación / Edición */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingId ? "Editar Llamado de Rodaje" : "Agendar Llamado de Actor"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Título del Llamado / Escena"
              id="sch-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Grabación Escena 3: Interrogatorio Central"
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Nombre del Actor"
                id="sch-actor"
                value={form.actorName}
                onChange={(e) => {
                  const val = e.target.value;
                  const actorChars = actors.filter((a) => a.name === val).map((a) => a.characterName);
                  const newChar = actorChars.length > 0 ? actorChars[0] : form.characterName;
                  setForm((f) => ({
                    ...f,
                    actorName: val,
                    characterName: newChar,
                  }));
                }}
                options={actorSelectOptions}
              />
              <Select
                label="Nombre del Personaje"
                id="sch-char"
                value={form.characterName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = actors.find((a) => a.characterName === val);
                  setForm((f) => ({
                    ...f,
                    characterName: val,
                    actorName: matched ? matched.name : f.actorName,
                  }));
                }}
                options={characterSelectOptions}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha de Rodaje"
                id="sch-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
              <Select
                label="Estado del Llamado"
                id="sch-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                options={[
                  { value: "scheduled", label: "Programado" },
                  { value: "filmed", label: "Grabado / Completado" },
                  { value: "rescheduled", label: "Reprogramado" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Hora de Citación (Llamado)"
                id="sch-call"
                type="time"
                value={form.callTime}
                onChange={(e) => setForm((f) => ({ ...f, callTime: e.target.value }))}
                required
              />
              <Input
                label="Hora Fin Estimada"
                id="sch-end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                required
              />
            </div>

            <Input
              label="Locación / Set de Grabación"
              id="sch-loc"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ej: Foro A (San José) o Locación Exterior"
              required
            />

            <Input
              label="Detalles de la Escena / Requerimientos de Vestuario"
              id="sch-details"
              value={form.sceneDetails}
              onChange={(e) => setForm((f) => ({ ...f, sceneDetails: e.target.value }))}
              placeholder="Notas de vestuario, props o especificaciones para el actor..."
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
                {editingId ? "Guardar Cambios" : "Agendar Rodaje"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageContainer>
  );
}
