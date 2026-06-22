import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "VTKB Anwesenheit Demo",
        short_name: "VTKB Anwesenheit",
        description: "Lokaler UX-Prototyp fuer die Anwesenheitserfassung",
        theme_color: "#b42318",
        background_color: "#ffffff",
        display: "standalone",
        lang: "de",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
});
