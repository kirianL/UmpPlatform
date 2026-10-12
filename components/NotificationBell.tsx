"use client";

import {
  BellIcon,
  BellRingingIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmSlateIcon,
  MapPinIcon,
  UserCheckIcon,
  CalendarDotsIcon,
  ArrowRightIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import { cn } from "@/helpers/classname-helper";
import { Tabs } from "@/components/public/Tabs";

type NotificationType = "rodaje_actor" | "rodaje_general" | "evento_calendario";

interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle?: string;
  timeLabel?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  isToday: boolean;
  isTomorrow: boolean;
  daysDiff: number; // 0 = hoy, 1 = mañana, etc.
  href: string;
}

function format12h(timeStr?: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) {
    return trimmed.toUpperCase();
  }
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, "0");
    if (isNaN(hours)) return trimmed;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return trimmed;
}

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateFriendly(ymd: string, isToday: boolean, isTomorrow: boolean): string {
  if (isToday) return "Hoy";
  if (isTomorrow) return "Mañana";
  const date = parseYmd(ymd);
  return date.toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const STORAGE_KEY = "ump_read_notifications_v1";

export default function NotificationBell({
  align = "right",
  className,
}: {
  align?: "left" | "right";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"todas" | "hoy" | "proximas">("todas");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // Ignorar fallos de acceso a localStorage
    }
  }, []);

  // Save read notifications to localStorage
  const markAsRead = (idsToMark: string[]) => {
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...idsToMark]));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

  // Close on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!mobileDrawerRef.current || !mobileDrawerRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);

      // Lock mobile body scroll while open
      const originalOverflow = document.body.style.overflow;
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const actorSchedules = useQuery(api.actorSchedules.get);
  const events = useQuery(api.events.get);

  // Generate notification items based on real calendar and actor schedules
  const notifications: SystemNotification[] = useMemo(() => {
    const todayStr = getLocalDateString();
    const todayDate = parseYmd(todayStr);
    const msInDay = 24 * 60 * 60 * 1000;

    const list: SystemNotification[] = [];

    // 1. Actor schedules (rodajes con actores)
    if (actorSchedules) {
      for (const item of actorSchedules) {
        if (item.status === "cancelled") continue;
        const itemDate = parseYmd(item.date);
        const diffDays = Math.round((itemDate.getTime() - todayDate.getTime()) / msInDay);

        // Mostrar eventos desde hoy hasta los próximos 7 días (o pasados recientes de hoy)
        if (diffDays >= 0 && diffDays <= 7) {
          const isToday = diffDays === 0;
          const isTomorrow = diffDays === 1;
          const callTimeFormatted = format12h(item.callTime || item.startTime);

          list.push({
            id: `actor-${item._id}`,
            type: "rodaje_actor",
            title: isToday
              ? `Hoy hay rodaje con ${item.actorName}`
              : isTomorrow
              ? `Mañana: Rodaje con ${item.actorName}`
              : `Rodaje programado: ${item.actorName}`,
            subtitle: item.characterName
              ? `Personaje: ${item.characterName}${item.title ? ` · ${item.title}` : ""}`
              : item.title,
            timeLabel: callTimeFormatted ? `Llamado: ${callTimeFormatted}` : undefined,
            location: item.location || undefined,
            date: item.date,
            isToday,
            isTomorrow,
            daysDiff: diffDays,
            href: "/calendario-actores",
          });
        }
      }
    }

    // 2. Calendar events (rodajes y eventos de producción)
    if (events) {
      for (const item of events) {
        if (item.status === "cancelled") continue;
        const itemDate = parseYmd(item.date);
        const diffDays = Math.round((itemDate.getTime() - todayDate.getTime()) / msInDay);

        if (diffDays >= 0 && diffDays <= 7) {
          const isToday = diffDays === 0;
          const isTomorrow = diffDays === 1;
          const timeFormatted = format12h(item.time);
          const isShooting = item.type === "shooting";

          list.push({
            id: `event-${item._id}`,
            type: isShooting ? "rodaje_general" : "evento_calendario",
            title: isShooting
              ? isToday
                ? `Hoy hay rodaje: ${item.title}`
                : isTomorrow
                ? `Mañana: Rodaje de ${item.title}`
                : `Rodaje: ${item.title}`
              : isToday
              ? `Hoy: ${item.title}`
              : isTomorrow
              ? `Mañana: ${item.title}`
              : item.title,
            subtitle: item.description || (isShooting ? "Jornada de producción" : "Evento en calendario"),
            timeLabel: timeFormatted ? `Hora: ${timeFormatted}` : undefined,
            date: item.date,
            isToday,
            isTomorrow,
            daysDiff: diffDays,
            href: "/calendario",
          });
        }
      }
    }

    // Sort: Hoy first, then by date, then by time
    list.sort((a, b) => {
      if (a.daysDiff !== b.daysDiff) return a.daysDiff - b.daysDiff;
      return (a.timeLabel || "").localeCompare(b.timeLabel || "");
    });

    return list;
  }, [actorSchedules, events]);

  // Counts
  const todayCount = useMemo(
    () => notifications.filter((n) => n.isToday).length,
    [notifications]
  );

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const unreadTodayCount = useMemo(() => {
    return notifications.filter((n) => n.isToday && !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  // Filtered list by active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "hoy") {
      return notifications.filter((n) => n.isToday);
    }
    if (activeTab === "proximas") {
      return notifications.filter((n) => !n.isToday);
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleMarkAllRead = () => {
    markAsRead(notifications.map((n) => n.id));
  };

  const handleNotificationClick = (item: SystemNotification) => {
    markAsRead([item.id]);
    setIsOpen(false);
  };

  const renderContent = (isMobile: boolean) => (
    <>
      {isMobile && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex w-full cursor-grab active:cursor-grabbing justify-center pt-3 pb-1 shrink-0"
          aria-label="Cerrar notificaciones"
        >
          <span className="h-1.5 w-12 rounded-full bg-grayscale-4 dark:bg-grayscale-5" />
        </button>
      )}

      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-grayscale-3/80 shrink-0 dark:border-grayscale-4/60",
          isMobile ? "px-5 py-3" : "px-4 py-3"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
            Notificaciones
          </span>
          {todayCount > 0 && (
            <span className="rounded-full bg-red-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-red-11 dark:bg-red-9/20 dark:text-red-9">
              {todayCount} hoy
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className={cn(
                "flex items-center gap-1 font-mono font-medium text-grayscale-9 hover:bg-grayscale-2 hover:text-grayscale-12 dark:hover:bg-grayscale-3 dark:text-grayscale-10 dark:hover:text-grayscale-12 transition-colors cursor-pointer",
                isMobile
                  ? "rounded-lg px-2.5 py-1.5 text-[11px]"
                  : "rounded-md px-2 py-1 text-[10px]"
              )}
              title="Marcar todas como leídas"
            >
              <CheckCircleIcon size={isMobile ? 13 : 12} weight="bold" />
              <span>Leídas</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex cursor-pointer items-center justify-center text-grayscale-8 hover:bg-grayscale-2 hover:text-grayscale-12 dark:hover:bg-grayscale-3 dark:text-grayscale-9 dark:hover:text-grayscale-12 transition-colors",
              isMobile
                ? "size-7.5 rounded-full bg-grayscale-2 dark:bg-grayscale-3 text-grayscale-9"
                : "size-6 rounded-md"
            )}
            aria-label="Cerrar"
          >
            <XIcon size={isMobile ? 14 : 12} weight={isMobile ? "bold" : "regular"} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "todas" | "hoy" | "proximas")}
        className="w-full shrink-0"
      >
        <div
          className={cn(
            "border-b border-grayscale-3/70 bg-grayscale-2/30 dark:border-grayscale-4/60 dark:bg-grayscale-2/10",
            isMobile ? "px-4 py-2" : "px-3 py-1.5"
          )}
        >
          <Tabs.List className={cn("border-0 pb-0 gap-1 flex", isMobile ? "w-full" : "")}>
            <Tabs.Tab
              value="todas"
              className={cn(
                "font-mono font-bold uppercase rounded-md text-grayscale-10 data-active:text-grayscale-12 transition-colors",
                isMobile
                  ? "flex-1 text-center py-1.5 px-3 text-[10px]"
                  : "text-center py-1 px-2.5 text-[10px]"
              )}
            >
              Todas ({notifications.length})
            </Tabs.Tab>
            <Tabs.Tab
              value="hoy"
              className={cn(
                "font-mono font-bold uppercase rounded-md text-grayscale-10 data-active:text-grayscale-12 transition-colors",
                isMobile
                  ? "flex-1 text-center py-1.5 px-3 text-[10px]"
                  : "text-center py-1 px-2.5 text-[10px]"
              )}
            >
              Hoy ({todayCount})
            </Tabs.Tab>
            <Tabs.Tab
              value="proximas"
              className={cn(
                "font-mono font-bold uppercase rounded-md text-grayscale-10 data-active:text-grayscale-12 transition-colors",
                isMobile
                  ? "flex-1 text-center py-1.5 px-3 text-[10px]"
                  : "text-center py-1 px-2.5 text-[10px]"
              )}
            >
              Próximas ({notifications.length - todayCount})
            </Tabs.Tab>
            <Tabs.Indicator className="bg-grayscale-3 dark:bg-grayscale-4/80 rounded-md shadow-xs" />
          </Tabs.List>
        </div>
      </Tabs.Root>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filteredNotifications.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center px-4 text-center",
              isMobile ? "py-14" : "py-10"
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-grayscale-3/60 text-grayscale-8 dark:bg-grayscale-4 dark:text-grayscale-9 mb-2.5">
              <CalendarDotsIcon size={isMobile ? 20 : 18} />
            </div>
            <p className="font-mono text-xs font-semibold text-grayscale-11">
              {activeTab === "hoy"
                ? "No hay rodajes programados para hoy"
                : "No hay eventos próximos en los próximos días"}
            </p>
            <p className="mt-1 text-[11px] text-grayscale-8">
              Los llamados y eventos de calendario aparecerán automáticamente aquí.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isRead = readIds.includes(item.id);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  "group flex items-start gap-3.5 transition-colors text-left border-b border-grayscale-3/40 dark:border-grayscale-4/30 last:border-b-0 active:bg-grayscale-2 dark:active:bg-grayscale-3",
                  isMobile ? "px-5 py-3.5" : "px-4 py-3",
                  isRead
                    ? "hover:bg-grayscale-2/60 dark:hover:bg-grayscale-3/40"
                    : "bg-grayscale-2/30 hover:bg-grayscale-2/70 dark:bg-grayscale-3/20 dark:hover:bg-grayscale-3/50"
                )}
              >
                {/* Minimalist Icon */}
                <div
                  className={cn(
                    "shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 flex",
                    isMobile ? "size-8.5" : "size-8 rounded-lg",
                    item.isToday
                      ? "bg-red-2 text-red-11 dark:bg-red-9/20 dark:text-red-9"
                      : "bg-grayscale-3/70 text-grayscale-11 dark:bg-grayscale-4 dark:text-grayscale-10 group-hover:text-grayscale-12"
                  )}
                >
                  {item.type === "rodaje_actor" ? (
                    <UserCheckIcon size={isMobile ? 17 : 16} weight={item.isToday ? "fill" : "regular"} />
                  ) : item.type === "rodaje_general" ? (
                    <FilmSlateIcon size={isMobile ? 17 : 16} weight={item.isToday ? "fill" : "regular"} />
                  ) : (
                    <CalendarDotsIcon size={isMobile ? 17 : 16} weight={item.isToday ? "fill" : "regular"} />
                  )}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isToday ? (
                        <span className="font-mono text-[9px] font-bold uppercase text-red-9 dark:text-red-9 tracking-wider">
                          Hoy
                        </span>
                      ) : item.isTomorrow ? (
                        <span className="font-mono text-[9px] font-bold uppercase text-orange-9 dark:text-orange-9 tracking-wider">
                          Mañana
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] font-bold uppercase text-grayscale-9 dark:text-grayscale-10 tracking-wider">
                          {formatDateFriendly(item.date, false, false)}
                        </span>
                      )}

                      {item.timeLabel && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-grayscale-9 dark:text-grayscale-10">
                          <span className="text-grayscale-6 select-none">·</span>
                          <ClockIcon size={11} className="text-grayscale-7" />
                          {item.timeLabel}
                        </span>
                      )}
                    </div>

                    {!isRead && (
                      <span className="size-1.5 rounded-full bg-accent-9 shrink-0" title="No leída" />
                    )}
                  </div>

                  <h4
                    className={cn(
                      "font-medium text-grayscale-12 leading-snug line-clamp-2",
                      isMobile ? "text-[13px]" : "text-xs"
                    )}
                  >
                    {item.title}
                  </h4>

                  {item.subtitle && (
                    <p
                      className={cn(
                        "mt-0.5 text-grayscale-9 dark:text-grayscale-10 line-clamp-1",
                        isMobile ? "text-xs" : "text-[11px]"
                      )}
                    >
                      {item.subtitle}
                    </p>
                  )}

                  {item.location && (
                    <p
                      className={cn(
                        "mt-1 flex items-center gap-1 text-grayscale-8 line-clamp-1",
                        isMobile ? "text-[11px]" : "text-[10px]"
                      )}
                    >
                      <MapPinIcon size={isMobile ? 12 : 11} className="shrink-0 text-grayscale-7" />
                      <span>{item.location}</span>
                    </p>
                  )}
                </div>

                {!isMobile && (
                  <ArrowRightIcon
                    size={14}
                    className="shrink-0 self-center text-grayscale-7 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-grayscale-11"
                  />
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* Quick Footer Links */}
      <div
        className={cn(
          "flex items-center justify-between border-t border-grayscale-3/80 bg-grayscale-1/90 shrink-0 dark:border-grayscale-4/60 dark:bg-grayscale-1",
          isMobile
            ? "px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "px-4 py-2.5"
        )}
      >
        <Link
          href="/calendario-actores"
          onClick={() => setIsOpen(false)}
          className={cn(
            "font-mono font-semibold uppercase text-grayscale-9 hover:text-grayscale-12 dark:text-grayscale-10 dark:hover:text-grayscale-12 transition-colors active:text-grayscale-12",
            isMobile ? "text-[11px] py-1" : "text-[10px]"
          )}
        >
          Agenda de actores
        </Link>
        <span className="text-grayscale-5 select-none">/</span>
        <Link
          href="/calendario"
          onClick={() => setIsOpen(false)}
          className={cn(
            "font-mono font-semibold uppercase text-grayscale-9 hover:text-grayscale-12 dark:text-grayscale-10 dark:hover:text-grayscale-12 transition-colors active:text-grayscale-12",
            isMobile ? "text-[11px] py-1" : "text-[10px]"
          )}
        >
          Calendario general
        </Link>
      </div>
    </>
  );

  return (
    <>
      <div ref={dropdownRef} className={cn("relative inline-block", className)}>
        {/* Bell Trigger Button - Minimalist Modern Style */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "group relative flex size-8 cursor-pointer items-center justify-center rounded-lg text-grayscale-10 transition-colors duration-150 hover:bg-grayscale-3/70 hover:text-grayscale-12 dark:hover:bg-grayscale-3 dark:hover:text-grayscale-12",
            isOpen && "bg-grayscale-3 text-grayscale-12 dark:bg-grayscale-3"
          )}
          aria-label="Notificaciones"
          title={
            unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "notificación" : "notificaciones"}`
              : "Notificaciones"
          }
        >
          <BellIcon
            size={17}
            weight={isOpen || unreadCount > 0 ? "fill" : "regular"}
            className="transition-transform duration-150 group-hover:scale-105"
          />

          {/* Minimalist Micro-Badge: stays strictly within button bounds */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-mono font-bold leading-none ring-1.5 ring-grayscale-1 dark:ring-grayscale-1 shadow-xs",
                unreadTodayCount > 0
                  ? "bg-red-9 text-white"
                  : "bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-12 dark:text-grayscale-1"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Desktop Popover (Anchored, >= 640px only) */}
        {isOpen && (
          <div
            className={cn(
              "hidden sm:flex sm:flex-col sm:absolute sm:top-full sm:mt-2 sm:w-96 sm:max-h-[520px] sm:rounded-2xl sm:border sm:border-grayscale-3 sm:bg-grayscale-1 sm:shadow-2xl sm:dark:border-grayscale-4 sm:dark:bg-grayscale-2 sm:animate-in sm:fade-in-0 sm:zoom-in-95 sm:duration-150 z-50 overflow-hidden outline-none",
              align === "left"
                ? "left-0 origin-top-left"
                : "right-0 origin-top-right"
            )}
          >
            {renderContent(false)}
          </div>
        )}
      </div>

      {/* Mobile Native Bottom Sheet (Rendered directly in document.body via Portal) */}
      {mounted && isOpen && typeof document !== "undefined" && createPortal(
        <div className="sm:hidden">
          {/* Solid Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <div
            ref={mobileDrawerRef}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[86dvh] w-full rounded-t-[28px] border-t border-grayscale-3/80 bg-grayscale-1 shadow-2xl dark:border-grayscale-4 dark:bg-grayscale-1 animate-in slide-in-from-bottom duration-250 ease-out outline-none overflow-hidden"
          >
            {renderContent(true)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
