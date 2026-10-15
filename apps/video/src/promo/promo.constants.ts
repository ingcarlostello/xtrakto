export const FPS = 30;

/** Each cut is a half-second crossfade, during which both scenes show. */
export const TRANSITION_FRAMES = 15;

/** Each scene's length in frames, transitions included. */
export const SCENE_FRAMES = {
  hook: 180,
  upload: 270,
  summary: 330,
  categories: 255,
  recurring: 240,
  movements: 225,
  closing: 165,
} as const;

type SceneKey = keyof typeof SCENE_FRAMES;

const SCENE_ORDER = Object.keys(SCENE_FRAMES);
const sceneFrames = Object.values(SCENE_FRAMES);

/** The frame a scene starts on: the scenes before it, minus their crossfades. */
export const sceneStart = (scene: SceneKey): number => {
  const before = sceneFrames.slice(0, SCENE_ORDER.indexOf(scene));
  return (
    before.reduce((total, frames) => total + frames, 0) -
    TRANSITION_FRAMES * before.length
  );
};

/** The closing starts once the last crossfade ends. */
export const CLOSING_START = sceneStart("closing");

/** About 52 seconds: under the minute the landing promises. */
export const PROMO_FRAMES = CLOSING_START + SCENE_FRAMES.closing;

/**
 * Moments inside a scene, in that scene's own frames, that the soundtrack
 * marks too: the picture and the sound read them from here.
 */
export const BEATS = {
  fileLands: 44,
  balanceVerified: 196,
  bankCosts: 150,
  paymentRose: 130,
  callToAction: 80,
} as const;
