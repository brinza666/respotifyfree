import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const pages = process.env.GITHUB_PAGES === "1";
const base = pages ? "/respotifyfree/" : "/";

export default defineConfig(({ command, isPreview }) => ({
  base,
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
    }),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "node-server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
