import type { NoticeId } from "@xtrakto/db";
import { bannerTitle } from "@/features/review/review-display.helpers";
import { REVIEW_COPY } from "@/features/review/review.constants";
import type { PendingReview } from "@/features/review/review.types";
import { SITE_URL } from "@/lib/site";
import { countText, wordFor } from "@/utils/count-text.utils";
import { type EmailSection, noticeEmail } from "./notice-email.helpers";
import { UPLOAD_EMAIL_COPY as COPY } from "./notices.constants";

/** What an upload's files add up to: counts only (10.4a). */
export type UploadEmailFigures = {
  readonly files: number;
  readonly failed: number;
  readonly added: number;
};

/** What an upload's email says, each part only when its notice is on. */
export type UploadEmailContent = {
  readonly files?: UploadEmailFigures;
  /** What waits for the review, and the way to that quarter's (10.4b). */
  readonly review?: { readonly pending: PendingReview; readonly url: string };
  /** How many fixed payments the upload made rise, and where they show. */
  readonly risen?: { readonly count: number; readonly url: string };
};

const RESULT_URL = `${SITE_URL}/upload`;

const titleOfFiles = ({ files, failed }: UploadEmailFigures): string =>
  wordFor(files, failed === files ? COPY.subject.unread : COPY.subject.ready);

// "Leímos tu archivo y guardamos 7 movimientos nuevos.", or that the person
// had them all; with several files, how many it read.
const readLine = ({ files, failed, added }: UploadEmailFigures): string => {
  const read =
    files === 1
      ? `${COPY.read} ${COPY.yourFile}`
      : `${COPY.read} ${countText(files - failed, COPY.files)}`;
  return added === 0
    ? `${read}. ${COPY.hadThem}`
    : `${read} ${COPY.saved} ${countText(added, COPY.movements)}.`;
};

const linesOfFiles = (figures: UploadEmailFigures): string[] => {
  const { files, failed } = figures;
  if (failed === files) return [COPY.whatHappened];
  return [
    readLine(figures),
    ...(failed === 0
      ? []
      : [`${countText(failed, COPY.files)} ${wordFor(failed, COPY.failed)}`]),
  ];
};

const sectionsOf = ({
  files,
  review,
  risen,
}: UploadEmailContent): EmailSection[] => [
  ...(files
    ? [
        {
          title: titleOfFiles(files),
          lines: linesOfFiles(files),
          action: COPY.action,
          url: RESULT_URL,
        },
      ]
    : []),
  ...(review
    ? [
        {
          title: bannerTitle(review.pending),
          lines: [REVIEW_COPY.bannerText],
          action: REVIEW_COPY.bannerAction,
          url: review.url,
        },
      ]
    : []),
  ...(risen
    ? [
        {
          title:
            risen.count === 1
              ? COPY.risen.title.one
              : `${risen.count} ${COPY.risen.title.other}`,
          lines: [wordFor(risen.count, COPY.risen.line)],
          action: COPY.risen.action,
          url: risen.url,
        },
      ]
    : []),
];

/** The notices an email with this content carries. */
export const noticesOf = ({
  files,
  review,
  risen,
}: UploadEmailContent): NoticeId[] => [
  ...(files ? (["uploadReady"] as const) : []),
  ...(review ? (["reviewWaiting"] as const) : []),
  ...(risen ? (["fixedPaymentRose"] as const) : []),
];

/**
 * The email that tells a person what their upload brought, one part for
 * each notice on. Throws without any: a bug, as `noticesOf` says so first.
 */
export const uploadNoticeEmail = (
  content: UploadEmailContent,
  unsubscribeUrl: string,
) => {
  const [lead, ...rest] = sectionsOf(content);
  if (lead === undefined)
    throw new RangeError("An email needs something to say.");
  return noticeEmail({
    sections: [lead, ...rest],
    footer: COPY.footer,
    unsubscribe: wordFor(rest.length + 1, COPY.unsubscribe),
    unsubscribeUrl,
  });
};
