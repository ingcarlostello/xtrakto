import { ArrowUpRight, Calendar } from "lucide-react";
import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { Badge, ChannelTag } from "../components/Badge";
import { Caption, Mark, type CaptionLine } from "../components/Caption";
import { Card, CardHeader } from "../components/Card";
import { IconChip } from "../components/IconChip";
import { SceneLayout } from "../components/SceneLayout";
import { RECURRING } from "../promo/promo.data";
import { BEATS } from "../promo/promo.constants";
import { COLORS, FONTS, KIND_COLORS, RADII } from "../theme/tokens";

/** When the second line points at the payment that went up. */
const ROSE_FROM = BEATS.paymentRose;

const CAPTION_LINES: readonly CaptionLine[] = [
  { from: 8, text: "Lo que pagas cada mes, sin hacer nada." },
  {
    from: ROSE_FROM,
    text: (
      <>
        Y cuál <Mark kind="spending">subió</Mark>: la energía, un 12%.
      </>
    ),
  },
];

const ROW: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "8px 10px",
  margin: "0 -10px",
};

const AMOUNT: CSSProperties = {
  width: 96,
  textAlign: "right",
  fontFamily: FONTS.display,
  fontWeight: 500,
  fontSize: 15,
  color: KIND_COLORS.spending.text,
};

type Recurring = (typeof RECURRING)[number];

/** July, August and September, the latest month in full color (v8-04). */
const MonthBars = ({ months }: { months: Recurring["months"] }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
    {months.map((height, index) => (
      <span
        key={index}
        style={{
          width: 7,
          height: 22 * height,
          borderRadius: 2,
          background:
            index === months.length - 1
              ? KIND_COLORS.spending.graphic
              : "#f6b48c",
        }}
      />
    ))}
  </div>
);

/** The channel and how the amount moves: steady, or up and flagged. */
const PaymentTags = ({
  payment,
  flagged,
}: {
  payment: Recurring;
  flagged: number;
}) => (
  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
    <ChannelTag>{payment.channel}</ChannelTag>
    {payment.rose ? (
      <span style={{ display: "inline-block", scale: 1 + flagged * 0.08 }}>
        <Badge tone="attention" icon={ArrowUpRight}>
          Subió 12%
        </Badge>
      </span>
    ) : (
      <Badge tone="ok">Estable</Badge>
    )}
  </div>
);

const RecurringRow = ({
  payment,
  start,
}: {
  payment: Recurring;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const flagged = payment.rose ? progress(frame, ROSE_FROM, 16) : 0;
  return (
    <div
      style={{
        ...ROW,
        borderRadius: flagged > 0 ? RADII.sm : 0,
        borderTop: `1px solid ${flagged > 0 ? "transparent" : COLORS.divider}`,
        background: `rgb(255 246 239 / ${flagged})`,
        ...enter(frame, start, 16),
      }}
    >
      <IconChip icon={payment.icon} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{payment.label}</div>
        <div
          style={{ fontSize: 11.5, color: COLORS.inkMuted, whiteSpace: "pre" }}
        >
          {payment.raw}
        </div>
        <PaymentTags payment={payment} flagged={flagged} />
      </div>
      <MonthBars months={payment.months} />
      <span style={AMOUNT}>{payment.amount}</span>
    </div>
  );
};

const MonthlyTotal = () => {
  const frame = useCurrentFrame();
  return (
    <Card style={{ ...enter(frame, 4), display: "flex", gap: 14, padding: 16 }}>
      <IconChip icon={Calendar} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Pagas al mes</div>
        <div
          style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 28 }}
        >
          $2,46M
        </div>
        <div style={{ fontSize: 12, color: COLORS.inkMuted }}>
          Sale de tu cuenta aunque no hagas nada.
        </div>
      </div>
    </Card>
  );
};

export const RecurringScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
      <div style={{ display: "grid", gap: 12 }}>
        <MonthlyTotal />
        <Card style={{ ...enter(frame, 12), padding: "16px 20px 8px" }}>
          <CardHeader
            title="Tus pagos fijos"
            detail="Las barras muestran julio, agosto y septiembre."
          />
          {RECURRING.map((payment, index) => (
            <RecurringRow
              key={payment.label}
              payment={payment}
              start={20 + index * 12}
            />
          ))}
        </Card>
      </div>
    </SceneLayout>
  );
};
