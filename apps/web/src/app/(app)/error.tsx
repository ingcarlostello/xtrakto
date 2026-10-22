"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { PageError } from "@/components/layout/PageError";

type AppErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// What a signed-in page throws lands here, while the header and the dock
// stay. retry() asks the server for the page again. A boundary keeps the
// error from Sentry's global handlers, so it's reported here.
export default function AppError({ error, retry }: AppErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <PageError onRetry={retry} />;
}
