import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { deleteUserData } from "@/features/users/user.service";
import { getServerEnv } from "@/lib/env";

// Clerk calls this endpoint when a user is deleted in Clerk (its dashboard or
// API). There is no session: the signature is the check, so nothing is read
// before it's verified. The endpoint is registered in Clerk in Phase 7.2.
export async function POST(request: NextRequest): Promise<Response> {
  const signingSecret = getServerEnv().CLERK_WEBHOOK_SIGNING_SECRET;
  // Not configured (development): Clerk will retry once it is.
  if (!signingSecret) return new Response(null, { status: 503 });
  const event = await verifyWebhook(request, { signingSecret }).catch(
    () => null,
  );
  if (!event) return new Response(null, { status: 400 });
  if (event.type === "user.deleted" && event.data.id)
    await deleteUserData(event.data.id);
  return new Response(null, { status: 204 });
}
