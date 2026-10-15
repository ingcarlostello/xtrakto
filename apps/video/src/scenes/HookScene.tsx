import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { Caption, Mark, type CaptionLine } from "../components/Caption";
import { Card } from "../components/Card";
import { SceneLayout } from "../components/SceneLayout";
import { BANK_LINES } from "../promo/promo.data";
import { COLORS, FONTS } from "../theme/tokens";

/** When the question comes in and the bank's lines step back. */
const QUESTION_FROM = 104;

const CAPTION_LINES: readonly CaptionLine[] = [
  { from: 8, text: "Tu extracto dice que salieron $54,2M." },
  {
    from: QUESTION_FROM,
    text: (
      <>
        ¿Cuánto fue <Mark kind="spending">gasto de verdad</Mark>?
      </>
    ),
  },
];

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 12,
  padding: "7px 0",
  borderTop: `1px solid ${COLORS.divider}`,
  fontFamily: FONTS.mono,
  fontSize: 12.5,
  whiteSpace: "pre",
};

/** The bank's own lines: cryptic, uppercase, every outflow alike. */
const BankStatement = () => {
  const frame = useCurrentFrame();
  const shown = enter(frame, 4);
  const dimmed = progress(frame, QUESTION_FROM, 20);
  return (
    <Card
      style={{
        ...shown,
        opacity: Number(shown.opacity) * (1 - dimmed * 0.4),
        scale: 1 - dimmed * 0.03,
        padding: "14px 22px",
      }}
    >
      <div style={{ ...ROW, borderTop: "none", color: COLORS.inkMuted }}>
        <span>FECHA</span>
        <span>DESCRIPCIÓN</span>
        <span>VALOR</span>
      </div>
      {BANK_LINES.map((line, index) => (
        <div
          key={`${line.date} ${line.text}`}
          style={{ ...ROW, ...enter(frame, 12 + index * 6, 14) }}
        >
          <span>{line.date}</span>
          <span>{line.text}</span>
          <span>{line.value}</span>
        </div>
      ))}
      <div style={{ ...ROW, fontWeight: 700, ...enter(frame, 70, 14) }}>
        <span />
        <span>TOTAL CARGOS</span>
        <span>54,200,000.00</span>
      </div>
    </Card>
  );
};

export const HookScene = () => (
  <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
    <BankStatement />
  </SceneLayout>
);
