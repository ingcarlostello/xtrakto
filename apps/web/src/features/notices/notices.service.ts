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
import { uploadNoticeEmail } from "./upload-notice-email.helpers";

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
 * Turns off the notice a link names, for the person it names: without a
 * session, so only the link's signature counts (ADR 0036). A link the server
 * didn't sign, or of someone already gone, changes nothing.
 */
export const turnNoticeOff = (token: string): Promise<void> =>
  withSanitizedErrors("NOTICE_NOT_TURNED_OFF", async () => {
    const target = readUnsubscribeToken(
      token,
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    if (!target) return;
    await withUserContext(getDb(), toUserId(target.userId), async (ctx) => {
      if (await findClerkUserId(ctx))
        await saveNoticePreference(ctx, target.notice, false);
    });
  });

/**
 * Takes the user's ended files, once, for the notice of their upload: `null`
 * when a file is still open, nothing waits, or they turned the notice off.
 * Ids and counts only, since Inngest keeps a step's output.
 */
export const claimUploadNotice = (
  userId: string,
): Promise<FinishedFiles | null> =>
  withSanitizedErrors("UPLOAD_NOTICE_NOT_CLAIMED", () =>
    withUserContext(getDb(), toUserId(userId), async (ctx) => {
      const finished = await claimFinishedFiles(ctx);
      if (!finished) return null;
      const { uploadReady } = await readNoticePreferences(ctx);
      return uploadReady ? finished : null;
    }),
  );

/** How sending a notice ended, in codes only. */
export type NoticeOutcome =
  | { readonly status: "sent" }
  | { readonly status: "not-sent"; readonly code: string };

// The address comes from Clerk when an email goes, outside the database's
// transaction, and is never kept or returned.
const addressOf = async (clerkUserId: string): Promise<string | undefined> => {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkUserId);
  return user.primaryEmailAddress?.emailAddress;
};

const urlOf = (route: string, token: string): string =>
  `${SITE_URL}${route}?token=${token}`;

const outcomeOf = (error: EmailError): NoticeOutcome => {
  // Thrown for Inngest to try again; the code names only what failed.
  if (error.code === "EMAIL_FAILED" && error.isTransient)
    throw new Error(`${error.code}: ${error.reason}`);
  return {
    status: "not-sent",
    code: error.code === "EMAIL_FAILED" ? error.reason : error.code,
  };
};

/**
 * Emails a person that their upload's files ended. A failure that may pass
 * is thrown for Inngest to retry; Resend's idempotency key, the claimed
 * job's, keeps a retry from sending it twice.
 */
export const sendUploadNotice = (
  userId: string,
  { jobId, files, failed, added }: FinishedFiles,
): Promise<NoticeOutcome> =>
  withSanitizedErrors("UPLOAD_NOTICE_NOT_SENT", async () => {
    const clerkUserId = await withUserContext(
      getDb(),
      toUserId(userId),
      findClerkUserId,
    );
    const address = clerkUserId && (await addressOf(clerkUserId));
    if (!address) return { status: "not-sent", code: "NO_ADDRESS" };
    const token = unsubscribeToken(
      { userId, notice: "uploadReady" },
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    const sent = await sendEmail({
      to: address,
      ...uploadNoticeEmail(
        { files, failed, added },
        urlOf(UNSUBSCRIBE_ROUTES.confirm, token),
      ),
      oneClickUrl: urlOf(UNSUBSCRIBE_ROUTES.oneClick, token),
      idempotencyKey: `upload-notice/${jobId}`,
    });
    return sent.ok ? { status: "sent" } : outcomeOf(sent.error);
  });
