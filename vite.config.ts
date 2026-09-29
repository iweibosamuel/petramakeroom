import { screenGraphPlugin } from "@animaapp/vite-plugin-screen-graph";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "development" && screenGraphPlugin()],
  publicDir: "./static",
  // Absolute asset paths, so pages opened directly at a nested address
  // (e.g. /trackgiving/mypledge/<id> from an email) can load the app.
  base: "/",
}));
