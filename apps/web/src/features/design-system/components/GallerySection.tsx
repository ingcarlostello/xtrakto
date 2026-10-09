import type { ReactNode } from "react";

type GallerySectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function GallerySection({
  title,
  description,
  children,
}: GallerySectionProps) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-section font-bold text-balance">{title}</h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
