# 0020. Promo video rendered with Remotion

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

The waitlist page (roadmap 16.0b and 16.0c) shows a video of under a minute with what the first version will do, and the same video, cut to 9:16, goes to social networks ([roadmap 16.0a](../ROADMAP.md#160a-promo-video)). Most of what it has to show doesn't exist yet: the summary, the categories and the recurring payments come in Stage 6, so a screen recording can't show them. The design exists: design v8 draws every MVP screen (`docs/ui/`), and its tokens are in `.claude/rules/design-system.md`. The video must say only what the first version will do, use invented data, and change when the design does.

## Decision

- **Remotion in `apps/video`.** The video is a React composition drawn with the design system's tokens, the app's fonts and the brand's mark, with invented data (the numbers of the v8 designs). Each scene is a component: the bank's lines, the upload, the three colors, the categories, the recurring payments, the movements and the closing.
- **Two compositions:** 16:9 (1920 × 1080) for the page and 9:16 (1080 × 1920) for social networks. Each scene picks its layout from the video's size; the app's pieces keep their real sizes, zoomed.
- **Music and effects, no voice yet:** a calm track from Pixabay ("Calm Corporate Background Music", by JoyInSound) under its Content License, brought near −18 LUFS, and three effects a script synthesizes (`scripts/generate-sfx.mjs`): air on each cut, a pop when something lands, a bell when something checks out. The track is git-ignored, since its license forbids sharing it on its own: whoever renders downloads it first. A voice-over can come later, with a paid plan (Fish Audio's free plan is for personal use only); "Xtrakto" is said like "extracto".
- **Rendered locally, never deployed or rendered in CI:** `pnpm --filter video render` writes the page's MP4 and its poster to `apps/web/public/video/` and the vertical cut to the git-ignored `apps/video/out/`. CI checks the app's types and lint only. H.264 in `yuv420p` and bt709, with AAC at 128 kb/s, so every browser plays it, Safari included.

## Alternatives considered

- **A screen recording of the app:** the screens the video shows don't exist yet, and a recording would have to be redone whenever one changes.
- **AI-generated video (Higgsfield and similar):** credits for each try, and no exact screens: it would look good without showing how the app works.
- **A video editor (After Effects, CapCut):** the design's tokens copied by hand, and a file outside the repository that only its author can change.
- **Remotion outside the repository:** fewer dependencies here, but the video's source would not be versioned with the design it shows.
- **The track committed with the video's source:** Pixabay's license forbids distributing it on its own, and the repository becomes public at launch (16.4).
- **AI-generated music:** the connected tools only make speech.

## Consequences

- The video changes in code: a scene, a number or a line of copy is a reviewed commit, and the design's tokens live in one file (`apps/video/src/theme/tokens.ts`) that mirrors `globals.css`.
- The monorepo gains Remotion and its Chrome download for rendering (not for installing or CI); its compositor has a `darwin-x64` build.
- Remotion's license is free for individuals and companies of up to 3 people. If Xtrakto becomes a company with more, it needs a Company License (remotion.pro) to keep rendering.
- Remotion's version check warns that the workspace has zod 4.6.5 (from `@xtrakto/core`) where it pins 4.5.4; zod only matters for compositions with typed props, which the video doesn't use.
- Rendering needs the track in `apps/video/public/audio/music/`: without it, Remotion stops at the missing file.
- The track is registered in Content ID: on YouTube or Instagram the video can get a claim, cleared with Pixabay's license certificate. The landing page isn't affected.
- The 16:9 file (about 2.6 MB with its sound) is committed with the page that shows it; a heavier video would move to a CDN or Vercel Blob.
