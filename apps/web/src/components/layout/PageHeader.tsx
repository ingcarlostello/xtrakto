type PageHeaderProps = { title: string; subtitle?: string };

// The page title row (design-system.md §9); one h1 per page.
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="font-display text-title font-medium text-balance">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}
