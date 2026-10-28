import type { Route } from "next";

type NavTarget = {
  readonly href: Route;
  readonly alsoActiveOn?: readonly Route[] | undefined;
};

/**
 * Whether the page at `pathname` is the item's: its own, one under it, or
 * one it stands for. Resumen is only `/`, which every path starts with.
 */
export const isNavItemActive = (
  pathname: string,
  { href, alsoActiveOn = [] }: NavTarget,
): boolean =>
  (href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`)) ||
  alsoActiveOn.some((path) => path === pathname);
