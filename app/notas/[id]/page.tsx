"use client";

import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowsInLineHorizontalIcon,
  ArrowsOutLineHorizontalIcon,
  CameraIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  DownloadSimpleIcon,
  FileArchiveIcon,
  FileArrowUpIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileDocIcon,
  FileIcon,
  FilePdfIcon,
  FileTextIcon,
  FileVideoIcon,
  FileXlsIcon,
  GlobeSimpleIcon,
  ImageIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  LockKeyIcon,
  PlusIcon,
  SpinnerGapIcon,
  TableIcon,
  TextAaIcon,
  TextTIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  downloadFile,
  formatFileSize,
  formatShortDate,
  pluralize,
  useNotesAuth,
} from "@/components/notes/notes-helpers";
import ProjectAccessModal from "@/components/notes/ProjectAccessModal";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import PageContainer from "@/components/public/PageContainer";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";

type TableData = {
  columns: string[];
  rows: string[][];
};

type BlockType = Doc<"noteBlocks">["type"];
type Block = Doc<"noteBlocks"> & {
  imageUrl: string | null;
  fileUrl?: string | null;
  tableData?: TableData;
};
type ChecklistItem = NonNullable<Doc<"noteBlocks">["checklist"]>[number];

const BLOCK_TYPES: {
  type: BlockType;
  label: string;
  icon: typeof TextTIcon;
}[] = [
  { type: "text", label: "Texto", icon: TextAaIcon },
  { type: "heading", label: "Sección", icon: TextTIcon },
  { type: "checklist", label: "Lista", icon: ListChecksIcon },
  { type: "table", label: "Tabla", icon: TableIcon },
  { type: "image", label: "Imagen", icon: ImageIcon },
  { type: "file", label: "Archivo", icon: FileArrowUpIcon },
  { type: "link", label: "Enlace", icon: LinkSimpleIcon },
];

