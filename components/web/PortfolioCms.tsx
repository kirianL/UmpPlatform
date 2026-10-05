"use client";

import {
  ArrowLeftIcon,
  ImageIcon,
  SquaresFourIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Select from "@/components/public/Select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/helpers/classname-helper";
import {
  cmsErrorMessage,
  parseYoutubeId,
  splitParagraphs,
  toSlug,
  uploadCmsImage,
} from "@/lib/cms-utils";

type ProjectStatus = "borrador" | "publicado";

type GalleryDraft = {
  storageId: Id<"_storage">;
  alt: string;
  preview: string;
};

type FormState = {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  category: string;
  year: string;
  client: string;
  deliverables: string;
  status: ProjectStatus;
  videoYoutubeId: string;
  lead: string;
  storyText: string;
  credits: { role: string; name: string }[];
  coverStorageId?: Id<"_storage">;
  coverPreview: string;
  gallery: GalleryDraft[];
};

const CATEGORIES = ["Producción", "Fotografía", "Branding", "Contenido"];

function currentYear() {
  return String(new Date().getFullYear());
}

function emptyForm(): FormState {
  return {
    title: "",
    slug: "",
    subtitle: "",
    excerpt: "",
    category: "Producción",
    year: currentYear(),
    client: "Ultimate Media Productions",
    deliverables: "",
    status: "borrador",
    videoYoutubeId: "",
    lead: "",
    storyText: "",
    credits: [{ role: "", name: "" }],
    coverPreview: "",
    gallery: [],
  };
}

export default function PortfolioCms() {
  const projects = useQuery(api.portfolio.list);
  const generateUploadUrl = useMutation(api.portfolio.generateUploadUrl);
  const createProject = useMutation(api.portfolio.create);
  const updateProject = useMutation(api.portfolio.update);
  const setStatus = useMutation(api.portfolio.setStatus);
  const removeProject = useMutation(api.portfolio.remove);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"portfolioProjects"> | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"portfolioProjects"> | null>(
    null,
  );

  const publishedCount = useMemo(
    () => projects?.filter((item) => item.status === "publicado").length ?? 0,
    [projects],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setFormError("");
    setEditorOpen(true);
  }

  function openEdit(project: NonNullable<typeof projects>[number]) {
    setEditingId(project._id);
    setForm({
      title: project.title,
      slug: project.slug,
      subtitle: project.subtitle,
      excerpt: project.excerpt,
      category: project.category,
      year: project.year,
      client: project.client,
      deliverables: project.deliverables,
      status: project.status,
      videoYoutubeId: project.videoYoutubeId || "",
      lead: project.lead,
      storyText: project.story.join("\n\n"),
      credits:
        project.credits.length > 0
          ? project.credits.map((credit) => ({ ...credit }))
          : [{ role: "", name: "" }],
      coverStorageId: project.coverStorageId,
      coverPreview: project.coverUrl || "",
      gallery: project.gallery
        .filter((item) => item.url)
        .map((item) => ({
          storageId: item.storageId,
          alt: item.alt || "",
          preview: item.url as string,
        })),
    });
    setSlugTouched(true);
    setFormError("");
    setEditorOpen(true);
  }

  function patchForm(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function handleCover(file: File) {
    setUploading("cover");
    setFormError("");
    try {
      const { storageId, preview } = await uploadCmsImage(
        file,
        generateUploadUrl,
      );
      patchForm({
        coverStorageId: storageId,
        coverPreview: preview,
      });
    } catch (error) {
      setFormError(cmsErrorMessage(error, "No se pudo guardar el proyecto."));
    } finally {
      setUploading(null);
    }
  }

  async function handleGalleryFiles(files: FileList | File[]) {
    setUploading("gallery");
    setFormError("");
    try {
      const uploaded: GalleryDraft[] = [];
      for (const file of Array.from(files)) {
        const { storageId, preview } = await uploadCmsImage(
          file,
          generateUploadUrl,
        );
        uploaded.push({
          storageId,
          alt: "",
          preview,
        });
      }
      patchForm({ gallery: [...form.gallery, ...uploaded] });
    } catch (error) {
      setFormError(cmsErrorMessage(error, "No se pudo guardar el proyecto."));
    } finally {
      setUploading(null);
    }
  }

  function removeGalleryItem(index: number) {
    patchForm({
      gallery: form.gallery.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    const payload = {
      slug: form.slug || toSlug(form.title),
      title: form.title,
      subtitle: form.subtitle,
      excerpt: form.excerpt,
      category: form.category,
      year: form.year,
      client: form.client,
      deliverables: form.deliverables,
      status: form.status,
      coverStorageId: form.coverStorageId,
      videoYoutubeId: parseYoutubeId(form.videoYoutubeId) || undefined,
      lead: form.lead,
      story: splitParagraphs(form.storyText),
      credits: form.credits,
      gallery: form.gallery.map((item) => ({
        storageId: item.storageId,
        alt: item.alt || undefined,
      })),
    };
    try {
      if (editingId) {
        await updateProject({ id: editingId, ...payload });
      } else {
        await createProject(payload);
      }
      setEditorOpen(false);
    } catch (error) {
      setFormError(cmsErrorMessage(error, "No se pudo guardar el proyecto."));
    } finally {
      setSaving(false);
    }
  }

  if (editorOpen) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditorOpen(false)}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-mono font-bold uppercase text-grayscale-9 hover:text-grayscale-12"
          >
            <ArrowLeftIcon size={14} weight="bold" />
            Portafolio
          </button>
          <div className="flex items-center gap-2">
            <Select
              id="portfolio-status"
              value={form.status}
              onChange={(event) =>
                patchForm({ status: event.target.value as ProjectStatus })
              }
              options={[
                { value: "borrador", label: "Borrador" },
                { value: "publicado", label: "Publicado" },
              ]}
              className="w-36"
            />
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || Boolean(uploading)}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-grayscale-12">
            {editingId ? "Editar proyecto" : "Nuevo proyecto"}
          </h2>
          <p className="mt-1 text-sm text-grayscale-9">
            Lo que publiques aquí se muestra en la landing en
            /portfolio/{form.slug || "slug"}.
          </p>
        </div>

        {formError && (
          <p className="mb-4 rounded-lg border border-red-6 bg-red-3 px-3 py-2 text-sm text-red-11">
            {formError}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <div className="flex flex-col gap-4">
            <Input
              id="portfolio-title"
              label="Título"
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                patchForm({
                  title,
                  slug: slugTouched ? form.slug : toSlug(title),
                });
              }}
              placeholder="Buscando al dealer"
            />
            <Input
              id="portfolio-slug"
              label="Slug (URL)"
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                patchForm({ slug: toSlug(event.target.value) });
              }}
              placeholder="buscando-al-dealer"
            />
            <Input
              id="portfolio-subtitle"
              label="Subtítulo"
              value={form.subtitle}
              onChange={(event) => patchForm({ subtitle: event.target.value })}
              placeholder="Serie documental original"
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="portfolio-excerpt"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Extracto
              </label>
              <textarea
                id="portfolio-excerpt"
                value={form.excerpt}
                onChange={(event) => patchForm({ excerpt: event.target.value })}
                rows={3}
                placeholder="Una línea para la ficha. Opcional."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="portfolio-lead"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Párrafo de apertura
              </label>
              <textarea
                id="portfolio-lead"
                value={form.lead}
                onChange={(event) => patchForm({ lead: event.target.value })}
                rows={4}
                placeholder="El texto que abre la ficha del proyecto."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="portfolio-story"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Historia
              </label>
              <textarea
                id="portfolio-story"
                value={form.storyText}
                onChange={(event) =>
                  patchForm({ storyText: event.target.value })
                }
                rows={7}
                placeholder="Separa cada párrafo con una línea en blanco."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium font-mono uppercase text-grayscale-10">
                  Créditos
                </p>
                <button
                  type="button"
                  onClick={() =>
                    patchForm({
                      credits: [...form.credits, { role: "", name: "" }],
                    })
                  }
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-mono font-bold uppercase text-accent-11 hover:text-accent-12"
                >
                  <PlusIcon size={12} weight="bold" />
                  Crédito
                </button>
              </div>
              {form.credits.map((credit, index) => (
                <div key={`credit-${index}`} className="flex items-end gap-2">
                  <Input
                    id={`credit-role-${index}`}
                    label={index === 0 ? "Rol" : undefined}
                    value={credit.role}
                    onChange={(event) => {
                      const credits = [...form.credits];
                      credits[index] = {
                        ...credit,
                        role: event.target.value,
                      };
                      patchForm({ credits });
                    }}
                    placeholder="Dirección"
                  />
                  <Input
                    id={`credit-name-${index}`}
                    label={index === 0 ? "Nombre" : undefined}
                    value={credit.name}
                    onChange={(event) => {
                      const credits = [...form.credits];
                      credits[index] = {
                        ...credit,
                        name: event.target.value,
                      };
                      patchForm({ credits });
                    }}
                    placeholder="Equipo UMP"
                  />
                  {form.credits.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchForm({
                          credits: form.credits.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                      className="mb-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                      aria-label="Quitar crédito"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium font-mono uppercase text-grayscale-10">
                Imagen de portada
              </span>
              <label
                className={cn(
                  "flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-grayscale-4 bg-grayscale-2 text-center dark:border-grayscale-5",
                  form.coverPreview && "border-solid p-0",
                )}
              >
                {form.coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.coverPreview}
                    alt="Portada del proyecto"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 py-8 text-grayscale-8">
                    <ImageIcon size={24} />
                    <span className="text-xs">
                      {uploading === "cover"
                        ? "Subiendo..."
                        : "Subir imagen horizontal"}
                    </span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleCover(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <Input
              id="portfolio-category"
              label="Categoría"
              list="portfolio-categories"
              value={form.category}
              onChange={(event) => patchForm({ category: event.target.value })}
            />
            <datalist id="portfolio-categories">
              {CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <Input
              id="portfolio-year"
              label="Año"
              value={form.year}
              onChange={(event) => patchForm({ year: event.target.value })}
            />
            <Input
              id="portfolio-client"
              label="Cliente"
              value={form.client}
              onChange={(event) => patchForm({ client: event.target.value })}
            />
            <Input
              id="portfolio-deliverables"
              label="Servicios"
              value={form.deliverables}
              onChange={(event) =>
                patchForm({ deliverables: event.target.value })
              }
              placeholder="Dirección · Montaje · Color"
            />
            <Input
              id="portfolio-youtube"
              label="YouTube (id o URL)"
              value={form.videoYoutubeId}
              onChange={(event) =>
                patchForm({ videoYoutubeId: event.target.value })
              }
              placeholder="https://youtu.be/..."
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-mono uppercase text-grayscale-10">
                  Galería
                </span>
                <span className="text-[11px] font-mono text-grayscale-8">
                  {form.gallery.length} fotos
                </span>
              </div>
              {form.gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {form.gallery.map((item, index) => (
                    <div
                      key={`${item.storageId}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-grayscale-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt={item.alt || `Foto ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(index)}
                        className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md bg-white/90 text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                        aria-label="Quitar foto"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-grayscale-4 bg-grayscale-1 px-3 py-5 text-grayscale-8 hover:border-grayscale-5 dark:border-grayscale-5 dark:bg-grayscale-3">
                <ImageIcon size={16} />
                <span className="text-xs">
                  {uploading === "gallery"
                    ? "Subiendo..."
                    : "Agregar fotos"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const files = event.target.files;
                    if (files && files.length > 0) {
                      void handleGalleryFiles(files);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-grayscale-9">
          {publishedCount} publicados en la landing
          {projects ? ` · ${projects.length} en total` : ""}
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon size={14} weight="bold" />
          Nuevo proyecto
        </Button>
      </div>

      {projects === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-64 animate-pulse rounded-xl bg-grayscale-3"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<SquaresFourIcon size={28} />}
          title="Todavía no hay proyectos"
          description="Crea el primero. Al publicarlo, la landing lo mostrará en /portfolio."
          action={
            <Button type="button" onClick={openCreate}>
              Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project._id}
              className="flex flex-col overflow-hidden rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4"
            >
              <div className="relative h-40 bg-grayscale-3">
                {project.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-grayscale-7">
                    <ImageIcon size={28} />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      project.status === "publicado" ? "green" : "orange"
                    }
                  >
                    {project.status === "publicado" ? "Publicado" : "Borrador"}
                  </Badge>
                  <span className="text-[11px] font-mono uppercase text-grayscale-8">
                    {project.category} · {project.year}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-grayscale-12">
                  {project.title}
                </h3>
                <p className="line-clamp-2 text-xs text-grayscale-9">
                  {project.excerpt || project.subtitle || "Sin extracto"}
                </p>
                <p className="font-mono text-[10px] text-grayscale-8">
                  /portfolio/{project.slug}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => openEdit(project)}
                  >
                    <PencilSimpleIcon size={13} />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() =>
                      void setStatus({
                        id: project._id,
                        status:
                          project.status === "publicado"
                            ? "borrador"
                            : "publicado",
                      })
                    }
                  >
                    {project.status === "publicado" ? "Ocultar" : "Publicar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(project._id)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                    aria-label="Eliminar proyecto"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar proyecto"
        description="Este proyecto dejará de aparecer en la landing. Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (!deleteId) return;
          await removeProject({ id: deleteId });
          setDeleteId(null);
        }}
      />
    </div>
  );
}
