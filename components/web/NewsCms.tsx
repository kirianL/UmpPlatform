"use client";

import {
  ArrowLeftIcon,
  ImageIcon,
  LinkSimpleIcon,
  NewspaperClippingIcon,
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
  normalizeHttpUrl,
  splitParagraphs,
  toSlug,
  todayYmd,
  uploadCmsImage,
} from "@/lib/cms-utils";
import { NEWS_AUTHORS, findNewsAuthor } from "@/lib/news-authors";

type ArticleStatus = "borrador" | "publicado";

type SectionDraft = {
  title: string;
  body: string;
  imageStorageId?: Id<"_storage">;
  imagePreview: string;
  linkEnabled: boolean;
  linkLabel: string;
  linkUrl: string;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  status: ArticleStatus;
  introText: string;
  sections: SectionDraft[];
  authorIds: string[];
  teamLabel: string;
  coverStorageId?: Id<"_storage">;
  coverPreview: string;
};

const CATEGORIES = [
  "Institucional",
  "Producción",
  "Estudio",
  "Equipo",
  "Comunidad",
];

function emptyForm(): FormState {
  return {
    title: "",
    slug: "",
    excerpt: "",
    category: "Institucional",
    publishedAt: todayYmd(),
    status: "borrador",
    introText: "",
    sections: [
      {
        title: "",
        body: "",
        imagePreview: "",
        linkEnabled: false,
        linkLabel: "",
        linkUrl: "",
      },
    ],
    authorIds: [],
    teamLabel: "Equipo Creativo UMP Media",
    coverPreview: "",
  };
}

