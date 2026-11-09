import { type NextRequest, NextResponse } from "next/server";
import { turnNoticeOff } from "@/features/notices/notices.service";
import { UNSUBSCRIBE_ROUTES } from "@/lib/auth-routes";

// Mail providers send this body when a person presses their own unsubscribe
// button (RFC 8058); the confirmation page's form sends none.
const ONE_CLICK = "One-Click";

// There is no session: the link's signature is the check (ADR 0036), and the
// answer is the same whether or not it was good. Only a POST changes
// anything, because mail scanners open every link they find.
export async function POST(request: NextRequest): Promise<Response> {
  await turnNoticeOff(request.nextUrl.searchParams.get("token") ?? "");
  return (await request.text()).includes(ONE_CLICK)
    ? new Response(null, { status: 200 })
    : NextResponse.redirect(new URL(UNSUBSCRIBE_ROUTES.done, request.url), 303);
}