const TYPE_LABEL: Record<BlockType, string> = {
  text: "Texto",
  heading: "Sección",
  checklist: "Lista",
  table: "Tabla",
  image: "Imagen",
  file: "Archivo",
  link: "Enlace",
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
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

export default function NoteBoardPage() {
  const params = useParams<{ id: string }>();
  const noteId = params.id as Id<"notes">;
  const { userEmail, isAdmin, authArgs } = useNotesAuth();

  const board = useQuery(
    api.notes.getBoard,
    userEmail ? { id: noteId, viewerEmail: userEmail, isAdmin } : "skip",
  );

  const updateMeta = useMutation(api.notes.updateMeta);
  const addBlock = useMutation(api.notes.addBlock);
  const updateBlock = useMutation(api.notes.updateBlock);
  const reorderBlocks = useMutation(api.notes.reorderBlocks);
  const removeBlock = useMutation(api.notes.removeBlock);
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);
  const migrateLegacy = useMutation(api.notes.migrateLegacy);
  const updateCover = useMutation(api.notes.updateCover);

  const [localOrder, setLocalOrder] = useState<Id<"noteBlocks">[] | null>(null);
  const [dragId, setDragId] = useState<Id<"noteBlocks"> | null>(null);
  const [overId, setOverId] = useState<Id<"noteBlocks"> | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [focusId, setFocusId] = useState<Id<"noteBlocks"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"noteBlocks"> | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const migratedRef = useRef(false);

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingCover(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error();
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await updateCover({
        id: noteId,
        storageId,
        ...authArgs,
      });
    } catch {
      setError("No se pudo subir la foto de portada. Probá de nuevo.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveCover() {
    await updateCover({
      id: noteId,
      storageId: undefined,
      ...authArgs,
    });
  }

  const blocks = useMemo(() => {
    const list = (board?.blocks ?? []) as Block[];
    if (!localOrder) return list;
    const byId = new Map(list.map((b) => [b._id, b]));
    const ordered = localOrder
      .map((id) => byId.get(id))
      .filter((b): b is Block => Boolean(b));
    const rest = list.filter((b) => !localOrder.includes(b._id));
    return [...ordered, ...rest];
  }, [board?.blocks, localOrder]);

  // Proyectos creados con la version anterior: pasar su contenido a bloques.
  useEffect(() => {
    if (!board || migratedRef.current) return;
    const { note } = board;
    const hasLegacy =
      Boolean(note.content?.trim()) || (note.checklist?.length ?? 0) > 0;
    if (board.blocks.length === 0 && hasLegacy) {
      migratedRef.current = true;
      migrateLegacy({ id: note._id, ...authArgs }).catch(() => {});
    }
  }, [board, migrateLegacy, authArgs]);

  async function handleAdd(type: BlockType) {
    setError(null);
    if (type === "image") {
      fileInputRef.current?.click();
      return;
    }
    if (type === "file") {
      genericFileInputRef.current?.click();
      return;
    }
    if (type === "table") {
      const id = await addBlock({
        noteId,
        type: "table",
        wide: true,
        content: "Tabla",
        tableData: {
          columns: ["Columna 1", "Columna 2", "Columna 3"],
          rows: [
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
          ],
        },
        ...authArgs,
      });
      setFocusId(id);
      return;
    }
    const id = await addBlock({
      noteId,
      type,
      checklist: type === "checklist" ? [] : undefined,
      ...authArgs,
    });
    setFocusId(id);
  }

  async function uploadFiles(files: File[], forceType?: "image" | "file") {
    if (files.length === 0) return;
    setError(null);
    setUploads((n) => n + files.length);

    for (const file of files) {
      try {
        const isImage = file.type.startsWith("image/");
        const targetType: BlockType =
          forceType ?? (isImage ? "image" : "file");

        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) throw new Error();
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        await addBlock({
          noteId,
          type: targetType,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          ...authArgs,
        });
      } catch {
        setError(`No se pudo subir "${file.name}". Probá de nuevo.`);
      } finally {
        setUploads((n) => n - 1);
      }
    }
  }

  // Pegar archivos o imagenes desde el portapapeles en cualquier parte del tablero.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length > 0) {
        e.preventDefault();
        void uploadFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function commitOrder(ids: Id<"noteBlocks">[]) {
    setLocalOrder(ids);
    reorderBlocks({ noteId, orderedIds: ids, ...authArgs })
      .catch(() => setError("No se pudo guardar el nuevo orden."))
      .finally(() => setLocalOrder(null));
  }

  function moveBlock(id: Id<"noteBlocks">, delta: number) {
    const ids = blocks.map((b) => b._id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    commitOrder(ids);
  }

  function dropOn(targetId: Id<"noteBlocks">) {
    if (!dragId || dragId === targetId) return;
    const ids = blocks.map((b) => b._id);
    const from = ids.indexOf(dragId);
    ids.splice(from, 1);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    commitOrder(ids);
  }

  if (board === null) {
    return (
      <PageContainer size="wide">
        <EmptyState
          title="Proyecto no disponible"
          description="No existe o no tenés acceso a este tablero."
          action={
            <Link
              href="/notas"
              className="font-mono text-xs font-bold uppercase text-accent-11 underline-offset-4 hover:underline"
            >
              Volver a proyectos
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const note = board?.note;

  return (
    <PageContainer size="wide">
      <div
        className="relative flex flex-col gap-5 sm:gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("Files")) setFileDragging(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setFileDragging(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setFileDragging(false);
          void uploadFiles([...e.dataTransfer.files]);
        }}
      >
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/notas"
              className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 font-mono text-xs font-semibold uppercase text-grayscale-11 transition-colors hover:text-grayscale-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
            >
              <ArrowLeftIcon size={13} weight="bold" aria-hidden />
              Proyectos
            </Link>

            <div className="flex items-center gap-2">
              {note && (isAdmin || note.ownerEmail === userEmail) && (
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-1/90 px-3 py-1.5 font-mono text-xs font-medium text-grayscale-11 transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2/90 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 disabled:opacity-50"
                  title={
                    note.coverUrl
                      ? "Cambiar foto de portada"
                      : "Asignar foto de portada"
                  }
                >
                  {uploadingCover ? (
                    <SpinnerGapIcon size={14} className="animate-spin" />
                  ) : (
                    <CameraIcon size={14} />
                  )}
                  <span>{note.coverUrl ? "Cambiar portada" : "Portada"}</span>
                </button>
              )}

              {note && (isAdmin || note.ownerEmail === userEmail) && (
                <button
                  type="button"
                  onClick={() => setAccessModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-1/90 px-3 py-1.5 font-mono text-xs font-medium text-grayscale-11 transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2/90 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
                  title="Configurar permisos de visibilidad"
                >
                  {note.visibility === "all" ? (
                    <>
                      <GlobeSimpleIcon size={14} className="text-grayscale-11" aria-hidden />
                      <span>Equipo</span>
                    </>
                  ) : note.visibility === "selected" ? (
                    <>
                      <UsersIcon size={14} className="text-accent-11" aria-hidden />
                      <span>Compartido ({note.sharedWith?.length ?? 0})</span>
                    </>
                  ) : (
                    <>
                      <LockKeyIcon size={14} className="text-grayscale-10" aria-hidden />
                      <span>Privado</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {note ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-title" className="sr-only">
                Nombre del proyecto
              </label>
              <input
                id="project-title"
                key={`title-${note._id}-${note.title}`}
                defaultValue={note.title}
                onBlur={(e) => {
                  if (e.target.value.trim() !== note.title) {
                    void updateMeta({
                      id: note._id,
                      title: e.target.value,
                      ...authArgs,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-full rounded-md bg-transparent text-xl sm:text-2xl font-bold text-grayscale-12 tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-accent-8/40"
              />
              <label htmlFor="project-description" className="sr-only">
                Descripción del proyecto
              </label>
              <AutoResizeTextarea
                id="project-description"
                key={`desc-${note._id}-${note.description ?? ""}`}
                defaultValue={note.description ?? ""}
                placeholder="Agregá una descripción breve del proyecto..."
                onBlur={(e) => {
                  if (e.target.value.trim() !== (note.description ?? "")) {
                    void updateMeta({
                      id: note._id,
                      description: e.target.value,
                      ...authArgs,
                    });
                  }
                }}
                className="w-full max-w-2xl rounded-md bg-transparent text-sm text-grayscale-11 placeholder:text-grayscale-9 outline-none text-pretty focus-visible:ring-2 focus-visible:ring-accent-8/40"
              />
              <p className="flex flex-wrap gap-x-4 font-mono text-[11px] font-medium uppercase text-grayscale-10 tabular-nums pt-0.5">
                <span>{pluralize(blocks.length, "elemento", "elementos")}</span>
                <span>
                  Editado el {formatShortDate(note.updatedAt || note.createdAt)}
                </span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2" aria-busy="true">
              <div className="h-7 w-64 animate-pulse rounded-md bg-grayscale-3" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-grayscale-3" />
            </div>
          )}
        </header>

        <div
          role="toolbar"
          aria-label="Agregar al tablero"
          className="sticky top-14 xl:top-2 z-20 -mx-1 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-grayscale-4 bg-grayscale-1/95 p-1.5 shadow-sm backdrop-blur dark:border-grayscale-5 dark:bg-grayscale-2/95"
        >
          <span className="hidden sm:inline px-2.5 font-mono text-[11px] font-bold uppercase text-grayscale-10">
            Agregar
          </span>
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              id={`add-block-${type}`}
              type="button"
              disabled={!note}
              onClick={() => void handleAdd(type)}
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-3 text-xs font-semibold text-grayscale-12 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 active:scale-[0.97] disabled:opacity-50 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-3"
            >
              <Icon size={16} className="text-grayscale-11" aria-hidden />
              {label}
            </button>
          ))}
          {uploads > 0 && (
            <span
              role="status"
              className="ml-auto flex shrink-0 items-center gap-1.5 px-2.5 font-mono text-[11px] font-bold uppercase text-grayscale-11"
            >
              <SpinnerGapIcon size={13} className="animate-spin" aria-hidden />
              Subiendo {uploads}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadFiles([...(e.target.files ?? [])], "image");
              e.target.value = "";
            }}
          />
          <input
            ref={genericFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadFiles([...(e.target.files ?? [])], "file");
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-xs font-medium text-red-11"
          >
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Cerrar aviso"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-red-3"
            >
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        )}

        {note && blocks.length === 0 && uploads === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-grayscale-4 bg-grayscale-2/70 px-6 py-14 text-center dark:bg-grayscale-2/50">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-grayscale-12">
                El tablero está vacío
              </p>
              <p className="text-xs text-grayscale-11 text-pretty">
                Empezá con una celda de texto, o arrastrá y pegá archivos o imágenes acá.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => void handleAdd(type)}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 text-xs font-semibold text-grayscale-12 transition-colors hover:border-grayscale-6 hover:bg-grayscale-2 dark:bg-grayscale-3"
                >
                  <Icon size={15} className="text-grayscale-11" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="grid grid-flow-row-dense grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {blocks.map((block, index) => (
              <BoardBlock
                key={block._id}
                block={block}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                autoFocus={focusId === block._id}
                dragging={dragId === block._id}
                dropTarget={overId === block._id && dragId !== block._id}
                onDragStart={() => setDragId(block._id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOverBlock={() => dragId && setOverId(block._id)}
                onDropBlock={() => {
                  dropOn(block._id);
                  setDragId(null);
                  setOverId(null);
                }}
                onMove={(delta) => moveBlock(block._id, delta)}
                onDelete={() => setDeleteId(block._id)}
                onUpdate={(patch) =>
                  updateBlock({ id: block._id, ...patch, ...authArgs }).catch(
                    () => setError("No se pudo guardar el cambio."),
                  )
                }
              />
            ))}
            {Array.from({ length: uploads }, (_, i) => (
              <li
                key={`upload-${i}`}
                className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-grayscale-5 bg-grayscale-2 text-grayscale-8"
              >
                <SpinnerGapIcon size={20} className="animate-spin" aria-hidden />
                <span className="sr-only">Subiendo archivo</span>
              </li>
            ))}
            {note && (
              <li>
                <button
                  type="button"
                  onClick={() => void handleAdd("text")}
                  className="flex min-h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-grayscale-5 bg-grayscale-1/60 p-4 text-xs font-semibold text-grayscale-11 transition-all hover:border-grayscale-7 hover:bg-grayscale-2 hover:text-grayscale-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 dark:bg-grayscale-2/60"
                >
                  <PlusIcon size={15} weight="bold" aria-hidden />
                  Nueva celda
                </button>
              </li>
            )}
          </ul>
        )}

        {fileDragging && (
          <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent-8 bg-accent-2/70 backdrop-blur-sm animate-backdrop">
            <p className="flex items-center gap-2 font-mono text-sm font-bold uppercase text-accent-11">
              <FileArrowUpIcon size={18} aria-hidden />
              Soltá para agregar archivos o imágenes
            </p>
          </div>
        )}

        <ConfirmModal
          open={deleteId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null);
          }}
          title="Eliminar celda"
          description="La celda se quitará del tablero de forma permanente."
          confirmText="Eliminar celda"
          onConfirm={async () => {
            if (!deleteId) return;
            await removeBlock({ id: deleteId, ...authArgs });
            setDeleteId(null);
          }}
        />

        {note && (isAdmin || note.ownerEmail === userEmail) && (
          <ProjectAccessModal
            open={accessModalOpen}
            onOpenChange={setAccessModalOpen}
            projectId={note._id}
            projectTitle={note.title}
            currentVisibility={note.visibility}
            currentSharedWith={note.sharedWith}
            actorEmail={userEmail || ""}
            isAdmin={isAdmin}
          />
        )}

        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverFileChange}
        />
      </div>
    </PageContainer>
  );
}

/* ---------- Celda ---------- */

type BlockPatch = {
  content?: string;
  fileName?: string;
  url?: string;
  checklist?: ChecklistItem[];
  tableData?: TableData;
  wide?: boolean;
};

function BoardBlock({
  block,
  isFirst,
  isLast,
  autoFocus,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOverBlock,
  onDropBlock,
  onMove,
  onDelete,
  onUpdate,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  autoFocus: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverBlock: () => void;
  onDropBlock: () => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
  onUpdate: (patch: BlockPatch) => void;
}) {
  const [handleArmed, setHandleArmed] = useState(false);
  const isHeading = block.type === "heading";
  const canWiden = !isHeading;

  return (
    <li
      draggable={handleArmed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", block._id);
        onDragStart();
      }}
      onDragEnd={() => {
        setHandleArmed(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        onDragOverBlock();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        onDropBlock();
      }}
      className={cn(
        "group/block relative flex flex-col rounded-xl transition-[opacity,box-shadow,border-color] duration-150",
        isHeading
          ? "col-span-full mt-4 first:mt-0 pt-2"
          : "border border-grayscale-4 bg-grayscale-1 hover:border-grayscale-6 focus-within:border-grayscale-6 shadow-xs dark:bg-grayscale-2",
        block.wide && canWiden && "sm:col-span-2",
        dragging && "opacity-40",
        dropTarget && "ring-2 ring-accent-8 ring-offset-2 ring-offset-grayscale-1",
      )}
    >
      <div
        onPointerDown={() => setHandleArmed(true)}
        onPointerUp={() => setHandleArmed(false)}
        className={cn(
          "flex min-h-9 cursor-grab items-center gap-1 pl-3 pr-1 active:cursor-grabbing select-none",
          isHeading ? "pl-0" : "border-b border-grayscale-3 dark:border-grayscale-4",
        )}
        title="Arrastrá para reordenar"
      >
        <span
          className={cn(
            "font-mono text-[10px] font-bold uppercase text-grayscale-10",
            isHeading && "sr-only",
          )}
        >
          {TYPE_LABEL[block.type]}
        </span>
        <div
          className={cn(
            "ml-auto flex items-center gap-0.5 transition-opacity",
            "opacity-100 sm:opacity-0 sm:group-hover/block:opacity-100 sm:group-focus-within/block:opacity-100",
          )}
        >
          <IconAction
            label="Mover antes"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <CaretLeftIcon size={13} weight="bold" />
          </IconAction>
          <IconAction
            label="Mover después"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <CaretRightIcon size={13} weight="bold" />
          </IconAction>
          {block.type === "image" && block.imageUrl && (
            <IconAction
              label="Descargar imagen"
              onClick={() => {
                if (block.imageUrl) {
                  void downloadFile(
                    block.imageUrl,
                    block.content || block.fileName || "imagen-proyecto",
                  );
                }
              }}
            >
              <DownloadSimpleIcon size={14} weight="bold" />
            </IconAction>
          )}
          {block.type === "file" && (block.fileUrl || block.imageUrl) && (
            <IconAction
              label="Descargar archivo"
              onClick={() => {
                const targetUrl = block.fileUrl || block.imageUrl;
                if (targetUrl) {
                  void downloadFile(
                    targetUrl,
                    block.fileName || block.content || "archivo",
                  );
                }
              }}
            >
              <DownloadSimpleIcon size={14} weight="bold" />
            </IconAction>
          )}
          {canWiden && (
            <IconAction
              label={block.wide ? "Hacer angosta" : "Hacer ancha"}
              className="hidden sm:flex"
              onClick={() => onUpdate({ wide: !block.wide })}
            >
              {block.wide ? (
                <ArrowsInLineHorizontalIcon size={14} />
              ) : (
                <ArrowsOutLineHorizontalIcon size={14} />
              )}
            </IconAction>
          )}
          <IconAction label="Eliminar celda" danger onClick={onDelete}>
            <TrashIcon size={14} />
          </IconAction>
        </div>
      </div>

      <div className={cn(!isHeading && "p-3.5")}>
        {block.type === "text" && (
          <AutoResizeTextarea
            aria-label="Texto de la celda"
            autoFocus={autoFocus}
            key={`${block._id}-${block.updatedAt}`}
            defaultValue={block.content ?? ""}
            placeholder="Escribí notas o ideas acá..."
            onBlur={(e) => {
              if (e.target.value !== (block.content ?? "")) {
                onUpdate({ content: e.target.value });
              }
            }}
            className="min-h-16 w-full bg-transparent text-sm leading-relaxed text-grayscale-12 placeholder:text-grayscale-9 outline-none whitespace-pre-wrap break-words"
          />
        )}

        {block.type === "heading" && (
          <div className="flex items-center gap-2 border-b-2 border-grayscale-4 pb-2 transition-colors focus-within:border-accent-8 dark:border-grayscale-5">
            <TextTIcon size={16} weight="bold" className="text-grayscale-10 shrink-0" aria-hidden />
            <input
              aria-label="Título de la sección"
              autoFocus={autoFocus}
              key={`${block._id}-${block.updatedAt}`}
              defaultValue={block.content ?? ""}
              placeholder="Nombre de la sección..."
              onBlur={(e) => {
                if (e.target.value !== (block.content ?? "")) {
                  onUpdate({ content: e.target.value });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-full bg-transparent font-mono text-sm font-bold uppercase tracking-wider text-grayscale-12 placeholder:text-grayscale-9 outline-none"
            />
          </div>
        )}

        {block.type === "checklist" && (
          <ChecklistEditor
            block={block}
            autoFocus={autoFocus}
            onChange={(checklist) => onUpdate({ checklist })}
          />
        )}

        {block.type === "image" && (
          <figure className="-m-1.5 flex flex-col gap-2">
            {block.imageUrl ? (
              <div className="group/img relative overflow-hidden rounded-lg bg-grayscale-2">
                <a
                  href={block.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
                >
                  {/* biome-ignore lint/performance/noImgElement: imagen de Convex storage con URL firmada */}
                  <img
                    src={block.imageUrl}
                    alt={block.content || "Imagen del tablero"}
                    loading="lazy"
                    draggable={false}
                    className="w-full object-cover transition-transform duration-200 group-hover/img:scale-[1.01]"
                  />
                </a>

                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 sm:group-focus-within/img:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void downloadFile(
                        block.imageUrl!,
                        block.content || "imagen-proyecto",
                      );
                    }}
                    title="Descargar imagen"
                    aria-label="Descargar imagen"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-1/90 text-grayscale-11 backdrop-blur shadow-sm transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2/90 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
                  >
                    <DownloadSimpleIcon size={15} weight="bold" />
                  </button>
                  <a
                    href={block.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir en pestaña nueva"
                    aria-label="Abrir en pestaña nueva"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-1/90 text-grayscale-11 backdrop-blur shadow-sm transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2/90 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
                  >
                    <ArrowSquareOutIcon size={15} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-grayscale-2 text-xs font-medium text-grayscale-10">
                Imagen no disponible
              </div>
            )}
            <figcaption className="px-1.5 flex items-center justify-between gap-2">
              <input
                aria-label="Descripción de la imagen"
                key={`${block._id}-${block.updatedAt}`}
                defaultValue={block.content ?? ""}
                placeholder="Agregar descripción..."
                onBlur={(e) => {
                  if (e.target.value !== (block.content ?? "")) {
                    onUpdate({ content: e.target.value });
                  }
                }}
                className="w-full bg-transparent text-xs text-grayscale-11 placeholder:text-grayscale-9 outline-none"
              />
              {block.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    void downloadFile(
                      block.imageUrl!,
                      block.content || "imagen-proyecto",
                    )
                  }
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-mono text-grayscale-10 transition-colors hover:text-grayscale-12"
                  title="Descargar imagen"
                >
                  <DownloadSimpleIcon size={12} weight="bold" />
                  <span>Descargar</span>
                </button>
              )}
            </figcaption>
          </figure>
        )}

        {block.type === "file" && (
          <FileBlockCard
            block={block}
            onUpdate={(patch) => onUpdate(patch)}
          />
        )}

        {block.type === "link" && (
          <LinkEditor
            block={block}
            autoFocus={autoFocus}
            onChange={(patch) => onUpdate(patch)}
          />
        )}

        {block.type === "table" && (
          <TableEditor
            block={block}
            onChange={(patch) => onUpdate(patch)}
          />
        )}
      </div>
    </li>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "flex size-9 sm:size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 disabled:pointer-events-none disabled:opacity-30",
        danger
          ? "hover:bg-red-3 hover:text-red-11"
          : "hover:bg-grayscale-3 hover:text-grayscale-12 dark:hover:bg-grayscale-4",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ChecklistEditor({
  block,
  autoFocus,
  onChange,
}: {
  block: Block;
  autoFocus: boolean;
  onChange: (items: ChecklistItem[]) => void;
}) {
  const items = block.checklist ?? [];
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: newId(), text, done: false }]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 && (
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-grayscale-4 dark:bg-grayscale-5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={done}
            aria-label="Progreso de la lista"
          >
            <div
              className="h-full rounded-full bg-accent-9 transition-[width] duration-300"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold uppercase text-grayscale-11 tabular-nums">
            {done} de {items.length}
          </span>
        </div>
      )}

      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="group/item flex items-start gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.text}
              onClick={() =>
                onChange(
                  items.map((i) =>
                    i.id === item.id ? { ...i, done: !i.done } : i,
                  ),
                )
              }
              className="flex size-9 sm:size-7 shrink-0 cursor-pointer items-center justify-center -ml-1.5 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-[5px] border transition-colors",
                  item.done
                    ? "border-accent-9 bg-accent-9 text-white"
                    : "border-grayscale-6 bg-grayscale-1 group-hover/item:border-grayscale-8 dark:bg-grayscale-3",
                )}
              >
                {item.done && <CheckIcon size={11} weight="bold" />}
              </span>
            </button>
            <span
              className={cn(
                "flex-1 py-1.5 sm:py-1 text-sm leading-snug break-words",
                item.done
                  ? "text-grayscale-9 line-through"
                  : "text-grayscale-12 font-medium",
              )}
            >
              {item.text}
            </span>
            <button
              type="button"
              aria-label={`Quitar "${item.text}"`}
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              className="flex size-9 sm:size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-grayscale-9 opacity-100 transition-opacity hover:text-red-11 sm:opacity-0 sm:group-hover/item:opacity-100 focus-visible:opacity-100"
            >
              <XIcon size={12} weight="bold" />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <PlusIcon size={14} weight="bold" className="shrink-0 text-grayscale-10" aria-hidden />
        <input
          aria-label="Nuevo elemento de la lista"
          autoFocus={autoFocus}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addItem}
          placeholder="Agregar elemento..."
          enterKeyHint="enter"
          className="flex-1 bg-transparent py-1 text-sm text-grayscale-12 placeholder:text-grayscale-9 outline-none"
        />
      </form>
    </div>
  );
}

function TableEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (patch: BlockPatch) => void;
}) {
  const tableData: TableData = block.tableData ?? {
    columns: ["Columna 1", "Columna 2", "Columna 3"],
    rows: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
  };

  const columns =
    tableData.columns.length > 0 ? tableData.columns : ["Columna 1"];
  const rows =
    tableData.rows.length > 0
      ? tableData.rows
      : [new Array(columns.length).fill("")];

  function setCell(rowIndex: number, colIndex: number, value: string) {
    const nextRows = rows.map((r, rIdx) =>
      rIdx === rowIndex
        ? r.map((c, cIdx) => (cIdx === colIndex ? value : c))
        : r,
    );
    onChange({ tableData: { columns, rows: nextRows } });
  }

  function setColumnHeader(colIndex: number, value: string) {
    const nextCols = columns.map((c, idx) => (idx === colIndex ? value : c));
    onChange({ tableData: { columns: nextCols, rows } });
  }

  function addRow() {
    const newRow = new Array(columns.length).fill("");
    onChange({ tableData: { columns, rows: [...rows, newRow] } });
  }

  function addColumn() {
    const nextColName = `Columna ${columns.length + 1}`;
    const nextCols = [...columns, nextColName];
    const nextRows = rows.map((r) => [...r, ""]);
    onChange({ tableData: { columns: nextCols, rows: nextRows } });
  }

  function removeRow(rowIndex: number) {
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, idx) => idx !== rowIndex);
    onChange({ tableData: { columns, rows: nextRows } });
  }

  function removeColumn(colIndex: number) {
    if (columns.length <= 1) return;
    const nextCols = columns.filter((_, idx) => idx !== colIndex);
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== colIndex));
    onChange({ tableData: { columns: nextCols, rows: nextRows } });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <input
          aria-label="Título de la tabla"
          key={`table-title-${block._id}-${block.content ?? ""}`}
          defaultValue={block.content ?? ""}
          placeholder="Nombre de la tabla (opcional)..."
          onBlur={(e) => {
            if (e.target.value !== (block.content ?? "")) {
              onChange({ content: e.target.value });
            }
          }}
          className="bg-transparent text-xs font-semibold text-grayscale-12 placeholder:text-grayscale-9 outline-none flex-1 truncate"
        />
        <span className="font-mono text-[10px] uppercase text-grayscale-10 tabular-nums shrink-0">
          {rows.length} {rows.length === 1 ? "fila" : "filas"} · {columns.length} {columns.length === 1 ? "col" : "cols"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-grayscale-4 dark:border-grayscale-5 bg-grayscale-1 dark:bg-grayscale-2 shadow-2xs">
        <table className="w-full border-collapse text-left font-sans text-xs">
          <thead>
            <tr className="bg-grayscale-2/70 dark:bg-grayscale-3/50 border-b border-grayscale-4 dark:border-grayscale-5">
              <th className="w-8 min-w-8 p-1 text-center font-mono text-[10px] text-grayscale-9 select-none border-r border-grayscale-4 dark:border-grayscale-5">
                #
              </th>
              {columns.map((col, cIdx) => (
                <th
                  key={`col-${cIdx}`}
                  className="group/col relative min-w-28 border-r border-grayscale-4 dark:border-grayscale-5 p-0"
                >
                  <div className="flex items-center">
                    <input
                      aria-label={`Encabezado de columna ${cIdx + 1}`}
                      key={`col-head-${block._id}-${cIdx}-${col}`}
                      defaultValue={col}
                      placeholder={`Col ${cIdx + 1}`}
                      onBlur={(e) => {
                        if (e.target.value !== col) {
                          setColumnHeader(cIdx, e.target.value);
                        }
                      }}
                      className="w-full bg-transparent px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-grayscale-12 placeholder:text-grayscale-9 outline-none focus:bg-grayscale-1 dark:focus:bg-grayscale-2"
                    />
                    {columns.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Eliminar columna ${col}`}
                        title="Eliminar columna"
                        onClick={() => removeColumn(cIdx)}
                        className="mr-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-grayscale-8 opacity-0 group-hover/col:opacity-100 hover:text-red-11 hover:bg-red-2 transition-opacity"
                      >
                        <XIcon size={11} weight="bold" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 min-w-8 p-0 text-center">
                <button
                  type="button"
                  aria-label="Agregar columna"
                  title="Agregar columna"
                  onClick={addColumn}
                  className="flex size-full cursor-pointer items-center justify-center py-1.5 text-grayscale-10 hover:bg-grayscale-3 hover:text-grayscale-12 transition-colors"
                >
                  <PlusIcon size={13} weight="bold" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={`row-${rIdx}`}
                className="group/row border-b border-grayscale-3 dark:border-grayscale-4 last:border-b-0 hover:bg-grayscale-2/30"
              >
                <td className="w-8 min-w-8 p-0 text-center font-mono text-[10px] text-grayscale-9 select-none border-r border-grayscale-4 dark:border-grayscale-5 bg-grayscale-2/40 dark:bg-grayscale-3/30">
                  <div className="relative flex items-center justify-center size-full py-1.5">
                    <span
                      className={cn(
                        rows.length > 1 &&
                          "group-hover/row:opacity-0 transition-opacity",
                      )}
                    >
                      {rIdx + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Eliminar fila ${rIdx + 1}`}
                        title="Eliminar fila"
                        onClick={() => removeRow(rIdx)}
                        className="absolute inset-0 flex items-center justify-center text-grayscale-8 opacity-0 group-hover/row:opacity-100 hover:text-red-11 hover:bg-red-2 transition-opacity cursor-pointer"
                      >
                        <TrashIcon size={12} />
                      </button>
                    )}
                  </div>
                </td>
                {columns.map((_, cIdx) => (
                  <td
                    key={`cell-${rIdx}-${cIdx}`}
                    className="p-0 border-r border-grayscale-3 dark:border-grayscale-4"
                  >
                    <input
                      aria-label={`Fila ${rIdx + 1}, columna ${columns[cIdx] || cIdx + 1}`}
                      key={`cell-val-${block._id}-${rIdx}-${cIdx}-${row[cIdx] ?? ""}`}
                      defaultValue={row[cIdx] ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (row[cIdx] ?? "")) {
                          setCell(rIdx, cIdx, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const target = e.currentTarget;
                          const currentTd = target.closest("td");
                          const currentTr = currentTd?.parentElement;
                          const nextTr = currentTr?.nextElementSibling;
                          if (nextTr) {
                            const cells = Array.from(
                              nextTr.querySelectorAll("input"),
                            );
                            cells[cIdx]?.focus();
                          } else {
                            addRow();
                          }
                        }
                      }}
                      className="w-full min-w-28 bg-transparent px-2.5 py-1.5 text-xs text-grayscale-12 outline-none focus:bg-accent-2/30 focus:ring-1 focus:ring-inset focus:ring-accent-8 transition-colors placeholder:text-grayscale-8"
                    />
                  </td>
                ))}
                <td className="w-8 min-w-8 p-0 bg-grayscale-1 dark:bg-grayscale-2" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-grayscale-11 hover:bg-grayscale-3 hover:text-grayscale-12 transition-colors cursor-pointer dark:hover:bg-grayscale-4"
        >
          <PlusIcon size={13} weight="bold" aria-hidden />
          Agregar fila
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-grayscale-11 hover:bg-grayscale-3 hover:text-grayscale-12 transition-colors cursor-pointer dark:hover:bg-grayscale-4"
        >
          <PlusIcon size={13} weight="bold" aria-hidden />
          Agregar columna
        </button>
      </div>
    </div>
  );
}

