import React, { useState, useMemo, useCallback } from "react";
import { cn } from "../../lib/cn";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

/* ─── Types ─── */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  render?: (row: T, rowIndex: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export type SortDirection = "asc" | "desc" | null;
export type SortConfig = { key: string; direction: SortDirection };

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalItems?: number;
  className?: string;
  onRowClick?: (row: T) => void;
}

/* ─── Component ─── */
export function Table<T>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  loading = false,
  emptyMessage = "No data available",
  pageSize = 10,
  onPageChange,
  currentPage: controlledPage = 1,
  totalItems,
  className,
  onRowClick,
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "",
    direction: null,
  });

  const currentPage = controlledPage;
  const effectiveTotal = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;
    const sorted = [...data];
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.key];
      const bVal = (b as Record<string, unknown>)[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * dir;
      }
      return ((aVal as number) - (bVal as number)) * dir;
    });
    return sorted;
  }, [data, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = useCallback(
    (key: string) => {
      setSortConfig((prev) => {
        if (prev.key !== key) return { key, direction: "asc" };
        if (prev.direction === "asc") return { key, direction: "desc" };
        return { key: "", direction: null };
      });
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (selectedKeys.size === paginatedData.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(
        new Set(paginatedData.map(keyExtractor))
      );
    }
  }, [selectedKeys, paginatedData, keyExtractor, onSelectionChange]);

  const handleSelectRow = useCallback(
    (key: string | number) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [selectedKeys, onSelectionChange]
  );

  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedKeys.has(keyExtractor(row)));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-navy-100 dark:border-navy-700",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/80 dark:border-navy-700 dark:bg-navy-800/80">
              {selectable && (
                <th className="w-12 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-navy-200 text-brand focus:ring-brand dark:border-navy-400"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-400",
                    col.sortable && "cursor-pointer select-none hover:text-navy-600 dark:hover:text-navy-200",
                    col.headerClassName
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex shrink-0">
                        {sortConfig.key === col.key && sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : sortConfig.key === col.key &&
                          sortConfig.direction === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-navy-400" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-700">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center"
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
                  <p className="mt-2 text-sm text-navy-400 dark:text-navy-400">
                    Loading...
                  </p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center text-sm text-navy-400 dark:text-navy-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const key = keyExtractor(row);
                const isSelected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      "transition-colors",
                      onRowClick && "cursor-pointer",
                      isSelected
                        ? "bg-brand-50/60 dark:bg-brand-950/20"
                        : "hover:bg-navy-50/50 dark:hover:bg-navy-700/50"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td
                        className="w-12 px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="h-4 w-4 rounded border-navy-200 text-brand focus:ring-brand dark:border-navy-400"
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-navy-700 dark:text-navy-200",
                          col.cellClassName
                        )}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? ""
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 dark:border-navy-700">
          <p className="text-xs text-navy-400 dark:text-navy-400">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, effectiveTotal)} of{" "}
            {effectiveTotal}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-navy-300 dark:hover:bg-navy-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, and nearby pages
                return (
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
                );
              })
              .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-xs text-navy-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item)}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      currentPage === item
                        ? "bg-brand-500 text-white"
                        : "text-navy-600 hover:bg-navy-50 dark:text-navy-300 dark:hover:bg-navy-700"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-navy-300 dark:hover:bg-navy-700"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
