import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// El repo se publica en https://<usuario>.github.io/<repo>/
// así que 'base' debe ser '/<repo>/'. Se toma de una env var para
// no tener que tocar este archivo cada vez que cambie el nombre del repo.
//
// Build multi-página: /admin es un HTML independiente (admin/index.html),
// no una ruta de client-side router. Esto evita el truco del 404.html que
// hace falta en GitHub Pages para SPAs con rutas dinámicas, y de paso
// separa el bundle del panel admin del bundle público (más liviano).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin/index.html"),
      },
    },
  },
});
