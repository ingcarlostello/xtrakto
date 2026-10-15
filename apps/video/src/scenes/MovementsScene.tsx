import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { enter } from "../animation/animation.helpers";
import { ChannelTag } from "../components/Badge";
import { Caption, type CaptionLine } from "../components/Caption";
import { Card, CardHeader } from "../components/Card";
import { IconChip } from "../components/IconChip";
import { SceneLayout } from "../components/SceneLayout";
import { MOVEMENTS } from "../promo/promo.data";
import { COLORS, FONTS, KIND_COLORS } from "../theme/tokens";

const CAPTION_LINES: readonly CaptionLine[] = [
  { from: 8, text: "Cada movimiento, entendible." },
  { from: 105, text: "Lo que dice el banco, qué fue y por dónde salió." },
];

const ROW: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "11px 0",
  borderTop: `1px solid ${COLORS.divider}`,
};

/** The bank's text exactly as printed: case and double spaces kept (§4). */
const RAW_TEXT: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.02em",
  whiteSpace: "pre",
};

type Movement = (typeof MOVEMENTS)[number];

/** The bank's text as printed, what it was and the channel it went through. */
const MovementRow = ({
  movement,
  start,
}: {
  movement: Movement;
  start: number;
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...ROW, ...enter(frame, start, 16) }}>
      <IconChip icon={movement.icon} kind={movement.kind} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={RAW_TEXT}>{movement.raw}</div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 3,
          }}
        >
          <span style={{ fontSize: 13, color: COLORS.inkSecondary }}>
            {movement.category}
          </span>
          <ChannelTag>{movement.channel}</ChannelTag>
        </div>
      </div>
      <span
        style={{
          fontFamily: FONTS.display,
          fontWeight: 500,
          fontSize: 16,
          color: KIND_COLORS[movement.kind].text,
        }}
      >
        {movement.amount}
      </span>
    </div>
  );
};

export const MovementsScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
      <Card style={{ ...enter(frame, 4), padding: "16px 20px 8px" }}>
        <CardHeader
          title="Movimientos"
          detail="Julio a septiembre de 2026, con el texto del banco."
        />
        {MOVEMENTS.map((movement, index) => (
          <MovementRow
            key={movement.raw}
            movement={movement}
            start={14 + index * 10}
          />
        ))}
      </Card>
    </SceneLayout>
  );
};
