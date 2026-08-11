import { cn } from "@/lib/cn";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * What the table contains, for a screen reader reaching it out of context.
   * Rendered visually hidden: sighted users already have the surrounding
   * heading, so showing it would repeat what is on screen.
   */
  caption: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-neutral-200 dark:border-night-700/60">
            {columns.map((col) => (
              <th
                key={col.key}
                // Without scope, cell-by-cell navigation reads a value with no
                // column context - "2024-04-11" and no "Odeh".
                scope="col"
                className={cn(
                  "whitespace-nowrap px-3 py-2 font-medium text-ink-muted",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-neutral-100 last:border-0 dark:border-night-700/40"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("whitespace-nowrap px-3 py-2.5", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
