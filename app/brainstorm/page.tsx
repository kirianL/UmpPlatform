"use client";

import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowsOutSimpleIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  FolderIcon,
  FolderSimplePlusIcon,
  GridNineIcon,
  HandGrabbingIcon,
  ImageIcon,
  LightbulbIcon,
  LinkIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ClientLogo from "@/components/clients/ClientLogo";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import PageContainer from "@/components/public/PageContainer";
import Select from "@/components/public/Select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const BOARD_COLORS = [
  { value: "#3b82f6", label: "Azul Studio", bgClass: "bg-blue-500" },
  { value: "#8b5cf6", label: "Púrpura Creativo", bgClass: "bg-purple-500" },
  { value: "#10b981", label: "Verde Esmeralda", bgClass: "bg-emerald-500" },
  { value: "#f59e0b", label: "Ámbar Cálido", bgClass: "bg-amber-500" },
  { value: "#ec4899", label: "Rosa Vibrante", bgClass: "bg-pink-500" },
  { value: "#06b6d4", label: "Cian Neón", bgClass: "bg-cyan-500" },
  { value: "#64748b", label: "Gris Grafito", bgClass: "bg-slate-500" },
];

const NOTE_COLORS = [
  { value: "#ffffff", label: "Blanco Neutral", border: "border-grayscale-4" },
  { value: "#fef08a", label: "Amarillo Post-it", border: "border-yellow-300" },
  { value: "#bfdbfe", label: "Azul Mente", border: "border-blue-300" },
  { value: "#fbcfe8", label: "Rosa Idea", border: "border-pink-300" },
  { value: "#bbf7d0", label: "Verde Fresco", border: "border-green-300" },
  { value: "#e9d5ff", label: "Violeta Suave", border: "border-purple-300" },
];

const EMPTY_BOARD = {
  title: "",
  clientId: "",
  coverUrl: "",
  color: "#3b82f6",
  description: "",
};

const EMPTY_ITEM = {
  type: "note" as "note" | "image" | "color" | "checklist" | "link",
  title: "",
  content: "",
  imageUrl: "",
  color: "#3b82f6",
  url: "",
  checklist: [{ text: "", done: false }],
};

