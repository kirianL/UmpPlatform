import { cn } from "@/helpers/classname-helper";

type InputProps = {
  label?: string;
  id?: string;
} & React.ComponentProps<"input">;

export default function Input({ label, id, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium font-mono uppercase text-grayscale-10"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full min-w-0 rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3 dark:placeholder:text-grayscale-7",
          className,
        )}
        {...props}
      />
    </div>
  );
}
