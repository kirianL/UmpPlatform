"use client";

import {
  AddressBookIcon,
  CalendarDotsIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FilmSlateIcon,
  FunnelIcon,
  SquaresFourIcon,
  UsersIcon,
  SignOutIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/helpers/classname-helper";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: SquaresFourIcon },
  { href: "/personal", label: "Personal", Icon: UsersIcon },
  { href: "/finanzas", label: "Finanzas", Icon: CurrencyDollarIcon },
  { href: "/clientes", label: "Clientes", Icon: AddressBookIcon },
  { href: "/crm", label: "CRM", Icon: FunnelIcon },
  { href: "/analytics", label: "Analytics", Icon: ChartBarIcon },
  { href: "/inventario", label: "Inventario", Icon: FilmSlateIcon },
  { href: "/calendario", label: "Calendario", Icon: CalendarDotsIcon },
];

function SidebarNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1">
        <Logo iconSize={16} className="w-6" />
        <span className="font-mono text-xs font-bold uppercase text-grayscale-12">
          UmpPlatform
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-px">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg pl-3 pr-2.5 py-2 font-mono text-xs font-semibold uppercase transition-all duration-200 hover:pl-[1.125rem]",
                isActive
                  ? "bg-grayscale-3 text-grayscale-12 dark:bg-grayscale-4"
                  : "text-grayscale-9 hover:bg-grayscale-2 hover:text-grayscale-11 dark:hover:bg-grayscale-3",
              )}
            >
              {/* Active / Hover Indicator bar */}
              <span
                className={cn(
                  "absolute left-1.5 top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-accent-9 transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
                  isActive
                    ? "opacity-100 scale-y-100"
                    : "opacity-0 scale-y-50 group-hover:opacity-60 group-hover:scale-y-75",
                )}
              />
              <Icon
                size={16}
                weight={isActive ? "fill" : "regular"}
                className={cn(
                  "transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-accent-9" : "text-grayscale-9 group-hover:text-grayscale-11",
                )}
              />
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-2 pt-6">
        <div className="border-t border-grayscale-3 pt-4 dark:border-grayscale-4/60">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between px-1">
              <span className="text-[10px] font-mono text-grayscale-9 font-bold uppercase tracking-wider">
                Tema Oscuro
              </span>
              <ThemeToggle />
            </div>
            
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/logout", { method: "POST" });
                  if (res.ok) {
                    window.location.href = "/login";
                  }
                } catch (err) {
                  console.error("Error al cerrar sesión:", err);
                }
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-mono text-[10px] font-bold uppercase text-red-9 hover:bg-red-2/30 hover:text-red-11 dark:hover:bg-red-9/10 transition-colors mt-1"
            >
              <SignOutIcon size={14} weight="bold" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 z-50 hidden h-full w-56 shrink-0 flex-col px-3 py-4 border-r border-grayscale-3 bg-grayscale-1 dark:border-grayscale-2 dark:bg-grayscale-1 xl:flex">
      <SidebarNavContent />
    </aside>
  );
}

export { SidebarNavContent };
