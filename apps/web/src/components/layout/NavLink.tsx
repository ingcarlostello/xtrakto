"use client";

import { cn } from "@/utils/cn.utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ACTIVE_NAV_ITEM_CLASS, NAV_ITEM_CLASS } from "./layout.constants";
import { isNavItemActive } from "./nav.helpers";

type NavLinkProps = {
  href: Route;
  alsoActiveOn?: readonly Route[] | undefined;
  label: string;
  icon: ReactNode;
};

// The dock's links are client components: knowing the active one needs the path.
export function NavLink({ href, alsoActiveOn, label, icon }: NavLinkProps) {
  const isActive = isNavItemActive(usePathname(), { href, alsoActiveOn });
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(NAV_ITEM_CLASS, isActive && ACTIVE_NAV_ITEM_CLASS)}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
