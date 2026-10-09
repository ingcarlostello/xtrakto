import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import "./globals.css";

// Display, amounts and the wordmark (design-system.md §4).
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

// Interface and body text.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
