"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ListIcon, MoonStarsIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";
import { SidebarNavContent } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function MobileHeader({ userRole }: { userRole?: string }) {
  const [open, setOpen] = useState(false);

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
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-1/75 backdrop-blur-sm transition-all duration-300 ease-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100 xl:hidden" />
        <Dialog.Popup className="fixed inset-y-0 left-0 z-100 flex h-dvh w-72 max-w-[calc(100vw-2rem)] flex-col gap-px border-r border-grayscale-3 bg-grayscale-1 px-3 py-4 shadow-xl outline-none transition-all duration-300 ease-out data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 xl:hidden dark:border-grayscale-2">
          <div className="mb-4 flex items-center justify-between px-2">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
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
          <SidebarNavContent onNavigate={() => setOpen(false)} hideLogo userRole={userRole} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
