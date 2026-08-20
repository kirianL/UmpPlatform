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
  contentClassName?: string;
};

export default function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
  contentClassName,
}: ModalProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-black/50 backdrop-blur-md animate-backdrop" />

        <div className="fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <Dialog.Popup
            onKeyDown={(e) => {
              if (e.key === "Escape" && typeof window !== "undefined") {
                window.getSelection()?.removeAllRanges();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            className={cn(
              "relative my-auto flex w-full max-w-lg max-h-[96vh] flex-col rounded-2xl border border-grayscale-3 bg-grayscale-1 shadow-2xl outline-none animate-modal dark:border-grayscale-4 dark:bg-grayscale-2 overflow-hidden",
              className,
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-grayscale-3 px-3.5 sm:px-5 py-2.5 sm:py-3 dark:border-grayscale-4 bg-grayscale-1 dark:bg-grayscale-2">
              <Dialog.Title className="text-xs sm:text-sm font-bold text-grayscale-12 truncate pr-2">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Cerrar"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 dark:border-grayscale-5 dark:hover:bg-grayscale-4"
              >
                <XIcon size={14} weight="bold" />
              </Dialog.Close>
            </div>
            <div
              className={cn(
                "px-3.5 sm:px-5 py-3 sm:py-4 overflow-y-auto flex-1 flex flex-col min-h-0",
                contentClassName,
              )}
            >
              {children}
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
