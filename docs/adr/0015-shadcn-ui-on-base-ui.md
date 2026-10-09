# 0015. shadcn/ui on Base UI

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The project rules choose shadcn/ui for the interface: components are copied into `apps/web/src/components/ui/` and become our code, styled with Tailwind and the tokens of `.claude/rules/design-system.md`. Since late 2025 the shadcn CLI builds each component on one of three headless libraries, which supply behavior and accessibility (focus, keyboard, ARIA): Base UI, Radix UI or React Aria. The choice shapes every component that opens, selects or toggles something (the account deletion dialog in Phase 4.5, the account selector in 5.3, the period selector in 6.7) and how components compose: Radix uses `asChild`, Base UI a `render` prop.

## Decision

Initialize shadcn/ui (CLI 4.21.4) with Base UI (`@base-ui/react`) and the `nova` preset on the `neutral` base color, in light mode only. Phase 4.3 replaces the preset's look with the v7 tokens. Components import `cn` from the `cn` package, as the CLI's own components do, so `components.json` points its `utils` alias at that package and there is no `lib/utils.ts`. Component files keep the CLI's kebab-case names (`button.tsx`), an exception to the `PascalCase.tsx` convention that keeps `shadcn add` and `shadcn diff` working.

## Alternatives considered

- **Radix UI:** the long-standing default, with the most examples online, but the CLI now recommends Base UI, and Radix's development has slowed.
- **React Aria:** thorough accessibility and internationalization, but its components and docs are less used with shadcn, and it adds more than this app needs.
- **No component library:** building dialogs, menus and selects by hand means owning focus traps and keyboard handling, which is where accessibility bugs hide.

## Consequences

- Composition uses Base UI's `render` prop: a button that navigates is `<Button nativeButton={false} render={<Link href="/upload" />}>`.
- shadcn's `shadcn/tailwind.css` (custom variants such as `data-open:`) and `tw-animate-css` are imported by `globals.css`, so both stay as development dependencies of the app.
- `@custom-variant dark` stays even without dark mode: without it, `dark:` classes inside the components would follow the system setting.
- Switching libraries later means regenerating and readapting every component in `components/ui/`.
