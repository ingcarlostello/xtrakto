import { useCurrentFrame } from "remotion";
import { countUp, enter, progress } from "../animation/animation.helpers";
import { Caption, Mark, type CaptionLine } from "../components/Caption";
import { Card } from "../components/Card";
import { IconChip } from "../components/IconChip";
import { Ring } from "../components/Ring";
import { SceneLayout } from "../components/SceneLayout";
import { compactMillions } from "../format/format.helpers";
import { KIND_TOTALS } from "../promo/promo.data";
import { COLORS, FONTS, KIND_COLORS } from "../theme/tokens";

/** When the second line turns the light on what only moved. */
const FOCUS_FROM = 180;

const CAPTION_LINES: readonly CaptionLine[] = [
  {
    from: 8,
    text: (
      <>
        Salieron $54,2M, pero <Mark kind="spending">no todo fue gasto</Mark>.
      </>
    ),
  },
  {
    from: FOCUS_FROM,
    text: (
      <>
        Pagar tu tarjeta o pasar plata a tu inversión es plata{" "}
        <Mark kind="moved">movida</Mark>.
      </>
    ),
  },
];

type KindTotal = (typeof KIND_TOTALS)[number];

/** The kind's label and its total, counting up as the card comes in. */
const KindAmount = ({ total, start }: { total: KindTotal; start: number }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{total.label}</div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 500,
          fontSize: 30,
          lineHeight: 1.15,
          color: KIND_COLORS[total.kind].text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {compactMillions(countUp(frame, start + 4, total.tenths))}
      </div>
    </div>
  );
};

const KindTotalCard = ({
  total,
  start,
}: {
  total: KindTotal;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const shown = enter(frame, start);
  const focus = progress(frame, FOCUS_FROM, 20);
  const isMoved = total.kind === "moved";
  return (
    <Card
      style={{
        ...shown,
        opacity: Number(shown.opacity) * (isMoved ? 1 : 1 - focus * 0.45),
        scale: isMoved ? 1 + focus * 0.03 : 1,
        outline: `2px solid rgb(76 141 246 / ${isMoved ? focus : 0})`,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconChip icon={total.icon} kind={total.kind} size={38} />
        <KindAmount total={total} start={start} />
        {total.percent !== undefined && (
          <Ring
            percent={total.percent}
            kind={total.kind}
            shown={progress(frame, start + 8, 40)}
          />
        )}
      </div>
      <div style={{ marginTop: 4, fontSize: 13, color: COLORS.inkMuted }}>
        {total.detail}
      </div>
    </Card>
  );
};

/** What went out, split into real spending and money that only moved. */
const OutflowBar = () => {
  const frame = useCurrentFrame();
  const grown = progress(frame, 66, 30);
  return (
    <Card style={{ ...enter(frame, 54), padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Salieron $54,2M</span>
        <span style={{ fontSize: 12, color: COLORS.inkMuted }}>
          Gasto real 45% · Movido 55%
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 3,
          height: 12,
          marginTop: 10,
          borderRadius: 6,
          overflow: "hidden",
          background: COLORS.ringTrack,
        }}
      >
        <div
          style={{
            width: `${45 * grown}%`,
            background: KIND_COLORS.spending.graphic,
          }}
        />
        <div
          style={{
            width: `${55 * grown}%`,
            background: KIND_COLORS.moved.graphic,
          }}
        />
      </div>
    </Card>
  );
};

export const SummaryScene = () => (
  <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
    <div style={{ display: "grid", gap: 12 }}>
      {KIND_TOTALS.map((total, index) => (
        <KindTotalCard key={total.kind} total={total} start={10 + index * 12} />
      ))}
      <OutflowBar />
    </div>
  </SceneLayout>
);
