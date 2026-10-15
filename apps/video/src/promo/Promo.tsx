import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { FictitiousNote } from "../components/FictitiousNote";
import { CategoriesScene } from "../scenes/CategoriesScene";
import { ClosingScene } from "../scenes/ClosingScene";
import { HookScene } from "../scenes/HookScene";
import { MovementsScene } from "../scenes/MovementsScene";
import { RecurringScene } from "../scenes/RecurringScene";
import { SummaryScene } from "../scenes/SummaryScene";
import { UploadScene } from "../scenes/UploadScene";
import {
  CLOSING_START,
  SCENE_FRAMES,
  TRANSITION_FRAMES,
} from "./promo.constants";
import { Soundtrack } from "./Soundtrack";

/** The scenes in order; the root also registers each one to preview alone. */
export const SCENES = [
  { id: "Hook", name: "Gancho", frames: SCENE_FRAMES.hook, Scene: HookScene },
  {
    id: "Upload",
    name: "Subir",
    frames: SCENE_FRAMES.upload,
    Scene: UploadScene,
  },
  {
    id: "Summary",
    name: "Tres colores",
    frames: SCENE_FRAMES.summary,
    Scene: SummaryScene,
  },
  {
    id: "Categories",
    name: "Categorías",
    frames: SCENE_FRAMES.categories,
    Scene: CategoriesScene,
  },
  {
    id: "Recurring",
    name: "Pagos fijos",
    frames: SCENE_FRAMES.recurring,
    Scene: RecurringScene,
  },
  {
    id: "Movements",
    name: "Movimientos",
    frames: SCENE_FRAMES.movements,
    Scene: MovementsScene,
  },
  {
    id: "Closing",
    name: "Cierre",
    frames: SCENE_FRAMES.closing,
    Scene: ClosingScene,
  },
] as const;

const CROSSFADE = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export const Promo = () => (
  <AbsoluteFill>
    <Background />
    <Soundtrack />
    <TransitionSeries>
      {SCENES.flatMap(({ id, name, frames, Scene }, index) => [
        ...(index === 0
          ? []
          : [
              <TransitionSeries.Transition
                key={`${id}-in`}
                presentation={fade()}
                timing={CROSSFADE}
              />,
            ]),
        <TransitionSeries.Sequence
          key={id}
          name={name}
          durationInFrames={frames}
        >
          <Scene />
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <Sequence name="Datos ficticios" durationInFrames={CLOSING_START}>
      <FictitiousNote until={CLOSING_START} />
    </Sequence>
  </AbsoluteFill>
);
