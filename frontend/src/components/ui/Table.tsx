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
    // tabIndex makes the scroll container reachable, so a keyboard user can
    // actually pan a table that is wider than the viewport - at 320px or 200%
    // zoom several columns sit off-screen with no other way to reach them
    // (WCAG 2.1.1). role="region" plus the name is what stops that tab stop
    // being an unexplained one; it is the one case with no native equivalent,
    // since HTML has no scrollable-region element.
    <div
      className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-solid)]"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
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
              className="border-b border-border/60 last:border-0"
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
