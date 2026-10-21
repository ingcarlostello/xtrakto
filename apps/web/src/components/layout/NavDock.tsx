import { HEADER_COPY, NAV_ITEMS } from "./layout.constants";
import { NavLink } from "./NavLink";

// A floating dock, sticky at the bottom on wide screens; a bottom bar above
// the home indicator on phones (design-system.md §7 and §9). The icons are
// rendered here, on the server: a component can't cross to the client.
export function NavDock() {
  return (
    <nav
      aria-label={HEADER_COPY.navigation}
      className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sm:sticky sm:inset-x-auto sm:bottom-4 sm:mx-auto sm:mb-4 sm:w-fit"
    >
      {/* On phones the items share the bar's width: five fit at 360px. */}
      <ul className="flex justify-between gap-0.5 rounded-xl bg-surface/94 p-1.5 shadow-float sm:justify-around sm:gap-1 sm:p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, alsoActiveOn }) => (
          <li key={href} className="min-w-0 flex-1 sm:flex-none">
            <NavLink
              href={href}
              alsoActiveOn={alsoActiveOn}
              label={label}
              icon={<Icon aria-hidden strokeWidth={1.7} />}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
