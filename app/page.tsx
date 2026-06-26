"use client";

import {
  AddressBookIcon,
  CalendarDotsIcon,
  CurrencyDollarIcon,
  FilmSlateIcon,
  TrendUpIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import Badge from "@/components/public/Badge";
import PageContainer from "@/components/public/PageContainer";
import StatCard from "@/components/public/StatCard";
import {
  EVENT_TYPE_LABELS,
  MOCK_CLIENTS,
  MOCK_EMPLOYEES,
  MOCK_EQUIPMENT,
  MOCK_EVENTS,
  MOCK_TRANSACTIONS,
} from "@/lib/mock-data";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export default function DashboardPage() {
  const activeEmployees = MOCK_EMPLOYEES.filter(
    (e) => e.status === "active",
  ).length;
  const totalIncome = MOCK_TRANSACTIONS.filter(
    (t) => t.type === "income" && t.status !== "cancelled",
  ).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = MOCK_TRANSACTIONS.filter(
    (t) => t.type === "expense" && t.status !== "cancelled",
  ).reduce((s, t) => s + t.amount, 0);
  const availableEquipment = MOCK_EQUIPMENT.filter(
    (e) => e.status === "available",
  ).length;

  const recentTransactions = [...MOCK_TRANSACTIONS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcomingEvents = MOCK_EVENTS.filter(
    (e) => e.status === "upcoming",
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
          Dashboard
        </h1>
        <p className="text-sm text-grayscale-10">
          Resumen general de UmpPlatform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Personal Activo"
          value={activeEmployees}
          detail={`${MOCK_EMPLOYEES.length} total`}
          icon={<UsersIcon size={18} weight="fill" />}
          className="animate-fade-in-up opacity-0"
        />
        <StatCard
          label="Ingresos"
          value={formatCurrency(totalIncome)}
          detail="Este periodo"
          icon={<TrendUpIcon size={18} weight="bold" />}
          className="animate-fade-in-up opacity-0" style={{ animationDelay: '60ms' }}
        />
        <StatCard
          label="Clientes"
          value={MOCK_CLIENTS.length}
          detail={`${MOCK_CLIENTS.reduce((s, c) => s + c.projectCount, 0)} proyectos`}
          icon={<AddressBookIcon size={18} weight="fill" />}
          className="animate-fade-in-up opacity-0" style={{ animationDelay: '120ms' }}
        />
        <StatCard
          label="Equipo Disponible"
          value={`${availableEquipment}/${MOCK_EQUIPMENT.length}`}
          detail="Unidades"
          icon={<FilmSlateIcon size={18} weight="fill" />}
          className="animate-fade-in-up opacity-0" style={{ animationDelay: '180ms' }}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-10">
              Movimientos Recientes
            </h2>
            <Link
              href="/finanzas"
              className="text-xs text-accent-9 transition-colors hover:text-accent-11"
            >
              Ver todo →
            </Link>
          </div>
          <div className="flex flex-col rounded-xl border border-grayscale-3 bg-grayscale-2 divide-y divide-grayscale-3 dark:divide-grayscale-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-grayscale-3/50 dark:hover:bg-grayscale-3/40">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm text-grayscale-11 truncate">{t.concept}</p>
                  <p className="text-xs text-grayscale-9">{formatDate(t.date)}</p>
                </div>
                <span
                  className={`text-sm font-medium whitespace-nowrap ml-3 ${
                    t.type === "income" ? "text-green-11" : "text-red-11"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold uppercase text-grayscale-10">
              Próximos Eventos
            </h2>
            <Link
              href="/calendario"
              className="text-xs text-accent-9 transition-colors hover:text-accent-11"
            >
              Ver todo →
            </Link>
          </div>
          <div className="flex flex-col rounded-xl border border-grayscale-3 bg-grayscale-2 divide-y divide-grayscale-3 dark:divide-grayscale-3">
            {upcomingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-grayscale-3/50 dark:hover:bg-grayscale-3/40">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm text-grayscale-11 truncate">{ev.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-grayscale-9">
                      {formatDate(ev.date)} · {ev.time}
                    </p>
                  </div>
                </div>
                <Badge variant="accent">
                  {EVENT_TYPE_LABELS[ev.type]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/personal", label: "Personal", Icon: UsersIcon },
          { href: "/finanzas", label: "Finanzas", Icon: CurrencyDollarIcon },
          { href: "/clientes", label: "Clientes", Icon: AddressBookIcon },
          { href: "/inventario", label: "Inventario", Icon: FilmSlateIcon },
          { href: "/calendario", label: "Calendario", Icon: CalendarDotsIcon },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="small-shadow flex flex-col items-center gap-2 rounded-lg border border-grayscale-3 bg-grayscale-1 p-4 text-grayscale-10 transition-all duration-200 hover:border-accent-6 hover:bg-accent-2 hover:text-accent-11 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transform-gpu dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-accent-6 dark:hover:bg-accent-3"
          >
            <Icon size={22} weight="duotone" />
            <span className="text-xs font-mono font-medium uppercase">{label}</span>
          </Link>
        ))}
      </div>
      </div>
    </PageContainer>
  );
}
