import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

// design-system.md §5 and §9. No borders: a translucent surface and a soft
// shadow separate cards from the background.
const cardVariants = cva("flex flex-col text-card-foreground", {
  variants: {
    variant: {
      // Stat cards and insight tiles.
      tile: "gap-3 rounded-md bg-card/88 p-5 shadow-card",
      // Large cards: the chart, the translated statement.
      card: "gap-4 rounded-lg bg-card/88 p-6 shadow-card",
      // Large translucent panels: the account, the chat.
      panel: "gap-4 rounded-lg bg-card/60 p-6 shadow-panel",
    },
  },
  defaultVariants: {
    variant: "tile",
  },
});

type CardProps = ComponentProps<"div"> & VariantProps<typeof cardVariants>;

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Title and description on the left; an optional CardAction on the right. */
function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-0.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-body font-bold text-ink", className)}
      {...props}
    />
  );
}

/** One sentence saying what the card's figure means (§1, principle 2). */
function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-caption text-ink-muted", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={className} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
