"use client";

import {
  BookOpenIcon,
  ChatTeardropTextIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  PaperPlaneRightIcon,
  ScrollIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import Logo from "@/components/Logo";

export default function PublicScriptPage({ params }: { params: Promise<{ shareId: string }> | { shareId: string } }) {
  const unwrappedParams = typeof (params as any)?.then === "function" ? use(params as Promise<{ shareId: string }>) : (params as { shareId: string });
  const shareId = unwrappedParams?.shareId || "";

  const script = useQuery(api.scripts.getByShareId, shareId ? { shareId } : "skip");
  const comments = useQuery(api.scripts.getCommentsByShareId, shareId ? { shareId } : "skip") ?? [];
  const addComment = useMutation(api.scripts.addComment);

  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !commentText.trim() || !script || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment({
        scriptId: script._id,
        shareId: shareId,
        authorName: authorName.trim(),
        comment: commentText.trim(),
      });

      setCommentText("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (script === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grayscale-1 dark:bg-grayscale-1">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-accent-9 border-t-transparent" />
          <p className="font-mono text-xs text-grayscale-9">Cargando guión...</p>
        </div>
      </div>
    );
  }

  if (script === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grayscale-1 dark:bg-grayscale-1 px-4">
        <div className="flex max-w-md flex-col items-center text-center gap-3 rounded-2xl border border-grayscale-3 bg-grayscale-2 p-8 shadow-sm dark:border-grayscale-4">
          <ScrollIcon size={48} className="text-grayscale-8" />
          <h2 className="font-mono text-lg font-bold text-grayscale-12">Guión No Encontrado</h2>
          <p className="text-xs text-grayscale-9">
            El enlace ingresado no existe o el guión ha sido removido de la plataforma UMP.
          </p>
        </div>
      </div>
    );
  }

  const hasPdfUrl = Boolean(script.fileUrl && script.fileUrl.startsWith("data:"));

  return (
    <div className="min-h-screen bg-grayscale-1 text-grayscale-12 dark:bg-grayscale-1 flex flex-col items-center px-3 py-4 sm:px-6 sm:py-8">
      <div className="w-full max-w-4xl flex flex-col gap-5 sm:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-grayscale-3 pb-4 dark:border-grayscale-4/60">
          <div className="flex items-center gap-2.5">
            <Logo iconSize={18} className="w-6" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-12">
              UmpPlatform
            </span>
          </div>
          <span className="font-mono text-xs text-grayscale-9">
            Lectura de Guiones
          </span>
        </div>

        {/* Main Script Details Card */}
        <div className="rounded-2xl border border-grayscale-3 bg-grayscale-2 p-4 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-5 dark:border-grayscale-4 dark:bg-grayscale-2/60">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-accent-10 uppercase tracking-wide">
                {script.episodeOrProject}
              </span>
              
              {/* Minimal Redesigned Status Indicator */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider">
                <span className={`size-2 rounded-full ${script.status === "approved" ? "bg-emerald-500" : script.status === "review" ? "bg-amber-500" : "bg-grayscale-8"}`} />
                <span className={script.status === "approved" ? "text-emerald-11 dark:text-emerald-400" : "text-amber-11 dark:text-amber-400"}>
                  {script.status === "approved" ? "Aprobado" : script.status === "review" ? "En Revisión" : "Borrador"}
                </span>
              </div>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-grayscale-12 tracking-tight">
              {script.title}
            </h1>
            <p className="text-xs text-grayscale-9 flex flex-wrap items-center gap-2 sm:gap-3">
              <span>Versión: <strong className="text-grayscale-11 font-mono">{script.version}</strong></span>
              <span>•</span>
              <span>Subido por: <strong className="text-grayscale-11">{script.uploadedBy}</strong></span>
            </p>
          </div>

          {script.description && (
            <p className="text-xs sm:text-sm text-grayscale-10 leading-relaxed rounded-xl bg-grayscale-1 p-3 border border-grayscale-3 dark:border-grayscale-4/50">
              {script.description}
            </p>
          )}

          {/* Download File Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-grayscale-4/50 bg-grayscale-1 p-3.5 dark:border-grayscale-4">
            <div className="flex items-center gap-3">
              <FilePdfIcon size={24} className="text-red-9 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-grayscale-12 truncate">{script.fileName}</p>
                <p className="text-[11px] text-grayscale-8 font-mono">{script.fileSize}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (script.fileUrl) {
                  const a = document.createElement("a");
                  a.href = script.fileUrl;
                  a.download = script.fileName;
                  a.click();
                } else {
                  const blob = new Blob([script.content || script.title], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = script.fileName;
                  a.click();
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-2 text-xs font-mono font-medium text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer"
            >
              <DownloadSimpleIcon size={14} />
              Descargar Archivo
            </button>
          </div>
        </div>

        {/* Real-Time Script Reader (Optimizado para Móviles sin Teleprompter) */}
        <div className="rounded-2xl border border-grayscale-3 bg-grayscale-2 p-4 sm:p-6 shadow-sm flex flex-col gap-4 dark:border-grayscale-4 dark:bg-grayscale-2/60">
          <div className="flex items-center gap-2 border-b border-grayscale-3 pb-3 dark:border-grayscale-4/60">
            <BookOpenIcon size={20} className="text-accent-9 shrink-0" />
            <h2 className="font-mono text-xs sm:text-sm font-bold uppercase text-grayscale-12">
              Lectura del Guión
            </h2>
          </div>

          {/* Reader Window - Responsive Viewer */}
          {hasPdfUrl ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-sky-4/40 bg-sky-2/40 p-3 dark:border-sky-8/40 dark:bg-sky-9/20">
                <span className="text-xs text-sky-11 dark:text-sky-300 font-mono">
                  ¿Problemas para visualizar el PDF en tu navegador móvil?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (script.fileUrl) {
                      const a = document.createElement("a");
                      a.href = script.fileUrl;
                      a.download = script.fileName;
                      a.click();
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-6/50 bg-sky-3/60 px-3 py-1.5 text-xs font-mono font-bold text-sky-12 hover:bg-sky-4/60 transition-colors shrink-0 cursor-pointer"
                >
                  <DownloadSimpleIcon size={14} />
                  <span>Abrir / Descargar PDF</span>
                </button>
              </div>
              <div className="w-full rounded-xl overflow-hidden border border-grayscale-4/60 bg-white shadow-inner">
                <iframe
                  src={`${script.fileUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-[65vh] min-h-[400px] sm:h-[750px] border-0"
                  title="Lectura de PDF del Guión"
                />
              </div>
            </div>
          ) : script.content ? (
            <div className="max-h-[60vh] sm:max-h-[650px] overflow-y-auto rounded-xl border border-grayscale-4/60 bg-grayscale-1 p-4 sm:p-6 shadow-inner dark:border-grayscale-5 dark:bg-grayscale-3">
              <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed text-grayscale-12 tracking-wide font-normal">
                {script.content}
              </pre>
            </div>
          ) : (
            <div className="py-12 text-center text-grayscale-9 flex flex-col items-center gap-2 rounded-xl border border-dashed border-grayscale-3 dark:border-grayscale-4">
              <BookOpenIcon size={32} className="text-grayscale-8" />
              <p className="text-xs font-mono uppercase font-bold text-grayscale-8">Sin archivo o texto para mostrar</p>
            </div>
          )}
        </div>

        {/* Comment Box Section (NO LOGIN REQUIRED) */}
        <div className="rounded-2xl border border-grayscale-3 bg-grayscale-2 p-4 sm:p-6 shadow-sm flex flex-col gap-4 dark:border-grayscale-4 dark:bg-grayscale-2/60">
          <div className="flex items-center gap-2">
            <ChatTeardropTextIcon size={20} className="text-accent-9 shrink-0" />
            <h2 className="font-mono text-xs sm:text-sm font-bold uppercase text-grayscale-12">
              Agregar Comentario o Retroalimentación
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre"
              id="actor-name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ej: Carlos Rivera"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Comentario
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe tu comentario..."
                rows={3}
                required
                className="w-full rounded-xl border border-grayscale-4 bg-grayscale-1 p-3 text-xs sm:text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                className="w-full sm:w-auto text-xs gap-1.5"
                type="submit"
                disabled={isSubmitting}
              >
                <PaperPlaneRightIcon size={15} weight="bold" />
                {isSubmitting ? "Enviando..." : "Enviar Comentario"}
              </Button>
            </div>
          </form>
        </div>

        {/* Existing Comments List */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-grayscale-10 flex items-center justify-between">
            <span>Comentarios del elenco</span>
            <span className="rounded-full bg-grayscale-3 px-2 py-0.5 text-[10px] text-grayscale-11 font-mono">
              {comments.length}
            </span>
          </h3>

          <div className="flex flex-col gap-3">
            {comments.map((c) => (
              <div
                key={c._id}
                className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-4 shadow-sm flex flex-col gap-2 dark:border-grayscale-4 dark:bg-grayscale-2/40"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-bold text-grayscale-12 flex items-center gap-1.5 truncate">
                    <UserIcon size={14} className="text-accent-9 shrink-0" />
                    {c.authorName}
                  </span>
                  <span className="text-grayscale-8 text-xs">•</span>
                  <span className="text-[10px] text-grayscale-9 font-mono shrink-0">
                    {new Date(c.createdAt).toLocaleDateString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-grayscale-11 leading-relaxed pl-4 sm:pl-5 border-l-2 border-accent-6/40">
                  {c.comment}
                </p>
              </div>
            ))}

            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-grayscale-3 py-8 px-4 text-center dark:border-grayscale-4">
                <p className="text-xs font-mono text-grayscale-8">Aún no hay comentarios.</p>
                <p className="text-[11px] text-grayscale-9 mt-1">Sé el primero en dejar una observación sobre este guión.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
