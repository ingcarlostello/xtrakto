import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ReactNode } from "react";

// design-system.md §9, Buttons. Pills with at least 44px of touch target; the
// focus ring comes from globals.css. Icons are 18px (19px in icon buttons).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-body font-bold text-primary-foreground shadow-primary hover:bg-primary-strong",
        secondary:
          "bg-surface text-body font-semibold text-ink shadow-chip hover:bg-surface-muted",
        destructive:
          "bg-danger text-body font-bold text-white shadow-chip hover:bg-danger/90",
        link: "rounded-none text-sm font-bold text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[50px] px-[22px]",
        sm: "min-h-11 px-4",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-[19px]",
      },
    },
    compoundVariants: [
      // A link action keeps its touch target but has no padding to align.
      { variant: "link", className: "min-h-11 px-0" },
      { variant: "secondary", size: "icon", className: "bg-surface/80" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

/**
 * To navigate, render a link: `<Button nativeButton={false} render={<Link
 * href="/upload" />}>`. Name the result ("Subir extracto", not "Enviar").
 */
function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

type IconButtonProps = Omit<ButtonPrimitive.Props, "aria-label"> & {
  /** Read by screen readers: an icon alone says nothing. */
  label: string;
  children: ReactNode;
};

/** A 44px circle around one icon, such as notifications. */
function IconButton({ label, ...props }: IconButtonProps) {
  return (
    <Button variant="secondary" size="icon" aria-label={label} {...props} />
  );
}

export { Button, buttonVariants, IconButton };
