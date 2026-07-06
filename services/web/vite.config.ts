import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend always talks to /api/*, same as before the service split — this file is the
// only thing that needs to know two separate backend services exist. A real Ingress plays
// this exact routing role once this moves to Kubernetes.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/ingest": {
        target: process.env.VITE_INGEST_SERVICE_URL || "http://localhost:8788",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/query": {
        target: process.env.VITE_QUERY_SERVICE_URL || "http://localhost:8789",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/health": {
        target: process.env.VITE_INGEST_SERVICE_URL || "http://localhost:8788",
        changeOrigin: true,
        rewrite: () => "/health",
      },
    },
  },
});
