"use client";

import { Menu } from "@base-ui/react/menu";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn.utils";
import { ACTIVE_NAV_ITEM_CLASS, NAV_ITEM_CLASS } from "./layout.constants";
import { isNavItemActive } from "./nav.helpers";

type MoreItem = {
  href: Route;
  alsoActiveOn?: readonly Route[] | undefined;
  label: string;
  icon: ReactNode;
};

function MoreMenuItem({
  item,
  isCurrent,
}: {
  item: MoreItem;
  isCurrent: boolean;
}) {
  return (
    <Menu.LinkItem
      closeOnClick
      aria-current={isCurrent ? "page" : undefined}
      render={<Link href={item.href} />}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm outline-none [&_svg]:size-5",
        isCurrent
          ? "bg-primary-soft-2 font-bold text-primary"
          : "font-semibold text-ink data-highlighted:bg-surface-muted",
      )}
    >
      {item.icon}
      {item.label}
    </Menu.LinkItem>
  );
}

type MoreMenuProps = {
  label: string;
  icon: ReactNode;
  items: readonly MoreItem[];
};

/**
 * "Más", the last item of the phone's bar (docs/ui/v8-11): the items that
 * don't fit, in a menu that opens above it. It looks active while one of
 * them is the page open, which the menu marks.
 */
export function MoreMenu({ label, icon, items }: MoreMenuProps) {
  const pathname = usePathname();
  const current = items.find((item) => isNavItemActive(pathname, item));
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(NAV_ITEM_CLASS, current && ACTIVE_NAV_ITEM_CLASS)}
      >
        {icon}
        <span>{label}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          align="end"
          sideOffset={12}
          className="z-50"
        >
          <Menu.Popup className="flex min-w-48 flex-col gap-0.5 rounded-md bg-surface p-1.5 shadow-pop outline-none">
            {items.map((item) => (
              <MoreMenuItem
                key={item.href}
                item={item}
                isCurrent={item === current}
              />
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
