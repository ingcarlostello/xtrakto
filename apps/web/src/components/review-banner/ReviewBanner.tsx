import { CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ReviewBannerProps = {
  /** What waits: "Tienes 4 grupos por revisar (24 movimientos)". */
  title: string;
  description: string;
  /** The way to answer it: "Revisar ahora". */
  action: string;
  href: ComponentProps<typeof Link>["href"];
};

/**
 * What waits for the quick review, on the summary (design-system.md §9,
 * review banner): on the attention surface, with the way to answer it.
 */
export function ReviewBanner({
  title,
  description,
  action,
  href,
}: ReviewBannerProps) {
  return (
    <section
      aria-labelledby="review-banner-title"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-spending-surface p-5"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
        <CircleAlert aria-hidden strokeWidth={1.9} className="size-5" />
        <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
      </span>
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-0.5">
        <h2 id="review-banner-title" className="text-body font-bold">
          {title}
        </h2>
        <p className="text-caption text-ink-secondary">{description}</p>
      </div>
      <Button nativeButton={false} render={<Link href={href} />}>
        {action}
      </Button>
    </section>
  );
}
