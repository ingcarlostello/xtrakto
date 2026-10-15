import { useVideoConfig } from "remotion";

/** The 9:16 cut for social networks; the landing's video is 16:9. */
export const useIsPortrait = (): boolean => {
  const { width, height } = useVideoConfig();
  return height > width;
};
