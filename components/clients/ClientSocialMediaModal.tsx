"use client";

import {
  ArrowSquareOutIcon,
  CalendarDotsIcon,
  ChartBarIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  FacebookLogoIcon,
  GlobeIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  LockKeyIcon,
  PencilSimpleIcon,
  PlusIcon,
  PrinterIcon,
  TiktokLogoIcon,
  TrashIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";
import ConfirmModal from "@/components/public/ConfirmModal";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";

import Select from "@/components/public/Select";
import Tabs from "@/components/public/Tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import { formatDateDDMMYYYY } from "@/helpers/date-format";

const SocialMediaReportPdf = dynamic(() => import("./SocialMediaReportPdf"), {
  ssr: false,
});
import ClientLogo from "./ClientLogo";
import SpanishDatePicker from "./SpanishDatePicker";
import VaultSecurityGate from "./VaultSecurityGate";

type PlatformType =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "otro";
type ContentType = "reel" | "carousel" | "image" | "story" | "video" | "post";
type StatusType = "planificado" | "en_proceso" | "publicado" | "cancelado";

interface ClientSocialMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    _id: Id<"clients">;
    name: string;
    company: string;
    email: string;
    logoUrl?: string;
  } | null;
  defaultTab?: "overview" | "credentials" | "calendar" | "report";
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: InstagramLogoIcon },
  { value: "facebook", label: "Facebook", icon: FacebookLogoIcon },
  { value: "tiktok", label: "TikTok", icon: TiktokLogoIcon },
  { value: "youtube", label: "YouTube", icon: YoutubeLogoIcon },
  { value: "linkedin", label: "LinkedIn", icon: LinkedinLogoIcon },
  { value: "otro", label: "Otro / Meta Suite", icon: GlobeIcon },
];

const CONTENT_TYPES = [
  { value: "reel", label: "Reel / Short" },
  { value: "carousel", label: "Carrusel" },
  { value: "image", label: "Imagen" },
  { value: "story", label: "Historia" },
  { value: "video", label: "Video Largo" },
  { value: "post", label: "Publicación General" },
];

const POST_STATUSES = [
  { value: "planificado", label: "Planificado", variant: "gray" as const },
  { value: "en_proceso", label: "En Proceso", variant: "orange" as const },
  { value: "publicado", label: "Publicado", variant: "green" as const },
  { value: "cancelado", label: "Cancelado", variant: "red" as const },
];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const SPANISH_MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function getSpanishMonthYearName(yearMonthStr: string): string {
  const [yStr, mStr] = yearMonthStr.split("-");
  const monthObj = SPANISH_MONTHS.find((m) => m.value === mStr);
  const monthName = monthObj ? monthObj.label : "";
  return `${monthName} ${yStr}`.trim();
}

