import { HEADER_COPY, NAV_ITEMS } from "./layout.constants";
import { NavLink } from "./NavLink";

// A floating dock, sticky at the bottom on wide screens; a bottom bar above
// the home indicator on phones (design-system.md §7 and §9). The icons are
// rendered here, on the server: a component can't cross to the client.
export function NavDock() {
  return (
    <nav
      aria-label={HEADER_COPY.navigation}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 sm:sticky sm:inset-x-auto sm:bottom-4 sm:mx-auto sm:mb-4 sm:w-fit"
    >
      <ul className="flex justify-around gap-1 rounded-xl bg-surface/94 p-2 shadow-float">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <NavLink
              href={href}
              label={label}
              icon={<Icon aria-hidden strokeWidth={1.7} />}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
