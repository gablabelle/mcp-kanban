import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/ui",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@": path.resolve(__dirname, "src/ui"),
    },
  },
  build: {
    outDir: "../../dist/ui",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3010",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:3010",
        ws: true,
      },
      "/internal": {
        target: "http://localhost:3010",
        changeOrigin: true,
      },
    },
  },
});
