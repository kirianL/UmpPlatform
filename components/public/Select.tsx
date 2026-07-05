import { cn } from "@/helpers/classname-helper";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  label?: string;
  id?: string;
  options: SelectOption[];
  placeholder?: string;
} & Omit<React.ComponentProps<"select">, "children">;

export default function Select({
  label,
  id,
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
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
      <select
        id={id}
        className={cn(
          "w-full min-w-0 appearance-none rounded-lg border border-grayscale-4 bg-grayscale-1 px-3 py-2 text-sm text-grayscale-12 outline-none transition-all duration-200 focus:border-accent-8 focus:ring-2 focus:ring-accent-8/30 dark:border-grayscale-5 dark:bg-grayscale-3",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
