import { eq } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import {
  NOTICE_DEFAULTS,
  type NoticeId,
  type NoticePreferences,
} from "./notice.constants";
import { noticePreferences } from "./notice.schemas";

/** Which notices the context user receives. */
export const readNoticePreferences = async ({
  tx,
  userId,
}: UserContext): Promise<NoticePreferences> => {
  const [row] = await tx
    .select({ uploadReady: noticePreferences.uploadReady })
    .from(noticePreferences)
    .where(eq(noticePreferences.userId, userId));
  return row ?? NOTICE_DEFAULTS;
};

/** Turns one of the context user's notices on or off. */
export const saveNoticePreference = async (
  { tx, userId }: UserContext,
  notice: NoticeId,
  isOn: boolean,
): Promise<void> => {
  await tx
    .insert(noticePreferences)
    .values({ userId, [notice]: isOn })
    .onConflictDoUpdate({
      target: noticePreferences.userId,
      set: { [notice]: isOn },
    });
};
