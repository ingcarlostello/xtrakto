"use client";

import { cn } from "@/utils/cn.utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: Route;
  alsoActiveOn?: readonly Route[] | undefined;
  label: string;
  icon: ReactNode;
};

// The only client part of the dock: knowing the active item needs the path.
export function NavLink({
  href,
  alsoActiveOn = [],
  label,
  icon,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    (href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`)) ||
    alsoActiveOn.some((path) => path === pathname);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-center text-[11px] font-semibold tracking-tight text-ink transition-colors hover:bg-surface-muted sm:w-auto sm:min-w-[86px] sm:px-3.5 sm:py-2.5 sm:text-sm sm:tracking-normal [&_svg]:size-[22px]",
        isActive &&
          "bg-primary-soft-2 font-bold text-primary hover:bg-primary-soft-2",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
