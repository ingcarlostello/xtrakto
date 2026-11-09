import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import type { NoticeId } from "@xtrakto/db";
import { z } from "zod";
import { noticeIdSchema } from "./notices.schemas";

/** Whose notice a link turns off, and which. */
export type UnsubscribeTarget = {
  readonly userId: string;
  readonly notice: NoticeId;
};

// Its own key, drawn from the identifier hash key, so a link's signature
// can't stand for a reference's hash or the other way around (ADR 0036).
const KEY_PURPOSE = "xtrakto/unsubscribe/v1";
const KEY_BYTES = 32;

const signingKey = (secret: string): Buffer =>
  Buffer.from(hkdfSync("sha256", secret, "", KEY_PURPOSE, KEY_BYTES));

const signatureOf = (payload: string, secret: string): Buffer =>
  createHmac("sha256", signingKey(secret)).update(payload).digest();

const targetSchema = z.object({ userId: z.uuid(), notice: noticeIdSchema });

/** A link's token: which notice of whose, and the server's signature of it. */
export const unsubscribeToken = (
  { userId, notice }: UnsubscribeTarget,
  secret: string,
): string => {
  const payload = `${userId}.${notice}`;
  return `${payload}.${signatureOf(payload, secret).toString("base64url")}`;
};

/** What a token names, or `null` unless the server signed exactly that. */
export const readUnsubscribeToken = (
  token: string,
  secret: string,
): UnsubscribeTarget | null => {
  const [userId, notice, signature, ...rest] = token.split(".");
  if (!userId || !notice || !signature || rest.length > 0) return null;
  const expected = signatureOf(`${userId}.${notice}`, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;
  const target = targetSchema.safeParse({ userId, notice });
  return target.success ? target.data : null;
};
