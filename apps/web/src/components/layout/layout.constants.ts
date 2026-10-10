import {
  Calendar,
  LayoutGrid,
  List,
  type LucideIcon,
  Upload,
} from "lucide-react";
import type { Route } from "next";

// The Spanish copy and the navigation of the app shell (design-system.md §9).

export const HEADER_COPY = {
  home: "Xtrakto, inicio",
  tagline: "Cuentas claras, mente tranquila",
  privacy: "Tus datos son privados",
  settings: "Configuración",
  navigation: "Navegación principal",
} as const;

type NavItem = { href: Route; label: string; icon: LucideIcon };

// Only the routes that exist; Categorías and Pregúntale arrive with their
// stages, and the settings live in the avatar's menu.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/transactions", label: "Movimientos", icon: List },
  { href: "/recurring", label: "Pagos fijos", icon: Calendar },
  { href: "/upload", label: "Subir", icon: Upload },
];
