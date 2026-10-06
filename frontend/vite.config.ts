import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      "/oauth2": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      "/login/oauth2": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
