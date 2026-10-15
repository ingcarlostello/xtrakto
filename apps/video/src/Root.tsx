import { Composition, Folder } from "remotion";
import { Promo, SCENES } from "./promo/Promo";
import { FPS, PROMO_FRAMES } from "./promo/promo.constants";
import { loadBrandFonts } from "./theme/fonts";

void loadBrandFonts();

// The landing's 16:9 video and the 9:16 cut for social networks share every
// scene; each scene also has its own composition, to preview it alone.
export const RemotionRoot = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={PROMO_FRAMES}
    />
    <Composition
      id="PromoVertical"
      component={Promo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={PROMO_FRAMES}
    />
    <Folder name="Escenas">
      {SCENES.map(({ id, frames, Scene }) => (
        <Composition
          key={id}
          id={id}
          component={Scene}
          width={1920}
          height={1080}
          fps={FPS}
          durationInFrames={frames}
        />
      ))}
    </Folder>
  </>
);
