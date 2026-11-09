import type { NoticeId } from "@xtrakto/db";
import { bannerTitle } from "@/features/review/review-display.helpers";
import { REVIEW_COPY } from "@/features/review/review.constants";
import type { PendingReview } from "@/features/review/review.types";
import { SITE_URL } from "@/lib/site";
import { countText, wordFor } from "@/utils/count-text.utils";
import {
  EMAIL_STYLE as STYLE,
  UPLOAD_EMAIL_COPY as COPY,
} from "./notices.constants";

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

type Section = {
  readonly title: string;
  readonly lines: readonly string[];
  readonly action: string;
  readonly url: string;
};

const LOGO_URL = `${SITE_URL}/brand/png/xtrakto-logo-horizontal.png`;
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
}: UploadEmailContent): Section[] => [
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

const paragraph = (line: string): string =>
  `<p style="margin:0 0 12px;font-size:16px;line-height:24px;color:${STYLE.inkSecondary}">${line}</p>`;

// The email's main part: what it's about, with the one pill.
const leadHtml = ({ title, lines, action, url }: Section): string => `
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:600;color:${STYLE.ink}">${title}</h1>
${lines.map(paragraph).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr><td style="background:${STYLE.primary};border-radius:999px">
<a href="${url}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">${action}</a>
</td></tr></table>`;

// What else it says, under a line, each with its link.
const restHtml = ({ title, lines, action, url }: Section): string => `
<div style="margin-top:24px;padding-top:24px;border-top:1px solid ${STYLE.divider}">
<h2 style="margin:0 0 8px;font-size:18px;line-height:26px;font-weight:600;color:${STYLE.ink}">${title}</h2>
${lines.map(paragraph).join("\n")}
<a href="${url}" style="font-size:16px;font-weight:700;color:${STYLE.primary}">${action}</a>
</div>`;

// Tables and inline styles: what every email client reads. Its texts are the
// constants above and numbers, and its links are the server's own.
const htmlOf = (
  [lead, ...rest]: readonly [Section, ...Section[]],
  unsubscribe: string,
  unsubscribeUrl: string,
): string => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${lead.title}</title></head>
<body style="margin:0;padding:0;background:${STYLE.background};font-family:${STYLE.font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLE.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 24px"><img src="${LOGO_URL}" width="160" alt="Xtrakto" style="display:block;width:160px;height:auto;border:0"></td></tr>
<tr><td style="background:${STYLE.surface};border-radius:16px;padding:32px">${leadHtml(lead)}${rest.map(restHtml).join("")}
</td></tr>
<tr><td style="padding:24px 8px 0;font-size:13px;line-height:20px;color:${STYLE.inkMuted}">${COPY.footer}<br><a href="${unsubscribeUrl}" style="color:${STYLE.inkMuted}">${unsubscribe}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;

const textOf = (
  sections: readonly Section[],
  unsubscribe: string,
  unsubscribeUrl: string,
): string =>
  [
    ...sections.flatMap(({ title, lines, action, url }) => [
      title,
      "",
      ...lines,
      "",
      `${action}: ${url}`,
      "",
    ]),
    COPY.footer,
    `${unsubscribe}: ${unsubscribeUrl}`,
  ].join("\n");

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
  const sections: [Section, ...Section[]] = [lead, ...rest];
  const unsubscribe = wordFor(sections.length, COPY.unsubscribe);
  return {
    subject: lead.title,
    html: htmlOf(sections, unsubscribe, unsubscribeUrl),
    text: textOf(sections, unsubscribe, unsubscribeUrl),
  };
};
