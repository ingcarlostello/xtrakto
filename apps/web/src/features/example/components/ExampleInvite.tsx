import { EXAMPLE_COPY as COPY } from "../example.constants";
import { ExploreExampleButton } from "./ExploreExampleButton";

/** Below the welcome's drop zone (docs/ui/v8-17): the example, for whoever doesn't have their files at hand. */
export function ExampleInvite() {
  return (
    <div className="flex flex-col items-start gap-0.5 border-t border-divider pt-4">
      <p className="text-body font-bold">{COPY.invite.title}</p>
      <p className="text-caption text-ink-muted">{COPY.invite.description}</p>
      <ExploreExampleButton label={COPY.open.welcome} variant="link" />
    </div>
  );
}
