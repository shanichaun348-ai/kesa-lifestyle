import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kesa Lifestyle",
    short_name: "Kesa",
    description: "Premium fashion jewellery for modern Indian wardrobes.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#1b1917",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
