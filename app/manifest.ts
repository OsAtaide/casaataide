import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CASAQUEST — Guardiões da Base",
    short_name: "CASAQUEST",
    description: "Missões da casa transformadas em uma aventura de progressão.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b1d",
    theme_color: "#070b1d",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
