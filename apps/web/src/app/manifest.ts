import type { MetadataRoute } from "next";

// From docs/brand.md §8.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Xtrakto",
    short_name: "Xtrakto",
    description: "Cuentas claras, mente tranquila",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF2F7",
    theme_color: "#EEF2F7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
