"use client";

import {
  CameraIcon,
  FileArrowDownIcon,
  GlobeSimpleIcon,
  ImageIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PushPinIcon,
  SpinnerGapIcon,
  SquaresFourIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  formatShortDate,
  pluralize,
  useNotesAuth,
} from "@/components/notes/notes-helpers";
import ProjectAccessModal from "@/components/notes/ProjectAccessModal";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import PageContainer from "@/components/public/PageContainer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";

export default function NotasPage() {
  const router = useRouter();
  const { userEmail, userName, isAdmin, authArgs } = useNotesAuth();

  const projects = useQuery(
    api.notes.get,
    userEmail ? { viewerEmail: userEmail, isAdmin } : "skip",
  );
  const createProject = useMutation(api.notes.create);
  const togglePinned = useMutation(api.notes.togglePinned);
  const removeProject = useMutation(api.notes.remove);
  const updateCover = useMutation(api.notes.updateCover);
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<Id<"notes"> | null>(null);
  const [accessProject, setAccessProject] = useState<{
    _id: Id<"notes">;
    title: string;
    visibility?: "private" | "all" | "selected";
    sharedWith?: string[];
  } | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [targetCoverProjectId, setTargetCoverProjectId] =
    useState<Id<"notes"> | null>(null);
  const [uploadingCoverId, setUploadingCoverId] =
    useState<Id<"notes"> | null>(null);

  function triggerCoverUpload(id: Id<"notes">) {
    setTargetCoverProjectId(id);
    coverFileInputRef.current?.click();
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !targetCoverProjectId) return;
    e.target.value = "";
    setUploadingCoverId(targetCoverProjectId);
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
        id: targetCoverProjectId,
        storageId,
        ...authArgs,
      });
    } catch {
      // upload error
    } finally {
      setUploadingCoverId(null);
      setTargetCoverProjectId(null);
    }
  }

  async function handleRemoveCover(id: Id<"notes">) {
    await updateCover({
      id,
      storageId: undefined,
      ...authArgs,
    });
  }

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects ?? []) {
      map.set(p.ownerEmail, p.ownerName || p.ownerEmail);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (projects ?? []).filter((p) => {
      if (isAdmin && ownerFilter !== "all" && p.ownerEmail !== ownerFilter) {
        return false;
      }
      if (!q) return true;
      return [p.title, p.description, p.preview, p.ownerName]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(q));
    });
  }, [projects, search, ownerFilter, isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = name.trim();
    if (!title || !userEmail || creating) return;
    setCreating(true);
    try {
      const id = await createProject({
        title,
        ownerEmail: userEmail,
        ownerName: userName,
        ...authArgs,
      });
      setName("");
      router.push(`/notas/${id}`);
    } finally {
      setCreating(false);
    }
  }

  const loading = projects === undefined;

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-5 sm:gap-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="flex flex-col gap-0.5">
          <h1 className="font-mono text-lg sm:text-xl font-bold uppercase text-grayscale-12">
            Proyectos
          </h1>
          <p className="hidden sm:block text-sm text-grayscale-11 text-pretty">
            Tableros por proyecto para reunir ideas, notas, referencias, imágenes, archivos y tablas.
          </p>
        </header>

        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2"
          aria-label="Crear proyecto"
        >
          <label htmlFor="new-project-name" className="sr-only">
            Nombre del proyecto
          </label>
          <input
            id="new-project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del proyecto nuevo..."
            autoComplete="off"
            enterKeyHint="go"
            className="min-w-0 flex-1 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-3 sm:py-2 text-base sm:text-sm text-grayscale-12 placeholder:text-grayscale-9 outline-none transition-colors focus-visible:border-accent-8 focus-visible:ring-2 focus-visible:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
          />
          <Button
            id="create-project"
            type="submit"
            variant="primary"
            disabled={!name.trim() || creating}
            className="h-11 sm:h-auto disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <PlusIcon size={16} weight="bold" aria-hidden />
            <span className="hidden sm:inline">Crear proyecto</span>
            <span className="sm:hidden">Crear</span>
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-b border-grayscale-3 pb-3 dark:border-grayscale-4">
          <div className="relative min-w-0 flex-1 sm:max-w-72">
            <MagnifyingGlassIcon
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-grayscale-10"
            />
            <label htmlFor="project-search" className="sr-only">
              Buscar proyecto
            </label>
            <input
              id="project-search"
              type="search"
              placeholder="Buscar proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-8 pr-3 text-sm sm:text-xs text-grayscale-12 placeholder:text-grayscale-9 outline-none transition-colors focus-visible:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
            />
          </div>
          {isAdmin && owners.length > 1 && (
            <>
              <label htmlFor="owner-filter" className="sr-only">
                Filtrar por persona
              </label>
              <select
                id="owner-filter"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="cursor-pointer rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 py-2 font-mono text-[11px] font-bold uppercase text-grayscale-11 outline-none transition-colors hover:bg-grayscale-2 focus-visible:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
              >
                <option value="all">Todo el equipo</option>
                {owners.map(([email, ownerName]) => (
                  <option key={email} value={email}>
                    {ownerName}
                  </option>
                ))}
              </select>
            </>
          )}
          {!loading && (
            <span className="ml-auto font-mono text-[11px] font-semibold uppercase text-grayscale-11 tabular-nums">
              {pluralize(visible.length, "proyecto", "proyectos")}
            </span>
          )}
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            aria-busy="true"
            aria-label="Cargando proyectos"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={
              search ? (
                <MagnifyingGlassIcon size={40} weight="duotone" />
              ) : (
                <SquaresFourIcon size={40} weight="duotone" />
              )
            }
            title={search ? "Sin resultados" : "Todavía no hay proyectos"}
            description={
              search
                ? `Ningún proyecto coincide con "${search}".`
                : "Escribí un nombre arriba para crear el primer tablero."
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visible.map((project) => (
              <li key={project._id} className="group relative">
                <Link
                  href={`/notas/${project._id}`}
                  className={cn(
                    "flex h-full flex-col overflow-hidden rounded-xl border bg-grayscale-1 transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8 dark:bg-grayscale-2 motion-reduce:transform-none",
                    project.pinned
                      ? "border-accent-6 dark:border-accent-6/60 shadow-xs"
                      : "border-grayscale-4 hover:border-grayscale-6 dark:border-grayscale-4",
                  )}
                >
                  <div className="group/cover relative m-1.5 mb-0 aspect-[16/9] overflow-hidden rounded-lg bg-grayscale-2 dark:bg-grayscale-3">
                    {project.coverUrl ? (
                      // biome-ignore lint/performance/noImgElement: imagen de Convex storage con URL firmada
                      <img
                        src={project.coverUrl}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
                      />
                    ) : project.preview ? (
                      <p className="line-clamp-5 p-3.5 text-xs leading-relaxed text-grayscale-11 whitespace-pre-line font-normal">
                        {project.preview}
                      </p>
                    ) : (
                      <div className="flex size-full items-center justify-center text-grayscale-8">
                        <SquaresFourIcon size={28} aria-hidden />
                      </div>
                    )}

                    {(isAdmin || project.ownerEmail === userEmail) && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/cover:opacity-100 sm:group-focus-within/cover:opacity-100 transition-opacity z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerCoverUpload(project._id);
                          }}
                          title={
                            project.coverUrl
                              ? "Cambiar foto de portada"
                              : "Subir foto de portada"
                          }
                          aria-label="Cambiar foto de portada"
                          className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-grayscale-4 bg-grayscale-1/90 px-2 font-mono text-[11px] font-medium text-grayscale-12 backdrop-blur shadow-xs transition-colors hover:border-grayscale-6 hover:bg-grayscale-2 dark:bg-grayscale-2/90 dark:hover:bg-grayscale-3"
                        >
                          <CameraIcon size={13} weight="bold" />
                          <span>Portada</span>
                        </button>
                        {project.coverUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleRemoveCover(project._id);
                            }}
                            title="Quitar foto de portada"
                            aria-label="Quitar portada"
                            className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-grayscale-4 bg-grayscale-1/90 text-grayscale-10 backdrop-blur shadow-xs transition-colors hover:border-red-6 hover:text-red-11 hover:bg-grayscale-2 dark:bg-grayscale-2/90"
                          >
                            <TrashIcon size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {uploadingCoverId === project._id && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                        <SpinnerGapIcon size={24} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 p-3.5 pt-3">
                    <h2 className="pr-16 text-sm font-semibold leading-snug text-grayscale-12 text-balance line-clamp-2">
                      {project.title}
                    </h2>
                    {project.description && (
                      <p className="line-clamp-2 text-xs text-grayscale-11 text-pretty">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 font-mono text-[11px] uppercase text-grayscale-10 tabular-nums">
                      <span>
                        {pluralize(project.blockCount, "elemento", "elementos")}
                      </span>
                      {project.imageCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <ImageIcon size={12} aria-hidden />
                          {project.imageCount}
                          <span className="sr-only">imágenes</span>
                        </span>
                      )}
                      {Boolean(project.fileCount && project.fileCount > 0) && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <FileArrowDownIcon size={12} aria-hidden />
                          {project.fileCount}
                          <span className="sr-only">archivos</span>
                        </span>
                      )}
                      {project.visibility === "all" ? (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-grayscale-11 normal-case"
                          title="Visible para todo el equipo"
                        >
                          <GlobeSimpleIcon size={12} aria-hidden />
                          Equipo
                        </span>
                      ) : project.visibility === "selected" ? (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-accent-11 normal-case"
                          title={`Compartido con ${(project.sharedWith?.length ?? 0)} usuario(s)`}
                        >
                          <UsersIcon size={12} aria-hidden />
                          {project.sharedWith?.length ?? 0}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-grayscale-10 normal-case"
                          title="Solo creador y administradores (Privado)"
                        >
                          <LockKeyIcon size={12} aria-hidden />
                          Privado
                        </span>
                      )}
                      {isAdmin && (
                        <span className="truncate normal-case">
                          {project.ownerName || project.ownerEmail}
                        </span>
                      )}
                      <time
                        dateTime={project.updatedAt || project.createdAt}
                        className="ml-auto"
                      >
                        {formatShortDate(project.updatedAt || project.createdAt)}
                      </time>
                    </div>
                  </div>
                </Link>

                <div className="absolute top-3 right-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {(isAdmin || project.ownerEmail === userEmail) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccessProject({
                          _id: project._id,
                          title: project.title,
                          visibility: project.visibility,
                          sharedWith: project.sharedWith,
                        });
                      }}
                      aria-label="Permisos de acceso"
                      title="Definir quién puede ver este proyecto"
                      className="flex size-9 sm:size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-1/90 text-grayscale-10 backdrop-blur transition-colors hover:border-grayscale-6 hover:text-grayscale-12 dark:bg-grayscale-2/90"
                    >
                      <UsersIcon size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => togglePinned({ id: project._id, ...authArgs })}
                    aria-label={project.pinned ? "Desfijar proyecto" : "Fijar proyecto"}
                    aria-pressed={project.pinned}
                    className={cn(
                      "flex size-9 sm:size-8 cursor-pointer items-center justify-center rounded-lg border backdrop-blur transition-colors",
                      project.pinned
                        ? "border-accent-6 bg-accent-3/90 text-accent-11"
                        : "border-grayscale-4 bg-grayscale-1/90 text-grayscale-10 hover:text-grayscale-12 dark:bg-grayscale-2/90",
                    )}
                  >
                    <PushPinIcon size={15} weight={project.pinned ? "fill" : "regular"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(project._id)}
                    aria-label="Eliminar proyecto"
                    className="flex size-9 sm:size-8 cursor-pointer items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-1/90 text-grayscale-10 backdrop-blur transition-colors hover:border-red-6 hover:text-red-11 dark:bg-grayscale-2/90"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
                {project.pinned && (
                  <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1 rounded-md border border-accent-6 bg-accent-3/90 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-accent-11 backdrop-blur sm:group-hover:opacity-0 transition-opacity">
                    <PushPinIcon size={10} weight="fill" aria-hidden />
                    Fijado
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <ConfirmModal
          open={deleteId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null);
          }}
          title="Eliminar proyecto"
          description="Se eliminará el tablero con todas sus celdas e imágenes. No se puede deshacer."
          confirmText="Eliminar proyecto"
          onConfirm={async () => {
            if (!deleteId) return;
            await removeProject({ id: deleteId, ...authArgs });
            setDeleteId(null);
          }}
        />

        {accessProject && (
          <ProjectAccessModal
            open={accessProject !== null}
            onOpenChange={(open) => {
              if (!open) setAccessProject(null);
            }}
            projectId={accessProject._id}
            projectTitle={accessProject.title}
            currentVisibility={accessProject.visibility}
            currentSharedWith={accessProject.sharedWith}
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
