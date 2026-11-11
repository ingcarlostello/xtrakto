import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole } from "@xtrakto/core";
import type { MappingChoices, ReviewRow } from "@xtrakto/parsers";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import {
  CONFIRMATION_COPY as COPY,
  NO_PROPOSAL_COPY,
} from "../format-confirmation.constants";
import {
  cellText,
  columnLabel,
  isAmountRole,
  rolesLeft,
  rowsNote,
} from "../format-confirmation.helpers";
import type { FormatConfirmation } from "../format-mapping.types";
import { FileFormat, RoleChoice } from "./FormatChoices";

// A row that isn't a movement, such as the opening balance, is crossed out;
// screen readers hear why before its first cell. While the choices don't read
// the file, no row is.
function TableRow({
  row,
  columns,
}: {
  row: ReviewRow;
  columns: readonly ColumnRole[];
}) {
  const isCrossedOut = row.kind !== undefined && row.kind !== "movement";
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
              (isCrossedOut || role === COLUMN_ROLE.NONE) && "text-ink-muted",
              isCrossedOut && "line-through",
            )}
          >
            {isCrossedOut && column === 0 && (
              <span className="sr-only">{why} </span>
            )}
            {cellText(cell)}
          </td>
        );
      })}
    </tr>
  );
}

type MappingColumnsProps = {
  /** Shown here only: a file's name never leaves the browser. */
  fileName: string;
  confirmation: FormatConfirmation;
  /** Reads the file again with the person's choices. */
  onCorrect: (choices: MappingChoices) => void;
};

type ChoicesProps = Omit<MappingColumnsProps, "fileName">;

// Each column's role, which the person changes among those the others leave.
function RoleChoices({ confirmation, onCorrect }: ChoicesProps) {
  const { review, choices } = confirmation;
  const { roles } = choices;
  const choose = (column: number, role: ColumnRole) =>
    onCorrect({ ...choices, roles: roles.with(column, role) });
  return (
    <tr>
      {roles.map((role, column) => (
        <th key={column} scope="col" className="px-1 pb-3">
          <RoleChoice
            role={role}
            options={rolesLeft(roles, column)}
            label={columnLabel(review.header[column], column)}
            onChoose={(chosen) => choose(column, chosen)}
          />
        </th>
      ))}
    </tr>
  );
}

// Each column's role over the header's names, then the first rows: the table
// scrolls sideways on phones, inside its card, with its chips, whose focus
// ring its scroll would clip without the room above them.
function ColumnsTable({ confirmation, onCorrect }: ChoicesProps) {
  const { review, choices } = confirmation;
  const { roles } = choices;
  return (
    <div className="-mx-6 -mt-2 overflow-x-auto px-6 pt-2">
      <table className="w-full min-w-max text-left">
        <caption className="sr-only">{COPY.columns.caption}</caption>
        <thead>
          <RoleChoices confirmation={confirmation} onCorrect={onCorrect} />
          <tr className="bg-surface-muted">
            {review.header.map((name, column) => (
              <th
                key={column}
                scope="col"
                className={cn(
                  "px-3 py-3 text-meta font-bold whitespace-nowrap uppercase",
                  isAmountRole(roles[column]) && "text-right",
                )}
              >
                {cellText(name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {review.rows.map((row, index) => (
            <TableRow key={index} row={row} columns={roles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * "Lo que entendimos de cada columna" (v8-14): what each column is read as,
 * which the person changes (11.3b), over the file's first rows as the file
 * writes them, and how the file writes its numbers and dates. Without a
 * proposal, only the date is chosen, and it asks for the rest.
 */
export function MappingColumns({
  fileName,
  confirmation,
  onCorrect,
}: MappingColumnsProps) {
  const { review, choices, noProposal } = confirmation;
  const { columns } = COPY;
  const note = rowsNote(review, choices.roles);
  const description =
    noProposal === undefined
      ? columns.description
      : `${NO_PROPOSAL_COPY[noProposal]} ${columns.descriptionWithoutProposal}`;
  return (
    <Card variant="card">
      <CardHeader className="grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-section font-bold text-balance">
            {noProposal === undefined
              ? columns.title
              : columns.titleWithoutProposal}
          </h2>
          <CardDescription>{description}</CardDescription>
        </div>
        <span className="inline-flex min-w-0 items-center gap-1.5 self-start rounded-full bg-surface-muted px-3 py-1.5 text-sm">
          <FileSpreadsheet aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{fileName}</span>
        </span>
      </CardHeader>
      <ColumnsTable confirmation={confirmation} onCorrect={onCorrect} />
      {note && <p className="text-caption text-ink-muted">{note}</p>}
      <FileFormat confirmation={confirmation} onCorrect={onCorrect} />
    </Card>
  );
}
