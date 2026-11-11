import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole } from "@xtrakto/core";
import type { ReviewRow } from "@xtrakto/parsers";
import { Check, EyeOff, FileSpreadsheet } from "lucide-react";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import {
  CONFIRMATION_COPY as COPY,
  ROLE_LABELS,
} from "../format-confirmation.constants";
import {
  cellText,
  formatFacts,
  isAmountRole,
  rowsNote,
} from "../format-confirmation.helpers";
import type { MappingProposal } from "../format-mapping.types";

// A role the mapping reads has a check; an ignored column, a crossed eye.
function RoleChip({ role }: { role: ColumnRole }) {
  const isIgnored = role === COLUMN_ROLE.NONE;
  const Icon = isIgnored ? EyeOff : Check;
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
        isIgnored
          ? "bg-surface-muted text-ink-muted"
          : "bg-surface text-ink shadow-chip ring-1 ring-primary/40",
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-4", isIgnored ? "text-ink-muted" : "text-primary")}
      />
      {ROLE_LABELS[role]}
    </span>
  );
}

// A row that isn't a movement, such as the opening balance, is crossed out;
// screen readers hear why before its first cell.
function TableRow({
  row,
  columns,
}: {
  row: ReviewRow;
  columns: readonly ColumnRole[];
}) {
  const isMovement = row.kind === "movement";
  const why = row.isOpening ? COPY.columns.opening : COPY.columns.notMovement;
  return (
    <tr className="border-t border-divider">
      {row.cells.map((cell, column) => {
        const role = columns[column];
        return (
          <td
            key={column}
            className={cn(
              "px-3 py-3 text-sm whitespace-nowrap",
              isAmountRole(role) && "text-right tabular-nums",
              (!isMovement || role === COLUMN_ROLE.NONE) && "text-ink-muted",
              !isMovement && "line-through",
            )}
          >
            {!isMovement && column === 0 && (
              <span className="sr-only">{why} </span>
            )}
            {cellText(cell)}
          </td>
        );
      })}
    </tr>
  );
}

function FileFormat({ proposal }: { proposal: MappingProposal }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body font-bold">{COPY.format.title}</h3>
      <dl className="flex flex-wrap gap-2">
        {formatFacts(proposal).map(({ term, value }) => (
          <div
            key={term}
            className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm shadow-chip"
          >
            <dt className="font-semibold">{term}</dt>
            <dd className="text-ink-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type MappingColumnsProps = {
  /** Shown here only: a file's name never leaves the browser. */
  fileName: string;
  proposal: MappingProposal;
};

// The roles over the header's names, then the first rows: the table scrolls
// sideways on phones, inside its card.
function ColumnsTable({ proposal }: { proposal: MappingProposal }) {
  const { mapping, review } = proposal;
  return (
    <div className="-mx-6 overflow-x-auto px-6">
      <table className="w-full min-w-max text-left">
        <caption className="sr-only">{COPY.columns.caption}</caption>
        <thead>
          <tr>
            {mapping.columns.map((role, column) => (
              <th key={column} scope="col" className="px-1 pb-3">
                <RoleChip role={role} />
              </th>
            ))}
          </tr>
          <tr className="bg-surface-muted">
            {review.header.map((name, column) => (
              <th
                key={column}
                scope="col"
                className={cn(
                  "px-3 py-3 text-meta font-bold whitespace-nowrap uppercase",
                  isAmountRole(mapping.columns[column]) && "text-right",
                )}
              >
                {cellText(name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {review.rows.map((row, index) => (
            <TableRow key={index} row={row} columns={mapping.columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Lo que entendimos de cada columna" (v8-14): what the proposal reads in
 * each column over the file's first rows, as the file writes them, and how
 * the file writes its numbers and dates.
 */
export function MappingColumns({ fileName, proposal }: MappingColumnsProps) {
  const note = rowsNote(proposal);
  return (
    <Card variant="card">
      <CardHeader className="grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-section font-bold text-balance">
            {COPY.columns.title}
          </h2>
          <CardDescription>{COPY.columns.description}</CardDescription>
        </div>
        <span className="inline-flex min-w-0 items-center gap-1.5 self-start rounded-full bg-surface-muted px-3 py-1.5 text-sm">
          <FileSpreadsheet aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{fileName}</span>
        </span>
      </CardHeader>
      <ColumnsTable proposal={proposal} />
      {note && <p className="text-caption text-ink-muted">{note}</p>}
      <FileFormat proposal={proposal} />
    </Card>
  );
}