function LinkEditor({
  block,
  autoFocus,
  onChange,
}: {
  block: Block;
  autoFocus: boolean;
  onChange: (patch: BlockPatch) => void;
}) {
  const [editing, setEditing] = useState(!block.url);

  if (editing || !block.url) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const url = normalizeUrl(String(data.get("url") ?? ""));
          if (!url) return;
          onChange({ url, content: String(data.get("label") ?? "") });
          setEditing(false);
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="url"
          type="url"
          inputMode="url"
          aria-label="Dirección del enlace"
          autoFocus={autoFocus || Boolean(block.url)}
          defaultValue={block.url ?? ""}
          placeholder="https://"
          className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-2 text-sm text-grayscale-12 placeholder:text-grayscale-9 outline-none focus-visible:border-accent-8 dark:bg-grayscale-3"
        />
        <input
          name="label"
          aria-label="Nombre del enlace"
          defaultValue={block.content ?? ""}
          placeholder="Nombre opcional"
          className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-2 text-sm text-grayscale-12 placeholder:text-grayscale-9 outline-none focus-visible:border-accent-8 dark:bg-grayscale-3"
        />
        <div className="flex justify-end gap-1.5">
          {block.url && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 sm:h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold text-grayscale-11 hover:bg-grayscale-3"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="h-9 sm:h-8 cursor-pointer rounded-lg bg-grayscale-12 px-3 text-xs font-semibold text-grayscale-1 transition-transform active:scale-[0.97] dark:bg-grayscale-5 dark:text-grayscale-12"
          >
            Guardar enlace
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-2 text-grayscale-12 dark:bg-grayscale-3">
        <LinkSimpleIcon size={16} weight="bold" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-text truncate text-left text-sm font-semibold text-grayscale-12 hover:underline underline-offset-2"
          title="Editar enlace"
        >
          {block.content || hostnameOf(block.url)}
        </button>
        <span className="truncate font-mono text-[11px] text-grayscale-10">
          {hostnameOf(block.url)}
        </span>
      </div>
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir enlace en otra pestaña"
        className="flex size-9 sm:size-8 shrink-0 items-center justify-center rounded-md text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
      >
        <ArrowSquareOutIcon size={15} />
      </a>
    </div>
  );
}

