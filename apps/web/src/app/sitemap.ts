import type { MetadataRoute } from "next";
import { PRIVACY_ROUTE, WAITLIST_ROUTES } from "@/lib/auth-routes";
import { SITE_URL } from "@/lib/site";

// The public pages worth indexing: the waitlist (16.0d) and the privacy page
// (7.5).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}${WAITLIST_ROUTES.join}` },
    { url: `${SITE_URL}${PRIVACY_ROUTE}` },
  ];
}
