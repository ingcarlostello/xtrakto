import type { MetadataRoute } from "next";
import { WAITLIST_ROUTES } from "@/lib/auth-routes";
import { SITE_URL } from "@/lib/site";

// The one public page worth indexing: the waitlist (16.0d).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}${WAITLIST_ROUTES.join}` }];
}
