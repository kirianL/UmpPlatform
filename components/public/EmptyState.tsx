import { cn } from "@/helpers/classname-helper";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-grayscale-4 bg-grayscale-2 px-6 py-12 text-center dark:border-grayscale-4 dark:bg-grayscale-2",
        className,
      )}
    >
      {icon && (
        <span className="text-grayscale-7">{icon}</span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-grayscale-11">{title}</p>
        {description && (
          <p className="text-xs text-grayscale-9">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
