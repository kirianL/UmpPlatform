import { cn } from "@/helpers/classname-helper";

type BadgeVariant = "green" | "red" | "orange" | "accent" | "gray";

const variantClasses: Record<BadgeVariant, string> = {
  green:
    "bg-green-3 text-green-11 border-green-6 dark:bg-green-3 dark:text-green-11 dark:border-green-5",
  red: "bg-red-3 text-red-11 border-red-6 dark:bg-red-3 dark:text-red-11 dark:border-red-5",
  orange:
    "bg-orange-3 text-orange-11 border-orange-6 dark:bg-orange-3 dark:text-orange-11 dark:border-orange-5",
  accent:
    "bg-accent-3 text-accent-11 border-accent-6 dark:bg-accent-3 dark:text-accent-11 dark:border-accent-5",
  gray: "bg-grayscale-3 text-grayscale-11 border-grayscale-6 dark:bg-grayscale-4 dark:text-grayscale-11 dark:border-grayscale-5",
};

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

export default function Badge({
  variant = "gray",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