function getFileMeta(fileName?: string, fileType?: string) {
  const name = fileName || "";
  const ext = (name.split(".").pop() || "").toLowerCase();
  const type = (fileType || "").toLowerCase();

  if (ext === "pdf" || type.includes("pdf")) {
    return {
      Icon: FilePdfIcon,
      label: "PDF",
      badgeColor: "bg-red-3 text-red-11 border-red-5 dark:bg-red-3/30",
    };
  }
  if (
    ["doc", "docx", "odt", "rtf"].includes(ext) ||
    type.includes("word") ||
    type.includes("document")
  ) {
    return {
      Icon: FileDocIcon,
      label: ext ? ext.toUpperCase() : "DOC",
      badgeColor: "bg-blue-3 text-blue-11 border-blue-5 dark:bg-blue-3/30",
    };
  }
  if (
    ["xls", "xlsx", "csv", "tsv", "ods"].includes(ext) ||
    type.includes("sheet") ||
    type.includes("excel") ||
    type.includes("csv")
  ) {
    return {
      Icon: FileXlsIcon,
      label: ext ? ext.toUpperCase() : "TABLA",
      badgeColor: "bg-green-3 text-green-11 border-green-5 dark:bg-green-3/30",
    };
  }
  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext) ||
    type.includes("zip") ||
    type.includes("compressed") ||
    type.includes("archive")
  ) {
    return {
      Icon: FileArchiveIcon,
      label: ext ? ext.toUpperCase() : "ZIP",
      badgeColor: "bg-amber-3 text-amber-11 border-amber-5 dark:bg-amber-3/30",
    };
  }
  if (
    ["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext) ||
    type.startsWith("video/")
  ) {
    return {
      Icon: FileVideoIcon,
      label: ext ? ext.toUpperCase() : "VIDEO",
      badgeColor: "bg-purple-3 text-purple-11 border-purple-5 dark:bg-purple-3/30",
    };
  }
  if (
    ["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext) ||
    type.startsWith("audio/")
  ) {
    return {
      Icon: FileAudioIcon,
      label: ext ? ext.toUpperCase() : "AUDIO",
      badgeColor: "bg-indigo-3 text-indigo-11 border-indigo-5 dark:bg-indigo-3/30",
    };
  }
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "json",
      "html",
      "css",
      "py",
      "sql",
      "sh",
      "yml",
      "yaml",
    ].includes(ext) ||
    type.includes("json") ||
    type.includes("javascript")
  ) {
    return {
      Icon: FileCodeIcon,
      label: ext ? ext.toUpperCase() : "CÓDIGO",
      badgeColor: "bg-cyan-3 text-cyan-11 border-cyan-5 dark:bg-cyan-3/30",
    };
  }
  if (["txt", "md"].includes(ext) || type.startsWith("text/")) {
    return {
      Icon: FileTextIcon,
      label: ext ? ext.toUpperCase() : "TEXTO",
      badgeColor:
        "bg-grayscale-3 text-grayscale-11 border-grayscale-5 dark:bg-grayscale-3/30",
    };
  }
  return {
    Icon: FileIcon,
    label: ext ? ext.toUpperCase() : "ARCHIVO",
    badgeColor:
      "bg-grayscale-3 text-grayscale-11 border-grayscale-5 dark:bg-grayscale-3/30",
  };
}

