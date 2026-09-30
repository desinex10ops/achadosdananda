import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Achados da Nanda - Melhores Ofertas e Cupons",
    short_name: "Achados da Nanda",
    description: "Encontre promoções imperdíveis, cupons VIP e descontos exclusivos nas maiores lojas online.",
    start_url: "/achados",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
