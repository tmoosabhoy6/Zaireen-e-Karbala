import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", target: "es2020" },
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  test: { include: ["tests/**/*.test.ts"] },
} as never);
