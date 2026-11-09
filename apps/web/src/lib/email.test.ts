import { beforeEach, describe, expect, it, vi } from "vitest";
import { type EmailMessage, sendEmail } from "./email";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getServerEnv: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("./env", () => ({ getServerEnv: mocks.getServerEnv }));

const MESSAGE: EmailMessage = {
  to: "ana.prueba@correo.test",
  subject: "Tu archivo está listo",
  html: "<p>Listo</p>",
  text: "Listo",
  oneClickUrl: "https://xtrakto.site/api/unsubscribe?token=abc",
  idempotencyKey: "upload-notice/job-1",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getServerEnv.mockReturnValue({ RESEND_API_KEY: "re_invented" });
  mocks.send.mockResolvedValue({ data: { id: "1" }, error: null });
});

describe("sendEmail", () => {
  it("sends from the notices' address, with its way out and its idempotency key", async () => {
    await expect(sendEmail(MESSAGE)).resolves.toEqual({
      ok: true,
      value: undefined,
    });

    expect(mocks.send).toHaveBeenCalledWith(
      {
        from: "Xtrakto <avisos@mail.xtrakto.site>",
        to: MESSAGE.to,
        replyTo: "hola@xtrakto.site",
        subject: MESSAGE.subject,
        html: MESSAGE.html,
        text: MESSAGE.text,
        headers: {
          "List-Unsubscribe": `<${MESSAGE.oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      { idempotencyKey: MESSAGE.idempotencyKey },
    );
  });

  it("sends nothing without its key", async () => {
    mocks.getServerEnv.mockReturnValue({});

    await expect(sendEmail(MESSAGE)).resolves.toEqual({
      ok: false,
      error: { code: "EMAIL_OFF" },
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(["a+clerk_test@example.com", "a@mail.example.org", "A@EXAMPLE.NET"])(
    "sends nothing to the reserved address %s",
    async (to) => {
      await expect(sendEmail({ ...MESSAGE, to })).resolves.toEqual({
        ok: false,
        error: { code: "EMAIL_UNDELIVERABLE" },
      });
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["rate_limit_exceeded", true],
    ["internal_server_error", true],
    ["validation_error", false],
    ["daily_quota_exceeded", false],
  ])("reports %s by its name, never its message", async (name, isTransient) => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { name, statusCode: 400, message: `refused ${MESSAGE.to}` },
    });

    const result = await sendEmail(MESSAGE);

    expect(result).toEqual({
      ok: false,
      error: { code: "EMAIL_FAILED", reason: name, isTransient },
    });
    expect(JSON.stringify(result)).not.toContain(MESSAGE.to);
  });
});
