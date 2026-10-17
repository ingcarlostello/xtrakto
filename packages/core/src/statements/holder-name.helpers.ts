import { foldText } from "../text/text.utils";

/**
 * The account holder's name as it's stored and compared with the bank's
 * descriptions, which write it in upper or mixed case, with or without
 * accents: `"Ana  Pérez Muñoz"` becomes `"ANA PEREZ MUNOZ"`.
 */
export const normalizeHolderName = (name: string): string => foldText(name);
