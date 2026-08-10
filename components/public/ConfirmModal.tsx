"use client";

import { TrashIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { useState } from "react";
import Button from "@/components/public/Button";
import Modal from "@/components/public/Modal";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export default function ConfirmModal({
  open,
  onOpenChange,
  title = "Confirmar acción",
  description,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  variant = "danger",
  onConfirm,
  isLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setInternalLoading(false);
    }
  };

  const isExecuting = isLoading || internalLoading;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="max-w-md"
    >
      <div className="flex flex-col items-center text-center py-2 px-1">
        {variant === "danger" ? (
          <TrashIcon size={28} className="text-red-9 mb-3" weight="bold" />
        ) : (
          <WarningCircleIcon
            size={28}
            className="text-orange-9 mb-3"
            weight="bold"
          />
        )}

        <p className="text-xs text-grayscale-11 leading-relaxed mb-6 font-sans">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2.5 w-full pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-xs flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            className={`px-3 py-1.5 text-xs flex-1 ${
              variant === "danger" ? "bg-red-9 hover:bg-red-10 text-white" : ""
            }`}
            onClick={handleConfirm}
            disabled={isExecuting}
          >
            {isExecuting ? "Procesando..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
