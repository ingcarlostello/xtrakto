import { FileText } from "lucide-react";
import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { Caption, Mark, type CaptionLine } from "../components/Caption";
import { Card, CardHeader } from "../components/Card";
import { IconChip } from "../components/IconChip";
import { SceneLayout } from "../components/SceneLayout";
import { CATEGORIES } from "../promo/promo.data";
import { BEATS } from "../promo/promo.constants";
import { COLORS, FONTS, RADII, SPENDING_GRADIENT } from "../theme/tokens";

/** When the second line brings in what the bank charged. */
const BANK_COSTS_FROM = BEATS.bankCosts;

const CAPTION_LINES: readonly CaptionLine[] = [
  {
    from: 8,
    text: (
      <>
        En qué se te va tu <Mark kind="spending">gasto real</Mark>, de mayor a
        menor.
      </>
    ),
  },
  {
    from: BANK_COSTS_FROM,
    text: "Y lo que te cobra el banco, como el 4x1000.",
  },
];

/** The largest category's share: its bar is full. */
const LARGEST_SHARE = Math.max(...CATEGORIES.map((category) => category.share));

const ROW: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "8px 0",
  borderTop: `1px solid ${COLORS.divider}`,
};

const ATTENTION_TILE: CSSProperties = {
  display: "flex",
  gap: 14,
  padding: 16,
  borderRadius: RADII.md,
  background: COLORS.attentionSurface,
  fontFamily: FONTS.ui,
  color: COLORS.ink,
};

/** A share of real spending, as a bar on its track (design-system.md §3.4). */
const ShareBar = ({ filled }: { filled: number }) => (
  <div
    style={{
      height: 8,
      margin: "6px 0 4px",
      borderRadius: 4,
      background: COLORS.ringTrack,
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${filled * 100}%`,
        borderRadius: 4,
        background: SPENDING_GRADIENT,
      }}
    />
  </div>
);

type Category = (typeof CATEGORIES)[number];

const CategoryRow = ({
  category,
  start,
}: {
  category: Category;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const grown = progress(frame, start + 6, 26);
  return (
    <div style={{ ...ROW, ...enter(frame, start, 16) }}>
      <IconChip icon={category.icon} size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {category.label}
          </span>
          <span
            style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 15 }}
          >
            {category.amount}
          </span>
        </div>
        <ShareBar filled={(category.share / LARGEST_SHARE) * grown} />
        <div style={{ fontSize: 12, color: COLORS.inkMuted }}>
          {category.share}% de tu gasto real · {category.count} movimientos
        </div>
      </div>
    </div>
  );
};

/** The 4x1000 and fees, on the attention surface (design-system.md §9). */
const BankCostsTile = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...ATTENTION_TILE, ...enter(frame, BANK_COSTS_FROM) }}>
      <IconChip icon={FileText} hasDot />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Costos del banco</div>
        <div
          style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 24 }}
        >
          $19.760
        </div>
        <div style={{ fontSize: 12, color: COLORS.inkMuted }}>
          4x1000 y una comisión de cajero. Revisa si tu cuenta es exenta.
        </div>
      </div>
    </div>
  );
};

export const CategoriesScene = () => {
  const frame = useCurrentFrame();
  return (
    <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
      <div style={{ display: "grid", gap: 12 }}>
        <Card style={{ ...enter(frame, 4), padding: "16px 20px 8px" }}>
          <CardHeader
            title="Tu gasto real por categoría"
            detail="$24,4M en el trimestre, de mayor a menor."
          />
          {CATEGORIES.map((category, index) => (
            <CategoryRow
              key={category.label}
              category={category}
              start={14 + index * 12}
            />
          ))}
        </Card>
        <BankCostsTile />
      </div>
    </SceneLayout>
  );
};
