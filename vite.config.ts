import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
  },
  // A forensics tool must not reach the network at runtime. Everything the UI
  // needs, fonts included, is bundled.
  build: {
    assetsInlineLimit: 0,
    target: "es2022",
  },
});
