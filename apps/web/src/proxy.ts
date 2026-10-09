import { clerkMiddleware } from "@clerk/nextjs/server";
import { AUTH_ROUTES, isPublicPath } from "@/lib/auth-routes";

// Clerk's middleware must run on every request for auth() to work. The early
// redirect only spares signed-out visitors a page render: server actions are
// called by id, not by path, so every page, action and route handler checks
// the session itself (lib/auth.ts).
export default clerkMiddleware(
  async (auth, request) => {
    if (isPublicPath(request.nextUrl.pathname)) return;
    const { isAuthenticated, redirectToSignIn } = await auth();
    if (!isAuthenticated) return redirectToSignIn();
  },
  { signInUrl: AUTH_ROUTES.signIn, signUpUrl: AUTH_ROUTES.signUp },
);

// Clerk's recommended matcher: every route except Next.js internals and
// static files, plus API routes and Clerk's own endpoints.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
