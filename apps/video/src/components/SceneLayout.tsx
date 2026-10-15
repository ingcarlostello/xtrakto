import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useIsPortrait } from "../layout/use-is-portrait";
import { Background } from "./Background";

// The headline beside the app in 16:9, above it in 9:16. The app's pieces are
// drawn at their real sizes (design-system.md) and zoomed, so they keep the
// design's proportions and stay sharp.
const LAYOUTS = {
  landscape: {
    frame: { flexDirection: "row", alignItems: "center", gap: 90 },
    caption: { flex: "0 0 640px" },
    content: { flex: 1, minWidth: 0, zoom: 1.9 },
  },
  portrait: {
    frame: {
      flexDirection: "column",
      justifyContent: "center",
      gap: 64,
      padding: "150px 80px 170px",
    },
    caption: { flex: "0 0 auto" },
    content: { flex: "0 0 auto", zoom: 2 },
  },
} satisfies Record<string, Record<string, CSSProperties>>;

type SceneLayoutProps = { caption: ReactNode; children: ReactNode };

export const SceneLayout = ({ caption, children }: SceneLayoutProps) => {
  const layout = LAYOUTS[useIsPortrait() ? "portrait" : "landscape"];
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ padding: "100px 120px", ...layout.frame }}>
        <div style={layout.caption}>{caption}</div>
        <div style={layout.content}>{children}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
