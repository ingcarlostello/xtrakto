import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  AUTH_ROUTES,
  isPublicPath,
  isWaitlistPath,
  WAITLIST_ROUTES,
} from "@/lib/auth-routes";
import { isWaitlistOnly } from "@/lib/site";

// Clerk's middleware must run on every request for auth() to work. The early
// redirect only spares signed-out visitors a page render: server actions are
// called by id, not by path, so every page, action and route handler checks
// the session itself (lib/auth.ts).
const clerkProxy = clerkMiddleware(
  async (auth, request) => {
    if (isPublicPath(request.nextUrl.pathname)) return;
    const { isAuthenticated, redirectToSignIn } = await auth();
    if (!isAuthenticated) return redirectToSignIn();
  },
  { signInUrl: AUTH_ROUTES.signIn, signUpUrl: AUTH_ROUTES.signUp },
);

// A waitlist-only deployment (16.0d, ADR 0022) has no Clerk: every path but
// the waitlist's goes to it, the app's home and its API included. A server
// action posted to the waitlist from another page still fails, on its own
// session check.
const waitlistOnlyProxy = (request: NextRequest): NextResponse =>
  isWaitlistPath(request.nextUrl.pathname)
    ? NextResponse.next()
    : NextResponse.redirect(new URL(WAITLIST_ROUTES.join, request.url));

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return isWaitlistOnly()
    ? waitlistOnlyProxy(request)
    : clerkProxy(request, event);
}

// Clerk's recommended matcher: every route except Next.js internals and
// static files, plus API routes and Clerk's own endpoints. MP4 joins the
// static files, so the waitlist's video plays without a session (16.0c), and
// so do robots.txt and the sitemap (16.0d).
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|txt|xml)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
