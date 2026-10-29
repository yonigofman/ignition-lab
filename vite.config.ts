import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx() }, react({ include: /\.(jsx|js|mdx|tsx|ts)$/ }), tailwindcss()],
});
