import "server-only";
import { err, ok, type Result } from "@xtrakto/core";
import { Resend } from "resend";
import { getServerEnv } from "./env";
import { CONTACT_EMAIL } from "./site";

// The only module that sends email (ADR 0035), as lib/ai.ts is for the LLM.

const FROM = "Xtrakto <avisos@mail.xtrakto.site>";

// These domains are reserved and receive nothing, and the test users are on
// them: a bounce would cost a young domain its reputation.
const RESERVED_ADDRESS = /@(?:[^@]+\.)?example\.(?:com|net|org)$/i;

// What may work on another try. Anything else (an address or a key Resend
// refuses, a quota used up) would fail the same way.
const TRANSIENT_ERRORS = new Set([
  "application_error",
  "concurrent_idempotent_requests",
  "internal_server_error",
  "rate_limit_exceeded",
]);

/** An email to one person, always with its way out. */
export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  /** Resend's one-click unsubscribe target (RFC 8058): takes a POST. */
  readonly oneClickUrl: string;
  /** The same key on a retry sends nothing new, for a day. */
  readonly idempotencyKey: string;
};

/**
 * Why an email didn't go, as codes only: Resend's messages can quote the
 * address, and Inngest, logs and Sentry keep what reaches them (ADR 0019).
 */
export type EmailError =
  /** Without RESEND_API_KEY, as in CI: nothing leaves. */
  | { readonly code: "EMAIL_OFF" }
  /** An address on a reserved domain: nothing leaves. */
  | { readonly code: "EMAIL_UNDELIVERABLE" }
  | {
      readonly code: "EMAIL_FAILED";
      /** Resend's name for the failure, one of a fixed list. */
      readonly reason: string;
      readonly isTransient: boolean;
    };

/**
 * Sends an email through Resend. Every failure comes back as a value without
 * content, so a caller decides whether to retry.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  oneClickUrl,
  idempotencyKey,
}: EmailMessage): Promise<Result<void, EmailError>> => {
  const apiKey = getServerEnv().RESEND_API_KEY;
  if (apiKey === undefined) return err({ code: "EMAIL_OFF" });
  if (RESERVED_ADDRESS.test(to)) return err({ code: "EMAIL_UNDELIVERABLE" });
  const { error } = await new Resend(apiKey).emails.send(
    {
      from: FROM,
      to,
      replyTo: CONTACT_EMAIL,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    { idempotencyKey },
  );
  if (!error) return ok(undefined);
  return err({
    code: "EMAIL_FAILED",
    reason: error.name,
    isTransient: TRANSIENT_ERRORS.has(error.name),
  });
};
