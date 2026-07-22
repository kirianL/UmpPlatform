"use client";

import {
  BookOpenIcon,
  ChatTeardropTextIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ScrollIcon,
  ShareNetworkIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import DataTable, { type Column } from "@/components/public/DataTable";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import PageContainer from "@/components/public/PageContainer";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const STATUS_BADGE = {
  draft: { label: "Borrador", variant: "gray" as const },
  review: { label: "En Revisión", variant: "orange" as const },
  approved: { label: "Aprobado", variant: "green" as const },
};

const EMPTY_SCRIPT = {
  title: "",
  episodeOrProject: "",
  version: "v1.0",
  status: "draft" as const,
  fileName: "",
  fileSize: "0 KB",
  fileType: "application/pdf",
  description: "",
  content: "",
  fileDataUrl: "",
};

export default function GuionesPage() {
  const scripts = useQuery(api.scripts.get) ?? [];
  const createScript = useMutation(api.scripts.create);
  const updateScript = useMutation(api.scripts.update);
  const removeScript = useMutation(api.scripts.remove);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY_SCRIPT);

  // Load comments for selected script
  const scriptComments = useQuery(
    api.scripts.getCommentsByScriptId,
    selectedScript ? { scriptId: selectedScript._id } : "skip"
  ) ?? [];

  const filtered = scripts.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.episodeOrProject.toLowerCase().includes(search.toLowerCase()) ||
      s.version.toLowerCase().includes(search.toLowerCase())
  );

  const approvedCount = scripts.filter((s) => s.status === "approved").length;
  const reviewCount = scripts.filter((s) => s.status === "review").length;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_SCRIPT);
    setSelectedFile(null);
    setModalOpen(true);
  }

  function openEdit(script: any) {
    setEditingId(script._id);
    setForm({
      title: script.title,
      episodeOrProject: script.episodeOrProject,
      version: script.version,
      status: script.status,
      fileName: script.fileName,
      fileSize: script.fileSize,
      fileType: script.fileType,
      description: script.description || "",
      content: script.content || "",
      fileDataUrl: script.fileUrl || "",
    });
    setSelectedFile(null);
    setModalOpen(true);
  }

  function openDetails(script: any) {
    setSelectedScript(script);
    setDetailsModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeKb = Math.round(file.size / 1024);
      const formattedSize = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

      // Read file to text if plain text (.txt)
      if (file.name.endsWith(".txt") || file.type.startsWith("text/")) {
        const textReader = new FileReader();
        textReader.onload = () => {
          if (typeof textReader.result === "string") {
            setForm((f) => ({ ...f, content: textReader.result as string }));
          }
        };
        textReader.readAsText(file);
      }

      // Read file to Data URL and extract PDF text via API
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setForm((f) => ({
          ...f,
          fileName: file.name,
          fileSize: formattedSize,
          fileType: file.type || "application/pdf",
          fileDataUrl: dataUrl,
        }));

        if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
          try {
            const res = await fetch("/api/extract-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pdfBase64: dataUrl }),
            });
            const data = await res.json();
            if (data.text && data.text.trim().length > 0) {
              setForm((f) => ({ ...f, content: data.text }));
            }
          } catch (err) {
            console.warn("Could not extract PDF text automatically:", err);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSave() {
    const scriptTitle = form.title.trim() || "Nuevo Guión sin Título";

    const shareId = editingId
      ? scriptTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20) + "-" + Math.random().toString(36).substring(2, 7)
      : "guion-" + Math.random().toString(36).substring(2, 9);

    if (editingId) {
      updateScript({
        id: editingId as any,
        title: scriptTitle,
        episodeOrProject: form.episodeOrProject,
        version: form.version,
        status: form.status,
        fileName: form.fileName || "Guion.pdf",
        fileSize: form.fileSize || "1.0 MB",
        fileType: form.fileType || "application/pdf",
        fileUrl: form.fileDataUrl || undefined,
        description: form.description,
        content: form.content,
      });
    } else {
      createScript({
        title: scriptTitle,
        episodeOrProject: form.episodeOrProject,
        version: form.version,
        status: form.status,
        fileName: form.fileName || "Guion_Oficial.pdf",
        fileSize: form.fileSize || "1.5 MB",
        fileType: form.fileType || "application/pdf",
        fileUrl: form.fileDataUrl || undefined,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Producción UMP",
        shareId: shareId,
        description: form.description,
        content: form.content,
      });
    }

    setModalOpen(false);
  }

  function handleDelete(id: string) {
    removeScript({ id: id as any });
  }

  function copyShareLink(shareId: string) {
    const url = `${window.location.origin}/guiones/public/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const columns: Column<any>[] = [
    {
      key: "title",
      header: "Guión / Proyecto",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-2/30 text-accent-11 border border-accent-4/30">
            <FilePdfIcon size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openDetails(s)}
              className="text-left font-bold text-sm text-grayscale-12 hover:text-accent-9 transition-colors truncate block"
            >
              {s.title}
            </button>
            <p className="text-xs text-grayscale-9 flex items-center gap-2">
              <span>{s.episodeOrProject}</span>
              <span>•</span>
              <span className="font-mono text-[11px] font-semibold text-accent-10">{s.version}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "file",
      header: "Archivo",
      className: "hidden sm:table-cell",
      render: (s) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-mono text-grayscale-11 truncate max-w-[180px]">{s.fileName}</span>
          <span className="text-[11px] text-grayscale-8 font-mono">{s.fileSize}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      filterOptions: [
        { label: "Borrador", value: "draft" },
        { label: "En Revisión", value: "review" },
        { label: "Aprobado", value: "approved" },
      ],
      getFilterValue: (s) => s.status,
      render: (s) => (
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider">
          <span className={`size-2 rounded-full ${s.status === "approved" ? "bg-emerald-500" : s.status === "review" ? "bg-amber-500" : "bg-grayscale-8"}`} />
          <span className={s.status === "approved" ? "text-emerald-11 dark:text-emerald-400" : "text-amber-11 dark:text-amber-400"}>
            {s.status === "approved" ? "Aprobado" : s.status === "review" ? "En Revisión" : "Borrador"}
          </span>
        </div>
      ),
    },
    {
      key: "share",
      header: "Enlace Público",
      className: "hidden md:table-cell",
      render: (s) => (
        <button
          type="button"
          onClick={() => copyShareLink(s.shareId)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-2.5 py-1 text-xs font-mono text-grayscale-11 hover:border-accent-6 hover:text-accent-11 hover:bg-accent-2/10 transition-all cursor-pointer"
          title="Copiar enlace de lectura y comentarios para actores"
        >
          {copiedId === s.shareId ? (
            <>
              <CheckCircleIcon size={14} className="text-green-9" />
              <span className="text-green-11 font-bold">¡Copiado!</span>
            </>
          ) : (
            <>
              <ShareNetworkIcon size={14} className="text-accent-9" />
              <span>Link Público</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openDetails(s)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Ver detalles, texto y comentarios"
          >
            <ChatTeardropTextIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => openEdit(s)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-11"
            title="Editar guión"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(s._id)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11"
            title="Eliminar guión"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            Guiones
          </h1>
          <p className="text-sm text-grayscale-10">
            Control de archivos de guión y retroalimentación del elenco
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Guiones"
            value={scripts.length}
            icon={<FileTextIcon size={18} weight="fill" />}
            index={0}
          />
          <StatCard
            label="Aprobados"
            value={approvedCount}
            detail="Listos para producción"
            icon={<CheckCircleIcon size={18} weight="fill" />}
            index={1}
          />
          <StatCard
            label="En Revisión"
            value={reviewCount}
            detail="Recibiendo comentarios"
            icon={<ChatTeardropTextIcon size={18} weight="fill" />}
            index={2}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
            />
            <input
              type="text"
              placeholder="Buscar por título, episodio o versión..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
            />
          </div>
          <Button variant="primary" className="text-xs" onClick={openCreate}>
            <UploadSimpleIcon size={16} weight="bold" />
            Subir nuevo guión
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(s) => s._id}
          emptyState={
            <EmptyState
              icon={<ScrollIcon size={40} weight="duotone" />}
              title="Sin guiones registrados"
              description={
                search
                  ? "No se encontraron guiones con esos criterios de búsqueda."
                  : "Aún no has subido archivos de guión a la plataforma."
              }
              action={
                !search && (
                  <Button variant="primary" className="text-xs" onClick={openCreate}>
                    <UploadSimpleIcon size={16} weight="bold" />
                    Subir primer guión
                  </Button>
                )
              }
            />
          }
        />

        {/* Modal Creación / Edición */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={editingId ? "Editar Guión" : "Subir Nuevo Guión"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Título del Guión"
              id="script-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Horizontes — Episodio 1: El Despertar"
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Proyecto / Episodio"
                id="script-project"
                value={form.episodeOrProject}
                onChange={(e) => setForm((f) => ({ ...f, episodeOrProject: e.target.value }))}
                placeholder="Ej: Serie Horizontes T1"
                required
              />
              <Input
                label="Versión"
                id="script-version"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="Ej: v1.0, Borrador 2"
                required
              />
            </div>

            <Select
              label="Estado del Guión"
              id="script-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              options={[
                { value: "draft", label: "Borrador" },
                { value: "review", label: "En Revisión" },
                { value: "approved", label: "Aprobado" },
              ]}
            />



            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Adjuntar Archivo de Respaldos (Opcional)
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-4 bg-grayscale-2 p-4 text-center dark:border-grayscale-5 dark:bg-grayscale-3/40 hover:border-accent-7 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                />
                <UploadSimpleIcon size={24} className="text-accent-9 mb-1" />
                <p className="text-xs font-semibold text-grayscale-11">
                  {selectedFile ? selectedFile.name : form.fileName ? form.fileName : "Haz clic o arrastra tu archivo aquí"}
                </p>
              </div>
            </div>

            <Input
              label="Notas / Descripción Corta"
              id="script-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notas importantes sobre este corte o escena..."
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
                {editingId ? "Guardar Cambios" : "Subir Guión"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Ver Detalles, Texto & Retroalimentación */}
        {selectedScript && (
          <Modal
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            title="Detalles del Guión"
            className="w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-4 sm:gap-5">
              {/* Header: Title, Episode, Version & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-grayscale-3 pb-3 dark:border-grayscale-4/60">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
                  <span className="font-extrabold text-grayscale-12 text-sm sm:text-base">{selectedScript.title}</span>
                  <span className="text-grayscale-8">•</span>
                  <span className="text-accent-10 font-bold uppercase">{selectedScript.episodeOrProject}</span>
                  <span className="text-grayscale-8">•</span>
                  <span className="text-grayscale-10 font-semibold">{selectedScript.version}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider shrink-0">
                  <span className={`size-2 rounded-full ${selectedScript.status === "approved" ? "bg-emerald-500" : selectedScript.status === "review" ? "bg-amber-500" : "bg-grayscale-8"}`} />
                  <span className={selectedScript.status === "approved" ? "text-emerald-11 dark:text-emerald-400" : "text-amber-11 dark:text-amber-400"}>
                    {selectedScript.status === "approved" ? "Aprobado" : selectedScript.status === "review" ? "En Revisión" : "Borrador"}
                  </span>
                </div>
              </div>

              {/* Share link info card (Responsive flex row) */}
              <div className="rounded-xl border border-accent-4/40 bg-accent-2/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon size={16} className="text-accent-10 shrink-0" />
                  <span className="text-xs font-mono font-medium text-grayscale-11 truncate">
                    Enlace de lectura en vivo y comentarios para actores
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyShareLink(selectedScript.shareId)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent-6/40 bg-accent-2/20 px-3 py-1.5 text-xs font-mono font-bold text-accent-11 hover:bg-accent-2/40 transition-colors shrink-0 cursor-pointer"
                >
                  <CopyIcon size={14} />
                  <span>{copiedId === selectedScript.shareId ? "¡Copiado!" : "Copiar Enlace"}</span>
                </button>
              </div>

              {/* Real-Time Script Content Reader / PDF Viewer in Modal */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-grayscale-3 bg-grayscale-2 p-3 sm:p-4 dark:border-grayscale-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon size={16} className="text-accent-9 shrink-0" />
                    <span className="font-mono text-xs font-bold uppercase text-grayscale-11">
                      Lectura del Guión en Vivo
                    </span>
                  </div>
                  {selectedScript.fileUrl && selectedScript.fileUrl.startsWith("data:") && (
                    <span className="text-[10px] font-mono text-emerald-11 dark:text-emerald-400 bg-emerald-2/40 dark:bg-emerald-9/20 px-2 py-0.5 rounded-md border border-emerald-4/30 shrink-0">
                      Documento PDF Cargado
                    </span>
                  )}
                </div>

                {selectedScript.fileUrl && selectedScript.fileUrl.startsWith("data:") ? (
                  <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-grayscale-4/50 bg-white">
                    <iframe
                      src={`${selectedScript.fileUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full border-0"
                      title="Visor PDF de Guión"
                    />
                  </div>
                ) : selectedScript.content ? (
                  <div className="max-h-48 sm:max-h-64 overflow-y-auto rounded-lg border border-grayscale-4/50 bg-grayscale-1 p-3 dark:border-grayscale-5 dark:bg-grayscale-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-grayscale-12 leading-relaxed">
                      {selectedScript.content}
                    </pre>
                  </div>
                ) : (
                  <div className="py-8 text-center text-grayscale-8 font-mono text-xs border border-dashed border-grayscale-4 rounded-lg">
                    Sin texto o archivo PDF para previsualizar.
                  </div>
                )}
              </div>

              {/* Comments Thread */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between border-b border-grayscale-3 pb-2 dark:border-grayscale-4/60">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-grayscale-11 flex items-center gap-1.5">
                    <ChatTeardropTextIcon size={16} className="text-accent-9" />
                    Comentarios y Retroalimentación
                  </h3>
                  <span className="rounded-full bg-accent-2/30 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-11 border border-accent-4/30">
                    {scriptComments.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-40 sm:max-h-52 overflow-y-auto no-scrollbar pr-1">
                  {scriptComments.map((c) => (
                    <div
                      key={c._id}
                      className="rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 flex flex-col gap-1 shadow-sm dark:border-grayscale-4 dark:bg-grayscale-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-grayscale-12 flex items-center gap-1.5 truncate">
                          <UserIcon size={13} className="text-accent-9 shrink-0" />
                          {c.authorName}
                        </span>
                        <span className="text-[10px] text-grayscale-9 font-mono shrink-0">
                          {new Date(c.createdAt).toLocaleDateString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-grayscale-11 leading-relaxed pl-3 sm:pl-5 border-l-2 border-accent-6/40">
                        {c.comment}
                      </p>
                    </div>
                  ))}

                  {scriptComments.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-3 py-6 px-4 text-center dark:border-grayscale-4">
                      <p className="text-xs font-mono text-grayscale-8">Aún no hay comentarios en este guión.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageContainer>
  );
}
