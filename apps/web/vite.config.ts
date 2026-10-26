import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The web app is a static build served by the appliance; in dev, /api goes to the local API.
export default defineConfig({
  plugins: [react(), tailwindcss(),
    // the page title before the app loads: the brand's product name (docs/edu54), the AI Lab's by default
    { name: "product-name", transformIndexHtml: (html) => html.replace("%PRODUCT_NAME%", process.env.VITE_PRODUCT_NAME || "Umanah AI Lab") }],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5173, proxy: { "/api": { target: "http://127.0.0.1:8101", changeOrigin: false } } },
});
