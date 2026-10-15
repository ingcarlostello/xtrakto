import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// The app's variable fonts (apps/web/src/fonts), copied to public/fonts with
// their licenses. loadFont holds every frame until its font is ready.
export const loadBrandFonts = () =>
  Promise.all([
    loadFont({
      family: "Outfit",
      url: staticFile("fonts/outfit-latin.woff2"),
      weight: "100 900",
    }),
    loadFont({
      family: "Manrope",
      url: staticFile("fonts/manrope-latin.woff2"),
      weight: "200 800",
    }),
  ]);
