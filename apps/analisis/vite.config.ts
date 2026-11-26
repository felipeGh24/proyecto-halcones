import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cada sistema se publica bajo su propia ruta (/analisis/) para que los tres compartan dominio,
// sesión y datos de demostración. En desarrollo corre en el puerto 5175.
// Con VITE_ENRUTADOR=hash se compila la versión para ver en Claude (rutas relativas, sin servidor) en dist-artefacto/.
const artefacto = process.env.VITE_ENRUTADOR === "hash";

export default defineConfig({
  base: artefacto ? "./" : "/analisis/",
  plugins: [react()],
  envDir: "../..",
  server: { port: 5175, strictPort: true },
  preview: { port: 5175 },
  build: { outDir: artefacto ? "../../dist-artefacto/analisis" : "../../dist/analisis", emptyOutDir: true, sourcemap: false },
});
