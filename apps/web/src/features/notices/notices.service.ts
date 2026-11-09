import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import {
  claimFinishedFiles,
  type FinishedFiles,
  findClerkUserId,
  findOrCreateUser,
  findUserId,
  NOTICE_DEFAULTS,
  type NoticeId,
  type NoticePreferences,
  readNoticePreferences,
  saveNoticePreference,
  toUserId,
  withUserContext,
} from "@xtrakto/db";
import { UNSUBSCRIBE_ROUTES } from "@/lib/auth-routes";
import { getDb } from "@/lib/db";
import { type EmailError, sendEmail } from "@/lib/email";
import { getServerEnv } from "@/lib/env";
import { SITE_URL } from "@/lib/site";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import {
  readUnsubscribeToken,
  unsubscribeToken,
} from "./unsubscribe-token.helpers";
import { readUploadNoticeContent } from "./upload-notice-content.service";
import { noticesOf, uploadNoticeEmail } from "./upload-notice-email.helpers";

/**
 * Which notices a Clerk user receives. Someone who never uploaded a file has
 * no row and the defaults; reading never creates one. The Clerk id must come
 * from the session.
 */
export const getNoticePreferences = async (
  clerkUserId: string,
): Promise<NoticePreferences> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  return userId
    ? withUserContext(db, userId, readNoticePreferences)
    : NOTICE_DEFAULTS;
};

/** Turns one of a Clerk user's notices on or off, from their session. */
export const setNoticePreference = async (
  clerkUserId: string,
  notice: NoticeId,
  isOn: boolean,
): Promise<void> => {
  const db = getDb();
  const userId = await findOrCreateUser(db, clerkUserId);
  await withUserContext(db, userId, (ctx) =>
    saveNoticePreference(ctx, notice, isOn),
  );
};

/**
 * Turns off the notices a link names, for the person it names: without a
 * session, so only the link's signature counts (ADR 0036). A link the server
 * didn't sign, or of someone already gone, changes nothing. One after the
 * other: they share the transaction.
 */
export const turnNoticeOff = (token: string): Promise<void> =>
  withSanitizedErrors("NOTICE_NOT_TURNED_OFF", async () => {
    const target = readUnsubscribeToken(
      token,
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    if (!target) return;
    await withUserContext(getDb(), toUserId(target.userId), async (ctx) => {
      if (!(await findClerkUserId(ctx))) return;
      for (const notice of target.notices)
        await saveNoticePreference(ctx, notice, false);
    });
  });

/**
 * Takes the user's ended files, once, for the notice of their upload: `null`
 * when a file is still open or nothing waits. Ids and counts only, since
 * Inngest keeps a step's output.
 */
export const claimUploadNotice = (
  userId: string,
): Promise<FinishedFiles | null> =>
  withSanitizedErrors("UPLOAD_NOTICE_NOT_CLAIMED", () =>
    withUserContext(
      getDb(),
      toUserId(userId),
      async (ctx) => (await claimFinishedFiles(ctx)) ?? null,
    ),
  );

/** How sending a notice ended, in codes only. */
export type NoticeOutcome =
  | { readonly status: "sent" }
  | { readonly status: "not-sent"; readonly code: string };

// The address comes from Clerk when an email goes, outside the database's
// transaction, and is never kept or returned.
export const addressOf = async (
  clerkUserId: string,
): Promise<string | undefined> => {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkUserId);
  return user.primaryEmailAddress?.emailAddress;
};

export const urlOf = (route: string, token: string): string =>
  `${SITE_URL}${route}?token=${token}`;

export const outcomeOf = (error: EmailError): NoticeOutcome => {
  // Thrown for Inngest to try again; the code names only what failed.
  if (error.code === "EMAIL_FAILED" && error.isTransient)
    throw new Error(`${error.code}: ${error.reason}`);
  return {
    status: "not-sent",
    code: error.code === "EMAIL_FAILED" ? error.reason : error.code,
  };
};

/**
 * Emails a person what their upload brought, each part only with its notice
 * on, and nothing with none to tell. A failure that may pass is thrown for
 * Inngest to retry; Resend's idempotency key, the claimed job's, keeps a
 * retry from sending it twice.
 */
export const sendUploadNotice = (
  userId: string,
  finished: FinishedFiles,
): Promise<NoticeOutcome> =>
  withSanitizedErrors("UPLOAD_NOTICE_NOT_SENT", async () => {
    const { clerkUserId, content } = await withUserContext(
      getDb(),
      toUserId(userId),
      async (ctx) => ({
        clerkUserId: await findClerkUserId(ctx),
        content: await readUploadNoticeContent(ctx, finished),
      }),
    );
    const notices = noticesOf(content);
    if (notices.length === 0)
      return { status: "not-sent", code: "NOTHING_TO_SAY" };
    const address = clerkUserId && (await addressOf(clerkUserId));
    if (!address) return { status: "not-sent", code: "NO_ADDRESS" };
    const token = unsubscribeToken(
      { userId, notices },
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    const email = uploadNoticeEmail(
      content,
      urlOf(UNSUBSCRIBE_ROUTES.confirm, token),
    );
    const sent = await sendEmail({
      to: address,
      ...email,
      oneClickUrl: urlOf(UNSUBSCRIBE_ROUTES.oneClick, token),
      idempotencyKey: `upload-notice/${finished.jobId}`,
    });
    return sent.ok ? { status: "sent" } : outcomeOf(sent.error);
  });
