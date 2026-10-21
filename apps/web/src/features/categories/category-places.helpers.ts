import {
  NO_DESCRIPTION,
  type Place,
  placesOf,
  sumAmounts,
} from "@xtrakto/core";
import { countText } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { boxAmount, compactSize } from "@/utils/money-text.utils";
import { barOf } from "./categories.helpers";
import {
  CATEGORIES_COPY,
  OTHER_TEXTS,
  PLACES_SHOWN,
} from "./categories.constants";
import type { CategoryDetail, PlacesView } from "./categories.types";
import { categoryMovements } from "./category-detail.helpers";

const COPY = CATEGORIES_COPY.places;

// "también PAGO QR APP DOMICIL": up to two other ways the bank wrote it,
// then how many more.
const alsoOf = (others: readonly string[]): string[] => {
  if (others.length === 0) return [];
  const named = others.slice(0, OTHER_TEXTS);
  const unnamed = others.length - named.length;
  const said = unnamed === 0 ? named : [...named, `${unnamed} ${COPY.more}`];
  return [`${COPY.also} ${joined(said)}`];
};

// "22 movimientos · COMPRA EN APP DOMICILIOS · también PAGO QR APP
// DOMICIL": how many, the way the bank wrote it most, and the others.
const noteOf = ({ total, bankTexts }: Place): string => {
  const [main, ...others] = bankTexts;
  return [
    countText(total.count, CATEGORIES_COPY.spending.movements),
    ...(main === undefined ? [] : [main]),
    ...alsoOf(others),
  ].join(" · ");
};

// "Y 3 lugares más: $45 mil."
const moreOf = (places: readonly Place[]): string => {
  const total = sumAmounts(places.map(({ total }) => total.amountMinor));
  return `${COPY.andMore} ${countText(places.length, COPY.rest)}: ${compactSize(total)}.`;
};

/**
 * "Dónde más" (docs/ui/v8-06): where the category's money went, however
 * the bank wrote each place, the most first with its bar against the most,
 * how many movements and the ways the bank wrote it; and how many more
 * places there are. Nothing without the category's movements.
 */
export const placesView = (
  detail: Pick<CategoryDetail, "categoryId" | "movements">,
): PlacesView | null => {
  const places = placesOf(categoryMovements(detail));
  const shown = places.slice(0, PLACES_SHOWN);
  if (shown.length === 0) return null;
  const most = Math.abs(shown[0]?.total.amountMinor ?? 0);
  const rest = places.slice(PLACES_SHOWN);
  return {
    rows: shown.map((place, index) => ({
      key: `${index}-${place.title}`,
      title:
        place.title === NO_DESCRIPTION
          ? CATEGORIES_COPY.latest.noDescription
          : place.title,
      amount: boxAmount(place.total.amountMinor),
      barPercent: barOf(place.total.amountMinor, most),
      note: noteOf(place),
    })),
    ...(rest.length > 0 ? { more: moreOf(rest) } : {}),
  };
};
