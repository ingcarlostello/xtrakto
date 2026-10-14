import { StatusPill } from "@/components/status-pill/StatusPill";
import { usagePill } from "../upload-display.helpers";
import type { MonthlyUsage } from "../upload.types";

// Beside the page title, full width on phones (docs/ui/v8-07).
export function MonthlyUsagePill({ usage }: { usage: MonthlyUsage }) {
  return <StatusPill {...usagePill(usage)} className="w-full sm:w-auto" />;
}
