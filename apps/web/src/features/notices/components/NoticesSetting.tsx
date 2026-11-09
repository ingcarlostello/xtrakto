"use client";

import type { NoticeId, NoticePreferences } from "@xtrakto/db";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNoticeSwitch } from "../hooks/use-notice-switch";
import { NOTICES_COPY as COPY } from "../notices.constants";

// In v8-11's order.
const NOTICES: readonly NoticeId[] = [
  "uploadReady",
  "reviewWaiting",
  "fixedPaymentRose",
  "monthlySummary",
];

function NoticeRow({
  notice,
  initial,
}: {
  notice: NoticeId;
  initial: boolean;
}) {
  const { isOn, hasFailed, change } = useNoticeSwitch(notice, initial);
  const { label, line } = COPY[notice];
  return (
    <div className="flex flex-col gap-2 border-t border-divider pt-4">
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{label}</span>
          <span className="text-caption text-ink-muted">{line}</span>
        </span>
        <Switch checked={isOn} onCheckedChange={change} />
      </label>
      {hasFailed && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {COPY.failed}
        </p>
      )}
    </div>
  );
}

/** "Avisos" (docs/ui/v8-11), with its four notices (10.4a to 10.5). */
export function NoticesSetting(preferences: NoticePreferences) {
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      {NOTICES.map((notice) => (
        <NoticeRow key={notice} notice={notice} initial={preferences[notice]} />
      ))}
    </Card>
  );
}
