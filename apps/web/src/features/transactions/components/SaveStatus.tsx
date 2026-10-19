import {
  SAVE_STATUS_ATTRIBUTE,
  TRANSACTIONS_COPY,
} from "../transaction.constants";

/**
 * What a form of the movement's detail saved, said politely, or that it
 * couldn't be, as an alert. The status stays in place while empty, so a
 * screen reader hears it when it fills, and can take the focus when what
 * was pressed is gone.
 */
export function SaveStatus({
  saved,
  isFailed,
}: {
  saved: string | null;
  isFailed: boolean;
}) {
  return (
    <>
      <p
        role="status"
        tabIndex={-1}
        {...{ [SAVE_STATUS_ATTRIBUTE]: "" }}
        className="text-caption font-semibold text-ink-secondary empty:sr-only"
      >
        {saved ?? ""}
      </p>
      {isFailed && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {TRANSACTIONS_COPY.detail.failed}
        </p>
      )}
    </>
  );
}
