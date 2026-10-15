import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Every path may be crawled: the app's pages send a visitor without a session
// to sign in (or, in a waitlist-only deployment, to the waitlist), and the
// "joined" page asks not to be indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
