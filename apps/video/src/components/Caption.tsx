import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { useIsPortrait } from "../layout/use-is-portrait";
import { COLORS, FONTS, KIND_COLORS, type Kind } from "../theme/tokens";

export type CaptionLine = { from: number; text: ReactNode };

/** The scene's headline: each line from its frame until the next one's. */
export const Caption = ({ lines }: { lines: readonly CaptionLine[] }) => {
  const frame = useCurrentFrame();
  const isPortrait = useIsPortrait();
  return (
    <div style={{ display: "grid" }}>
      {lines.map((line, index) => {
        const next = lines[index + 1];
        const shown = enter(frame, line.from, 32);
        const hidden = next ? progress(frame, next.from - 12, 12) : 0;
        return (
          <div
            key={line.from}
            style={{
              ...shown,
              opacity: Number(shown.opacity) * (1 - hidden),
              gridArea: "1 / 1",
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: isPortrait ? 84 : 72,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: COLORS.ink,
              textWrap: "balance",
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

/** Words in the color of their kind: the color always means something. */
export const Mark = ({
  kind,
  children,
}: {
  kind: Kind;
  children: ReactNode;
}) => <span style={{ color: KIND_COLORS[kind].text }}>{children}</span>;
