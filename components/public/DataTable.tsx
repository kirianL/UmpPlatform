import { cn } from "@/helpers/classname-helper";

export type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
};

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto no-scrollbar rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-3 dark:bg-grayscale-2",
        className,
      )}
    >
      <table className="w-full min-w-[600px] text-left">
        <thead>
          <tr className="border-b border-grayscale-3 dark:border-grayscale-4">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-[11px] font-semibold font-mono uppercase text-grayscale-9",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grayscale-3 dark:divide-grayscale-3">
          {data.map((item, idx) => (
            <tr
              key={keyExtractor(item)}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="transition-all duration-200 ease-out hover:bg-grayscale-3/50 dark:hover:bg-grayscale-3/50 animate-fade-in-up opacity-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-sm text-grayscale-11",
                    col.className,
                  )}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
