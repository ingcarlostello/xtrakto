"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteAccount } from "../hooks/use-delete-account";
import { DELETE_ACCOUNT_COPY as COPY } from "../user.constants";

type ConfirmDeletionProps = {
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
};

// The dialog stays open while the deletion runs, so an error shows in place.
function ConfirmDeletion({
  isPending,
  error,
  onConfirm,
}: ConfirmDeletionProps) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{COPY.confirmTitle}</AlertDialogTitle>
        <AlertDialogDescription>
          {COPY.confirmDescription}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>
          {COPY.cancel}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? COPY.pending : COPY.confirm}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * "Borrar todos mis datos" (4.5), the white destructive button, which asks
 * before deleting the account with every row of the user's. `describedBy`
 * names the line that says what it deletes.
 */
export function DeleteAllData({ describedBy }: { describedBy: string }) {
  const { isPending, error, confirm } = useDeleteAccount();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        aria-describedby={describedBy}
        render={<Button variant="destructive-secondary" />}
      >
        <Trash2 aria-hidden strokeWidth={2.2} />
        {COPY.trigger}
      </AlertDialogTrigger>
      <ConfirmDeletion
        isPending={isPending}
        error={error}
        onConfirm={confirm}
      />
    </AlertDialog>
  );
}
