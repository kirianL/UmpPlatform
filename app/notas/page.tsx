"use client";

import {
  CheckCircleIcon,
  CircleIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import PageContainer from "@/components/public/PageContainer";
import { Tabs } from "@/components/public/Tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";

type Note = Doc<"notes">;
type NoteColor = "neutral" | "accent" | "orange" | "green";
type NotesTab = "activas" | "hechas" | "todas";

const SYSTEM_ACCOUNTS = [
  { email: "admin@ultimate.cr", name: "Administrador UMP" },
  { email: "michelle@ultimate.cr", name: "Michelle" },
  { email: "tatiana@ultimate.cr", name: "Tatiana" },
  { email: "eymar@ultimate.cr", name: "Eymar" },
  { email: "kirian@ultimate.cr", name: "Kirian" },
];

const NOTE_COLORS: {
  id: NoteColor;
  indicator: string;
}[] = [
  { id: "neutral", indicator: "bg-grayscale-6" },
  { id: "accent", indicator: "bg-accent-9" },
  { id: "orange", indicator: "bg-orange-9" },
  { id: "green", indicator: "bg-green-9" },
];

function colorStyles(color: string) {
  return NOTE_COLORS.find((item) => item.id === color) ?? NOTE_COLORS[0];
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function AutoResizeTextarea({
  className,
  onInput,
  ...props
}: React.ComponentProps<"textarea">) {
  function resize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <textarea
      {...props}
      rows={1}
      ref={(node) => resize(node)}
      onInput={(e) => {
        resize(e.currentTarget);
        onInput?.(e);
      }}
      className={cn("resize-none overflow-hidden", className)}
    />
  );
}

export default function NotasPage() {
  const { userRole, userEmail } = useAuth();
  const isAdmin =
    userRole === "admin" ||
    userRole === "programador" ||
    userEmail?.toLowerCase() === "admin@ultimate.cr" ||
    userEmail?.toLowerCase() === "kirian@ultimate.cr";

  const currentUserName =
    SYSTEM_ACCOUNTS.find(
      (account) => account.email.toLowerCase() === userEmail?.toLowerCase(),
    )?.name ||
    userEmail ||
    "Usuario";

  const notes =
    useQuery(
      api.notes.get,
      userEmail ? { viewerEmail: userEmail, isAdmin } : "skip",
    ) ?? [];

  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const toggleDone = useMutation(api.notes.toggleDone);
  const togglePinned = useMutation(api.notes.togglePinned);
  const toggleChecklistItem = useMutation(api.notes.toggleChecklistItem);
  const removeNote = useMutation(api.notes.remove);

  const [quickText, setQuickText] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<NotesTab>("activas");
  const [deleteId, setDeleteId] = useState<Id<"notes"> | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const authArgs = {
    actorEmail: userEmail || "",
    isAdmin,
  };

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of notes) {
      map.set(note.ownerEmail, note.ownerName || note.ownerEmail);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (isAdmin && ownerFilter !== "all" && note.ownerEmail !== ownerFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const inTitle = note.title.toLowerCase().includes(q);
        const inContent = note.content?.toLowerCase().includes(q) ?? false;
        const inChecklist = (note.checklist ?? []).some((item) =>
          item.text.toLowerCase().includes(q),
        );
        const inOwner = (note.ownerName || note.ownerEmail)
          .toLowerCase()
          .includes(q);
        if (!inTitle && !inContent && !inChecklist && !inOwner) return false;
      }
      return true;
    });
  }, [notes, search, ownerFilter, isAdmin]);

  const activeNotes = filteredNotes.filter((note) => !note.done);
  const doneNotes = filteredNotes.filter((note) => note.done);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickText.trim();
    if (!title || !userEmail) return;
    await createNote({
      title,
      ownerEmail: userEmail,
      ownerName: currentUserName,
      ...authArgs,
    });
    setQuickText("");
    quickInputRef.current?.focus();
  }

  async function patchNote(
    note: Note,
    patch: { title?: string; content?: string },
  ) {
    const title = (patch.title ?? note.title).trim() || "Nota sin título";
    const content = patch.content ?? note.content ?? "";
    if (title === note.title && content === (note.content ?? "")) return;

    await updateNote({
      id: note._id,
      title,
      content,
      color: note.color,
      pinned: note.pinned,
      done: note.done,
      checklist: note.checklist,
      ...authArgs,
    });
  }

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-4 sm:gap-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-mono text-lg sm:text-xl font-bold uppercase text-grayscale-12">
            Notas
          </h1>
          <p className="hidden sm:block text-sm text-grayscale-10">
            Anotá ideas, recordatorios y pendientes.
          </p>
        </div>

        <form
          onSubmit={handleQuickAdd}
          className="sticky top-14 xl:static z-20 -mx-4 px-4 py-2.5 flex items-center gap-2 bg-grayscale-1/95 backdrop-blur border-y border-grayscale-3 dark:border-grayscale-2 md:-mx-6 md:px-6 lg:-mx-10 lg:px-10 xl:mx-0 xl:px-0 xl:py-0 xl:border-0 xl:bg-transparent xl:backdrop-blur-none"
        >
          <div className="relative flex-1 min-w-0">
            <NotePencilIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8 pointer-events-none"
            />
            <input
              ref={quickInputRef}
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Anotar..."
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              className="w-full rounded-lg border border-grayscale-3 bg-grayscale-1 py-3 sm:py-2.5 pl-10 pr-3 text-base sm:text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-4 dark:bg-grayscale-3"
            />
          </div>
          <Button
            variant="primary"
            className="size-11 sm:size-auto sm:px-3 shrink-0"
            type="submit"
            disabled={!quickText.trim()}
            aria-label="Anotar"
          >
            <PlusIcon size={18} weight="bold" />
            <span className="hidden sm:inline text-xs">Anotar</span>
          </Button>
        </form>

        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as NotesTab)}
          className="w-full flex flex-col"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1 w-full sm:w-auto">
              <Tabs.Tab
                value="activas"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Activas ({activeNotes.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="hechas"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Hechas ({doneNotes.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="todas"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Todas ({filteredNotes.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56 sm:flex-initial">
                <MagnifyingGlassIcon
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-8"
                />
                <input
                  type="text"
                  placeholder="Buscar nota..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-grayscale-3 bg-grayscale-1 py-1.5 pl-8 pr-3 font-mono text-[11px] text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all focus:border-accent-8 dark:border-grayscale-4 dark:bg-grayscale-3"
                />
              </div>
              {isAdmin && owners.length > 0 && (
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="rounded-lg border border-grayscale-3 bg-grayscale-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-grayscale-11 outline-none transition-all hover:bg-grayscale-2 cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3"
                >
                  <option value="all">Todo el equipo</option>
                  {owners.map(([email, name]) => (
                    <option key={email} value={email}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {(["activas", "hechas", "todas"] as NotesTab[]).map((tab) => {
            const panelNotes =
              tab === "activas"
                ? activeNotes
                : tab === "hechas"
                  ? doneNotes
                  : filteredNotes;

            return (
              <Tabs.Panel key={tab} value={tab} className="mt-4">
                {panelNotes.length === 0 ? (
                  <EmptyState
                    icon={
                      search ? (
                        <MagnifyingGlassIcon size={40} weight="duotone" />
                      ) : (
                        <NotePencilIcon size={40} weight="duotone" />
                      )
                    }
                    title={search ? "Sin resultados" : "Sin notas todavía"}
                    description={
                      search
                        ? `No hay notas que coincidan con "${search}".`
                        : "Escribí arriba y tocá + para anotar."
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {panelNotes.map((note) => {
                      const styles = colorStyles(note.color);
                      const checklist = note.checklist ?? [];
                      const doneCount = checklist.filter(
                        (item) => item.done,
                      ).length;

                      return (
                        <div
                          key={note._id}
                          className={cn(
                            "group relative flex flex-col gap-2.5 rounded-xl border p-3 pl-4 sm:p-4 sm:pl-5 transition-all duration-200",
                            note.done
                              ? "border-grayscale-3 bg-grayscale-2/60 dark:border-grayscale-4 dark:bg-grayscale-3/40"
                              : note.pinned
                                ? "border-accent-6 bg-accent-2/30 shadow-xs dark:border-accent-6/50 dark:bg-accent-3/20"
                                : "border-grayscale-4 bg-grayscale-1 hover:border-grayscale-5 dark:border-grayscale-5 dark:bg-grayscale-2",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full",
                              styles.indicator,
                            )}
                          />

                          <div className="flex items-start gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggleDone({ id: note._id, ...authArgs })
                              }
                              className="flex size-10 shrink-0 items-center justify-center text-grayscale-8 transition-colors hover:text-accent-9"
                              title={
                                note.done
                                  ? "Marcar como activa"
                                  : "Marcar como hecha"
                              }
                            >
                              {note.done ? (
                                <CheckCircleIcon
                                  size={22}
                                  weight="fill"
                                  className="text-green-11"
                                />
                              ) : (
                                <CircleIcon
                                  size={22}
                                  className="text-grayscale-8 hover:text-accent-10"
                                />
                              )}
                            </button>

                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <AutoResizeTextarea
                                key={`${note._id}-title-${note.updatedAt}`}
                                defaultValue={note.title}
                                onBlur={(e) =>
                                  patchNote(note, {
                                    title: e.target.value,
                                  })
                                }
                                className={cn(
                                  "w-full bg-transparent border-0 p-0 text-base sm:text-sm font-medium text-grayscale-12 outline-none whitespace-pre-wrap break-words leading-snug",
                                  note.done && "line-through text-grayscale-9",
                                )}
                              />

                              <AutoResizeTextarea
                                key={`${note._id}-content-${note.updatedAt}`}
                                defaultValue={note.content ?? ""}
                                placeholder="Agregar detalle..."
                                onBlur={(e) =>
                                  patchNote(note, {
                                    content: e.target.value,
                                  })
                                }
                                className={cn(
                                  "w-full bg-transparent border-0 p-0 text-sm sm:text-xs text-grayscale-10 placeholder:text-grayscale-7 outline-none whitespace-pre-wrap break-words leading-relaxed",
                                  note.done && "text-grayscale-8",
                                )}
                              />

                              {checklist.length > 0 && (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  {checklist.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() =>
                                        toggleChecklistItem({
                                          id: note._id,
                                          itemId: item.id,
                                          ...authArgs,
                                        })
                                      }
                                      className="flex min-h-10 items-start gap-2 py-1 text-left"
                                    >
                                      {item.done ? (
                                        <CheckCircleIcon
                                          size={15}
                                          weight="fill"
                                          className="mt-0.5 shrink-0 text-green-11"
                                        />
                                      ) : (
                                        <CircleIcon
                                          size={15}
                                          className="mt-0.5 shrink-0 text-grayscale-8"
                                        />
                                      )}
                                      <span
                                        className={cn(
                                          "text-sm sm:text-xs text-grayscale-11 break-words",
                                          item.done &&
                                            "line-through text-grayscale-8",
                                        )}
                                      >
                                        {item.text}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-1 mt-1">
                                <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap text-[11px] text-grayscale-8">
                                  {note.pinned && (
                                    <Badge
                                      variant="accent"
                                      className="flex items-center gap-1 text-[10px]"
                                    >
                                      <PushPinIcon size={10} weight="fill" />
                                      Fijada
                                    </Badge>
                                  )}
                                  {isAdmin && (
                                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-grayscale-9 bg-grayscale-3 dark:bg-grayscale-4 px-2 py-0.5 rounded-md">
                                      <UserIcon size={11} />
                                      {note.ownerName || note.ownerEmail}
                                    </span>
                                  )}
                                  {checklist.length > 0 && (
                                    <span className="inline-flex items-center gap-1 font-mono text-grayscale-9 bg-grayscale-3 dark:bg-grayscale-4 px-2 py-0.5 rounded-md">
                                      <ListChecksIcon size={11} />
                                      {doneCount}/{checklist.length}
                                    </span>
                                  )}
                                  <span className="font-mono text-grayscale-8">
                                    {formatDate(
                                      note.updatedAt || note.createdAt,
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      togglePinned({
                                        id: note._id,
                                        ...authArgs,
                                      })
                                    }
                                    className={cn(
                                      "flex size-10 sm:size-7 cursor-pointer items-center justify-center rounded-md transition-colors",
                                      note.pinned
                                        ? "text-accent-11 bg-accent-3 dark:bg-accent-4"
                                        : "text-grayscale-8 hover:bg-grayscale-3 hover:text-grayscale-11",
                                    )}
                                    title={
                                      note.pinned ? "Desfijar" : "Fijar nota"
                                    }
                                  >
                                    {note.pinned ? (
                                      <PushPinIcon size={16} weight="fill" />
                                    ) : (
                                      <PushPinSlashIcon size={16} />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteId(note._id)}
                                    className="flex size-10 sm:size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-8 transition-colors hover:bg-red-3 hover:text-red-11"
                                    title="Eliminar"
                                  >
                                    <TrashIcon size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Tabs.Panel>
            );
          })}
        </Tabs.Root>

        <ConfirmModal
          open={deleteId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null);
          }}
          title="Eliminar nota"
          description="Esta nota se eliminará de forma permanente."
          confirmText="Eliminar"
          onConfirm={async () => {
            if (!deleteId) return;
            await removeNote({ id: deleteId, ...authArgs });
            setDeleteId(null);
          }}
        />
      </div>
    </PageContainer>
  );
}
