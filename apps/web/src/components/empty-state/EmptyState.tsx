import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { StatementIllustration } from "./StatementIllustration";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

// What a page shows before there is data: what will appear here, and the one
// step that brings it (design-system.md §1: every screen explains itself).
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card
      variant="panel"
      className="items-center gap-5 px-6 py-10 text-center sm:py-12"
    >
      <StatementIllustration className="w-24 sm:w-28" />
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-section font-bold text-balance">{title}</h2>
        <p className="text-body text-pretty text-ink-secondary">
          {description}
        </p>
      </div>
      {action}
    </Card>
  );
}