function FileBlockCard({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: BlockPatch) => void;
}) {
  const url = block.fileUrl || block.imageUrl;
  const displayName = block.fileName || block.content || "Archivo adjunto";
  const { Icon, label, badgeColor } = getFileMeta(
    block.fileName,
    block.fileType,
  );
  const sizeText = formatFileSize(block.fileSize);

  return (
    <div className="flex flex-col gap-2">
      <div className="group/file relative flex items-center gap-2.5 rounded-lg border border-grayscale-4 bg-grayscale-2/50 p-2.5 transition-colors hover:border-grayscale-6 dark:bg-grayscale-3/40">
        <a
          href={url || "#"}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (!url) e.preventDefault();
          }}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover/file:scale-105",
            badgeColor,
          )}
          title={`Abrir ${displayName}`}
        >
          <Icon size={22} weight="duotone" aria-hidden />
        </a>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!url) e.preventDefault();
            }}
            className="line-clamp-2 text-xs sm:text-sm font-semibold leading-snug text-grayscale-12 hover:text-accent-11 hover:underline underline-offset-2 break-words"
            title={displayName}
          >
            {displayName}
          </a>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-grayscale-10 whitespace-nowrap overflow-hidden">
            <span className="font-bold uppercase tracking-wider shrink-0">
              {label}
            </span>
            {sizeText && (
              <>
                <span className="text-grayscale-8 shrink-0" aria-hidden>
                  ·
                </span>
                <span className="whitespace-nowrap shrink-0 tabular-nums font-medium text-grayscale-11">
                  {sizeText}
                </span>
              </>
            )}
          </div>
        </div>

        {url && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void downloadFile(url, displayName)}
              title="Descargar archivo"
              aria-label={`Descargar ${displayName}`}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-md border border-grayscale-4 bg-grayscale-1 text-grayscale-11 shadow-2xs transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
            >
              <DownloadSimpleIcon size={14} weight="bold" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Abrir en pestaña nueva"
              aria-label={`Abrir ${displayName} en pestaña nueva`}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-md border border-grayscale-4 bg-grayscale-1 text-grayscale-11 shadow-2xs transition-colors hover:border-grayscale-6 hover:text-grayscale-12 hover:bg-grayscale-2 dark:bg-grayscale-2 dark:hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
            >
              <ArrowSquareOutIcon size={14} />
            </a>
          </div>
        )}
      </div>

      <div className="px-1">
        <input
          aria-label="Nota o descripción del archivo"
          key={`${block._id}-${block.updatedAt}`}
          defaultValue={block.content ?? ""}
          placeholder="Agregar nota o descripción..."
          onBlur={(e) => {
            if (e.target.value !== (block.content ?? "")) {
              onUpdate({ content: e.target.value });
            }
          }}
          className="w-full bg-transparent py-0.5 text-xs text-grayscale-11 placeholder:text-grayscale-9 outline-none focus:placeholder:text-grayscale-10"
        />
      </div>
    </div>
  );
}

