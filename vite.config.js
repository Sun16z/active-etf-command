import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("/node_modules/lucide-react")) {
            return "icons-vendor";
          }
          if (id.includes("/src/data/dailyMovements")) {
            return "daily-movements";
          }
          if (id.includes("/src/data/etfUniverse")) {
            return "etf-universe";
          }
          if (id.includes("/src/data/intradayAttacks")) {
            return "intraday-attacks";
          }
          if (id.includes("/src/data/themeRisk")) {
            return "theme-risk";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5176,
    strictPort: false,
  },
});
