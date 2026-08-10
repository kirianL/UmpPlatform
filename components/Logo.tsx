import { cn } from "@/helpers/classname-helper";

type LogoProps = {
  className?: string;
  iconSize?: number;
};

export default function Logo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center shrink-0 justify-center",
        className,
      )}
    >
      <img
        src="/logos/ump-logo-dark.svg"
        alt="UMP Logo"
        className="h-full w-auto object-contain dark:hidden"
      />
      <img
        src="/logos/ump-logo-white.svg"
        alt="UMP Logo"
        className="hidden h-full w-auto object-contain dark:block"
      />
    </div>
  );
}