function formatNewsDate(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return ymd;
  return new Date(year, month - 1, day).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function uniqueAuthorIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function NewsCms() {
  const articles = useQuery(api.news.list);
  const generateUploadUrl = useMutation(api.news.generateUploadUrl);
  const createArticle = useMutation(api.news.create);
  const updateArticle = useMutation(api.news.update);
  const setStatus = useMutation(api.news.setStatus);
  const removeArticle = useMutation(api.news.remove);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"newsArticles"> | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"newsArticles"> | null>(null);

  const publishedCount = useMemo(
    () => articles?.filter((item) => item.status === "publicado").length ?? 0,
    [articles],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setFormError("");
    setEditorOpen(true);
  }

  function openEdit(article: NonNullable<typeof articles>[number]) {
    setEditingId(article._id);
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      category: article.category,
      publishedAt: article.publishedAt,
      status: article.status,
      introText: article.intro.join("\n\n"),
      sections:
        article.sections.length > 0
          ? article.sections.map((section) => ({
              title: section.title,
              body: section.paragraphs.join("\n\n"),
              imageStorageId: section.imageStorageId,
              imagePreview: section.imageUrl || "",
              linkEnabled: Boolean(section.linkUrl),
              linkLabel: section.linkLabel || "",
              linkUrl: section.linkUrl || "",
            }))
          : [
              {
                title: "",
                body: "",
                imagePreview: "",
                linkEnabled: false,
                linkLabel: "",
                linkUrl: "",
              },
            ],
      authorIds: uniqueAuthorIds(
        article.authors
          .map((author) => findNewsAuthor(author)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
      teamLabel: article.teamLabel || "Equipo Creativo UMP Media",
      coverStorageId: article.coverStorageId,
      coverPreview: article.coverUrl || "",
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
      setFormError(cmsErrorMessage(error, "No se pudo guardar la noticia."));
    } finally {
      setUploading(null);
    }
  }

  async function handleSectionImage(index: number, file: File) {
    setUploading(`section-${index}`);
    setFormError("");
    try {
      const { storageId, preview } = await uploadCmsImage(
        file,
        generateUploadUrl,
      );
      const sections = [...form.sections];
      sections[index] = {
        ...sections[index],
        imageStorageId: storageId,
        imagePreview: preview,
      };
      patchForm({ sections });
    } catch (error) {
      setFormError(cmsErrorMessage(error, "No se pudo guardar la noticia."));
    } finally {
      setUploading(null);
    }
  }

  function clearSectionImage(index: number) {
    const sections = [...form.sections];
    sections[index] = {
      ...sections[index],
      imageStorageId: undefined,
      imagePreview: "",
    };
    patchForm({ sections });
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    const payload = {
      slug: form.slug || toSlug(form.title),
      title: form.title,
      excerpt: form.excerpt,
      category: form.category,
      publishedAt: form.publishedAt,
      status: form.status,
      coverStorageId: form.coverStorageId,
      intro: splitParagraphs(form.introText),
      sections: form.sections.map((section) => ({
        title: section.title,
        paragraphs: splitParagraphs(section.body),
        imageStorageId: section.imageStorageId,
        linkUrl: section.linkEnabled
          ? normalizeHttpUrl(section.linkUrl) || undefined
          : undefined,
        linkLabel: section.linkEnabled
          ? section.linkLabel.trim() || undefined
          : undefined,
      })),
      authors: uniqueAuthorIds(form.authorIds)
        .map((id) => NEWS_AUTHORS.find((person) => person.id === id))
        .filter((person): person is (typeof NEWS_AUTHORS)[number] =>
          Boolean(person),
        )
        .map((person) => ({ id: person.id, name: person.name })),
      teamLabel: form.teamLabel,
    };
    try {
      if (editingId) {
        await updateArticle({ id: editingId, ...payload });
      } else {
        await createArticle(payload);
      }
      setEditorOpen(false);
    } catch (error) {
      setFormError(cmsErrorMessage(error, "No se pudo guardar la noticia."));
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
            Noticias
          </button>
          <div className="flex items-center gap-2">
            <Select
              id="news-status"
              value={form.status}
              onChange={(event) =>
                patchForm({ status: event.target.value as ArticleStatus })
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
            {editingId ? "Editar noticia" : "Nueva noticia"}
          </h2>
          <p className="mt-1 text-sm text-grayscale-9">
            Lo que publiques aquí se muestra en la landing en
            /news/{form.slug || "slug"}.
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
              id="news-title"
              label="Título"
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                patchForm({
                  title,
                  slug: slugTouched ? form.slug : toSlug(title),
                });
              }}
              placeholder="Visita de la Ministra del MEIC a UMP..."
            />
            <Input
              id="news-slug"
              label="Slug (URL)"
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                patchForm({ slug: toSlug(event.target.value) });
              }}
              placeholder="visita-ministerial-desarrollo-ump"
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="news-excerpt"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Extracto
              </label>
              <textarea
                id="news-excerpt"
                value={form.excerpt}
                onChange={(event) => patchForm({ excerpt: event.target.value })}
                rows={3}
                placeholder="Resumen corto que aparece bajo el título."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="news-intro"
                className="text-xs font-medium font-mono uppercase text-grayscale-10"
              >
                Introducción
              </label>
              <textarea
                id="news-intro"
                value={form.introText}
                onChange={(event) =>
                  patchForm({ introText: event.target.value })
                }
                rows={6}
                placeholder="Párrafos iniciales. Separa cada párrafo con una línea en blanco."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium font-mono uppercase text-grayscale-10">
                  Secciones / índice de temas
                </p>
                <button
                  type="button"
                  onClick={() =>
                    patchForm({
                      sections: [
                        ...form.sections,
                        {
                          title: "",
                          body: "",
                          imagePreview: "",
                          linkEnabled: false,
                          linkLabel: "",
                          linkUrl: "",
                        },
                      ],
                    })
                  }
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-mono font-bold uppercase text-accent-11 hover:text-accent-12"
                >
                  <PlusIcon size={12} weight="bold" />
                  Sección
                </button>
              </div>
              {form.sections.map((section, index) => (
                <div
                  key={`section-${index}`}
                  className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3 dark:border-grayscale-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-mono font-bold uppercase text-grayscale-9">
                      Tema {index + 1}
                    </p>
                    {form.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          patchForm({
                            sections: form.sections.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        className="cursor-pointer text-grayscale-8 hover:text-red-10"
                        aria-label="Quitar sección"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                  <Input
                    id={`section-title-${index}`}
                    label="Título de la sección"
                    value={section.title}
                    onChange={(event) => {
                      const sections = [...form.sections];
                      sections[index] = {
                        ...section,
                        title: event.target.value,
                      };
                      patchForm({ sections });
                    }}
                  />
                  <div className="mt-2 flex flex-col gap-1.5">
                    <label
                      htmlFor={`section-body-${index}`}
                      className="text-xs font-medium font-mono uppercase text-grayscale-10"
                    >
                      Párrafos
                    </label>
                    <textarea
                      id={`section-body-${index}`}
                      value={section.body}
                      onChange={(event) => {
                        const sections = [...form.sections];
                        sections[index] = {
                          ...section,
                          body: event.target.value,
                        };
                        patchForm({ sections });
                      }}
                      rows={5}
                      placeholder="Separa cada párrafo con una línea en blanco."
                      className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3"
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium font-mono uppercase text-grayscale-10">
                      Foto de la sección
                    </span>
                    {section.imagePreview ? (
                      <div className="relative overflow-hidden rounded-lg border border-grayscale-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={section.imagePreview}
                          alt={
                            section.title || `Foto de la sección ${index + 1}`
                          }
                          className="h-36 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => clearSectionImage(index)}
                          className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/90 text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                          aria-label="Quitar foto de la sección"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-grayscale-4 bg-grayscale-1 px-3 py-6 text-grayscale-8 hover:border-grayscale-5 dark:border-grayscale-5 dark:bg-grayscale-3">
                        <ImageIcon size={16} />
                        <span className="text-xs">
                          {uploading === `section-${index}`
                            ? "Subiendo..."
                            : "Subir foto"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading !== null}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleSectionImage(index, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium font-mono uppercase text-grayscale-10">
                      Enlace de la sección
                    </span>
                    {section.linkEnabled ? (
                      <div className="relative rounded-lg border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3">
                        <button
                          type="button"
                          onClick={() => {
                            const sections = [...form.sections];
                            sections[index] = {
                              ...section,
                              linkEnabled: false,
                              linkLabel: "",
                              linkUrl: "",
                            };
                            patchForm({ sections });
                          }}
                          className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                          aria-label="Quitar enlace de la sección"
                        >
                          <XIcon size={14} />
                        </button>
                        <div className="flex flex-col gap-2 pr-8">
                          <Input
                            id={`section-link-label-${index}`}
                            label="Texto del enlace"
                            value={section.linkLabel}
                            onChange={(event) => {
                              const sections = [...form.sections];
                              sections[index] = {
                                ...section,
                                linkLabel: event.target.value,
                              };
                              patchForm({ sections });
                            }}
                            placeholder="Ver el episodio"
                          />
                          <Input
                            id={`section-link-url-${index}`}
                            label="URL"
                            value={section.linkUrl}
                            onChange={(event) => {
                              const sections = [...form.sections];
                              sections[index] = {
                                ...section,
                                linkUrl: event.target.value,
                              };
                              patchForm({ sections });
                            }}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const sections = [...form.sections];
                          sections[index] = {
                            ...section,
                            linkEnabled: true,
                          };
                          patchForm({ sections });
                        }}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-grayscale-4 bg-grayscale-1 px-3 py-6 text-grayscale-8 hover:border-grayscale-5 dark:border-grayscale-5 dark:bg-grayscale-3"
                      >
                        <LinkSimpleIcon size={16} />
                        <span className="text-xs">Agregar enlace</span>
                      </button>
                    )}
                  </div>
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
                    alt="Portada de la noticia"
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
              id="news-category"
              label="Categoría"
              list="news-categories"
              value={form.category}
              onChange={(event) => patchForm({ category: event.target.value })}
            />
            <datalist id="news-categories">
              {CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <Input
              id="news-date"
              label="Fecha"
              type="date"
              value={form.publishedAt}
              onChange={(event) =>
                patchForm({ publishedAt: event.target.value })
              }
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium font-mono uppercase text-grayscale-10">
                Autores
              </span>
              <div className="flex flex-col gap-1.5">
                {NEWS_AUTHORS.map((person) => {
                  const selected = form.authorIds.includes(person.id);
                  return (
                    <div
                      key={person.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2",
                        selected
                          ? "border-accent-7 bg-accent-2/40 dark:border-accent-8 dark:bg-accent-3/20"
                          : "border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (selected) return;
                          patchForm({
                            authorIds: uniqueAuthorIds([
                              ...form.authorIds,
                              person.id,
                            ]),
                          });
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={person.cmsPhoto}
                          alt=""
                          className="size-9 rounded-full object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-grayscale-12">
                            {person.name}
                          </span>
                          <span className="block text-[11px] text-grayscale-9">
                            {person.role}
                          </span>
                        </span>
                      </button>
                      {selected && (
                        <button
                          type="button"
                          onClick={() =>
                            patchForm({
                              authorIds: form.authorIds.filter(
                                (id) => id !== person.id,
                              ),
                            })
                          }
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                          aria-label={`Quitar a ${person.name}`}
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Input
              id="news-team"
              label="Equipo"
              value={form.teamLabel}
              onChange={(event) => patchForm({ teamLabel: event.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-grayscale-9">
          {publishedCount} publicadas en la landing
          {articles ? ` · ${articles.length} en total` : ""}
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon size={14} weight="bold" />
          Nueva noticia
        </Button>
      </div>

      {articles === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-64 animate-pulse rounded-xl bg-grayscale-3"
            />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<NewspaperClippingIcon size={28} />}
          title="Todavía no hay noticias"
          description="Crea la primera nota. Al publicarla, la landing la mostrará en /news."
          action={
            <Button type="button" onClick={openCreate}>
              Nueva noticia
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article._id}
              className="flex flex-col overflow-hidden rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4"
            >
              <div className="relative h-40 bg-grayscale-3">
                {article.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.coverUrl}
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
                      article.status === "publicado" ? "green" : "orange"
                    }
                  >
                    {article.status === "publicado" ? "Publicado" : "Borrador"}
                  </Badge>
                  <span className="text-[11px] font-mono uppercase text-grayscale-8">
                    {article.category} · {formatNewsDate(article.publishedAt)}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-grayscale-12">
                  {article.title}
                </h3>
                <p className="line-clamp-2 text-xs text-grayscale-9">
                  {article.excerpt || "Sin extracto"}
                </p>
                <p className="font-mono text-[10px] text-grayscale-8">
                  /news/{article.slug}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => openEdit(article)}
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
                        id: article._id,
                        status:
                          article.status === "publicado"
                            ? "borrador"
                            : "publicado",
                      })
                    }
                  >
                    {article.status === "publicado" ? "Ocultar" : "Publicar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(article._id)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-grayscale-8 hover:bg-red-3 hover:text-red-11"
                    aria-label="Eliminar noticia"
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
        title="Eliminar noticia"
        description="Esta noticia dejará de aparecer en la landing. Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (!deleteId) return;
          await removeArticle({ id: deleteId });
          setDeleteId(null);
        }}
      />
    </div>
  );
}
