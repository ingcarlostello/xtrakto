import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaveExample } from "../actions/leave-example.action";
import { EXAMPLE_COPY } from "../example.constants";

const COPY = EXAMPLE_COPY.banner;
const TITLE_ID = "example-banner-title";

/**
 * On each page that shows the example while the browser explores it (7.8):
 * what it is, that nothing saves, and the way back to the user's own data.
 */
export function ExampleBanner() {
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="flex flex-col gap-4 rounded-lg bg-primary-soft-2 p-5 sm:flex-row sm:items-center"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary-strong shadow-chip"
      >
        <Eye strokeWidth={1.9} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={TITLE_ID} className="text-body font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-secondary">{COPY.description}</p>
      </div>
      <form action={leaveExample}>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          {COPY.leave}
        </Button>
      </form>
    </section>
  );
}
