"use client";

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
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
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

export function DeleteAccountSection() {
  const { isPending, error, confirm } = useDeleteAccount();
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="font-heading text-body font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" className="self-start" />}
        >
          {COPY.trigger}
        </AlertDialogTrigger>
        <ConfirmDeletion
          isPending={isPending}
          error={error}
          onConfirm={confirm}
        />
      </AlertDialog>
    </Card>
  );
}
