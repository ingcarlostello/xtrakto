import { SITE_URL } from "@/lib/site";
import { EMAIL_STYLE as STYLE } from "./notices.constants";

/** A part of a notice's email: what it says, and where it leads. */
export type EmailSection = {
  readonly title: string;
  readonly lines: readonly string[];
  readonly action: string;
  readonly url: string;
};

/** A notice's email: its parts, why it arrived and its way out. */
export type NoticeEmailParts = {
  /** The first leads the subject and the pill. */
  readonly sections: readonly [EmailSection, ...EmailSection[]];
  readonly footer: string;
  readonly unsubscribe: string;
  readonly unsubscribeUrl: string;
};

const LOGO_URL = `${SITE_URL}/brand/png/xtrakto-logo-horizontal.png`;

/** A page's address, from an email. */
export const appUrlOf = ({
  pathname,
  query,
}: {
  readonly pathname: string;
  readonly query: Record<string, string>;
}): string => `${SITE_URL}${pathname}?${new URLSearchParams(query)}`;

const paragraph = (line: string): string =>
  `<p style="margin:0 0 12px;font-size:16px;line-height:24px;color:${STYLE.inkSecondary}">${line}</p>`;

// The email's main part: what it's about, with the one pill.
const leadHtml = ({ title, lines, action, url }: EmailSection): string => `
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:600;color:${STYLE.ink}">${title}</h1>
${lines.map(paragraph).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr><td style="background:${STYLE.primary};border-radius:999px">
<a href="${url}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none">${action}</a>
</td></tr></table>`;

// What else it says, under a line, each with its link.
const restHtml = ({ title, lines, action, url }: EmailSection): string => `
<div style="margin-top:24px;padding-top:24px;border-top:1px solid ${STYLE.divider}">
<h2 style="margin:0 0 8px;font-size:18px;line-height:26px;font-weight:600;color:${STYLE.ink}">${title}</h2>
${lines.map(paragraph).join("\n")}
<a href="${url}" style="font-size:16px;font-weight:700;color:${STYLE.primary}">${action}</a>
</div>`;

// Tables and inline styles: what every email client reads. Its texts are the
// app's constants and numbers, and its links are the server's own.
const htmlOf = ({
  sections: [lead, ...rest],
  footer,
  unsubscribe,
  unsubscribeUrl,
}: NoticeEmailParts): string => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${lead.title}</title></head>
<body style="margin:0;padding:0;background:${STYLE.background};font-family:${STYLE.font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLE.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 24px"><img src="${LOGO_URL}" width="160" alt="Xtrakto" style="display:block;width:160px;height:auto;border:0"></td></tr>
<tr><td style="background:${STYLE.surface};border-radius:16px;padding:32px">${leadHtml(lead)}${rest.map(restHtml).join("")}
</td></tr>
<tr><td style="padding:24px 8px 0;font-size:13px;line-height:20px;color:${STYLE.inkMuted}">${footer}<br><a href="${unsubscribeUrl}" style="color:${STYLE.inkMuted}">${unsubscribe}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;

const textOf = ({
  sections,
  footer,
  unsubscribe,
  unsubscribeUrl,
}: NoticeEmailParts): string =>
  [
    ...sections.flatMap(({ title, lines, action, url }) => [
      title,
      "",
      ...lines,
      "",
      `${action}: ${url}`,
      "",
    ]),
    footer,
    `${unsubscribe}: ${unsubscribeUrl}`,
  ].join("\n");

/** A notice's email, in HTML and in text. */
export const noticeEmail = (parts: NoticeEmailParts) => ({
  subject: parts.sections[0].title,
  html: htmlOf(parts),
  text: textOf(parts),
});
