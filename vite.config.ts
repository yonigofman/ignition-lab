import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this as a project page (github.com/<user>/ignition-lab),
  // so assets must resolve under that subpath there. Only the deploy workflow sets
  // GITHUB_PAGES=true; local `pnpm build`/`pnpm preview` are unaffected (base "/").
  base: process.env.GITHUB_PAGES ? "/ignition-lab/" : "/",
  plugins: [{ enforce: "pre", ...mdx() }, react({ include: /\.(jsx|js|mdx|tsx|ts)$/ }), tailwindcss()],
});
