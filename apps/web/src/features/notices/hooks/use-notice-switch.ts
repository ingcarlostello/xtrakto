"use client";

import type { NoticeId } from "@xtrakto/db";
import { useState, useTransition } from "react";
import { setNotice } from "../actions/set-notice.action";

/**
 * A notice's switch: it moves at once and goes back if saving fails. A press
 * while one is saving is ignored, without disabling it, so it keeps the focus.
 */
export function useNoticeSwitch(notice: NoticeId, initial: boolean) {
  const [isOn, setIsOn] = useState(initial);
  const [hasFailed, setHasFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const change = (next: boolean) => {
    if (isSaving) return;
    setIsOn(next);
    setHasFailed(false);
    startSaving(async () => {
      const saved = await setNotice({ notice, isOn: next }).catch(() => null);
      if (saved?.ok) return;
      setIsOn(!next);
      setHasFailed(true);
    });
  };

  return { isOn, hasFailed, change };
}
