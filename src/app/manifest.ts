import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kesa Lifestyle",
    short_name: "Kesa",
    description: "Premium fashion jewellery for modern Indian wardrobes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5e1dc",
    theme_color: "#9c4a57",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
