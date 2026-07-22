"use client";

import {
  CalendarCheckIcon,
  ClockIcon,
  FilmStripIcon,
  MapPinIcon,
  UserCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Logo from "@/components/Logo";

const STATUS_BADGE = {
  scheduled: { label: "Programado", variant: "accent" as const },
  filmed: { label: "Grabado", variant: "green" as const },
  rescheduled: { label: "Reprogramado", variant: "orange" as const },
  cancelled: { label: "Cancelado", variant: "red" as const },
};

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

export default function PublicActorSchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const schedules = useQuery(api.actorSchedules.getByShareToken, { shareToken: token });
  const actor = useQuery(api.actors.getByShareToken, { shareToken: token });

  if (schedules === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grayscale-1 dark:bg-grayscale-1">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-accent-9 border-t-transparent" />
          <p className="font-mono text-xs text-grayscale-9">Cargando agenda de rodaje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grayscale-1 text-grayscale-12 dark:bg-grayscale-1 flex flex-col items-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-xl sm:max-w-2xl flex flex-col gap-5 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-grayscale-3 pb-4 dark:border-grayscale-4/60">
          <div className="flex items-center gap-2.5">
            <Logo iconSize={18} className="w-6" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
              UmpPlatform
            </span>
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-grayscale-10">
            Agenda del Actor
          </span>
        </div>

        {/* Actor Hero Split Cover Card (La foto NUNCA se tapa, 100% Rostro y Cuerpo Visibles) */}
        {actor && (
          <div className="rounded-3xl border border-grayscale-3 bg-grayscale-1 shadow-md dark:border-grayscale-4/80 dark:bg-grayscale-2 overflow-hidden flex flex-col sm:flex-row items-stretch sm:min-h-[280px]">
            {/* Left Side: 100% Unobstructed Studio Photo Frame */}
            <div className="relative w-full sm:w-2/5 aspect-[4/3] sm:aspect-auto sm:h-auto sm:min-h-full shrink-0 bg-grayscale-2 border-b sm:border-b-0 sm:border-r border-grayscale-3/60 dark:border-grayscale-4/60 overflow-hidden">
              {actor.photoUrl ? (
                <img
                  src={actor.photoUrl}
                  alt={actor.name}
                  className="size-full object-cover object-[center_20%] sm:object-top"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-accent-3/40 font-mono text-4xl font-bold text-accent-10">
                  {actor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Right Side: Clean Modern Gradient Dossier Panel */}
            <div className="flex-1 p-5 sm:p-7 flex flex-col justify-center gap-3 bg-gradient-to-br from-grayscale-1 via-grayscale-1 to-grayscale-2/60 dark:from-grayscale-2 dark:via-grayscale-2 dark:to-grayscale-3/40">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-accent-10 dark:text-accent-9">
                  {actor.characterName || "Personaje Principal"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-grayscale-12 tracking-tight mt-0.5">
                  {actor.name}
                </h1>
              </div>

              {/* Stat & Status Indicators */}
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider text-grayscale-11 border-t border-b border-grayscale-3/60 dark:border-grayscale-4/60 py-2.5 my-0.5">
                <div className="flex items-center gap-1.5 text-grayscale-12">
                  <FilmStripIcon size={15} className="text-accent-9" />
                  <span>{actor.episodeCount ?? 0} Capítulos</span>
                </div>
                <span className="size-1 rounded-full bg-grayscale-6" />
                <div className="flex items-center gap-1.5 text-emerald-11 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Elenco {actor.status === "active" ? "Activo" : "Inactivo"}</span>
                </div>
              </div>

              {actor.characterBio && (
                <p className="text-xs text-grayscale-11 leading-relaxed">
                  {actor.characterBio}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Call Sheet Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="font-mono text-xs sm:text-sm font-bold uppercase text-grayscale-12 flex items-center gap-2">
            <CalendarCheckIcon size={18} className="text-accent-9" />
            Llamados de Rodaje
          </h2>
        </div>

        {/* List of Shooting Schedules */}
        <div className="flex flex-col gap-4">
          {schedules.map((ev) => (
            <div
              key={ev._id}
              className="rounded-2xl border border-grayscale-3 bg-grayscale-1 p-4 sm:p-5 shadow-sm flex flex-col gap-3.5 dark:border-grayscale-4/80 dark:bg-grayscale-2"
            >
              {/* Card Header: Date & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-grayscale-3/70 pb-3 dark:border-grayscale-4/60">
                <span className="font-mono text-xs font-bold text-accent-10 dark:text-accent-9 capitalize">
                  {formatDate(ev.date)}
                </span>
                <span className="self-start sm:self-auto font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-11 dark:text-emerald-400 bg-emerald-2/60 dark:bg-emerald-9/20 border border-emerald-4/30 px-2.5 py-0.5 rounded-md">
                  {STATUS_BADGE[ev.status as "scheduled"]?.label || ev.status}
                </span>
              </div>

              {/* Title & Cast Info */}
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-lg font-extrabold text-grayscale-12 tracking-tight">
                  {ev.title}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-grayscale-11">
                  <span className="font-bold text-grayscale-12">{ev.actorName}</span>
                  <span className="text-accent-10 dark:text-accent-9 font-semibold">({ev.characterName})</span>
                </div>
              </div>

              {/* Call Time & Location Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-3 rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 dark:border-grayscale-4/60 dark:bg-grayscale-3/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-2/60 text-accent-10 dark:bg-accent-9/20 dark:text-accent-9">
                    <ClockIcon size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-grayscale-8">Hora de Citación</span>
                    <span className="text-sm font-mono font-bold text-accent-11 dark:text-accent-9 leading-tight">{format12Hour(ev.callTime)}</span>
                    <span className="text-[10px] text-grayscale-9 font-mono truncate">Rodaje: {format12Hour(ev.startTime)} - {format12Hour(ev.endTime)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-grayscale-3 bg-grayscale-2/60 p-3 dark:border-grayscale-4/60 dark:bg-grayscale-3/40">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-2/60 text-red-9 dark:bg-red-9/20 dark:text-red-4">
                    <MapPinIcon size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-grayscale-8">Locación</span>
                    <span className="text-xs font-bold text-grayscale-12 leading-snug">{ev.location}</span>
                  </div>
                </div>
              </div>

              {/* Scene & Costume Notes */}
              {ev.sceneDetails && (
                <div className="flex flex-col gap-1 rounded-xl border border-grayscale-3 bg-grayscale-2/40 p-3 dark:border-grayscale-4/60 dark:bg-grayscale-3/30 text-xs">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                    Notas de la Escena / Vestuario
                  </span>
                  <p className="text-grayscale-11 leading-relaxed">{ev.sceneDetails}</p>
                </div>
              )}
            </div>
          ))}

          {schedules.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-grayscale-3 p-8 sm:p-16 text-center dark:border-grayscale-4">
              <UserCheckIcon size={44} className="text-grayscale-8 mb-3 shrink-0" />
              <h3 className="font-mono text-sm font-bold text-grayscale-11 uppercase tracking-wide">Sin llamadas pendientes</h3>
              <p className="text-xs text-grayscale-9 mt-1.5 max-w-sm">Actualmente no tienes fechas de rodaje agendadas en la plataforma.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
