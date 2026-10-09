import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// A label pill. Kind colors only label kinds (design-system.md §3.4), always
// with their text-on-soft tone, which keeps the contrast pairs of §3.6.
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-meta font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-ink-secondary",
        income: "bg-income-soft text-income-on-soft",
        spending: "bg-spending-soft text-spending-on-soft",
        moved: "bg-moved-soft text-moved-on-soft",
        // Something to review, such as the 4x1000 charges.
        attention: "bg-spending-surface text-spending-on-soft",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
