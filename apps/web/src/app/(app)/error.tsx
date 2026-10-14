"use client";

import { PageError } from "@/components/layout/PageError";

type AppErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// What a signed-in page throws lands here, while the header and the dock
// stay. retry() asks the server for the page again.
export default function AppError({ retry }: AppErrorProps) {
  return <PageError onRetry={retry} />;
}
