import { SITE_URL } from "@/lib/site";
import { countText, wordFor } from "@/utils/count-text.utils";
import {
  EMAIL_STYLE as STYLE,
  UPLOAD_EMAIL_COPY as COPY,
} from "./notices.constants";

/** What an upload's email says: counts only (10.4a). */
export type UploadEmailFigures = {
  readonly files: number;
  readonly failed: number;
  readonly added: number;
};

const LOGO_URL = `${SITE_URL}/brand/png/xtrakto-logo-horizontal.png`;
const RESULT_URL = `${SITE_URL}/upload`;

const subjectOf = ({ files, failed }: UploadEmailFigures): string =>
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

const linesOf = (figures: UploadEmailFigures): string[] => {
  const { files, failed } = figures;
  if (failed === files) return [COPY.whatHappened];
  return [
    readLine(figures),
    ...(failed === 0
      ? []
      : [`${countText(failed, COPY.files)} ${wordFor(failed, COPY.failed)}`]),
  ];
};

const paragraph = (line: string): string =>
  `<p style="margin:0 0 12px;font-size:16px;line-height:24px;color:${STYLE.inkSecondary}">${line}</p>`;

// Tables and inline styles: what every email client reads. Its texts are the
// constants above and numbers, and its links are the server's own.
const htmlOf = (
  title: string,
  lines: readonly string[],
  unsubscribeUrl: string,
): string => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${STYLE.background};font-family:${STYLE.font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLE.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 24px"><img src="${LOGO_URL}" width="160" alt="Xtrakto" style="display:block;width:160px;height:auto;border:0"></td></tr>
<tr><td style="background:${STYLE.surface};border-radius:16px;padding:32px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:600;color:${STYLE.ink}">${title}</h1>
${lines.map(paragraph).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr><td style="background:${STYLE.primary};border-radius:999px">
<a href="${RESULT_URL}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">${COPY.action}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 8px 0;font-size:13px;line-height:20px;color:${STYLE.inkMuted}">${COPY.footer}<br><a href="${unsubscribeUrl}" style="color:${STYLE.inkMuted}">${COPY.unsubscribe}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;

const textOf = (
  title: string,
  lines: readonly string[],
  unsubscribeUrl: string,
): string =>
  [
    title,
    "",
    ...lines,
    "",
    `${COPY.action}: ${RESULT_URL}`,
    "",
    COPY.footer,
    `${COPY.unsubscribe}: ${unsubscribeUrl}`,
  ].join("\n");

/** The email that tells a person their upload's files ended. */
export const uploadNoticeEmail = (
  figures: UploadEmailFigures,
  unsubscribeUrl: string,
) => {
  const subject = subjectOf(figures);
  const lines = linesOf(figures);
  return {
    subject,
    html: htmlOf(subject, lines, unsubscribeUrl),
    text: textOf(subject, lines, unsubscribeUrl),
  };
};
