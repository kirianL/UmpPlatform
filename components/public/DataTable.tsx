import { useState, useMemo, useEffect } from "react";
import { cn } from "@/helpers/classname-helper";

export type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  filterOptions?: { label: string; value: string }[];
  getFilterValue?: (item: T) => string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  pageSize?: number;
};

const FunnelIconSvg = ({ active }: { active: boolean }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={cn("size-3 cursor-pointer transition-colors", active ? "text-accent-9 fill-accent-9/10" : "text-grayscale-8 hover:text-grayscale-11")}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className,
  pageSize = 25,
}: DataTableProps<T>) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data locally based on active filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue;
        const col = columns.find((c) => c.key === key);
        const itemVal = col?.getFilterValue ? col.getFilterValue(item) : (item as any)[key];
        if (String(itemVal) !== value) return false;
      }
      return true;
    });
  }, [data, activeFilters, columns]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters]);

  // Total pages
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const isInitialDataEmpty = data.length === 0;

  if (isInitialDataEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto no-scrollbar rounded-xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-3 dark:bg-grayscale-2 flex flex-col",
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
                  "relative px-4 py-3 text-[11px] font-semibold font-mono uppercase text-grayscale-9 select-none",
                  col.className,
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.header}</span>
                  {col.filterOptions && (
                    <button
                      type="button"
                      onClick={() => setOpenFilterKey(openFilterKey === col.key ? null : col.key)}
                      className={cn(
                        "inline-flex p-0.5 rounded hover:bg-grayscale-3 dark:hover:bg-grayscale-4 cursor-pointer transition-colors",
                        activeFilters[col.key] ? "bg-accent-2/60 dark:bg-accent-2/20" : ""
                      )}
                    >
                      <FunnelIconSvg active={!!activeFilters[col.key]} />
                    </button>
                  )}
                </div>

                {col.filterOptions && openFilterKey === col.key && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterKey(null);
                      }}
                    />
                    <div className="absolute left-4 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-grayscale-3 bg-grayscale-1 p-1 shadow-lg dark:border-grayscale-4 dark:bg-grayscale-2 normal-case font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilters((prev) => {
                            const next = { ...prev };
                            delete next[col.key];
                            return next;
                          });
                          setOpenFilterKey(null);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors hover:bg-grayscale-2 dark:hover:bg-grayscale-3",
                          !activeFilters[col.key] ? "font-bold text-accent-9 bg-accent-2/30 dark:bg-accent-2/10" : "text-grayscale-11"
                        )}
                      >
                        Todos
                      </button>
                      {col.filterOptions.map((opt) => {
                        const isSelected = activeFilters[col.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setActiveFilters((prev) => ({
                                ...prev,
                                [col.key]: opt.value,
                              }));
                              setOpenFilterKey(null);
                            }}
                            className={cn(
                              "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors hover:bg-grayscale-2 dark:hover:bg-grayscale-3",
                              isSelected ? "font-bold text-accent-9 bg-accent-2/30 dark:bg-accent-2/10" : "text-grayscale-11"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grayscale-3 dark:divide-grayscale-3">
          {paginatedData.map((item, idx) => (
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

          {filteredData.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-xs font-mono uppercase text-grayscale-8">
                Sin resultados para el filtro seleccionado
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-grayscale-3 bg-grayscale-2 px-4 py-3 gap-3 dark:border-grayscale-4 dark:bg-grayscale-2 select-none">
          <div className="text-[11px] font-mono uppercase text-grayscale-9">
            Mostrando <span className="font-semibold text-grayscale-12">{(currentPage - 1) * pageSize + 1}</span> -{" "}
            <span className="font-semibold text-grayscale-12">
              {Math.min(currentPage * pageSize, filteredData.length)}
            </span>{" "}
            de <span className="font-semibold text-grayscale-12">{filteredData.length}</span> registros
          </div>
          <div className="flex items-center gap-1.5">
            {/* Previous button */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-10 transition-all hover:bg-grayscale-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              <span className="text-xs">←</span>
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and pages near current
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, index, arr) => {
                const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
                const isSelected = page === currentPage;

                return (
                  <div key={page} className="flex items-center gap-1.5">
                    {showEllipsisBefore && (
                      <span className="text-grayscale-8 font-mono text-[10px]">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg border text-xs font-mono font-medium transition-all active:scale-95 cursor-pointer",
                        isSelected
                          ? "border-accent-9 bg-accent-9 text-white font-bold"
                          : "border-grayscale-3 bg-grayscale-1 text-grayscale-10 hover:bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3"
                      )}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}

            {/* Next button */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 text-grayscale-10 transition-all hover:bg-grayscale-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3"
            >
              <span className="text-xs">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
