// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  adapter: cloudflare(),
  // Listen on all interfaces so other devices on the LAN can open the dev server
  server: { host: true },
  devToolbar: { enabled: false },
});
