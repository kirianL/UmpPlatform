import { cn } from "@/helpers/classname-helper";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  detail?: string;
  style?: React.CSSProperties;
};

export default function StatCard({
  label,
  value,
  icon,
  className,
  detail,
  style,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "small-shadow flex flex-col gap-1 rounded-lg border border-grayscale-3 bg-grayscale-1 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-accent-6 transform-gpu dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-accent-7",
        className,
      )}
      style={style}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-mono uppercase text-grayscale-9">
          {label}
        </span>
        {icon && (
          <span className="text-grayscale-8">{icon}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-grayscale-12">{value}</p>
      {detail && (
        <p className="text-xs text-grayscale-10">{detail}</p>
      )}
    </div>
  );
}
