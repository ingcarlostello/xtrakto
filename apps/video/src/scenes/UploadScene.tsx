import { Check, CircleCheck, FileSpreadsheet, Upload } from "lucide-react";
import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { Caption, type CaptionLine } from "../components/Caption";
import { Card } from "../components/Card";
import { IconChip } from "../components/IconChip";
import { SceneLayout } from "../components/SceneLayout";
import { StatusPill } from "../components/StatusPill";
import { UPLOAD_STEPS } from "../promo/promo.data";
import { BEATS } from "../promo/promo.constants";
import { COLORS, FONTS, KIND_COLORS, RADII, SHADOWS } from "../theme/tokens";

const CAPTION_LINES: readonly CaptionLine[] = [
  { from: 8, text: "Sube el Excel de tu cuenta de ahorros Bancolombia." },
  {
    from: 150,
    text: "Lo leemos en tu navegador: el archivo no sale de tu equipo.",
  },
];

const FILE_CHIP: CSSProperties = {
  position: "absolute",
  top: 70,
  left: 110,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px 10px 10px",
  background: COLORS.surface,
  borderRadius: RADII.sm,
  boxShadow: SHADOWS.panel,
};

const UPLOAD_CIRCLE: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
};

const STEP_MARK: CSSProperties = {
  flex: "0 0 24px",
  height: 24,
  marginTop: 1,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: KIND_COLORS.income.soft,
};

/** The spreadsheet the bank gave, on its way into the drop zone. */
const FileChip = () => {
  const frame = useCurrentFrame();
  const away = 1 - progress(frame, 14, 32);
  return (
    <div
      style={{
        ...FILE_CHIP,
        translate: `${away * 160}px ${away * -170}px`,
        rotate: `${away * 8}deg`,
        opacity: away === 1 ? 0 : 1 - progress(frame, 54, 8),
      }}
    >
      <IconChip icon={FileSpreadsheet} size={36} />
      <span>
        <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
          Extracto jul–sep.xlsx
        </span>
        <span style={{ fontSize: 12, color: COLORS.inkMuted }}>Excel</span>
      </span>
    </div>
  );
};

/** Where files are dropped (design-system.md §9): solid while one is over it. */
const DropTarget = ({ isOver }: { isOver: boolean }) => (
  <div
    style={{
      display: "grid",
      justifyItems: "center",
      gap: 10,
      padding: "40px 20px",
      borderRadius: RADII.md,
      border: isOver
        ? `2px solid ${COLORS.primary}`
        : "2px dashed rgb(37 99 235 / 0.3)",
      background: isOver ? COLORS.primarySoft : "transparent",
      textAlign: "center",
    }}
  >
    <div
      style={{
        ...UPLOAD_CIRCLE,
        background: isOver ? COLORS.surface : COLORS.primarySoft,
      }}
    >
      <Upload size={28} color={COLORS.primary} strokeWidth={2} />
    </div>
    <div style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 22 }}>
      Arrastra tus extractos aquí
    </div>
    <div style={{ fontSize: 13, color: COLORS.inkMuted }}>
      Hasta 10 MB. Los leemos en tu navegador.
    </div>
  </div>
);

const DropZone = () => {
  const frame = useCurrentFrame();
  const gone = progress(frame, 82, 14);
  return (
    <Card
      style={{
        ...enter(frame, 4),
        gridArea: "1 / 1",
        position: "relative",
        alignSelf: "center",
        opacity: 1 - gone,
        scale: 1 - gone * 0.04,
      }}
    >
      <DropTarget isOver={frame >= BEATS.fileLands} />
      <FileChip />
    </Card>
  );
};

type StepProps = { title: string; detail: string; start: number };

const Step = ({ title, detail, start }: StepProps) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 12, ...enter(frame, start, 14) }}>
      <span style={STEP_MARK}>
        <Check size={14} strokeWidth={2.4} color={KIND_COLORS.income.onSoft} />
      </span>
      <span>
        <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
          {title}
        </span>
        <span style={{ fontSize: 13, color: COLORS.inkMuted }}>{detail}</span>
      </span>
    </div>
  );
};

/** The file's result, step by step, as the upload screen shows it (v8-08). */
const UploadResult = () => {
  const frame = useCurrentFrame();
  return (
    <Card style={{ ...enter(frame, 92), gridArea: "1 / 1", padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconChip icon={CircleCheck} kind="income" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Listo: leímos tu archivo
          </div>
          <div style={{ fontSize: 13, color: COLORS.inkMuted }}>
            Extracto jul–sep.xlsx · 312 movimientos
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 14, margin: "18px 0" }}>
        {UPLOAD_STEPS.map((step, index) => (
          <Step key={step.title} {...step} start={108 + index * 22} />
        ))}
      </div>
      <StatusPill
        title="Saldo verificado"
        detail="312 movimientos cuadran"
        style={enter(frame, BEATS.balanceVerified)}
      />
    </Card>
  );
};

export const UploadScene = () => (
  <SceneLayout caption={<Caption lines={CAPTION_LINES} />}>
    <div style={{ display: "grid", height: "100%", alignItems: "center" }}>
      <DropZone />
      <UploadResult />
    </div>
  </SceneLayout>
);
