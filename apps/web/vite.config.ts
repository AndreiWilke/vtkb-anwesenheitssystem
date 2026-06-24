import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.CI === "true" ? "/vtkb-anwesenheitssystem/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "VTKB Anwesenheit Demo",
        short_name: "VTKB Anwesenheit",
        description: "Lokaler UX-Prototyp fuer die Anwesenheitserfassung",
        theme_color: "#9d1f17",
        background_color: "#f4f1ea",
        display: "standalone",
        lang: "de",
        icons: [
          {
            src: "VTKBLogo.png",
            sizes: "704x704",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
});
