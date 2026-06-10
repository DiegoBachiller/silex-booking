import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 sm:px-6 md:px-10 py-5 md:py-8">
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 -mx-1 px-1 md:mx-0 md:px-0 md:overflow-visible">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
