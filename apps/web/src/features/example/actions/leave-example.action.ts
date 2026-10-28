"use server";

import { redirect } from "next/navigation";
import { endExample } from "@/lib/example-mode";

/** Back to the user's own data, from the summary. */
export async function leaveExample(): Promise<void> {
  await endExample();
  redirect("/");
}