function formatDate(isoStr?: string): string {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function triggerDownload(url: string, filename?: string) {
  try {
    const safeName = (filename || "archivo-brainstorm")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();

    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/^data:([^;]+);/);
      let ext = "png";
      if (mimeMatch && mimeMatch[1]) {
        const mime = mimeMatch[1];
        if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        else if (mime.includes("webp")) ext = "webp";
        else if (mime.includes("gif")) ext = "gif";
        else if (mime.includes("pdf")) ext = "pdf";
      }
      const finalName = safeName.includes(".")
        ? safeName
        : `${safeName}.${ext}`;

      const link = document.createElement("a");
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeName.includes(".") ? safeName : `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "archivo-brainstorm";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Subcomponent: Draggable Canvas Card with Framer Motion useMotionValue
interface DraggableCanvasCardProps {
  item: any;
  idx: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreviewImage: (url: string, title?: string) => void;
  onDownloadFile: (url: string, title?: string, id?: string) => void;
  onCopyHex: (hex: string) => void;
  onCopyLink: (url: string, id: string) => void;
  onToggleChecklist: (checkIndex: number) => void;
  onPositionChange: (
    itemId: Id<"brainstormItems">,
    x: number,
    y: number,
  ) => void;
  copiedHex: string | null;
  copiedLinkId: string | null;
  downloadedItemId: string | null;
}

function DraggableCanvasCard({
  item,
  idx,
  canvasRef,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onPreviewImage,
  onDownloadFile,
  onCopyHex,
  onCopyLink,
  onToggleChecklist,
  onPositionChange,
  copiedHex,
  copiedLinkId,
  downloadedItemId,
}: DraggableCanvasCardProps) {
  const initialX = item.positionX ?? (idx % 4) * 240 + 24;
  const initialY = item.positionY ?? Math.floor(idx / 4) * 220 + 24;

  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  // Synchronize motion values when DB item position updates
  useEffect(() => {
    if (canvasRef.current) {
      const maxX = Math.max(100, canvasRef.current.clientWidth - 260);
      const maxY = Math.max(200, canvasRef.current.clientHeight - 220);
      const clampedX = Math.min(maxX, Math.max(16, item.positionX ?? initialX));
      const clampedY = Math.min(maxY, Math.max(16, item.positionY ?? initialY));
      x.set(clampedX);
      y.set(clampedY);
    } else {
      x.set(initialX);
      y.set(initialY);
    }
  }, [item.positionX, item.positionY, x, y, canvasRef, initialX, initialY]);

  const isDownloaded = downloadedItemId === item._id;

  return (
    <motion.div
      drag
      dragConstraints={canvasRef}
      dragElastic={0}
      dragMomentum={false}
      style={
        item.type === "note" && item.color
          ? { x, y, backgroundColor: item.color, color: "#1e293b" }
          : { x, y }
      }
      onDragStart={() => {
        onSelect();
        document.body.style.cursor = "grabbing";
      }}
      onDragEnd={() => {
        document.body.style.cursor = "";
        const finalX = Math.round(x.get());
        const finalY = Math.round(y.get());
        onPositionChange(item._id, finalX, finalY);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ cursor: "grab" }}
      whileDrag={{
        cursor: "grabbing",
        scale: 1.02,
        zIndex: 100,
        boxShadow: "0 20px 35px -5px rgba(0, 0, 0, 0.25)",
      }}
      className={`group absolute top-0 left-0 w-52 sm:w-60 rounded-2xl border transition-all duration-200 transform-gpu overflow-hidden ${
        isSelected
          ? "border-accent-8 ring-2 ring-accent-8/40 shadow-xl z-40"
          : "border-grayscale-3/80 dark:border-grayscale-4/80 shadow-sm hover:shadow-lg hover:border-grayscale-4 dark:hover:border-grayscale-5 z-10"
      } bg-white dark:bg-grayscale-2`}
    >
      {/* Floating Card Actions Overlay */}
      <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/95 dark:bg-grayscale-2/95 backdrop-blur-md border border-grayscale-3 dark:border-grayscale-4/80 rounded-full px-1.5 py-1 shadow-lg transition-all duration-200">
        {item.type === "image" && item.imageUrl && (
          <>
            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              title="Ver en grande"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewImage(item.imageUrl, item.title);
              }}
              className="p-1 rounded-full text-grayscale-10 hover:text-accent-11 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 cursor-pointer transition-colors"
            >
              <ArrowsOutSimpleIcon size={12} weight="bold" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              title={isDownloaded ? "Descargado" : "Descargar imagen"}
              onClick={(e) => {
                e.stopPropagation();
                onDownloadFile(item.imageUrl, item.title, item._id);
              }}
              className={`p-1 rounded-full cursor-pointer transition-colors ${
                isDownloaded
                  ? "text-emerald-11 bg-emerald-3 dark:bg-emerald-4/30"
                  : "text-grayscale-10 hover:text-emerald-11 hover:bg-grayscale-3 dark:hover:bg-grayscale-4"
              }`}
            >
              {isDownloaded ? (
                <CheckIcon
                  size={12}
                  weight="bold"
                  className="text-emerald-500"
                />
              ) : (
                <DownloadSimpleIcon size={12} weight="bold" />
              )}
            </motion.button>
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          title="Editar"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 rounded-full text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 cursor-pointer transition-colors"
        >
          <PencilSimpleIcon size={12} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          title="Eliminar"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded-full text-grayscale-10 hover:text-red-11 hover:bg-red-3/60 cursor-pointer transition-colors"
        >
          <TrashIcon size={12} />
        </motion.button>
      </div>

      {/* ITEM CONTENT TYPES */}
      {item.type === "note" && (
        <div
          className="flex flex-col gap-1.5 p-3.5 cursor-pointer"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {item.title && (
            <h3 className="font-serif font-bold text-xs leading-snug">
              {item.title}
            </h3>
          )}
          {item.content && (
            <p className="text-[11px] whitespace-pre-wrap leading-relaxed opacity-90 font-sans">
              {item.content}
            </p>
          )}
        </div>
      )}

      {item.type === "image" && (
        <div className="flex flex-col">
          {item.imageUrl ? (
            <div className="relative group/img overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title || "Moodboard"}
                draggable={false}
                className="w-full max-h-64 object-cover select-none cursor-grab active:cursor-grabbing transition-transform duration-300 group-hover/img:scale-[1.02]"
                onDoubleClick={() => onPreviewImage(item.imageUrl!, item.title)}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 pointer-events-none">
                <span className="text-[10px] font-mono text-white bg-black/60 backdrop-blur px-2 py-0.5 rounded-full">
                  Doble clic para ampliar
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center bg-grayscale-3 dark:bg-grayscale-4 text-grayscale-8">
              <ImageIcon size={24} />
            </div>
          )}
          {(item.title || item.content) && (
            <div className="flex flex-col gap-0.5 p-2.5 bg-white dark:bg-grayscale-2 border-t border-grayscale-3/60 dark:border-grayscale-4/60">
              {item.title && (
                <h4 className="font-bold text-[11px] text-grayscale-12 truncate">
                  {item.title}
                </h4>
              )}
              {item.content && (
                <p className="text-[10px] text-grayscale-10 truncate">
                  {item.content}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {item.type === "color" && (
        <div className="flex flex-col">
          <div
            className="h-20 w-full cursor-pointer active:opacity-90 transition-all flex items-end justify-end p-1.5 group/color"
            style={{ backgroundColor: item.color || "#3b82f6" }}
            onClick={() => onCopyHex(item.color || "#3b82f6")}
            title="Clic para copiar código HEX"
          >
            <motion.span
              whileTap={{ scale: 0.92 }}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono text-white backdrop-blur transition-all ${
                copiedHex === item.color
                  ? "bg-emerald-600 font-bold"
                  : "bg-black/60 group-hover/color:bg-black/80"
              }`}
            >
              {copiedHex === item.color ? (
                <>
                  <CheckIcon size={10} weight="bold" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <CopyIcon size={9} />
                  <span>{item.color || "#3b82f6"}</span>
                </>
              )}
            </motion.span>
          </div>
          <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-grayscale-2 border-t border-grayscale-3/40 dark:border-grayscale-4/40">
            <h4 className="font-bold text-[11px] text-grayscale-12 truncate">
              {item.title || "Paleta de Color"}
            </h4>
            {item.content && (
              <p className="text-[10px] text-grayscale-10 truncate">
                {item.content}
              </p>
            )}
          </div>
        </div>
      )}

      {item.type === "checklist" && (
        <div className="flex flex-col gap-1.5 p-3">
          {item.title && (
            <h3 className="font-bold text-xs text-grayscale-12 flex items-center gap-1">
              <ListChecksIcon size={14} className="text-emerald-500 shrink-0" />
              <span className="truncate">{item.title}</span>
            </h3>
          )}
          {item.checklist && item.checklist.length > 0 && (
            <div className="flex flex-col gap-1 mt-0.5">
              {item.checklist.map((c: any, checkIdx: number) => (
                <label
                  key={checkIdx}
                  className="group/item flex items-start gap-1.5 text-[11px] text-grayscale-11 cursor-pointer select-none transition-colors hover:text-grayscale-12"
                >
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={() => onToggleChecklist(checkIdx)}
                    className="mt-0.5 rounded border-grayscale-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span
                    className={`transition-all ${
                      c.done ? "line-through text-grayscale-8" : ""
                    }`}
                  >
                    {c.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {item.type === "link" && (
        <div className="flex flex-col gap-1.5 p-2.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1 text-purple-500 font-mono text-xs font-bold truncate">
              <LinkIcon size={13} className="shrink-0" />
              <span className="truncate max-w-[140px]">
                {item.title || "Referencia Web"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.url && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    type="button"
                    title={
                      copiedLinkId === item._id
                        ? "Enlace copiado"
                        : "Copiar enlace"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyLink(item.url, item._id);
                    }}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      copiedLinkId === item._id
                        ? "text-emerald-11 bg-emerald-3 dark:bg-emerald-4/30"
                        : "text-grayscale-9 hover:text-purple-500 hover:bg-grayscale-3 dark:hover:bg-grayscale-4"
                    }`}
                  >
                    {copiedLinkId === item._id ? (
                      <CheckIcon size={12} weight="bold" />
                    ) : (
                      <CopyIcon size={12} />
                    )}
                  </motion.button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded text-grayscale-9 hover:text-purple-500 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 transition-colors"
                    title="Abrir enlace externo"
                  >
                    <ArrowSquareOutIcon size={12} />
                  </a>
                </>
              )}
            </div>
          </div>
          {item.url && (
            <span className="text-[10px] font-mono text-grayscale-8 truncate block">
              {item.url}
            </span>
          )}
          {item.content && (
            <p className="text-[10px] text-grayscale-10 line-clamp-2 leading-relaxed">
              {item.content}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function BrainstormPage() {
  const clients = useQuery(api.clients.get) ?? [];
  const boards = useQuery(api.brainstorm.listBoards) ?? [];

  const createBoard = useMutation(api.brainstorm.createBoard);
  const updateBoard = useMutation(api.brainstorm.updateBoard);
  const removeBoard = useMutation(api.brainstorm.removeBoard);

  const createItem = useMutation(api.brainstorm.createItem);
  const updateItem = useMutation(api.brainstorm.updateItem);
  const updateItemPosition = useMutation(api.brainstorm.updateItemPosition);
  const removeItem = useMutation(api.brainstorm.removeItem);

  // Canvas container reference for drag constraints
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [activeBoardId, setActiveBoardId] =
    useState<Id<"brainstormBoards"> | null>(null);
  const [searchFolder, setSearchFolder] = useState("");
  const [layoutMode, setLayoutMode] = useState<"free" | "grid">("free");
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);

  // Folder modal
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] =
    useState<Id<"brainstormBoards"> | null>(null);
  const [boardForm, setBoardForm] = useState(EMPTY_BOARD);

  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] =
    useState<Id<"brainstormItems"> | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);

  // Delete confirms
  const [boardToDeleteId, setBoardToDeleteId] =
    useState<Id<"brainstormBoards"> | null>(null);
  const [itemToDeleteId, setItemToDeleteId] =
    useState<Id<"brainstormItems"> | null>(null);

  // Selected item on canvas
  const [selectedItemId, setSelectedItemId] =
    useState<Id<"brainstormItems"> | null>(null);

  // Preview full image modal
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title?: string;
  } | null>(null);

  // Interactive feedback states
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [downloadedItemId, setDownloadedItemId] = useState<string | null>(null);
  const [modalDownloaded, setModalDownloaded] = useState(false);

  // Active board items query
  const boardItems =
    useQuery(
      api.brainstorm.listItems,
      activeBoardId ? { boardId: activeBoardId } : "skip",
    ) ?? [];

  const activeBoard = useMemo(
    () => boards.find((b) => b._id === activeBoardId) || null,
    [boards, activeBoardId],
  );

  // Display actual database boards
  const displayBoards = useMemo(() => {
    const s = searchFolder.toLowerCase().trim();
    if (!s) return boards;
    return boards.filter(
      (b) =>
        b.title.toLowerCase().includes(s) ||
        (b.client && b.client.company.toLowerCase().includes(s)) ||
        (b.client && b.client.name.toLowerCase().includes(s)),
    );
  }, [boards, searchFolder]);

  // Clear selection and active element focus on ESC key press
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Handle Paste Events (Ctrl+V / Cmd+V for direct image pasting into board canvas)
  useEffect(() => {
    if (!activeBoardId) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onloadend = async () => {
              if (typeof reader.result === "string") {
                const count = boardItems.length;
                const initialX = (count % 4) * 240 + 24;
                const initialY = Math.floor(count / 4) * 220 + 24;

                await createItem({
                  boardId: activeBoardId,
                  type: "image",
                  title:
                    file.name && file.name !== "image.png"
                      ? file.name
                      : "Foto pegada",
                  imageUrl: reader.result,
                  positionX: initialX,
                  positionY: initialY,
                });
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeBoardId, boardItems.length, createItem]);

  // Open Board
  const handleOpenBoard = useCallback((board: any) => {
    setActiveBoardId(board._id);
  }, []);

  // Handlers for Boards (Folders)
  const openCreateBoard = useCallback(() => {
    setEditingBoardId(null);
    setBoardForm(EMPTY_BOARD);
    setBoardModalOpen(true);
  }, []);

  const openEditBoard = useCallback((b: any) => {
    setEditingBoardId(b._id);
    setBoardForm({
      title: b.title,
      clientId: b.clientId || "",
      coverUrl: b.coverUrl || "",
      color: b.color || "#3b82f6",
      description: b.description || "",
    });
    setBoardModalOpen(true);
  }, []);

  async function handleSaveBoard() {
    if (!boardForm.title.trim()) return;

    if (editingBoardId) {
      await updateBoard({
        id: editingBoardId,
        title: boardForm.title.trim(),
        coverUrl: boardForm.coverUrl.trim() || undefined,
        color: boardForm.color,
        description: boardForm.description.trim() || undefined,
      });
    } else {
      const selectedClient = clients.find((c) => c._id === boardForm.clientId);
      const title =
        boardForm.title.trim() ||
        (selectedClient ? selectedClient.company : "Nuevo Tablero");

      await createBoard({
        title,
        clientId: boardForm.clientId
          ? (boardForm.clientId as Id<"clients">)
          : undefined,
        coverUrl: boardForm.coverUrl.trim() || undefined,
        color: boardForm.color,
        description: boardForm.description.trim() || undefined,
      });
    }
    setBoardModalOpen(false);
  }

  async function handleDeleteBoard() {
    if (boardToDeleteId) {
      await removeBoard({ id: boardToDeleteId });
      if (activeBoardId === boardToDeleteId) {
        setActiveBoardId(null);
      }
      setBoardToDeleteId(null);
    }
  }

  // Handlers for Items
  const openCreateItem = useCallback(
    (type: "note" | "image" | "color" | "checklist" | "link") => {
      setEditingItemId(null);
      setItemForm({
        ...EMPTY_ITEM,
        type,
        color:
          type === "note"
            ? "#fef08a"
            : type === "color"
              ? "#3b82f6"
              : "#ffffff",
        checklist: [{ text: "", done: false }],
      });
      setItemModalOpen(true);
    },
    [],
  );

  const openEditItem = useCallback((item: any) => {
    setEditingItemId(item._id);
    setItemForm({
      type: item.type,
      title: item.title || "",
      content: item.content || "",
      imageUrl: item.imageUrl || "",
      color: item.color || "#ffffff",
      url: item.url || "",
      checklist: item.checklist || [{ text: "", done: false }],
    });
    setItemModalOpen(true);
  }, []);

  async function handleSaveItem() {
    if (!activeBoardId) return;

    const count = boardItems.length;
    const initialX = (count % 4) * 240 + 24;
    const initialY = Math.floor(count / 4) * 220 + 24;

    const payload = {
      boardId: activeBoardId,
      type: itemForm.type,
      title: itemForm.title.trim() || undefined,
      content: itemForm.content.trim() || undefined,
      imageUrl: itemForm.imageUrl.trim() || undefined,
      color: itemForm.color,
      url: itemForm.url.trim() || undefined,
      checklist:
        itemForm.type === "checklist"
          ? itemForm.checklist.filter((i) => i.text.trim().length > 0)
          : undefined,
    };

    if (editingItemId) {
      await updateItem({
        id: editingItemId,
        ...payload,
      });
    } else {
      await createItem({
        ...payload,
        positionX: initialX,
        positionY: initialY,
      });
    }
    setItemModalOpen(false);
  }

  async function handleDeleteItem() {
    if (itemToDeleteId) {
      await removeItem({ id: itemToDeleteId });
      setItemToDeleteId(null);
    }
  }

  const handleToggleChecklistItem = useCallback(
    async (item: any, checkIndex: number) => {
      if (!item.checklist) return;
      const updated = item.checklist.map((c: any, idx: number) => {
        if (idx === checkIndex) return { ...c, done: !c.done };
        return c;
      });
      await updateItem({
        id: item._id,
        checklist: updated,
      });
    },
    [updateItem],
  );

  const copyHexToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  }, []);

  const copyLinkToClipboard = useCallback((url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }, []);

  const handleDownloadFile = useCallback(
    (url: string, title?: string, id?: string) => {
      triggerDownload(url, title);
      if (id) {
        setDownloadedItemId(id);
        setTimeout(() => setDownloadedItemId(null), 2200);
      }
    },
    [],
  );

  const handleModalDownload = useCallback(() => {
    if (!previewImage) return;
    triggerDownload(previewImage.url, previewImage.title);
    setModalDownloaded(true);
    setTimeout(() => setModalDownloaded(false), 2200);
  }, [previewImage]);

  // Position change handler (Asynchronous non-blocking mutation)
  const handleItemPositionChange = useCallback(
    (itemId: Id<"brainstormItems">, newX: number, newY: number) => {
      updateItemPosition({
        id: itemId,
        positionX: newX,
        positionY: newY,
      });
    },
    [updateItemPosition],
  );

  // File Drop Handlers onto Canvas
  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOverCanvas(false);
      if (!activeBoardId) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result === "string") {
            const count = boardItems.length + i;
            const initialX = (count % 4) * 240 + 24;
            const initialY = Math.floor(count / 4) * 220 + 24;

            await createItem({
              boardId: activeBoardId,
              type: "image",
              title: file.name.replace(/\.[^/.]+$/, "") || "Imagen subida",
              imageUrl: reader.result,
              positionX: initialX,
              positionY: initialY,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [activeBoardId, boardItems.length, createItem],
  );

  // ==========================================
  // RENDER: CANVAS VIEW (Inside a Folder Board)
  // ==========================================
  if (activeBoardId && activeBoard) {
    return (
      <PageContainer size="wide">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="flex flex-col gap-5"
        >
          {/* Breadcrumb & Board Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3/60 pb-3 dark:border-grayscale-4/60">
            <div className="flex items-center gap-3 min-w-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => setActiveBoardId(null)}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-grayscale-4 bg-grayscale-1 text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 shadow-xs"
                title="Volver a carpetas de proyecto"
              >
                <ArrowLeftIcon size={15} weight="bold" />
              </motion.button>

              {activeBoard.client ? (
                <ClientLogo
                  logoUrl={activeBoard.client.logoUrl}
                  company={activeBoard.client.company}
                  name={activeBoard.client.name}
                  size="sm"
                />
              ) : (
                <div
                  className="size-8 shrink-0 rounded-xl flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs"
                  style={{ backgroundColor: activeBoard.color || "#3b82f6" }}
                >
                  {activeBoard.title.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-base font-bold text-grayscale-12 truncate">
                    {activeBoard.title}
                  </h1>
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeBoard.color || "#3b82f6" }}
                  />
                </div>
                <span className="text-[11px] text-grayscale-9 truncate">
                  {boardItems.length}{" "}
                  {boardItems.length === 1 ? "elemento" : "elementos"} ·
                  Arrastra archivos o pega con Ctrl+V
                </span>
              </div>
            </div>

            {/* Canvas Toolbar & Tools */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex items-center rounded-xl border border-grayscale-4 bg-grayscale-2 p-0.5 dark:border-grayscale-5 dark:bg-grayscale-3 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLayoutMode("free")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all cursor-pointer ${
                    layoutMode === "free"
                      ? "bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-5 dark:text-grayscale-12 shadow-xs font-bold"
                      : "text-grayscale-9 hover:text-grayscale-12"
                  }`}
                  title="Modo Canvas Libre Draggable"
                >
                  <HandGrabbingIcon
                    size={13}
                    weight={layoutMode === "free" ? "fill" : "regular"}
                  />
                  <span>Libre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all cursor-pointer ${
                    layoutMode === "grid"
                      ? "bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-5 dark:text-grayscale-12 shadow-xs font-bold"
                      : "text-grayscale-9 hover:text-grayscale-12"
                  }`}
                  title="Modo Cuadrícula Organizada"
                >
                  <GridNineIcon
                    size={13}
                    weight={layoutMode === "grid" ? "fill" : "regular"}
                  />
                  <span>Cuadrícula</span>
                </button>
              </div>

              {/* Add Tools Divider */}
              <div className="h-5 w-px bg-grayscale-4 dark:bg-grayscale-5 hidden sm:block mx-1" />

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => openCreateItem("note")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 cursor-pointer shadow-xs active:shadow-inner"
              >
                <FileTextIcon
                  size={14}
                  className="text-yellow-500"
                  weight="bold"
                />
                <span>+ Nota</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => openCreateItem("image")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 cursor-pointer shadow-xs active:shadow-inner"
              >
                <ImageIcon size={14} className="text-blue-500" weight="bold" />
                <span>+ Foto</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => openCreateItem("color")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 cursor-pointer shadow-xs active:shadow-inner"
              >
                <PaletteIcon
                  size={14}
                  className="text-pink-500"
                  weight="bold"
                />
                <span>+ Color</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => openCreateItem("checklist")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 cursor-pointer shadow-xs active:shadow-inner"
              >
                <ListChecksIcon
                  size={14}
                  className="text-emerald-500"
                  weight="bold"
                />
                <span>+ Checklist</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => openCreateItem("link")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-all hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-2 cursor-pointer shadow-xs active:shadow-inner"
              >
                <LinkIcon size={14} className="text-purple-500" weight="bold" />
                <span>+ Enlace</span>
              </motion.button>
            </div>
          </div>

          {/* MILANOTE-STYLE CANVAS */}
          {boardItems.length === 0 ? (
            <EmptyState
              icon={<LightbulbIcon size={44} weight="duotone" />}
              title="Lienzo listo para brainstorm"
              description="Arrastra imágenes desde tu computadora, pega capturas con Ctrl+V o agrega notas, colores y listas de chequeo."
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={() => openCreateItem("note")}
                  >
                    <PlusIcon size={15} weight="bold" />
                    Crear primera nota
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openCreateItem("image")}
                  >
                    <ImageIcon size={15} />
                    Subir foto
                  </Button>
                </div>
              }
            />
          ) : layoutMode === "free" ? (
            /* FREEFORM NATIVE CANVAS WITH CONTROLLED DRAGGABLE CARDS */
            <div
              ref={canvasRef}
              onClick={() => setSelectedItemId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverCanvas(true);
              }}
              onDragLeave={() => setIsDraggingOverCanvas(false)}
              onDrop={handleCanvasDrop}
              className={`relative min-h-[780px] w-full rounded-2xl bg-grayscale-2/30 dark:bg-grayscale-3/15 p-4 sm:p-6 overflow-hidden border transition-colors ${
                isDraggingOverCanvas
                  ? "border-accent-8 ring-2 ring-accent-8/40 bg-accent-2/20"
                  : "border-grayscale-3/40 dark:border-grayscale-4/40"
              }`}
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(160, 160, 160, 0.18) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              {/* Drop File Overlay */}
              {isDraggingOverCanvas && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-grayscale-1 dark:bg-grayscale-2 p-6 shadow-2xl border-2 border-dashed border-accent-8 animate-bounce">
                    <UploadSimpleIcon
                      size={36}
                      className="text-accent-11"
                      weight="bold"
                    />
                    <p className="text-sm font-bold text-grayscale-12 font-mono">
                      Suelta la imagen aquí para agregarla
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {boardItems.map((item, idx) => (
                  <DraggableCanvasCard
                    key={item._id}
                    item={item}
                    idx={idx}
                    canvasRef={canvasRef}
                    isSelected={selectedItemId === item._id}
                    onSelect={() => setSelectedItemId(item._id)}
                    onEdit={() => openEditItem(item)}
                    onDelete={() => setItemToDeleteId(item._id)}
                    onPreviewImage={(url, title) =>
                      setPreviewImage({ url, title: title || item.title })
                    }
                    onDownloadFile={handleDownloadFile}
                    onCopyHex={copyHexToClipboard}
                    onCopyLink={copyLinkToClipboard}
                    onToggleChecklist={(checkIdx) =>
                      handleToggleChecklistItem(item, checkIdx)
                    }
                    onPositionChange={handleItemPositionChange}
                    copiedHex={copiedHex}
                    copiedLinkId={copiedLinkId}
                    downloadedItemId={downloadedItemId}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* COMPACT ORGANIZED GRID LAYOUT */
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
              <AnimatePresence>
                {boardItems.map((item, idx) => {
                  const isDownloaded = downloadedItemId === item._id;
                  return (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 26,
                        delay: idx * 0.03,
                      }}
                      className="break-inside-avoid group relative flex flex-col rounded-2xl border border-grayscale-3/80 bg-grayscale-1 shadow-xs transition-all duration-200 hover:shadow-lg hover:border-grayscale-4 dark:border-grayscale-4/80 dark:bg-grayscale-2 overflow-hidden"
                      style={
                        item.type === "note" && item.color
                          ? { backgroundColor: item.color, color: "#1e293b" }
                          : undefined
                      }
                    >
                      {/* Floating Card Actions Overlay */}
                      <div className="absolute top-1.5 right-1.5 z-30 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-white/95 dark:bg-grayscale-2/95 backdrop-blur border border-grayscale-3 dark:border-grayscale-4 rounded-lg p-0.5 shadow-md transition-all">
                        {item.type === "image" && item.imageUrl && (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              type="button"
                              title="Ver en grande"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.imageUrl,
                                  title: item.title,
                                })
                              }
                              className="p-1 rounded text-grayscale-10 hover:text-accent-11 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 cursor-pointer transition-colors"
                            >
                              <ArrowsOutSimpleIcon size={12} weight="bold" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              type="button"
                              title={
                                isDownloaded ? "Descargado" : "Descargar imagen"
                              }
                              onClick={() =>
                                handleDownloadFile(
                                  item.imageUrl,
                                  item.title,
                                  item._id,
                                )
                              }
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                isDownloaded
                                  ? "text-emerald-11 bg-emerald-3 dark:bg-emerald-4/30"
                                  : "text-grayscale-10 hover:text-emerald-11 hover:bg-grayscale-3 dark:hover:bg-grayscale-4"
                              }`}
                            >
                              {isDownloaded ? (
                                <CheckIcon
                                  size={12}
                                  weight="bold"
                                  className="text-emerald-500"
                                />
                              ) : (
                                <DownloadSimpleIcon size={12} weight="bold" />
                              )}
                            </motion.button>
                          </>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          type="button"
                          title="Editar"
                          onClick={() => openEditItem(item)}
                          className="p-1 rounded text-grayscale-10 hover:text-grayscale-12 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 cursor-pointer transition-colors"
                        >
                          <PencilSimpleIcon size={12} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          type="button"
                          title="Eliminar"
                          onClick={() => setItemToDeleteId(item._id)}
                          className="p-1 rounded text-grayscale-10 hover:text-red-11 hover:bg-red-3/60 cursor-pointer transition-colors"
                        >
                          <TrashIcon size={12} />
                        </motion.button>
                      </div>

                      {/* ITEM TYPE: NOTE */}
                      {item.type === "note" && (
                        <div
                          className="flex flex-col gap-1 p-3 cursor-pointer"
                          onDoubleClick={() => openEditItem(item)}
                        >
                          {item.title && (
                            <h3 className="font-serif font-bold text-xs leading-snug">
                              {item.title}
                            </h3>
                          )}
                          {item.content && (
                            <p className="text-[11px] whitespace-pre-wrap leading-relaxed opacity-90 font-sans">
                              {item.content}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ITEM TYPE: IMAGE / MOODBOARD */}
                      {item.type === "image" && (
                        <div className="flex flex-col">
                          {item.imageUrl ? (
                            <div className="relative group/gridimg overflow-hidden">
                              <img
                                src={item.imageUrl}
                                alt={item.title || "Moodboard"}
                                className="w-full max-h-64 object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                                onClick={() =>
                                  setPreviewImage({
                                    url: item.imageUrl,
                                    title: item.title,
                                  })
                                }
                              />
                            </div>
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-grayscale-3 dark:bg-grayscale-4 text-grayscale-8">
                              <ImageIcon size={24} />
                            </div>
                          )}
                          {(item.title || item.content) && (
                            <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-grayscale-2 border-t border-grayscale-3/40 dark:border-grayscale-4/40">
                              {item.title && (
                                <h4 className="font-bold text-[11px] text-grayscale-12 truncate">
                                  {item.title}
                                </h4>
                              )}
                              {item.content && (
                                <p className="text-[10px] text-grayscale-10 truncate">
                                  {item.content}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ITEM TYPE: COLOR SWATCH */}
                      {item.type === "color" && (
                        <div className="flex flex-col">
                          <div
                            className="h-20 w-full cursor-pointer active:opacity-90 transition-all flex items-end justify-end p-1.5 group/color"
                            style={{ backgroundColor: item.color || "#3b82f6" }}
                            onClick={() =>
                              copyHexToClipboard(item.color || "#3b82f6")
                            }
                            title="Clic para copiar código HEX"
                          >
                            <motion.span
                              whileTap={{ scale: 0.92 }}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono text-white backdrop-blur transition-all ${
                                copiedHex === item.color
                                  ? "bg-emerald-600 font-bold"
                                  : "bg-black/60 group-hover/color:bg-black/80"
                              }`}
                            >
                              {copiedHex === item.color ? (
                                <>
                                  <CheckIcon size={10} weight="bold" />
                                  <span>Copiado</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon size={9} />
                                  <span>{item.color || "#3b82f6"}</span>
                                </>
                              )}
                            </motion.span>
                          </div>
                          <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-grayscale-2 border-t border-grayscale-3/40 dark:border-grayscale-4/40">
                            <h4 className="font-bold text-[11px] text-grayscale-12 truncate">
                              {item.title || "Paleta de Color"}
                            </h4>
                            {item.content && (
                              <p className="text-[10px] text-grayscale-10 truncate">
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ITEM TYPE: CHECKLIST */}
                      {item.type === "checklist" && (
                        <div className="flex flex-col gap-1.5 p-3">
                          {item.title && (
                            <h3 className="font-bold text-xs text-grayscale-12 flex items-center gap-1">
                              <ListChecksIcon
                                size={14}
                                className="text-emerald-500 shrink-0"
                              />
                              <span className="truncate">{item.title}</span>
                            </h3>
                          )}
                          {item.checklist && item.checklist.length > 0 && (
                            <div className="flex flex-col gap-1 mt-0.5">
                              {item.checklist.map(
                                (c: any, checkIdx: number) => (
                                  <label
                                    key={checkIdx}
                                    className="group/item flex items-start gap-1.5 text-[11px] text-grayscale-11 cursor-pointer select-none transition-colors hover:text-grayscale-12"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={c.done}
                                      onChange={() =>
                                        handleToggleChecklistItem(
                                          item,
                                          checkIdx,
                                        )
                                      }
                                      className="mt-0.5 rounded border-grayscale-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span
                                      className={`transition-all ${
                                        c.done
                                          ? "line-through text-grayscale-8"
                                          : ""
                                      }`}
                                    >
                                      {c.text}
                                    </span>
                                  </label>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ITEM TYPE: LINK */}
                      {item.type === "link" && (
                        <div className="flex flex-col gap-1.5 p-2.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1 text-purple-500 font-mono text-xs font-bold truncate">
                              <LinkIcon size={13} className="shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {item.title || "Referencia Web"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.url && (
                                <>
                                  <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    type="button"
                                    title={
                                      copiedLinkId === item._id
                                        ? "Enlace copiado"
                                        : "Copiar enlace"
                                    }
                                    onClick={() =>
                                      copyLinkToClipboard(item.url, item._id)
                                    }
                                    className={`p-1 rounded cursor-pointer transition-colors ${
                                      copiedLinkId === item._id
                                        ? "text-emerald-11 bg-emerald-3 dark:bg-emerald-4/30"
                                        : "text-grayscale-9 hover:text-purple-500 hover:bg-grayscale-3 dark:hover:bg-grayscale-4"
                                    }`}
                                  >
                                    {copiedLinkId === item._id ? (
                                      <CheckIcon size={12} weight="bold" />
                                    ) : (
                                      <CopyIcon size={12} />
                                    )}
                                  </motion.button>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded text-grayscale-9 hover:text-purple-500 hover:bg-grayscale-3 dark:hover:bg-grayscale-4 transition-colors"
                                    title="Abrir enlace externo"
                                  >
                                    <ArrowSquareOutIcon size={12} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                          {item.url && (
                            <span className="text-[10px] font-mono text-grayscale-8 truncate block">
                              {item.url}
                            </span>
                          )}
                          {item.content && (
                            <p className="text-[10px] text-grayscale-10 line-clamp-2 leading-relaxed">
                              {item.content}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Modal: Crear / Editar Elemento en el Canvas */}
          <Modal
            open={itemModalOpen}
            onOpenChange={setItemModalOpen}
            title={
              editingItemId
                ? "Editar elemento"
                : "Añadir al lienzo de Brainstorm"
            }
            className="max-w-[95vw] sm:max-w-lg max-h-[96vh]"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveItem();
              }}
              className="flex flex-col gap-3"
            >
              {/* Type Switcher */}
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                  Tipo de elemento
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    {
                      type: "note",
                      label: "Nota",
                      Icon: FileTextIcon,
                      activeColor: "text-yellow-500",
                    },
                    {
                      type: "image",
                      label: "Foto",
                      Icon: ImageIcon,
                      activeColor: "text-blue-500",
                    },
                    {
                      type: "color",
                      label: "Color",
                      Icon: PaletteIcon,
                      activeColor: "text-pink-500",
                    },
                    {
                      type: "checklist",
                      label: "Checklist",
                      Icon: ListChecksIcon,
                      activeColor: "text-emerald-500",
                    },
                    {
                      type: "link",
                      label: "Enlace",
                      Icon: LinkIcon,
                      activeColor: "text-purple-500",
                    },
                  ].map(({ type, label, Icon, activeColor }) => {
                    const isSelected = itemForm.type === type;
                    return (
                      <motion.button
                        key={type}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        onClick={() =>
                          setItemForm((f) => ({
                            ...f,
                            type: type as any,
                            color:
                              type === "note"
                                ? "#fef08a"
                                : type === "color"
                                  ? "#3b82f6"
                                  : "#ffffff",
                          }))
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-mono font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-grayscale-12 text-grayscale-1 dark:bg-grayscale-5 dark:text-grayscale-12 shadow-sm font-bold ring-2 ring-accent-8/40"
                            : "bg-grayscale-2 text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:bg-grayscale-3 border border-grayscale-3/60 dark:border-grayscale-4/60"
                        }`}
                      >
                        <Icon
                          size={16}
                          weight={isSelected ? "bold" : "regular"}
                          className={isSelected ? activeColor : ""}
                        />
                        <span>{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Título / Concepto"
                id="item-title"
                value={itemForm.title}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ej: Paleta principal o Concepto de video"
              />

              {itemForm.type !== "color" && itemForm.type !== "checklist" && (
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                    Descripción / Contenido
                  </label>
                  <textarea
                    rows={3}
                    value={itemForm.content}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, content: e.target.value }))
                    }
                    placeholder="Escribe notas, referencias o detalles creativos..."
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
                  />
                </div>
              )}

              {/* IMAGE TYPE FIELDS */}
              {itemForm.type === "image" && (
                <div className="flex flex-col gap-2 rounded-xl border border-grayscale-4 bg-grayscale-2/60 p-3 dark:border-grayscale-5 dark:bg-grayscale-3/40">
                  <span className="text-[11px] font-bold text-grayscale-12 font-mono uppercase">
                    Foto o Imagen para Moodboard
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="cursor-pointer inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 text-xs font-mono font-medium text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:bg-grayscale-3 shadow-xs">
                      <UploadSimpleIcon size={14} weight="bold" />
                      <span>Subir archivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setItemForm((f) => ({
                                  ...f,
                                  title:
                                    f.title ||
                                    file.name.replace(/\.[^/.]+$/, ""),
                                  imageUrl: reader.result as string,
                                }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={itemForm.imageUrl}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, imageUrl: e.target.value }))
                      }
                      placeholder="o pega URL de la foto..."
                      className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 px-2.5 text-xs text-grayscale-12 outline-none dark:border-grayscale-5 dark:bg-grayscale-3"
                    />
                  </div>

                  {itemForm.imageUrl && (
                    <div className="relative mt-1 max-h-36 overflow-hidden rounded-lg border border-grayscale-4 bg-grayscale-3">
                      <img
                        src={itemForm.imageUrl}
                        alt="Vista previa"
                        className="w-full h-36 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* COLOR SWATCH SELECTOR */}
              {itemForm.type === "color" && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                    Código de Color HEX
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={itemForm.color}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="size-10 rounded-xl cursor-pointer border-0 shadow-xs"
                    />
                    <Input
                      label=""
                      id="color-hex"
                      value={itemForm.color}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, color: e.target.value }))
                      }
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              )}

              {/* LINK URL FIELD */}
              {itemForm.type === "link" && (
                <Input
                  label="URL del sitio o referencia"
                  id="item-url"
                  value={itemForm.url}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://milanote.com/ejemplo"
                />
              )}

              {/* CHECKLIST ITEMS EDIT */}
              {itemForm.type === "checklist" && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                    Ítems de la Checklist
                  </span>
                  {itemForm.checklist.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const updated = [...itemForm.checklist];
                          updated[idx].text = e.target.value;
                          setItemForm((f) => ({ ...f, checklist: updated }));
                        }}
                        placeholder={`Ítem ${idx + 1}...`}
                        className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 px-2.5 text-xs text-grayscale-12 outline-none dark:border-grayscale-5 dark:bg-grayscale-3"
                      />
                      {itemForm.checklist.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = itemForm.checklist.filter(
                              (_, i) => i !== idx,
                            );
                            setItemForm((f) => ({ ...f, checklist: updated }));
                          }}
                          className="text-grayscale-8 hover:text-red-11 cursor-pointer p-1"
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setItemForm((f) => ({
                        ...f,
                        checklist: [...f.checklist, { text: "", done: false }],
                      }))
                    }
                    className="self-start text-xs font-mono font-bold text-accent-11 hover:underline cursor-pointer pt-1"
                  >
                    + Agregar otro ítem
                  </button>
                </div>
              )}

              {/* NOTE COLOR SELECTOR */}
              {itemForm.type === "note" && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                    Color de fondo de nota
                  </span>
                  <div className="flex items-center gap-2">
                    {NOTE_COLORS.map((nc) => (
                      <button
                        key={nc.value}
                        type="button"
                        onClick={() =>
                          setItemForm((f) => ({ ...f, color: nc.value }))
                        }
                        className={`size-7 rounded-full border-2 transition-all cursor-pointer ${nc.border} ${
                          itemForm.color === nc.value
                            ? "scale-125 shadow-md ring-2 ring-accent-8"
                            : "hover:scale-110 opacity-90 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: nc.value }}
                        title={nc.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-grayscale-3 dark:border-grayscale-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1.5 px-3.5"
                  onClick={() => setItemModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs py-1.5 px-3.5"
                >
                  {editingItemId ? "Guardar cambios" : "Añadir al lienzo"}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal Preview Full Image Inside Canvas */}
          <Modal
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
            title={previewImage?.title || "Vista ampliada de fotografía"}
            className="max-w-md sm:max-w-2xl md:max-w-3xl"
          >
            {previewImage && (
              <div className="flex flex-col gap-4">
                <div className="relative w-full max-h-[68vh] sm:max-h-[74vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/90 p-2 border border-grayscale-4 shadow-inner">
                  <img
                    src={previewImage.url}
                    alt={previewImage.title || "Imagen ampliada"}
                    className="max-h-[64vh] sm:max-h-[70vh] w-auto max-w-full rounded-lg object-contain select-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-grayscale-3 dark:border-grayscale-4">
                  <span className="text-xs font-mono text-grayscale-10 truncate">
                    {previewImage.title || "Fotografía de moodboard"}
                  </span>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={handleModalDownload}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs ${
                      modalDownloaded
                        ? "bg-emerald-600 text-white"
                        : "bg-grayscale-12 text-grayscale-1 hover:bg-grayscale-11 dark:bg-grayscale-4 dark:text-grayscale-12 dark:hover:bg-grayscale-5"
                    }`}
                  >
                    {modalDownloaded ? (
                      <>
                        <CheckIcon size={14} weight="bold" />
                        <span>Descargado</span>
                      </>
                    ) : (
                      <>
                        <DownloadSimpleIcon size={14} weight="bold" />
                        <span>Descargar archivo</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          </Modal>

          {/* Confirm Delete Item Modal */}
          <ConfirmModal
            open={!!itemToDeleteId}
            onOpenChange={(open) => !open && setItemToDeleteId(null)}
            title="Eliminar elemento"
            description="¿Deseas eliminar esta tarjeta del lienzo de Brainstorm?"
            confirmText="Eliminar"
            onConfirm={handleDeleteItem}
          />
        </motion.div>
      </PageContainer>
    );
  }

  // ==========================================
  // RENDER: FOLDERS DIRECTORY VIEW (By Project / Company)
  // ==========================================
  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
              Brainstorming
            </h1>
            <p className="text-sm text-grayscale-10">
              Carpetas de creatividad e inspiración organizadas por proyecto y
              empresa.
            </p>
          </div>
          <Button
            variant="primary"
            className="text-xs shrink-0"
            onClick={openCreateBoard}
          >
            <FolderSimplePlusIcon size={16} weight="bold" />
            Crear carpeta de negocio
          </Button>
        </div>

        {/* Directory Search & Count */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 pb-4 dark:border-grayscale-4">
          <div className="relative flex-1 sm:w-80">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
            />
            <input
              type="text"
              placeholder="Buscar carpeta por empresa o cliente..."
              value={searchFolder}
              onChange={(e) => setSearchFolder(e.target.value)}
              className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-1.5 pl-9 pr-3 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
            />
          </div>

          <span className="text-xs font-mono text-grayscale-9">
            {displayBoards.length}{" "}
            {displayBoards.length === 1
              ? "carpeta de proyecto"
              : "carpetas de proyecto"}
          </span>
        </div>

        {/* PROJECT FOLDER CARDS GRID */}
        {displayBoards.length === 0 ? (
          <EmptyState
            icon={<FolderIcon size={44} weight="duotone" />}
            title="Sin carpetas de Brainstorm"
            description={
              searchFolder
                ? "No se encontraron carpetas de proyecto con esa búsqueda."
                : "Crea tu primera carpeta de negocio para comenzar a armar el moodboard y brainstorm del cliente."
            }
            action={
              !searchFolder && (
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={openCreateBoard}
                >
                  <FolderSimplePlusIcon size={16} weight="bold" />
                  Crear carpeta de negocio
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {displayBoards.map((board, idx) => {
                const color = board.color || "#3b82f6";
                return (
                  <motion.div
                    key={board._id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 26,
                      delay: idx * 0.04,
                    }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenBoard(board)}
                    className="group relative flex flex-col cursor-pointer select-none"
                  >
                    {/* Modern Folder Tab Lip */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-grayscale-3/70 dark:bg-grayscale-4/60 w-32 rounded-t-xl border-t border-x border-grayscale-4/50 dark:border-grayscale-5/50">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-mono font-bold uppercase text-grayscale-10 truncate">
                        PROYECTO
                      </span>
                    </div>

                    {/* Folder Main Cover Body */}
                    <div className="relative flex flex-col rounded-b-2xl rounded-tr-2xl border border-grayscale-3 bg-grayscale-1 p-5 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:border-grayscale-5 dark:border-grayscale-4 dark:bg-grayscale-2 overflow-hidden">
                      {/* Top Accent Strip */}
                      <div
                        className="absolute left-0 top-0 h-1.5 w-full transition-all duration-300 group-hover:h-2"
                        style={{ backgroundColor: color }}
                      />

                      {/* Header: Client Logo & Items Pill */}
                      <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                        {board.client ? (
                          <ClientLogo
                            logoUrl={board.client.logoUrl}
                            company={board.client.company}
                            name={board.client.name}
                            size="lg"
                          />
                        ) : (
                          <div
                            className="size-12 rounded-xl flex items-center justify-center text-white font-mono font-bold text-base shadow-xs group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: color }}
                          >
                            {board.title.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <span className="inline-flex items-center gap-1 rounded-full border border-grayscale-3 bg-grayscale-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-grayscale-11 dark:border-grayscale-4 dark:bg-grayscale-3">
                          {board.itemCount}{" "}
                          {board.itemCount === 1 ? "ítem" : "ítems"}
                        </span>
                      </div>

                      {/* Title & Client details */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h3 className="font-mono text-base font-bold text-grayscale-12 group-hover:text-accent-11 transition-colors truncate">
                          {board.title}
                        </h3>

                        {board.client && (
                          <span className="text-xs font-medium text-grayscale-9 truncate">
                            Cliente: {board.client.name}
                          </span>
                        )}

                        {board.description && (
                          <p className="text-xs text-grayscale-10 line-clamp-2 mt-1">
                            {board.description}
                          </p>
                        )}
                      </div>

                      {/* Footer & Quick Actions */}
                      <div className="flex items-center justify-between border-t border-grayscale-3 pt-3 mt-4 dark:border-grayscale-4">
                        <span className="font-mono text-[10px] text-grayscale-8">
                          {formatDate(board.createdAt)}
                        </span>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            title="Editar carpeta"
                            onClick={() => openEditBoard(board)}
                            className="flex size-7 items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:hover:bg-grayscale-4 cursor-pointer"
                          >
                            <PencilSimpleIcon size={14} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            title="Eliminar carpeta"
                            onClick={() => setBoardToDeleteId(board._id)}
                            className="flex size-7 items-center justify-center rounded-md text-grayscale-9 transition-colors hover:bg-red-3 hover:text-red-11 cursor-pointer"
                          >
                            <TrashIcon size={14} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Modal: Crear / Editar Carpeta de Negocio */}
        <Modal
          open={boardModalOpen}
          onOpenChange={setBoardModalOpen}
          title={
            editingBoardId
              ? "Editar carpeta de negocio"
              : "Crear carpeta de negocio"
          }
          className="max-w-[95vw] sm:max-w-lg max-h-[96vh]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveBoard();
            }}
            className="flex flex-col gap-3"
          >
            {!editingBoardId && (
              <Select
                label="Vincular a cliente registrado (opcional)"
                id="board-client"
                value={boardForm.clientId}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = clients.find((c) => c._id === val);
                  setBoardForm((f) => ({
                    ...f,
                    clientId: val,
                    title: found ? found.company : f.title,
                  }));
                }}
                options={[
                  {
                    value: "",
                    label: "Sin cliente directo (Carpeta independiente)",
                  },
                  ...clients.map((c) => ({
                    value: c._id,
                    label: `${c.company} (${c.name})`,
                  })),
                ]}
              />
            )}

            <Input
              label="Nombre de la carpeta / empresa"
              id="board-title"
              value={boardForm.title}
              onChange={(e) =>
                setBoardForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Ej: Ranchilokas Studio u Oportunidad Marca"
              required
            />

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                Descripción / Notas del proyecto
              </label>
              <textarea
                rows={2}
                value={boardForm.description}
                onChange={(e) =>
                  setBoardForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Breve descripción del concepto o estrategia..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            {/* Color Accent Picker */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] font-semibold uppercase text-grayscale-11">
                Color distintivo de la carpeta
              </span>
              <div className="flex items-center gap-2">
                {BOARD_COLORS.map((bc) => (
                  <button
                    key={bc.value}
                    type="button"
                    onClick={() =>
                      setBoardForm((f) => ({ ...f, color: bc.value }))
                    }
                    className={`size-7 rounded-full transition-transform cursor-pointer ${bc.bgClass} ${
                      boardForm.color === bc.value
                        ? "ring-2 ring-grayscale-12 scale-110 shadow-xs"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    title={bc.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1 px-3"
                onClick={() => setBoardModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="text-xs py-1 px-3"
              >
                {editingBoardId ? "Guardar" : "Crear carpeta"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Board Modal */}
        <ConfirmModal
          open={!!boardToDeleteId}
          onOpenChange={(open) => !open && setBoardToDeleteId(null)}
          title="Eliminar carpeta de negocio"
          description="¿Estás seguro de que deseas eliminar esta carpeta y todo su lienzo de brainstorm?"
          confirmText="Eliminar"
          onConfirm={handleDeleteBoard}
        />
      </div>
    </PageContainer>
  );
}
