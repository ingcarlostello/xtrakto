/**
 * The email notices a user can turn on and off, each with what it starts as
 * (docs/ui/v8-11): a user without a row has these.
 */
export const NOTICE_DEFAULTS = { uploadReady: true } as const;

/** One of the email notices. */
export type NoticeId = keyof typeof NOTICE_DEFAULTS;

/** Which notices a user receives. */
export type NoticePreferences = Readonly<Record<NoticeId, boolean>>;
