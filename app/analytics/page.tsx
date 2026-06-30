"use client";

import {
  ChartBarIcon,
  ClockIcon,
  EyeIcon,
  FacebookLogo,
  HeartIcon,
  InstagramLogo,
  ShareNetworkIcon,
  TiktokLogo,
  TrendUpIcon,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { useState, useMemo } from "react";
import Badge from "@/components/public/Badge";
import PageContainer from "@/components/public/PageContainer";
import StatCard from "@/components/public/StatCard";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Button from "@/components/public/Button";
import { AreaChart, Area } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_PLATFORM_STATS = {
  all: {
    followers: 325300,
    followersGrowth: "+9.1%",
    views: 1485000,
    viewsGrowth: "+26.8%",
    engagement: "8.2%",
    engagementGrowth: "+1.5%",
    shares: 61400,
    sharesGrowth: "+17.2%",
    watchTime: "52,400 h",
    avgRetention: "58.4%",
    insights: [
      {
        title: "Crecimiento Multiplataforma Sólido",
        description: "El alcance consolidado ha subido un 26.8%. Prioriza contenido cruzado (Cross-posting) entre TikTok e Instagram.",
        type: "info" as const,
      },
      {
        title: "Optimización del Gancho Inicial",
        description: "La retención de video decae rápido en los primeros 10s. Comienza tus videos directamente con la acción principal.",
        type: "warning" as const,
      },
      {
        title: "Llamado a la Acción (CTA)",
        description: "El engagement creció un 1.5%. Agrega un recordatorio interactivo para suscribirse a la mitad de tus videos largos.",
        type: "tip" as const,
      },
    ],
  },
  youtube: {
    followers: 120000,
    followersGrowth: "+6.1%",
    views: 450000,
    viewsGrowth: "+18.5%",
    engagement: "9.2%",
    engagementGrowth: "+0.8%",
    shares: 12500,
    sharesGrowth: "+10.2%",
    watchTime: "31,200 h",
    avgRetention: "64.2%",
    insights: [
      {
        title: "Optimización de Retención Temprana",
        description: "Tus videos promedian una retención del 64.2%. Considera acortar la introducción a menos de 10 segundos.",
        type: "warning" as const,
      },
      {
        title: "Oportunidad de Audiencia",
        description: "Tus principales vistas provienen de Costa Rica. Incentiva la interacción preguntando sobre temas de interés regional.",
        type: "tip" as const,
      },
      {
        title: "Fidelización del Público",
        description: "El grupo de edad de 25-34 años representa el 45% de tu audiencia. Ajusta el ritmo y duración de tus videos.",
        type: "info" as const,
      },
    ],
  },
  instagram: {
    followers: 85000,
    followersGrowth: "+12.4%",
    views: 380000,
    viewsGrowth: "+35.1%",
    engagement: "6.8%",
    engagementGrowth: "+2.1%",
    shares: 18400,
    sharesGrowth: "+22.5%",
    watchTime: "8,500 h",
    avgRetention: "48.5%",
    insights: [
      {
        title: "Potencial de Compartidos en Reels",
        description: "Los compartidos subieron un 22.5%. Publica Reels cortos de tipo tutorial con plantillas para incentivar el guardado.",
        type: "tip" as const,
      },
      {
        title: "Retención de Stories Baja",
        description: "El abandono de historias ocurre tras la segunda diapositiva. Usa encuestas o stickers interactivos en la primera.",
        type: "warning" as const,
      },
    ],
  },
  tiktok: {
    followers: 40300,
    followersGrowth: "+22.8%",
    views: 375000,
    viewsGrowth: "+45.2%",
    engagement: "14.2%",
    engagementGrowth: "+4.5%",
    shares: 18000,
    sharesGrowth: "+38.4%",
    watchTime: "6,200 h",
    avgRetention: "42.1%",
    insights: [
      {
        title: "Crecimiento Viral Acelerado",
        description: "El volumen de visualizaciones creció un 45.2%. Mantén la frecuencia de subida de 3 a 5 publicaciones por semana.",
        type: "info" as const,
      },
      {
        title: "Abandono de Pantalla Crítico",
        description: "La retención de video decae un 50% al segundo 3. Elige portadas con títulos más llamativos o textos de impacto inicial.",
        type: "warning" as const,
      },
    ],
  },
  facebook: {
    followers: 80000,
    followersGrowth: "+5.3%",
    views: 280000,
    viewsGrowth: "+14.8%",
    engagement: "5.4%",
    engagementGrowth: "+0.5%",
    shares: 12500,
    sharesGrowth: "+12.1%",
    watchTime: "6,500 h",
    avgRetention: "51.8%",
    insights: [
      {
        title: "Frecuencia de Publicación Recomendada",
        description: "Publicar en horarios de la tarde (2 PM - 5 PM) aumenta el engagement en un 12%. Configura un planificador.",
        type: "tip" as const,
      },
      {
        title: "Alcance Orgánico Estable",
        description: "Las vistas mensuales subieron un 14.8%. Responde a los comentarios más populares para subir la interacción.",
        type: "info" as const,
      },
    ],
  },
};

const MOCK_TOP_CONTENT = [
  {
    id: "1",
    title: "Detrás de Cámaras: Serie 'Horizontes' — Ep. 5",
    platform: "youtube",
    views: 185000,
    likes: 15400,
    watchTime: "12,400 h",
    retention: "64.2%",
    duration: "14:20",
    date: "Hace 5 días",
  },
  {
    id: "2",
    title: "Teaser Oficial — Comercial Lumina Brands",
    platform: "instagram",
    views: 112000,
    likes: 22400,
    watchTime: "930 h",
    retention: "48.5%",
    duration: "0:30",
    date: "Hace 2 días",
  },
  {
    id: "3",
    title: "Bloopers y Risas en el Set Exterior 🎬",
    platform: "tiktok",
    views: 295000,
    likes: 45000,
    watchTime: "2,450 h",
    retention: "42.1%",
    duration: "0:45",
    date: "Hace 1 día",
  },
  {
    id: "4",
    title: "Trailer Oficial: Documental 'Raíces'",
    platform: "youtube",
    views: 75000,
    likes: 8200,
    watchTime: "3,120 h",
    retention: "59.8%",
    duration: "2:30",
    date: "Hace 1 semana",
  },
  {
    id: "5",
    title: "Cómo iluminamos con el Aputure 600d Pro",
    platform: "tiktok",
    views: 145000,
    likes: 18900,
    watchTime: "1,180 h",
    retention: "45.3%",
    duration: "0:58",
    date: "Hace 4 días",
  },
  {
    id: "6",
    title: "Retrato en Locación — Sony FX6 Cinematography",
    platform: "instagram",
    views: 92000,
    likes: 14100,
    watchTime: "760 h",
    retention: "50.1%",
    duration: "1:00",
    date: "Hace 3 días",
  },
  {
    id: "7",
    title: "Anuncio de Producción: Nueva Temporada de 'Horizontes'",
    platform: "facebook",
    views: 125000,
    likes: 18200,
    watchTime: "3,100 h",
    retention: "51.8%",
    duration: "1:30",
    date: "Hace 6 días",
  },
  {
    id: "8",
    title: "Galería de Fotos: Rodaje en Parque Central",
    platform: "facebook",
    views: 65000,
    likes: 9400,
    watchTime: "540 h",
    retention: "55.4%",
    duration: "Fotos",
    date: "Hace 3 días",
  },
];

const MOCK_MONTHLY_VIEWS = [
  { month: "Ene", youtube: 280000, instagram: 190000, tiktok: 120000, facebook: 90000 },
  { month: "Feb", youtube: 310000, instagram: 220000, tiktok: 150000, facebook: 105000 },
  { month: "Mar", youtube: 390000, instagram: 280000, tiktok: 210000, facebook: 140000 },
  { month: "Abr", youtube: 350000, instagram: 270000, tiktok: 260000, facebook: 120000 },
  { month: "May", youtube: 420000, instagram: 310000, tiktok: 310000, facebook: 155000 },
  { month: "Jun", youtube: 450000, instagram: 380000, tiktok: 375000, facebook: 280000 },
];

const DEMOGRAPHICS = {
  age: [
    { label: "18-24 años", value: 35 },
    { label: "25-34 años", value: 42 },
    { label: "35-44 años", value: 15 },
    { label: "45+ años", value: 8 },
  ],
  location: [
    { label: "San José", value: 45 },
    { label: "Alajuela", value: 22 },
    { label: "Heredia", value: 18 },
    { label: "Cartago", value: 10 },
    { label: "Otras provincias", value: 5 },
  ],
  gender: [
    { label: "Femenino", value: 52, color: "bg-accent-9" },
    { label: "Masculino", value: 45, color: "bg-grayscale-10" },
    { label: "Otro", value: 3, color: "bg-grayscale-6" },
  ],
};

const MOCK_YOUTUBE_DEMOGRAPHICS = {
  age: [
    { label: "18-24 años", value: 28 },
    { label: "25-34 años", value: 45 },
    { label: "35-44 años", value: 18 },
    { label: "45+ años", value: 9 },
  ],
  location: [
    { label: "Costa Rica", value: 65 },
    { label: "México", value: 15 },
    { label: "Estados Unidos", value: 8 },
    { label: "España", value: 7 },
    { label: "Otros países", value: 5 },
  ],
  gender: [
    { label: "Femenino", value: 48, color: "bg-accent-9" },
    { label: "Masculino", value: 50, color: "bg-grayscale-10" },
    { label: "Otro", value: 2, color: "bg-grayscale-6" },
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [platform, setPlatform] = useState<"all" | "youtube" | "instagram" | "tiktok" | "facebook">("all");
  const [timeframe, setTimeframe] = useState("30");
  const [hoveredPoint, setHoveredPoint] = useState<{ ratio: number; retention: number } | null>(null);

  const dbStats = useQuery(api.analytics.getStats) ?? [];
  const dbTopContent = useQuery(api.analytics.getTopContent) ?? [];

  const stats = useMemo(() => {
    const found = dbStats.find((s) => s.platform === platform);
    return found || MOCK_PLATFORM_STATS[platform];
  }, [dbStats, platform]);

  const filteredContent = useMemo(() => {
    const contentList = dbTopContent.length > 0 ? dbTopContent : MOCK_TOP_CONTENT;
    return contentList.filter(
      (item) => platform === "all" || item.platform === platform
    );
  }, [dbTopContent, platform]);

  const monthlyViewsToShow = useMemo(() => {
    const ytStats = dbStats.find((s) => s.platform === "youtube");
    if (ytStats?.monthlyViews && ytStats.monthlyViews.length > 0) {
      return MOCK_MONTHLY_VIEWS.map((m) => {
        const realMonth = ytStats.monthlyViews?.find(
          (rm) => rm.month.toLowerCase() === m.month.toLowerCase()
        );
        return {
          ...m,
          youtube: realMonth ? realMonth.views : m.youtube,
        };
      });
    }
    return MOCK_MONTHLY_VIEWS;
  }, [dbStats]);

  const demographicsToShow = useMemo(() => {
    if (platform === "youtube") {
      const ytStats = dbStats.find((s) => s.platform === "youtube");
      if (ytStats?.demographics) {
        return {
          age: ytStats.demographics.age && ytStats.demographics.age.length > 0 ? ytStats.demographics.age : MOCK_YOUTUBE_DEMOGRAPHICS.age,
          location: ytStats.demographics.location && ytStats.demographics.location.length > 0 ? ytStats.demographics.location : MOCK_YOUTUBE_DEMOGRAPHICS.location,
          gender: ytStats.demographics.gender && ytStats.demographics.gender.length > 0 ? ytStats.demographics.gender : MOCK_YOUTUBE_DEMOGRAPHICS.gender,
        };
      }
      return MOCK_YOUTUBE_DEMOGRAPHICS;
    }
    return DEMOGRAPHICS;
  }, [dbStats, platform]);

  const retentionPath = useMemo(() => {
    const ytStats = dbStats.find((s) => s.platform === "youtube");
    const hasRealData = platform === "youtube" && ytStats?.retentionCurve && ytStats.retentionCurve.length > 0;
    
    const points = hasRealData 
      ? [...(ytStats.retentionCurve || [])].sort((a, b) => a.ratio - b.ratio)
      : [
          { ratio: 0.0, retention: 100 },
          { ratio: 0.1, retention: 70 },
          { ratio: 0.2, retention: 60 },
          { ratio: 0.3, retention: 54 },
          { ratio: 0.4, retention: 50 },
          { ratio: 0.5, retention: 47 },
          { ratio: 0.6, retention: 44 },
          { ratio: 0.7, retention: 41 },
          { ratio: 0.8, retention: 38 },
          { ratio: 0.9, retention: 35 },
          { ratio: 1.0, retention: 32 },
        ];

    const svgPoints = points.map((p) => {
      const x = p.ratio * 100;
      const y = 35 - (p.retention / 100) * 35;
      return `${x},${y}`;
    });

    return {
      line: `M ${svgPoints.join(" L ")}`,
      area: `M 0,35 L ${svgPoints.join(" L ")} L 100,35 Z`,
      points,
    };
  }, [dbStats, platform]);

  const chartData = useMemo(() => {
    return retentionPath.points.map((p) => {
      const date = new Date(2025, 0, Math.floor(p.ratio * 28) + 1);
      return {
        date,
        retention: p.retention,
      };
    });
  }, [retentionPath.points]);

  const [syncing, setSyncing] = useState(false);
  const saveStatsMutation = useMutation(api.analytics.saveStats);
  const saveTopContentMutation = useMutation(api.analytics.saveTopContent);

  const handleSyncYoutube = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-youtube");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Error al sincronizar con YouTube");
        return;
      }
      const data = await res.json();
      
      const currentStats: any[] = [...dbStats];
      const ytIndex = currentStats.findIndex((s) => s.platform === "youtube");
      const newYtStat = {
        platform: "youtube" as const,
        ...data.stats,
      };
      
      if (ytIndex >= 0) {
        currentStats[ytIndex] = newYtStat;
      } else {
        currentStats.push(newYtStat);
      }
      
      const allIndex = currentStats.findIndex((s) => s.platform === "all");
      const otherPlatforms = currentStats.filter((s) => s.platform !== "all" && s.platform !== "youtube");
      const totalFollowers = newYtStat.followers + otherPlatforms.reduce((sum: number, s: any) => sum + s.followers, 0);
      const totalViews = newYtStat.views + otherPlatforms.reduce((sum: number, s: any) => sum + s.views, 0);
      
      const newAllStat = {
        platform: "all" as const,
        followers: totalFollowers || 325300,
        followersGrowth: "+9.1%",
        views: totalViews || 1485000,
        viewsGrowth: "+26.8%",
        engagement: "8.2%",
        engagementGrowth: "+1.5%",
        shares: 61400,
        sharesGrowth: "+17.2%",
        watchTime: "52,400 h",
        avgRetention: "58.4%",
      };
      
      if (allIndex >= 0) {
        currentStats[allIndex] = newAllStat;
      } else {
        currentStats.push(newAllStat);
      }
      
      await saveStatsMutation({ stats: currentStats.map(({ _id, _creationTime, ...rest }: any) => rest) });
      
      const otherContent = dbTopContent.filter((c) => c.platform !== "youtube");
      const newContent = [...otherContent, ...data.topContent];
      await saveTopContentMutation({ content: newContent.map(({ _id, _creationTime, ...rest }: any) => rest) });
      
    } catch (err: any) {
      alert("Error de conexión: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
              Social Media Analytics
            </h1>
            <p className="text-sm text-grayscale-10">
              Rendimiento y alcance del contenido audiovisual en redes sociales
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            {platform === "youtube" && (
              <>
                {stats.watchTime === "Requiere OAuth" && (
                  <Button
                    variant="secondary"
                    href="/api/auth/youtube"
                    className="text-xs flex items-center gap-1.5 border-red-9/50 text-red-6 hover:bg-red-2/30 dark:text-red-9 dark:hover:bg-red-9/10"
                  >
                    Vincular YouTube (OAuth)
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleSyncYoutube}
                  disabled={syncing}
                  className="text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white border-transparent flex items-center gap-1.5 dark:bg-[#1e293b] dark:hover:bg-[#334155]"
                >
                  {syncing ? "Sincronizando..." : "Sincronizar YouTube"}
                </Button>
              </>
            )}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-1.5 font-mono text-xs font-semibold text-grayscale-11 uppercase outline-none focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
          </div>
        </div>

        {/* Platform Tabs Filter */}
        <div className="flex justify-start border-b border-grayscale-3 dark:border-grayscale-4 overflow-x-auto no-scrollbar max-w-[calc(100vw-8rem)]">
          <button
            type="button"
            onClick={() => setPlatform("all")}
            className={`border-b-2 px-4 py-2.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
              platform === "all"
                ? "border-accent-9 text-grayscale-12"
                : "border-transparent text-grayscale-9 hover:text-grayscale-12"
            }`}
          >
            Todos los canales
          </button>
          <button
            type="button"
            onClick={() => setPlatform("youtube")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
              platform === "youtube"
                ? "border-red-9 text-red-11"
                : "border-transparent text-grayscale-9 hover:text-grayscale-12"
            }`}
          >
            <YoutubeLogo size={16} weight="fill" className={platform === "youtube" ? "text-red-9" : ""} />
            YouTube
          </button>
          <button
            type="button"
            onClick={() => setPlatform("instagram")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
              platform === "instagram"
                ? "border-violet-9 text-violet-11"
                : "border-transparent text-grayscale-9 hover:text-grayscale-12"
            }`}
          >
            <InstagramLogo size={16} className={platform === "instagram" ? "text-violet-9" : ""} />
            Instagram
          </button>
          <button
            type="button"
            onClick={() => setPlatform("tiktok")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
              platform === "tiktok"
                ? "border-cyan-9 text-cyan-11"
                : "border-transparent text-grayscale-9 hover:text-grayscale-12"
            }`}
          >
            <TiktokLogo size={16} className={platform === "tiktok" ? "text-cyan-9" : ""} />
            TikTok
          </button>
          <button
            type="button"
            onClick={() => setPlatform("facebook")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer whitespace-nowrap ${
              platform === "facebook"
                ? "border-blue-9 text-blue-11"
                : "border-transparent text-grayscale-9 hover:text-grayscale-12"
            }`}
          >
            <FacebookLogo size={16} weight="fill" className={platform === "facebook" ? "text-blue-9" : ""} />
            Facebook
          </button>
        </div>

        {/* AI Insights Section */}
        {stats.insights && stats.insights.length > 0 && (
          <div className="flex flex-col gap-4 rounded-xl border border-grayscale-3 bg-grayscale-2/30 p-5 dark:border-grayscale-3 dark:bg-grayscale-2/10 animate-fade-in">
            <div className="flex items-center justify-between border-b border-grayscale-3 dark:border-grayscale-4/40 pb-2">
              <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-12 tracking-wider flex items-center gap-2">
                AI Insights
                <span className="text-[9px] font-mono text-grayscale-9 lowercase font-normal">
                  (gemini assistant)
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.insights.map((insight: any, idx: number) => {
                const label = 
                  insight.type === "warning" ? "WARN" : insight.type === "tip" ? "TIP" : "INFO";

                const badgeColor = 
                  insight.type === "warning" 
                    ? "border border-red-9/20 text-red-9 bg-red-9/5" 
                    : insight.type === "tip" 
                      ? "border border-green-9/20 text-green-9 bg-green-9/5"
                      : "border border-blue-9/20 text-blue-9 bg-blue-9/5";

                return (
                  <div 
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-grayscale-3 bg-grayscale-2/30 p-4 transition-all hover:translate-y-[-2px] hover:border-grayscale-4 dark:border-grayscale-4 dark:bg-grayscale-3/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-grayscale-12 leading-snug">
                        {insight.title}
                      </span>
                      <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-grayscale-10 leading-normal">
                      {insight.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Seguidores Totales"
            value={stats.followers.toLocaleString("es-CR")}
            detail={`${stats.followersGrowth} este mes`}
            icon={<ShareNetworkIcon size={18} weight="bold" className="text-accent-9" />}
          />
          <StatCard
            label="Reproducciones"
            value={stats.views.toLocaleString("es-CR")}
            detail={`${stats.viewsGrowth} vs anterior`}
            icon={<EyeIcon size={18} weight="fill" className="text-green-9" />}
          />
          <StatCard
            label="Tiempo Reproducción"
            value={stats.watchTime}
            detail="Horas de consumo"
            icon={<ClockIcon size={18} weight="bold" className="text-violet-9" />}
          />
          <StatCard
            label="Retención Promedio"
            value={stats.avgRetention}
            detail="Permanencia en video"
            icon={<TrendUpIcon size={18} weight="bold" className="text-orange-9" />}
          />
        </div>

        {/* Multi-Section Graphics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart performance comparisons */}
          <div className="lg:col-span-3 flex flex-col gap-4 rounded-xl border border-grayscale-3 bg-grayscale-2/30 p-5 dark:border-grayscale-3 dark:bg-grayscale-2/10">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-12">
                Historial de Reproducciones Mensuales
              </h2>
              <span className="text-[10px] text-grayscale-9 font-mono uppercase">Millones de Vistas</span>
            </div>
            
            {/* Custom CSS Bar Chart */}
            <div className="flex h-56 items-end justify-between gap-2 pt-6 pb-2 border-b border-grayscale-3 dark:border-grayscale-4">
              {monthlyViewsToShow.map((data, mIdx) => {
                const max = 500000;
                const ytHeight = (data.youtube / max) * 100;
                const igHeight = (data.instagram / max) * 100;
                const tkHeight = (data.tiktok / max) * 100;
                const fbHeight = (data.facebook / max) * 100;

                return (
                  <div key={data.month} className="flex flex-1 flex-col items-center h-full justify-end">
                    <div className="flex w-full items-end gap-0.5 px-0.5 h-full max-w-[65px]">
                      {/* YouTube Bar */}
                      <div
                        className="flex-1 rounded-t bg-red-9/80 dark:bg-red-9/60 transition-all hover:bg-red-9 cursor-pointer relative group animate-grow-up"
                        style={{ height: `${ytHeight}%`, animationDelay: `${mIdx * 80}ms` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 rounded bg-grayscale-12 px-1.5 py-0.5 text-[8px] text-grayscale-1 shadow transition-all duration-200 ease-out group-hover:scale-100 origin-bottom font-mono whitespace-nowrap z-10">
                          YT: {(data.youtube / 1000).toFixed(0)}k
                        </span>
                      </div>
                      {/* Instagram Bar */}
                      <div
                        className="flex-1 rounded-t bg-violet-9/80 dark:bg-violet-9/60 transition-all hover:bg-violet-9/60 hover:bg-violet-9 cursor-pointer relative group animate-grow-up"
                        style={{ height: `${igHeight}%`, animationDelay: `${mIdx * 80 + 20}ms` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 rounded bg-grayscale-12 px-1.5 py-0.5 text-[8px] text-grayscale-1 shadow transition-all duration-200 ease-out group-hover:scale-100 origin-bottom font-mono whitespace-nowrap z-10">
                          IG: {(data.instagram / 1000).toFixed(0)}k
                        </span>
                      </div>
                      {/* TikTok Bar */}
                      <div
                        className="flex-1 rounded-t bg-cyan-9/80 dark:bg-cyan-9/60 transition-all hover:bg-cyan-9 cursor-pointer relative group animate-grow-up"
                        style={{ height: `${tkHeight}%`, animationDelay: `${mIdx * 80 + 40}ms` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 rounded bg-grayscale-12 px-1.5 py-0.5 text-[8px] text-grayscale-1 shadow transition-all duration-200 ease-out group-hover:scale-100 origin-bottom font-mono whitespace-nowrap z-10">
                          TK: {(data.tiktok / 1000).toFixed(0)}k
                        </span>
                      </div>
                      {/* Facebook Bar */}
                      <div
                        className="flex-1 rounded-t bg-blue-9/80 dark:bg-blue-9/60 transition-all hover:bg-blue-9 cursor-pointer relative group animate-grow-up"
                        style={{ height: `${fbHeight}%`, animationDelay: `${mIdx * 80 + 60}ms` }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-0 rounded bg-grayscale-12 px-1.5 py-0.5 text-[8px] text-grayscale-1 shadow transition-all duration-200 ease-out group-hover:scale-100 origin-bottom font-mono whitespace-nowrap z-10">
                          FB: {(data.facebook / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                    <span className="mt-2 font-mono text-[10px] text-grayscale-9">{data.month}</span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded bg-red-9" />
                <span className="text-[10px] font-mono text-grayscale-9">YouTube</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded bg-violet-9" />
                <span className="text-[10px] font-mono text-grayscale-9">Instagram</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded bg-cyan-9" />
                <span className="text-[10px] font-mono text-grayscale-9">TikTok</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded bg-blue-9" />
                <span className="text-[10px] font-mono text-grayscale-9">Facebook</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audience Retention & Demographics Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Audience Retention Chart (Bklit UI AreaChart) */}
          <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-grayscale-3 bg-grayscale-2/30 p-5 dark:border-grayscale-3 dark:bg-grayscale-2/10">
            <div className="flex flex-col gap-1">
              <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-12">
                Curva de Retención de Video
              </h2>
              <p className="text-[10px] text-grayscale-10 leading-tight">
                Retención promedio a lo largo de la duración de reproducción (video popular)
              </p>
            </div>

            {/* Bklit AreaChart */}
            <div className="relative flex flex-col items-center justify-center flex-1 py-1 w-full min-h-[200px]">
              <AreaChart data={chartData} xDataKey="date" aspectRatio="2.5 / 1" className="w-full">
                <Grid horizontal stroke="var(--chart-grid)" strokeDasharray="3,3" />
                <Area 
                  dataKey="retention" 
                  fill="#ef4444" 
                  stroke="#ef4444" 
                  fillOpacity={0.18} 
                  strokeWidth={2}
                />
                <XAxis numTicks={5} />
                <ChartTooltip 
                  rows={(point) => [
                    {
                      label: "Retención",
                      value: `${Math.round(point.retention as number)}%`,
                      color: "#ef4444",
                    },
                  ]}
                />
              </AreaChart>
            </div>

            <div className="rounded-lg bg-grayscale-2 p-3 dark:bg-grayscale-4/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-grayscale-10">Punto de Abandono Crítico</span>
                <span className="font-mono font-bold text-red-9">0:45 min (Intro)</span>
              </div>
            </div>
          </div>

          {/* Demographics Panel */}
          <div className="lg:col-span-1 flex flex-col gap-5 rounded-xl border border-grayscale-3 bg-grayscale-2/30 p-5 dark:border-grayscale-3 dark:bg-grayscale-2/10">
            <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-12">
              Distribución Demográfica de la Audiencia
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Age groups */}
              <div className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] font-bold uppercase text-grayscale-9 tracking-wide">
                  Grupos de Edad
                </h3>
                <div className="flex flex-col gap-2.5">
                  {demographicsToShow.age.map((item, idx) => (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-grayscale-11">
                        <span>{item.label}</span>
                        <span className="font-mono font-bold">{item.value}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-grayscale-3 dark:bg-grayscale-4 overflow-hidden">
                        <div
                           className="h-full rounded-full bg-accent-9 animate-slide-in-left origin-left"
                           style={{ width: `${item.value}%`, animationDelay: `${idx * 100}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location groups */}
              <div className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] font-bold uppercase text-grayscale-9 tracking-wide">
                  Ubicaciones Principales {platform === "youtube" ? "(Países)" : "(Costa Rica)"}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {demographicsToShow.location.map((item, idx) => (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-grayscale-11">
                        <span>{item.label}</span>
                        <span className="font-mono font-bold">{item.value}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-grayscale-3 dark:bg-grayscale-4 overflow-hidden">
                        <div
                           className="h-full rounded-full bg-green-9 animate-slide-in-left origin-left"
                           style={{ width: `${item.value}%`, animationDelay: `${idx * 100}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gender distributions */}
            <div className="border-t border-grayscale-3 dark:border-grayscale-4/60 pt-4 mt-2">
              <h3 className="font-mono text-[10px] font-bold uppercase text-grayscale-9 tracking-wide mb-3">
                Distribución por Género
              </h3>
              
              {/* Segmented bar chart */}
              <div className="h-3 w-full rounded-full bg-grayscale-3 dark:bg-grayscale-4 flex overflow-hidden">
                {demographicsToShow.gender.map((item, idx) => (
                  <div
                    key={item.label}
                    className={`h-full ${item.color} first:rounded-l-full last:rounded-r-full animate-slide-in-left origin-left`}
                    style={{ width: `${item.value}%`, animationDelay: `${idx * 150}ms` }}
                    title={`${item.label}: ${item.value}%`}
                  />
                ))}
              </div>

              {/* Legend with percentages */}
              <div className="flex items-center gap-6 mt-3">
                {demographicsToShow.gender.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-grayscale-11">{item.label}</span>
                    <span className="font-mono text-xs font-bold text-grayscale-12">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Content Grid */}
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-10">
            Contenido con Mayor Rendimiento
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((item) => {
              const Icon =
                item.platform === "youtube"
                  ? YoutubeLogo
                  : item.platform === "instagram"
                    ? InstagramLogo
                    : item.platform === "tiktok"
                      ? TiktokLogo
                      : FacebookLogo;

              const platformColor =
                item.platform === "youtube"
                  ? "text-red-9 bg-red-3 dark:bg-red-9/15"
                  : item.platform === "instagram"
                    ? "text-violet-9 bg-violet-3 dark:bg-violet-9/15"
                    : item.platform === "tiktok"
                      ? "text-cyan-9 bg-cyan-3 dark:bg-cyan-9/15"
                      : "text-blue-9 bg-blue-3 dark:bg-blue-9/15";

              return (
                <div
                  key={(item as any)._id || (item as any).id || item.title}
                  className="small-shadow flex flex-col gap-3 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-grayscale-4 dark:border-grayscale-4 dark:bg-grayscale-3 overflow-hidden"
                >
                  {/* Thumbnail / Portada Container */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-grayscale-2 dark:bg-grayscale-4 flex items-center justify-center group-hover:scale-102 transition-transform">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-grayscale-2 to-grayscale-3 dark:from-grayscale-4 dark:to-grayscale-5`}>
                        <Icon size={32} className={`opacity-40 ${item.platform === "youtube" ? "text-red-9" : item.platform === "instagram" ? "text-violet-9" : item.platform === "tiktok" ? "text-cyan-9" : "text-blue-9"}`} weight={item.platform === "youtube" || item.platform === "facebook" ? "fill" : "regular"} />
                      </div>
                    )}
                    {/* Duration Badge */}
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white tracking-wider">
                        {item.duration}
                      </span>
                    )}
                  </div>

                  {/* Header Row: Platform Icon and Date */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`flex size-6 items-center justify-center rounded-md ${platformColor}`}>
                        <Icon size={14} weight={item.platform === "youtube" || item.platform === "facebook" ? "fill" : "regular"} />
                      </div>
                      <span className="font-mono text-[10px] text-grayscale-10 uppercase tracking-wide font-semibold">
                        {item.platform}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-grayscale-9">{item.date}</span>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-grayscale-12 leading-snug line-clamp-2 min-h-[40px]">
                    {item.title}
                  </p>

                  {/* Divider */}
                  <div className="border-t border-grayscale-3 dark:border-grayscale-4/60 my-0.5" />

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-grayscale-9 uppercase">Vistas</span>
                      <span className="text-xs font-bold font-mono text-grayscale-12">
                        {item.views >= 1000000 
                          ? `${(item.views / 1000000).toFixed(1)}M` 
                          : item.views >= 1000 
                            ? `${(item.views / 1000).toFixed(0)}k` 
                            : item.views}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-grayscale-9 uppercase">Watch Time</span>
                      <span className="text-xs font-bold font-mono text-grayscale-12">
                        {item.watchTime}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-grayscale-9 uppercase">Retención</span>
                      <span className="text-xs font-bold font-mono text-grayscale-12">
                        {item.retention}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
