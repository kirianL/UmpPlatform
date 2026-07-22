"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/helpers/classname-helper";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-1/75 animate-backdrop" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-100 flex w-[calc(100%-1.5rem)] sm:w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[92vh] flex-col rounded-2xl border border-grayscale-3 bg-grayscale-1 shadow-2xl outline-none animate-modal dark:border-grayscale-4 dark:bg-grayscale-2 overflow-hidden",
            className,
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-grayscale-3 px-4 sm:px-5 py-3.5 dark:border-grayscale-4 bg-grayscale-1 dark:bg-grayscale-2">
            <Dialog.Title className="text-sm font-bold text-grayscale-12 truncate pr-2">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:hover:bg-grayscale-4"
            >
              <XIcon size={14} weight="bold" />
            </Dialog.Close>
          </div>
          <div className="px-4 sm:px-5 py-4 overflow-y-auto max-h-[calc(92vh-3.5rem)]">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