export default function ClientSocialMediaModal({
  open,
  onOpenChange,
  client,
  defaultTab = "overview",
}: ClientSocialMediaModalProps) {
  const clientId = client?._id;
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Convex Queries
  const credentials =
    useQuery(
      api.clientCredentials.getByClient,
      clientId ? { clientId } : "skip",
    ) ?? [];
  const posts =
    useQuery(
      api.socialMediaPosts.getByClient,
      clientId ? { clientId } : "skip",
    ) ?? [];
  const goals =
    useQuery(
      api.socialMediaGoals.getByClient,
      clientId ? { clientId } : "skip",
    ) ?? [];

  // Convex Mutations
  const createCredential = useMutation(api.clientCredentials.create);
  const updateCredential = useMutation(api.clientCredentials.update);
  const removeCredential = useMutation(api.clientCredentials.remove);

  const createPost = useMutation(api.socialMediaPosts.create);
  const updatePost = useMutation(api.socialMediaPosts.update);

  const setGoal = useMutation(api.socialMediaGoals.setGoal);

  // Local State
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [credToDeleteId, setCredToDeleteId] =
    useState<Id<"clientCredentials"> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [visiblePasswordIds, setVisiblePasswordIds] = useState<
    Record<string, boolean>
  >({});

  // Credential Form State
  const [credFormOpen, setCredFormOpen] = useState(false);
  const [editingCredId, setEditingCredId] = useState<string | null>(null);
  const [credForm, setCredForm] = useState({
    platform: "instagram",
    username: "",
    password: "",
    url: "",
    notes: "",
    status: "active" as "active" | "needs_relogin" | "inactive",
  });

  // Post Form State
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    title: "",
    platform: "instagram" as
      | "instagram"
      | "facebook"
      | "tiktok"
      | "youtube"
      | "linkedin"
      | "otro",
    contentType: "reel" as
      | "reel"
      | "carousel"
      | "image"
      | "story"
      | "video"
      | "post",
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: "12:00",
    status: "planificado" as
      | "planificado"
      | "en_proceso"
      | "publicado"
      | "cancelado",
    postUrl: "",
    caption: "",
    notes: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  });

  // Goal Form State
  const currentGoal = useMemo(() => {
    return (
      goals.find((g: Doc<"socialMediaGoals">) => g.month === selectedMonth) ||
      null
    );
  }, [goals, selectedMonth]);

  const goalTargets = useMemo(() => {
    const reels = currentGoal?.targetReels ?? 6;
    const carousels = currentGoal?.targetCarousels ?? 4;
    const stories = currentGoal?.targetStories ?? 15;
    const computedSum = reels + carousels + stories;
    const totalPosts =
      currentGoal?.targetPosts != null
        ? Math.max(currentGoal.targetPosts, computedSum)
        : computedSum;

    return {
      targetPosts: totalPosts,
      targetReels: reels,
      targetCarousels: carousels,
      targetStories: stories,
    };
  }, [currentGoal]);

  const [goalForm, setGoalForm] = useState({
    targetPosts: 0,
    targetReels: 0,
    targetStories: 0,
    targetCarousels: 0,
    notes: "",
  });

  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    setGoalForm({
      targetPosts: goalTargets.targetPosts,
      targetReels: goalTargets.targetReels,
      targetStories: goalTargets.targetStories,
      targetCarousels: goalTargets.targetCarousels,
      notes: currentGoal?.notes ?? "",
    });
  }, [goalTargets, currentGoal]);

  // Month filtered posts
  const monthPosts = useMemo(() => {
    return posts.filter((p: Doc<"socialMediaPosts">) =>
      p.scheduledDate.startsWith(selectedMonth),
    );
  }, [posts, selectedMonth]);

  const publishedPostsCount = useMemo(() => {
    return monthPosts.filter(
      (p: Doc<"socialMediaPosts">) => p.status === "publicado",
    ).length;
  }, [monthPosts]);

  const publishedReelsCount = useMemo(() => {
    return monthPosts.filter(
      (p: Doc<"socialMediaPosts">) =>
        p.status === "publicado" && p.contentType === "reel",
    ).length;
  }, [monthPosts]);

  const publishedStoriesCount = useMemo(() => {
    return monthPosts.filter(
      (p: Doc<"socialMediaPosts">) =>
        p.status === "publicado" && p.contentType === "story",
    ).length;
  }, [monthPosts]);

  const publishedCarouselsCount = useMemo(() => {
    return monthPosts.filter(
      (p: Doc<"socialMediaPosts">) =>
        p.status === "publicado" &&
        (p.contentType === "carousel" || p.contentType === "image"),
    ).length;
  }, [monthPosts]);

  // Aggregate metrics
  const totalViews = useMemo(
    () =>
      monthPosts.reduce(
        (acc: number, p: Doc<"socialMediaPosts">) => acc + (p.views || 0),
        0,
      ),
    [monthPosts],
  );
  const totalLikes = useMemo(
    () =>
      monthPosts.reduce(
        (acc: number, p: Doc<"socialMediaPosts">) => acc + (p.likes || 0),
        0,
      ),
    [monthPosts],
  );
  const totalComments = useMemo(
    () =>
      monthPosts.reduce(
        (acc: number, p: Doc<"socialMediaPosts">) => acc + (p.comments || 0),
        0,
      ),
    [monthPosts],
  );
  const totalShares = useMemo(
    () =>
      monthPosts.reduce(
        (acc: number, p: Doc<"socialMediaPosts">) => acc + (p.shares || 0),
        0,
      ),
    [monthPosts],
  );

  // Handlers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswordIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !credForm.username || !credForm.password) return;

    const payload = {
      platform: String(credForm.platform || "instagram"),
      username: String(credForm.username || "").trim(),
      password: String(credForm.password || ""),
      url: credForm.url ? String(credForm.url).trim() : undefined,
      notes: credForm.notes ? String(credForm.notes).trim() : undefined,
      status: (credForm.status || "active") as
        | "active"
        | "needs_relogin"
        | "inactive",
    };

    if (editingCredId) {
      await updateCredential({
        id: editingCredId as Id<"clientCredentials">,
        ...payload,
      });
    } else {
      await createCredential({
        clientId: client._id,
        ...payload,
      });
    }
    setCredFormOpen(false);
    setEditingCredId(null);
    setCredForm({
      platform: "instagram",
      username: "",
      password: "",
      url: "",
      notes: "",
      status: "active",
    });
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !postForm.title || !postForm.scheduledDate) return;

    const payload = {
      title: String(postForm.title || "").trim(),
      platform: postForm.platform,
      contentType: postForm.contentType,
      scheduledDate: String(postForm.scheduledDate),
      scheduledTime: postForm.scheduledTime
        ? String(postForm.scheduledTime)
        : undefined,
      status: postForm.status,
      postUrl: postForm.postUrl ? String(postForm.postUrl).trim() : undefined,
      caption: postForm.caption ? String(postForm.caption).trim() : undefined,
      notes: postForm.notes ? String(postForm.notes).trim() : undefined,
      views: Number(postForm.views || 0),
      likes: Number(postForm.likes || 0),
      comments: Number(postForm.comments || 0),
      shares: Number(postForm.shares || 0),
    };

    if (editingPostId) {
      await updatePost({
        id: editingPostId as Id<"socialMediaPosts">,
        ...payload,
      });
    } else {
      await createPost({
        clientId: client._id,
        ...payload,
      });
    }
    setPostFormOpen(false);
    setEditingPostId(null);
    setPostForm({
      title: "",
      platform: "instagram",
      contentType: "reel",
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: "12:00",
      status: "planificado",
      postUrl: "",
      caption: "",
      notes: "",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const computedSum =
      Number(goalForm.targetReels) +
      Number(goalForm.targetCarousels) +
      Number(goalForm.targetStories);
    const targetPosts = Math.max(Number(goalForm.targetPosts), computedSum);
    await setGoal({
      clientId: client._id,
      month: selectedMonth,
      targetPosts,
      targetReels: Number(goalForm.targetReels),
      targetStories: Number(goalForm.targetStories),
      targetCarousels: Number(goalForm.targetCarousels),
      notes: goalForm.notes,
    });
    setEditingGoal(false);
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDayIndex = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0

    const days: {
      id: string;
      dayNumber: number | null;
      dateStr: string | null;
    }[] = [];

    for (let i = 0; i < startDayIndex; i++) {
      days.push({ id: `pad-${i}`, dayNumber: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ id: dateStr, dayNumber: d, dateStr });
    }
    return days;
  }, [selectedMonth]);

  // Report Data
  const reportData = useMemo(() => {
    const monthName = getSpanishMonthYearName(selectedMonth);

    return {
      clientName: client?.name ?? "",
      companyName: client?.company ?? "",
      email: client?.email ?? "",
      logoUrl: client?.logoUrl,
      monthYear: monthName,

      targetPosts: goalTargets.targetPosts,
      publishedPosts: publishedPostsCount,
      targetReels: goalTargets.targetReels,
      publishedReels: publishedReelsCount,
      targetStories: goalTargets.targetStories,
      publishedStories: publishedStoriesCount,
      targetCarousels: goalTargets.targetCarousels,
      publishedCarousels: publishedCarouselsCount,

      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      posts: monthPosts,
      notes: currentGoal?.notes || "",
    };
  }, [
    client,
    selectedMonth,
    currentGoal,
    goalTargets,
    publishedPostsCount,
    publishedReelsCount,
    publishedStoriesCount,
    publishedCarouselsCount,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    monthPosts,
  ]);

  if (!client) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Social Media — ${client.company} (${client.name})`}
      className="max-w-4xl h-[85vh] min-h-[640px] flex flex-col"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* TOP CONTROLS: MONTH PICKER & ACTION BUTTONS */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-grayscale-3 pb-3 dark:border-grayscale-4">
          <div className="flex items-center gap-3">
            <ClientLogo
              logoUrl={client.logoUrl}
              company={client.company}
              name={client.name}
              size="sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-grayscale-10">
                Periodo:
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-grayscale-3 bg-grayscale-2 px-2 py-1 text-xs font-mono text-grayscale-12 dark:border-grayscale-4 dark:bg-grayscale-3">
                <select
                  value={selectedMonth.split("-")[1] || "01"}
                  onChange={(e) => {
                    const year = selectedMonth.split("-")[0] || "2026";
                    setSelectedMonth(`${year}-${e.target.value}`);
                  }}
                  className="bg-transparent font-mono text-xs font-bold text-grayscale-12 outline-none cursor-pointer"
                >
                  {SPANISH_MONTHS.map((m) => (
                    <option
                      key={m.value}
                      value={m.value}
                      className="bg-grayscale-1 text-grayscale-12 dark:bg-grayscale-3"
                    >
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth.split("-")[0] || "2026"}
                  onChange={(e) => {
                    const month = selectedMonth.split("-")[1] || "08";
                    setSelectedMonth(`${e.target.value}-${month}`);
                  }}
                  className="bg-transparent font-mono text-xs font-bold text-grayscale-12 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option
                      key={y}
                      value={String(y)}
                      className="bg-grayscale-1 text-grayscale-12 dark:bg-grayscale-3"
                    >
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="accent" className="font-mono text-xs">
              {publishedPostsCount} / {goalTargets.targetPosts} Publicaciones
            </Badge>
          </div>
        </div>

        {/* MAIN TABS */}
        <Tabs.Root
          defaultValue={defaultTab}
          className="flex flex-col flex-1 min-h-0"
        >
          <Tabs.List className="border-b border-grayscale-3 dark:border-grayscale-4 pb-1 shrink-0">
            <Tabs.Tab
              value="overview"
              className="flex items-center gap-1.5 font-mono text-xs"
            >
              <ChartBarIcon size={14} />
              Conteo & Metas
            </Tabs.Tab>
            <Tabs.Tab
              value="credentials"
              className="flex items-center gap-1.5 font-mono text-xs"
            >
              <LockKeyIcon size={14} />
              Bóveda Accesos ({credentials.length})
            </Tabs.Tab>
            <Tabs.Tab
              value="calendar"
              className="flex items-center gap-1.5 font-mono text-xs"
            >
              <CalendarDotsIcon size={14} />
              Calendario ({monthPosts.length})
            </Tabs.Tab>
            <Tabs.Tab
              value="report"
              className="flex items-center gap-1.5 font-mono text-xs"
            >
              <PrinterIcon size={14} />
              Reporte PDF
            </Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>

          {/* TAB 1: OVERVIEW & GOALS */}
          <Tabs.Panel
            value="overview"
            className="mt-4 flex-1 overflow-y-auto min-h-0 pr-1 space-y-5 font-sans"
          >
            {/* GOALS SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3.5 dark:border-grayscale-4 dark:bg-grayscale-3">
                <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9">
                  Total Publicaciones
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-grayscale-12">
                    {publishedPostsCount}
                  </span>
                  <span className="text-xs font-mono text-grayscale-9">
                    Meta: {goalTargets.targetPosts}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-grayscale-3 rounded-full overflow-hidden dark:bg-grayscale-4">
                  <div
                    className="h-full bg-accent-9 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((publishedPostsCount / (goalTargets.targetPosts || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3.5 dark:border-grayscale-4 dark:bg-grayscale-3">
                <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9">
                  Reels / Shorts
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-grayscale-12">
                    {publishedReelsCount}
                  </span>
                  <span className="text-xs font-mono text-grayscale-9">
                    Meta: {goalTargets.targetReels}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-grayscale-3 rounded-full overflow-hidden dark:bg-grayscale-4">
                  <div
                    className="h-full bg-red-9 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((publishedReelsCount / (goalTargets.targetReels || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3.5 dark:border-grayscale-4 dark:bg-grayscale-3">
                <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9">
                  Carruseles
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-grayscale-12">
                    {publishedCarouselsCount}
                  </span>
                  <span className="text-xs font-mono text-grayscale-9">
                    Meta: {goalTargets.targetCarousels}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-grayscale-3 rounded-full overflow-hidden dark:bg-grayscale-4">
                  <div
                    className="h-full bg-violet-9 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((publishedCarouselsCount / (goalTargets.targetCarousels || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-grayscale-3 bg-grayscale-2 p-3.5 dark:border-grayscale-4 dark:bg-grayscale-3">
                <span className="text-[10px] font-mono font-bold uppercase text-grayscale-9">
                  Historias
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-grayscale-12">
                    {publishedStoriesCount}
                  </span>
                  <span className="text-xs font-mono text-grayscale-9">
                    Meta: {goalTargets.targetStories}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-grayscale-3 rounded-full overflow-hidden dark:bg-grayscale-4">
                  <div
                    className="h-full bg-orange-9 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((publishedStoriesCount / (goalTargets.targetStories || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* EDIT GOALS SECTION */}
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 p-4 dark:border-grayscale-4 dark:bg-grayscale-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <h4 className="text-xs font-mono font-bold uppercase text-grayscale-12">
                  Metas Mensuales de Publicación (
                  {getSpanishMonthYearName(selectedMonth)})
                </h4>

                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => {
                    setGoalForm({
                      targetPosts: goalTargets.targetPosts,
                      targetReels: goalTargets.targetReels,
                      targetStories: goalTargets.targetStories,
                      targetCarousels: goalTargets.targetCarousels,
                      notes: currentGoal?.notes ?? "",
                    });
                    setEditingGoal(!editingGoal);
                  }}
                >
                  <PencilSimpleIcon size={14} />
                  {editingGoal ? "Cancelar" : "Definir metas"}
                </Button>
              </div>

              {editingGoal ? (
                <form
                  onSubmit={handleSaveGoal}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Meta Total (Publicaciones)
                    </span>
                    <Input
                      type="number"
                      value={goalForm.targetPosts}
                      onChange={(e) =>
                        setGoalForm((prev) => ({
                          ...prev,
                          targetPosts: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Meta Reels / Shorts
                    </span>
                    <Input
                      type="number"
                      value={goalForm.targetReels}
                      onChange={(e) => {
                        const reels = Number(e.target.value);
                        setGoalForm((prev) => ({
                          ...prev,
                          targetReels: reels,
                          targetPosts:
                            reels + prev.targetCarousels + prev.targetStories,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Meta Carruseles
                    </span>
                    <Input
                      type="number"
                      value={goalForm.targetCarousels}
                      onChange={(e) => {
                        const carousels = Number(e.target.value);
                        setGoalForm((prev) => ({
                          ...prev,
                          targetCarousels: carousels,
                          targetPosts:
                            prev.targetReels + carousels + prev.targetStories,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Meta Historias
                    </span>
                    <Input
                      type="number"
                      value={goalForm.targetStories}
                      onChange={(e) => {
                        const stories = Number(e.target.value);
                        setGoalForm((prev) => ({
                          ...prev,
                          targetStories: stories,
                          targetPosts:
                            prev.targetReels + prev.targetCarousels + stories,
                        }));
                      }}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-4 flex justify-end gap-2 mt-2">
                    <Button type="submit" className="px-2 py-1 text-xs">
                      Guardar Metas
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-grayscale-10">
                  {currentGoal?.notes
                    ? `Objetivo del cliente: ${currentGoal.notes}`
                    : "Modifica los objetivos de contenido para que los contadores del mes reflejen el progreso esperado del cliente."}
                </p>
              )}
            </div>

            {/* MONTHLY RECENT ACTIVITY & METRICS SUMMARY */}
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 p-4 dark:border-grayscale-4 dark:bg-grayscale-2">
              <h4 className="text-xs font-mono font-bold uppercase text-grayscale-12 mb-3">
                Desglose de Contenido Publicado
              </h4>
              {monthPosts.length === 0 ? (
                <p className="text-xs text-grayscale-9 italic">
                  No hay publicaciones registradas este mes.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {monthPosts.map((p: Doc<"socialMediaPosts">) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-grayscale-3 bg-grayscale-2 text-xs dark:border-grayscale-4 dark:bg-grayscale-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-grayscale-9">
                          {formatDateDDMMYYYY(p.scheduledDate)}
                        </span>

                        <Badge
                          variant="gray"
                          className="capitalize text-[10px] font-mono"
                        >
                          {p.platform}
                        </Badge>
                        <span className="font-semibold text-grayscale-12 line-clamp-1">
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            p.status === "publicado"
                              ? "green"
                              : p.status === "en_proceso"
                                ? "orange"
                                : p.status === "cancelado"
                                  ? "red"
                                  : "gray"
                          }
                          className="font-mono text-[10px] uppercase"
                        >
                          {POST_STATUSES.find((s) => s.value === p.status)
                            ?.label || p.status.replace(/_/g, " ")}
                        </Badge>
                        {p.postUrl && (
                          <a
                            href={p.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-grayscale-9 hover:text-accent-9"
                          >
                            <ArrowSquareOutIcon size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Panel>

          {/* TAB 2: CREDENTIALS VAULT */}
          <Tabs.Panel
            value="credentials"
            className="mt-4 flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 font-sans"
          >
            {!isVaultUnlocked ? (
              <VaultSecurityGate onUnlock={() => setIsVaultUnlocked(true)} />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase text-grayscale-12">
                      Bóveda de Accesos y Contraseñas
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setIsVaultUnlocked(false)}
                      title="Bloquear Bóveda"
                    >
                      <LockKeyIcon size={14} />
                      Bloquear
                    </Button>
                    <Button
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        setEditingCredId(null);
                        setCredForm({
                          platform: "instagram",
                          username: "",
                          password: "",
                          url: "",
                          notes: "",
                          status: "active",
                        });
                        setCredFormOpen(true);
                      }}
                    >
                      <PlusIcon size={14} />
                      Nuevo Acceso
                    </Button>
                  </div>
                </div>

                {/* CREDENTIAL FORM MODAL/INLINE */}
                {credFormOpen && (
                  <form
                    onSubmit={handleSaveCredential}
                    className="p-4 rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                          Plataforma
                        </span>
                        <Select
                          value={credForm.platform}
                          onChange={(e) =>
                            setCredForm({
                              ...credForm,
                              platform: e.target.value,
                            })
                          }
                          options={PLATFORMS.map((p) => ({
                            value: p.value,
                            label: p.label,
                          }))}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                          Usuario / Email
                        </span>
                        <Input
                          required
                          placeholder="@usuario o email"
                          value={credForm.username}
                          onChange={(e) =>
                            setCredForm({
                              ...credForm,
                              username: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                          Contraseña
                        </span>
                        <Input
                          required
                          type="text"
                          placeholder="Contraseña"
                          value={credForm.password}
                          onChange={(e) =>
                            setCredForm({
                              ...credForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                          URL Perfil / Suite
                        </span>
                        <Input
                          placeholder="https://..."
                          value={credForm.url}
                          onChange={(e) =>
                            setCredForm({ ...credForm, url: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                        Notas de Acceso / 2FA
                      </span>
                      <Input
                        placeholder="Codigos de respaldo, quien maneja el 2FA, etc."
                        value={credForm.notes}
                        onChange={(e) =>
                          setCredForm({ ...credForm, notes: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        type="button"
                        onClick={() => setCredFormOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button className="px-2 py-1 text-xs" type="submit">
                        {editingCredId ? "Actualizar Acceso" : "Guardar Acceso"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* CREDENTIAL CARDS LIST */}
                {credentials.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-grayscale-3 rounded-xl dark:border-grayscale-4">
                    <LockKeyIcon
                      size={24}
                      className="mx-auto text-grayscale-9 mb-2"
                    />
                    <p className="text-xs text-grayscale-10">
                      No hay accesos registrados para este cliente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {credentials.map((cred: Doc<"clientCredentials">) => {
                      const PlatformIcon =
                        PLATFORMS.find((p) => p.value === cred.platform)
                          ?.icon || GlobeIcon;
                      const isVisible = !!visiblePasswordIds[cred._id];

                      return (
                        <div
                          key={cred._id}
                          className="p-4 rounded-xl border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <PlatformIcon
                                  size={18}
                                  className="text-accent-9"
                                />
                                <span className="font-mono text-xs font-bold uppercase text-grayscale-12">
                                  {cred.platform}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCredId(cred._id);
                                    setCredForm({
                                      platform: cred.platform,
                                      username: cred.username,
                                      password: cred.password,
                                      url: cred.url || "",
                                      notes: cred.notes || "",
                                      status: cred.status || "active",
                                    });
                                    setCredFormOpen(true);
                                  }}
                                  className="p-1 text-grayscale-9 hover:text-grayscale-12 cursor-pointer"
                                >
                                  <PencilSimpleIcon size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCredToDeleteId(cred._id)}
                                  className="p-1 text-grayscale-9 hover:text-red-9 cursor-pointer"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            </div>

                            {/* USERNAME FIELD */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-grayscale-2 rounded-lg border border-grayscale-3 mb-2 dark:bg-grayscale-3 dark:border-grayscale-4">
                              <span className="font-mono text-xs text-grayscale-12 truncate pr-2">
                                {cred.username}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(cred.username, `${cred._id}-user`)
                                }
                                className="text-grayscale-9 hover:text-accent-9 flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                              >
                                {copiedId === `${cred._id}-user` ? (
                                  <CheckIcon
                                    size={14}
                                    className="text-green-9"
                                  />
                                ) : (
                                  <CopyIcon size={14} />
                                )}
                              </button>
                            </div>

                            {/* PASSWORD FIELD WITH HIDE/SHOW */}
                            <div className="flex items-center justify-between py-1.5 px-2 bg-grayscale-2 rounded-lg border border-grayscale-3 dark:bg-grayscale-3 dark:border-grayscale-4">
                              <span className="font-mono text-xs text-grayscale-12">
                                {isVisible ? cred.password : "••••••••••••"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePasswordVisibility(cred._id)
                                  }
                                  className="text-grayscale-9 hover:text-grayscale-12 cursor-pointer"
                                >
                                  {isVisible ? (
                                    <EyeSlashIcon size={14} />
                                  ) : (
                                    <EyeIcon size={14} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(
                                      cred.password,
                                      `${cred._id}-pass`,
                                    )
                                  }
                                  className="text-grayscale-9 hover:text-accent-9 cursor-pointer"
                                >
                                  {copiedId === `${cred._id}-pass` ? (
                                    <CheckIcon
                                      size={14}
                                      className="text-green-9"
                                    />
                                  ) : (
                                    <CopyIcon size={14} />
                                  )}
                                </button>
                              </div>
                            </div>

                            {cred.notes && (
                              <p className="mt-2 text-[10px] text-grayscale-9 italic">
                                {cred.notes}
                              </p>
                            )}
                          </div>

                          {cred.url && (
                            <div className="mt-3 pt-2 border-t border-grayscale-3 dark:border-grayscale-4 flex justify-end">
                              <a
                                href={cred.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-accent-9 hover:underline flex items-center gap-1"
                              >
                                Abrir Plataforma{" "}
                                <ArrowSquareOutIcon size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </Tabs.Panel>

          {/* TAB 3: POST CALENDAR & LIST */}
          <Tabs.Panel
            value="calendar"
            className="mt-4 flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 font-sans"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-grayscale-12">
                  Calendario de Publicaciones (
                  {getSpanishMonthYearName(selectedMonth)})
                </h4>
              </div>
              <Button
                className="px-2 py-1 text-xs"
                onClick={() => {
                  setEditingPostId(null);
                  setPostForm({
                    title: "",
                    platform: "instagram",
                    contentType: "reel",
                    scheduledDate: `${selectedMonth}-01`,
                    scheduledTime: "12:00",
                    status: "planificado",
                    postUrl: "",
                    caption: "",
                    notes: "",
                    views: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                  });
                  setPostFormOpen(true);
                }}
              >
                <PlusIcon size={14} />
                Programar Post
              </Button>
            </div>

            {/* POST FORM INLINE */}
            {postFormOpen && (
              <form
                onSubmit={handleSavePost}
                className="p-4 rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Título del Post
                    </span>
                    <Input
                      required
                      placeholder="Ej. Lanzamiento Campaña Verano"
                      value={postForm.title}
                      onChange={(e) =>
                        setPostForm({ ...postForm, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Plataforma
                    </span>
                    <Select
                      value={postForm.platform}
                      onChange={(e) =>
                        setPostForm({
                          ...postForm,
                          platform: e.target.value as PlatformType,
                        })
                      }
                      options={PLATFORMS.map((p) => ({
                        value: p.value,
                        label: p.label,
                      }))}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Tipo de Contenido
                    </span>
                    <Select
                      value={postForm.contentType}
                      onChange={(e) =>
                        setPostForm({
                          ...postForm,
                          contentType: e.target.value as ContentType,
                        })
                      }
                      options={CONTENT_TYPES}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Fecha Programada
                    </span>
                    <SpanishDatePicker
                      value={postForm.scheduledDate}
                      onChange={(isoDate) =>
                        setPostForm({
                          ...postForm,
                          scheduledDate: isoDate,
                        })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Estado
                    </span>
                    <Select
                      value={postForm.status}
                      onChange={(e) =>
                        setPostForm({
                          ...postForm,
                          status: e.target.value as StatusType,
                        })
                      }
                      options={POST_STATUSES}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      URL de Publicación (Link)
                    </span>
                    <Input
                      placeholder="https://instagram.com/p/..."
                      value={postForm.postUrl}
                      onChange={(e) =>
                        setPostForm({ ...postForm, postUrl: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-grayscale-9 block mb-1">
                      Texto / Caption
                    </span>
                    <Input
                      placeholder="Texto del post o pie de foto..."
                      value={postForm.caption}
                      onChange={(e) =>
                        setPostForm({ ...postForm, caption: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    type="button"
                    onClick={() => setPostFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button className="px-2 py-1 text-xs" type="submit">
                    {editingPostId ? "Actualizar Post" : "Guardar Post"}
                  </Button>
                </div>
              </form>
            )}

            {/* CALENDAR MATRIX GRID */}
            <div className="rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-2">
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase font-bold text-grayscale-9 mb-2">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cd) => {
                  if (!cd.dayNumber || !cd.dateStr) {
                    return (
                      <div
                        key={cd.id}
                        className="h-16 rounded-lg bg-transparent"
                      />
                    );
                  }

                  const dayPosts = monthPosts.filter(
                    (p: Doc<"socialMediaPosts">) =>
                      p.scheduledDate === cd.dateStr,
                  );

                  return (
                    <div
                      key={cd.id}
                      className="h-16 p-1 rounded-lg border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 flex flex-col justify-between overflow-hidden"
                    >
                      <span className="font-mono text-[10px] font-bold text-grayscale-10">
                        {cd.dayNumber}
                      </span>
                      <div className="space-y-0.5 overflow-y-auto no-scrollbar">
                        {dayPosts.map((dp: Doc<"socialMediaPosts">) => (
                          <button
                            type="button"
                            key={dp._id}
                            title={`${dp.platform}: ${dp.title} (${POST_STATUSES.find((s) => s.value === dp.status)?.label || dp.status})`}
                            onClick={() => {
                              setEditingPostId(dp._id);
                              setPostForm({
                                title: dp.title,
                                platform: dp.platform,
                                contentType: dp.contentType,
                                scheduledDate: dp.scheduledDate,
                                scheduledTime: dp.scheduledTime || "12:00",
                                status: dp.status,
                                postUrl: dp.postUrl || "",
                                caption: dp.caption || "",
                                notes: dp.notes || "",
                                views: dp.views || 0,
                                likes: dp.likes || 0,
                                comments: dp.comments || 0,
                                shares: dp.shares || 0,
                              });
                              setPostFormOpen(true);
                            }}
                            className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-mono truncate cursor-pointer font-medium ${
                              dp.status === "publicado"
                                ? "bg-green-9 text-white"
                                : dp.status === "en_proceso"
                                  ? "bg-orange-9 text-white"
                                  : "bg-grayscale-4 text-grayscale-12"
                            }`}
                          >
                            {dp.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Tabs.Panel>

          {/* TAB 4: PDF REPORT GENERATOR (EN CONSTRUCCIÓN) */}
          <Tabs.Panel
            value="report"
            keepMounted={false}
            className="mt-4 flex-1 flex flex-col items-center justify-center p-12 text-center font-sans min-h-[220px]"
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <PrinterIcon
                size={44}
                weight="duotone"
                className="text-amber-9"
              />
              <span className="inline-block px-3 py-1 rounded-full bg-amber-3 text-amber-11 dark:bg-amber-9/20 dark:text-amber-9 text-xs font-mono font-bold uppercase tracking-wider">
                Módulo en construcción
              </span>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </div>

      <ConfirmModal
        open={!!credToDeleteId}
        onOpenChange={(open) => !open && setCredToDeleteId(null)}
        title="¿Eliminar Acceso?"
        description="¿Estás seguro de que deseas eliminar este acceso de la bóveda? Esta acción no se puede deshacer."
        confirmText="Eliminar Acceso"
        onConfirm={async () => {
          if (credToDeleteId) {
            await removeCredential({ id: credToDeleteId });
            setCredToDeleteId(null);
          }
        }}
      />
    </Modal>
  );
}
