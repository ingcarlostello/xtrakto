import type { CategoryId, HomeService } from "@xtrakto/core";
import { cn } from "@/utils/cn.utils";
import {
  CATEGORY_ICONS,
  SERVICE_ICONS,
  TONE_CLASSES,
  UNKNOWN_CATEGORY_ICON,
} from "./category-icons.constants";
import type { MovementTone } from "./movement-icon.types";

/**
 * The icon of a movement's category, which a guess keeps too, or of the
 * home service a fixed payment pays, in its tone's chip (design-system.md
 * §8): neutral and in ink while it isn't sure.
 */
export function MovementIcon({
  categoryId,
  service,
  tone,
}: {
  categoryId: CategoryId | null;
  service?: HomeService;
  tone: MovementTone;
}) {
  const Icon =
    (service === undefined ? undefined : SERVICE_ICONS[service]) ??
    (categoryId === null ? undefined : CATEGORY_ICONS[categoryId]) ??
    UNKNOWN_CATEGORY_ICON;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        TONE_CLASSES[tone].chip,
      )}
    >
      <Icon strokeWidth={1.9} className="size-5" />
    </span>
  );
}
