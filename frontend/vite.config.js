import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import prefix from "postcss-prefix-selector";
export default defineConfig({
  plugins: [react(), tailwind()],
  css: {
    postcss: {
      plugins: [
        prefix({
          prefix: ".vortex-game",
          includeFiles: [/vortex\.css/],
          transform: (p, s, ps) =>
            s === ":root" ? p : s === "body" || s === "html" ? p : ps,
        }),
      ],
    },
  },
  server: { proxy: { "/api": process.env.FF_API_PROXY || "http://127.0.0.1:5000" } },
});

