import { exportDestination } from "./account-destination.helpers";
import type { AccountDestination } from "./account-destination.helpers";
import { UPLOAD_STATUS } from "./upload.constants";
import type {
  AccountKey,
  FileToSend,
  StatementPreview,
  UploadAccount,
  UploadItem,
} from "./upload.types";

/**
 * The previews of the files read in this upload, sent or not: a quarterly
 * statement among them names an account its movements exports can go to.
 */
export const batchPreviews = (
  items: readonly UploadItem[],
): readonly StatementPreview[] =>
  items.flatMap((item) => {
    if (item.status === UPLOAD_STATUS.SENT) return [item.preview];
    const isRead =
      item.status === UPLOAD_STATUS.READY ||
      item.status === UPLOAD_STATUS.SENDING;
    return isRead ? [item.statement.preview] : [];
  });

// The account an export goes up with: none when its destination is known,
// the chosen one when the person had to choose, or `null` while they haven't.
const accountToSend = (
  destination: AccountDestination,
  chosen: AccountKey | undefined,
): { readonly key?: AccountKey } | null => {
  if (destination.kind === "known") return {};
  return destination.options.some(({ key }) => key === chosen)
    ? { key: chosen }
    : null;
};

/**
 * The files ready to send, in the list's order, each with what goes up: its
 * content and, for a movements export whose account the person chose, that
 * account's key. An export still waiting for a choice stays out: sent without
 * one, the server could put it in the user's only account, not the one a
 * quarterly statement of this upload creates.
 */
export const filesToSend = (
  items: readonly UploadItem[],
  accounts: readonly UploadAccount[],
): readonly FileToSend[] => {
  const batch = batchPreviews(items);
  return items.flatMap((item) => {
    if (item.status !== UPLOAD_STATUS.READY) return [];
    const { content, preview } = item.statement;
    if (preview.accountLast4 !== undefined) {
      return [{ id: item.id, input: { content } }];
    }
    const destination = exportDestination(preview, accounts, batch);
    const account = accountToSend(destination, item.accountKey);
    if (!account) return [];
    const input = account.key ? { content, account: account.key } : { content };
    return [{ id: item.id, input }];
  });
};
