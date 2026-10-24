"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  CheckIcon,
  GlobeSimpleIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { SYSTEM_ACCOUNTS } from "@/components/notes/notes-helpers";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";

type Visibility = "private" | "all" | "selected";

type ProjectAccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"notes">;
  projectTitle: string;
  currentVisibility?: Visibility;
  currentSharedWith?: string[];
  actorEmail: string;
  isAdmin: boolean;
};

function getInitials(name: string, email: string) {
  const clean = (name || email).trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function ProjectAccessModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  currentVisibility = "private",
  currentSharedWith = [],
  actorEmail,
  isAdmin,
}: ProjectAccessModalProps) {
  const usersList = useQuery(api.users.list) ?? [];
  const updateAccess = useMutation(api.notes.updateAccess);

  const [visibility, setVisibility] = useState<Visibility>(
    currentVisibility || (currentSharedWith?.length ? "selected" : "private"),
  );
  const [selectedEmails, setSelectedEmails] = useState<string[]>(
    currentSharedWith ?? [],
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVisibility(
        currentVisibility || (currentSharedWith?.length ? "selected" : "private"),
      );
      setSelectedEmails(currentSharedWith ?? []);
      setMemberSearch("");
      setError(null);
    }
  }, [open, currentVisibility, currentSharedWith]);

  // Unificar usuarios del sistema con usuarios de base de datos
  const allMembers = useMemo(() => {
    const map = new Map<string, { email: string; name: string; role?: string }>();

    for (const u of SYSTEM_ACCOUNTS) {
      map.set(u.email.toLowerCase(), {
        email: u.email.toLowerCase(),
        name: u.name,
      });
    }

    for (const u of usersList) {
      const email = u.email.toLowerCase();
      const existing = map.get(email);
      map.set(email, {
        email,
        name: u.name || existing?.name || email,
        role: u.role,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [usersList]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    if (!q) return allMembers;
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [allMembers, memberSearch]);

  function toggleEmail(email: string) {
    const norm = email.toLowerCase();
    setSelectedEmails((prev) =>
      prev.includes(norm) ? prev.filter((e) => e !== norm) : [...prev, norm],
    );
  }

  function selectAll() {
    setSelectedEmails(allMembers.map((m) => m.email));
  }

  function deselectAll() {
    setSelectedEmails([]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateAccess({
        id: projectId,
        visibility,
        sharedWith: visibility === "selected" ? selectedEmails : [],
        actorEmail,
        isAdmin,
      });
      onOpenChange(false);
    } catch {
      setError("No se pudieron guardar los permisos. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    onOpenChange(nextOpen);
  };

  const MODES: {
    id: Visibility;
    label: string;
    description: string;
    icon: typeof LockKeyIcon;
  }[] = [
    {
      id: "private",
      label: "Solo creador y administradores",
      description: "Nadie más del equipo podrá ver este proyecto.",
      icon: LockKeyIcon,
    },
    {
      id: "all",
      label: "Todo el equipo",
      description: "Cualquier persona con acceso a la plataforma puede verlo.",
      icon: GlobeSimpleIcon,
    },
    {
      id: "selected",
      label: "Usuarios específicos",
      description: "Selecciona individualmente quiénes tienen acceso.",
      icon: UsersIcon,
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-black/60 backdrop-blur-md animate-backdrop" />

        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <Dialog.Popup
            onKeyDown={(e) => {
              if (e.key === "Escape" && typeof window !== "undefined") {
                window.getSelection()?.removeAllRanges();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            className="relative my-auto flex w-full max-w-[480px] flex-col rounded-2xl border border-grayscale-4 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2 shadow-2xl shadow-black/25 outline-none animate-modal overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 pb-4 border-b border-grayscale-3 dark:border-grayscale-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-grayscale-4 bg-grayscale-2 dark:bg-grayscale-3 text-grayscale-12 shadow-2xs">
                  <ShieldCheckIcon size={20} weight="bold" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Dialog.Title className="text-sm sm:text-base font-bold text-grayscale-12 tracking-tight">
                    Acceso al proyecto
                  </Dialog.Title>
                  <p className="text-xs text-grayscale-11 truncate max-w-[280px] sm:max-w-[320px]">
                    {projectTitle}
                  </p>
                </div>
              </div>

              <Dialog.Close
                aria-label="Cerrar modal"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-grayscale-4 bg-grayscale-1 text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 hover:border-grayscale-5 active:scale-[0.96] dark:bg-grayscale-3 dark:hover:bg-grayscale-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
              >
                <XIcon size={14} weight="bold" />
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 p-5 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-6 bg-red-2 p-3 text-xs text-red-11"
                >
                  {error}
                </div>
              )}

              {/* Modes Selection Group */}
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-10">
                  Nivel de visibilidad
                </span>

                <div className="rounded-xl border border-grayscale-4 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2 divide-y divide-grayscale-3 dark:divide-grayscale-4 overflow-hidden shadow-2xs">
                  {MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = visibility === mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setVisibility(mode.id)}
                        className={cn(
                          "w-full flex items-center gap-3.5 p-3.5 text-left transition-colors cursor-pointer outline-none focus-visible:bg-grayscale-2",
                          isSelected
                            ? "bg-accent-2/30 dark:bg-accent-3/20"
                            : "hover:bg-grayscale-2/60 dark:hover:bg-grayscale-3/40",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                            isSelected
                              ? "border-accent-6 bg-accent-3 text-accent-11 dark:border-accent-7 dark:bg-accent-4"
                              : "border-grayscale-4 bg-grayscale-2 text-grayscale-11 dark:bg-grayscale-3",
                          )}
                        >
                          <Icon size={17} weight={isSelected ? "bold" : "regular"} />
                        </div>

                        <div className="flex flex-1 flex-col gap-0.5 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-grayscale-12 leading-snug">
                            {mode.label}
                          </p>
                          <p className="text-[11px] text-grayscale-11 leading-normal text-pretty">
                            {mode.description}
                          </p>
                        </div>

                        {/* Custom Modern Radio */}
                        <div
                          className={cn(
                            "flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-all",
                            isSelected
                              ? "border-accent-9 bg-accent-9 shadow-2xs"
                              : "border-grayscale-5 bg-transparent dark:border-grayscale-6",
                          )}
                        >
                          {isSelected && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Users Selector */}
              {visibility === "selected" && (
                <div className="flex flex-col gap-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-10">
                      Miembros con acceso ({selectedEmails.length})
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-[11px] font-semibold text-grayscale-11 hover:text-grayscale-12 cursor-pointer transition-colors"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-grayscale-6 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-[11px] font-semibold text-grayscale-11 hover:text-grayscale-12 cursor-pointer transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative flex items-center">
                    <MagnifyingGlassIcon
                      size={14}
                      className="absolute left-3 text-grayscale-10 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Buscar por nombre o correo..."
                      className="h-9 w-full rounded-xl border border-grayscale-4 bg-grayscale-2/60 pl-8.5 pr-8 text-xs text-grayscale-12 placeholder:text-grayscale-9 outline-none transition-colors focus:border-accent-8 focus:bg-grayscale-1 dark:bg-grayscale-3/60 dark:focus:bg-grayscale-2"
                    />
                    {memberSearch && (
                      <button
                        type="button"
                        onClick={() => setMemberSearch("")}
                        className="absolute right-2.5 flex size-4 items-center justify-center rounded-full text-grayscale-10 hover:text-grayscale-12"
                      >
                        <XIcon size={12} weight="bold" />
                      </button>
                    )}
                  </div>

                  {/* Member List */}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-grayscale-4 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2 divide-y divide-grayscale-3/70 dark:divide-grayscale-4/70 shadow-2xs">
                    {filteredMembers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-grayscale-10">
                        No se encontraron miembros con ese término.
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const checked = selectedEmails.includes(member.email);
                        const initials = getInitials(member.name, member.email);

                        return (
                          <button
                            key={member.email}
                            type="button"
                            onClick={() => toggleEmail(member.email)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer outline-none",
                              checked
                                ? "bg-accent-2/20 dark:bg-accent-3/15"
                                : "hover:bg-grayscale-2/60 dark:hover:bg-grayscale-3/40",
                            )}
                          >
                            {/* Avatar with Initials */}
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-grayscale-4 bg-grayscale-3 font-mono text-[10px] font-bold text-grayscale-12 dark:bg-grayscale-4">
                              {initials}
                            </div>

                            <div className="flex flex-1 flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="truncate text-xs font-semibold text-grayscale-12">
                                  {member.name}
                                </span>
                                {member.role && (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-grayscale-3 text-grayscale-11 border border-grayscale-4 shrink-0">
                                    {member.role}
                                  </span>
                                )}
                              </div>
                              <span className="truncate font-mono text-[10px] text-grayscale-10">
                                {member.email}
                              </span>
                            </div>

                            {/* Checkbox */}
                            <div
                              className={cn(
                                "flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-all active:scale-[0.96]",
                                checked
                                  ? "border-accent-9 bg-accent-9 text-white shadow-2xs"
                                  : "border-grayscale-5 bg-grayscale-1 dark:border-grayscale-6 dark:bg-grayscale-3",
                              )}
                            >
                              {checked && <CheckIcon size={12} weight="bold" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-grayscale-3 dark:border-grayscale-4 bg-grayscale-2/30 dark:bg-grayscale-3/20">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-grayscale-11 truncate pr-2">
                {visibility === "all" ? (
                  <>
                    <GlobeSimpleIcon size={13} className="shrink-0 text-grayscale-11" />
                    <span className="truncate">Visible para el equipo</span>
                  </>
                ) : visibility === "selected" ? (
                  <>
                    <UsersIcon size={13} className="shrink-0 text-accent-11" />
                    <span className="truncate">
                      {selectedEmails.length}{" "}
                      {selectedEmails.length === 1 ? "usuario" : "usuarios"}
                    </span>
                  </>
                ) : (
                  <>
                    <LockKeyIcon size={13} className="shrink-0 text-grayscale-10" />
                    <span className="truncate">Solo administradores</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="h-8.5 px-3.5 cursor-pointer rounded-lg text-xs font-semibold text-grayscale-11 hover:text-grayscale-12 hover:bg-grayscale-3 transition-colors active:scale-[0.96] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg bg-grayscale-12 px-4 text-xs font-semibold text-grayscale-1 shadow-2xs transition-all hover:opacity-90 active:scale-[0.96] disabled:opacity-50 dark:bg-grayscale-12 dark:text-grayscale-1"
                >
                  {saving && <SpinnerGapIcon size={14} className="animate-spin" />}
                  <span>Guardar cambios</span>
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
