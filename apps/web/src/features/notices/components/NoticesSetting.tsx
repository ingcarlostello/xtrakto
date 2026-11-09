"use client";

import type { NoticePreferences } from "@xtrakto/db";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NOTICES_COPY as COPY } from "../notices.constants";
import { useNoticeSwitch } from "../hooks/use-notice-switch";

/** "Avisos" (docs/ui/v8-11), with the notices that exist today (10.4a). */
export function NoticesSetting({ uploadReady }: NoticePreferences) {
  const { isOn, hasFailed, change } = useNoticeSwitch(
    "uploadReady",
    uploadReady,
  );
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <label className="flex items-center justify-between gap-3 border-t border-divider pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{COPY.uploadReady.label}</span>
          <span className="text-caption text-ink-muted">
            {COPY.uploadReady.line}
          </span>
        </span>
        <Switch checked={isOn} onCheckedChange={change} />
      </label>
      {hasFailed && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {COPY.failed}
        </p>
      )}
    </Card>
  );
}
