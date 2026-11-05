import type { UserFiles } from "@xtrakto/db";
import { countText, wordFor } from "@/utils/count-text.utils";
import { YOUR_DATA_COPY as COPY } from "./user.constants";

/**
 * The files the user keeps, by kind (docs/ui/v8-11): "9 archivos: 3
 * trimestrales y 6 de movimientos.", "2 archivos trimestrales.", or that
 * there are none.
 */
export const filesText = ({ quarterly, movements }: UserFiles): string => {
  const total = quarterly + movements;
  if (total === 0) return COPY.none;
  const files = countText(total, COPY.files);
  if (movements === 0) return `${files} ${wordFor(quarterly, COPY.quarterly)}.`;
  if (quarterly === 0) return `${files} ${COPY.movements}.`;
  return `${files}: ${countText(quarterly, COPY.quarterly)} ${COPY.and} ${movements} ${COPY.movements}.`;
};
