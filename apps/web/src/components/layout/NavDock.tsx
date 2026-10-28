import { Ellipsis } from "lucide-react";
import { cn } from "@/utils/cn.utils";
import { HEADER_COPY, NAV_ITEMS } from "./layout.constants";
import { MoreMenu } from "./MoreMenu";
import { NavLink } from "./NavLink";

// The items as the dock's client parts take them: the icons are rendered
// here, on the server, since a component can't cross to the client.
const NAV_LINKS = NAV_ITEMS.map(
  ({ href, label, icon: Icon, alsoActiveOn, isUnderMore }) => ({
    href,
    label,
    alsoActiveOn,
    isUnderMore,
    icon: <Icon aria-hidden strokeWidth={1.7} />,
  }),
);

// A floating dock, sticky at the bottom on wide screens; a bottom bar above
// the home indicator on phones (design-system.md §7 and §9), where the
// items that don't fit wait under "Más".
export function NavDock() {
  return (
    <nav
      aria-label={HEADER_COPY.navigation}
      className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sm:sticky sm:inset-x-auto sm:bottom-4 sm:mx-auto sm:mb-4 sm:w-fit"
    >
      {/* On phones the items share the bar's width: five fit at 360px. */}
      <ul className="flex justify-between gap-0.5 rounded-xl bg-surface/94 p-1.5 shadow-float sm:justify-around sm:gap-1 sm:p-2">
        {NAV_LINKS.map(({ isUnderMore, ...link }) => (
          <li
            key={link.href}
            className={cn(
              "min-w-0 flex-1 sm:flex-none",
              isUnderMore && "hidden sm:block",
            )}
          >
            <NavLink {...link} />
          </li>
        ))}
        <li className="min-w-0 flex-1 sm:hidden">
          <MoreMenu
            label={HEADER_COPY.more}
            icon={<Ellipsis aria-hidden strokeWidth={1.7} />}
            items={NAV_LINKS.filter(({ isUnderMore }) => isUnderMore)}
          />
        </li>
      </ul>
    </nav>
  );
}
