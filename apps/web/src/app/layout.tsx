import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk";
import "./globals.css";

// Google Fonts' variable files, Latin subset, kept in the repository: with
// next/font/google every build downloads them, and Google's answer can break
// it (src/fonts/README.md).

// Display, amounts and the wordmark (design-system.md §4).
const outfit = localFont({
  src: "../fonts/outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit",
});

// Interface and body text.
const manrope = localFont({
  src: "../fonts/manrope-latin.woff2",
  weight: "200 800",
  variable: "--font-manrope",
});

// From docs/brand.md §8. The icons and the social image are files in this
// folder, which Next.js picks up on its own.
export const metadata: Metadata = {
  metadataBase: new URL("https://xtrakto.site"),
  title: { default: "Xtrakto", template: "%s · Xtrakto" },
  description:
    "Entiende tu extracto bancario: en qué gastaste, qué solo moviste y cuánto entró.",
  applicationName: "Xtrakto",
};

export const viewport: Viewport = {
  themeColor: "#EEF2F7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // No fixed height on <html>: the page background is painted at its size,
    // so a fixed height would repeat the gradient once per screen.
    <html
      lang="es"
      className={`${outfit.variable} ${manrope.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        {/* Inside <body>, as Clerk Core 3 requires. */}
        <ClerkProvider
          appearance={clerkAppearance}
          localization={clerkLocalization}
          signInUrl={AUTH_ROUTES.signIn}
          signUpUrl={AUTH_ROUTES.signUp}
          afterSignOutUrl={AUTH_ROUTES.signIn}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
