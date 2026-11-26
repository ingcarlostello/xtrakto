import {
  DOWNLOAD_COPY as COPY,
  FIRST_BANK,
  FIRST_FILE,
} from "./onboarding.constants";
import type { FirstBank, FirstFile } from "./onboarding.schemas";

/** The guides the last step can show, one per file and bank. */
export const GUIDE = {
  QUARTERLY: "quarterly",
  MOVEMENTS: "movements",
  CARD: "card",
  NU_CARD: "nuCard",
  OTHER_BANK: "otherBank",
} as const;

export type GuideKey = (typeof GUIDE)[keyof typeof GUIDE];

/** What the last step says, and its guides in order. */
export type DownloadContent = {
  readonly title: string;
  readonly subtitle: string;
  readonly guides: readonly GuideKey[];
};

// Bancolombia's files, the one chosen first on top; a card's beside its
// savings account's (12.3b).
const BANCOLOMBIA_GUIDES: Readonly<Record<FirstFile, readonly GuideKey[]>> = {
  [FIRST_FILE.QUARTERLY]: [GUIDE.QUARTERLY, GUIDE.MOVEMENTS],
  [FIRST_FILE.MOVEMENTS]: [GUIDE.MOVEMENTS, GUIDE.QUARTERLY],
  [FIRST_FILE.CARD]: [GUIDE.CARD, GUIDE.QUARTERLY, GUIDE.MOVEMENTS],
};

/**
 * What the last step shows for the file and the bank chosen: Bancolombia's
 * files; Nu's card (12.3b); or another bank's savings account, read through
 * the columns the person confirms (11.3c), which a Nu savings account is
 * too, and which another bank's card isn't yet.
 */
export const downloadContentOf = (
  first: FirstFile,
  bank: FirstBank,
): DownloadContent => {
  const isCard = first === FIRST_FILE.CARD;
  if (bank === FIRST_BANK.BANCOLOMBIA)
    return {
      title: COPY.title,
      subtitle: COPY.subtitle[first],
      guides: BANCOLOMBIA_GUIDES[first],
    };
  if (bank === FIRST_BANK.NU && isCard)
    return {
      title: COPY.nu.title,
      subtitle: COPY.nu.subtitle,
      guides: [GUIDE.NU_CARD],
    };
  return {
    title: COPY.otherBank.title,
    subtitle: isCard ? COPY.otherCardSubtitle : COPY.otherBank.subtitle,
    guides: [GUIDE.OTHER_BANK],
  };
};
