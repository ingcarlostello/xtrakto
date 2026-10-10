"use client";

import { cn } from "cn";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = { href: Route; label: string; icon: ReactNode };

// The only client part of the dock: knowing the active item needs the path.
export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted sm:min-w-[86px] sm:px-3.5 sm:py-2.5 sm:text-sm [&_svg]:size-[22px]",
        isActive &&
          "bg-primary-soft-2 font-bold text-primary hover:bg-primary-soft-2",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
