import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile } from "remotion";
import { BEATS, FPS, PROMO_FRAMES, sceneStart } from "./promo.constants";

/**
 * "Calm Corporate Background Music" by JoyInSound, from Pixabay under its
 * Content License: pixabay.com/music/upbeat-calm-corporate-background-music-399302.
 * The license forbids sharing the track on its own, so it is git-ignored:
 * download it to public/audio/music/ before rendering (ADR 0020).
 */
const MUSIC = "audio/music/calm-corporate-background-music.mp3";

/**
 * The track measures -9 LUFS over the video's length: 0.36 (-8.9 dB) brings
 * it near -18 LUFS, a calm level for a video that plays when someone asks.
 */
const MUSIC_LEVEL = 0.36;

/** The music comes in over a second and leaves over the last two. */
const musicVolume = (frame: number) =>
  interpolate(
    frame,
    [0, FPS, PROMO_FRAMES - 2 * FPS, PROMO_FRAMES],
    [0, MUSIC_LEVEL, MUSIC_LEVEL, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

// Air on every cut, a pop when something lands, a bell when something checks
// out: just above the music. The sounds come from scripts/generate-sfx.mjs.
const SOUND_LEVELS = { whoosh: 0.3, pop: 0.45, ding: 0.35 } as const;

type Cue = { sound: keyof typeof SOUND_LEVELS; at: number };

const CUTS = [
  "upload",
  "summary",
  "categories",
  "recurring",
  "movements",
  "closing",
] as const;

const CUES: readonly Cue[] = [
  ...CUTS.map((scene): Cue => ({ sound: "whoosh", at: sceneStart(scene) - 3 })),
  { sound: "pop", at: sceneStart("upload") + BEATS.fileLands },
  { sound: "ding", at: sceneStart("upload") + BEATS.balanceVerified },
  { sound: "pop", at: sceneStart("categories") + BEATS.bankCosts },
  { sound: "pop", at: sceneStart("recurring") + BEATS.paymentRose },
  { sound: "ding", at: sceneStart("closing") + BEATS.callToAction },
];

export const Soundtrack = () => (
  <>
    <Audio name="Música" src={staticFile(MUSIC)} volume={musicVolume} />
    {CUES.map(({ sound, at }) => (
      <Sequence
        key={`${sound}-${at}`}
        name={`Sonido: ${sound}`}
        from={at}
        layout="none"
      >
        <Audio
          src={staticFile(`audio/sfx/${sound}.wav`)}
          volume={SOUND_LEVELS[sound]}
        />
      </Sequence>
    ))}
  </>
);
