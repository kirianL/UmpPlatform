"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  AddressBookIcon,
  CalendarDotsIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FilmSlateIcon,
  FunnelIcon,
  ListIcon,
  MoonStarsIcon,
  ScrollIcon,
  SignOutIcon,
  SquaresFourIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/helpers/classname-helper";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: SquaresFourIcon },
  { href: "/personal", label: "Personal", Icon: UsersIcon },
  { href: "/guiones", label: "Guiones", Icon: ScrollIcon },
  { href: "/calendario-actores", label: "Agenda actores", Icon: UserCheckIcon },
  { href: "/calendario", label: "Calendario", Icon: CalendarDotsIcon },
  { href: "/finanzas", label: "Finanzas", Icon: CurrencyDollarIcon },
  { href: "/clientes", label: "Clientes", Icon: AddressBookIcon },
  { href: "/crm", label: "CRM", Icon: FunnelIcon },
  { href: "/analytics", label: "Analytics", Icon: ChartBarIcon },
  { href: "/inventario", label: "Inventario", Icon: FilmSlateIcon },
];

export default function MobileHeader({ userRole }: { userRole?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (userRole === "produccion") {
      return (
        item.href === "/inventario" ||
        item.href === "/calendario" ||
        item.href === "/guiones" ||
        item.href === "/calendario-actores"
      );
    }
    return true;
  });

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <header className="mobile-header pointer-events-none fixed inset-x-0 top-0 z-100 flex h-14 xl:hidden">
        <div className="pointer-events-auto relative mx-auto flex h-full w-full items-center justify-between border-b border-grayscale-3 bg-grayscale-1/95 px-4 backdrop-blur dark:border-grayscale-2">
          <Dialog.Trigger
            aria-label="Open navigation"
            title="Open navigation"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:border-grayscale-4 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 dark:hover:border-grayscale-5"
          >
            <ListIcon size={18} weight="bold" />
          </Dialog.Trigger>
          <Link
            href={userRole === "produccion" ? "/inventario" : "/"}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-grayscale-12"
          >
            <Logo iconSize={14} className="w-5" />
            UmpPlatform
          </Link>
          <div className="flex items-center gap-2 text-grayscale-10">
            <MoonStarsIcon
              aria-hidden="true"
              size={17}
              weight="fill"
              className="text-grayscale-10"
            />
            <ThemeToggle size={16} />
          </div>
        </div>
      </header>

      <Dialog.Portal>
        {/* Fullscreen backdrop */}
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-1/80 backdrop-blur-xl transition-opacity duration-300 ease-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100 xl:hidden dark:bg-grayscale-1/90" />

        {/* Fullscreen centered menu */}
        <Dialog.Popup className="fixed inset-0 z-100 flex flex-col h-dvh w-full bg-grayscale-1 outline-none xl:hidden dark:bg-grayscale-1 transition-opacity duration-300 ease-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>

          {/* Top bar — logo + close */}
          <div className="flex items-center justify-between px-5 h-14 shrink-0 border-b border-grayscale-3 dark:border-grayscale-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-grayscale-12">
              <Logo iconSize={16} className="w-6" />
              UmpPlatform
            </div>
            <Dialog.Close
              aria-label="Close navigation"
              title="Close navigation"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-b-2 border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:border-grayscale-4 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4 dark:hover:border-grayscale-5"
            >
              <XIcon size={16} weight="bold" />
            </Dialog.Close>
          </div>

          {/* Centered nav links */}
          <nav className="flex flex-1 flex-col items-center justify-center gap-0.5 px-8">
            {visibleItems.map(({ href, label, Icon }, index) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mobile-nav-item flex w-full max-w-xs items-center justify-center gap-3 rounded-xl px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-wide transition-colors duration-150",
                    isActive
                      ? "bg-grayscale-3 text-grayscale-12 dark:bg-grayscale-3"
                      : "text-grayscale-10 active:bg-grayscale-2 dark:active:bg-grayscale-2",
                  )}
                  style={{
                    animationDelay: `${index * 35}ms`,
                  }}
                >
                  <Icon
                    size={18}
                    weight={isActive ? "fill" : "regular"}
                    className={cn(
                      isActive ? "text-accent-9" : "text-grayscale-9",
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom — theme toggle + logout */}
          <div className="shrink-0 px-6 pb-8 pt-4">
            <div className="border-t border-grayscale-3 pt-5 dark:border-grayscale-3 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-mono text-grayscale-9 font-bold uppercase tracking-wider">
                  Tema oscuro
                </span>
                <ThemeToggle />
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/auth/logout", {
                      method: "POST",
                    });
                    if (res.ok) {
                      window.location.href = "/login";
                    }
                  } catch (err) {
                    console.error("Error al cerrar sesión:", err);
                  }
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-xs font-bold uppercase text-red-9 active:bg-red-2/30 dark:active:bg-red-9/10 transition-colors"
              >
                <SignOutIcon size={16} weight="bold" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
