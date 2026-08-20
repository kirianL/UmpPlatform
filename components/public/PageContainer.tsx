import { cn } from "@/helpers/classname-helper";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "full";
};

export default function PageContainer({
  children,
  className,
  size = "wide",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto border-x border-grayscale-3 dark:border-grayscale-2 min-h-screen bg-grayscale-1",
        size === "default" && "max-w-4xl",
        size === "wide" && "max-w-6xl xl:max-w-7xl",
        size === "full" && "max-w-none border-x-0",
      )}
    >
      <div className="px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-10 xl:px-12 xl:pt-8">
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
