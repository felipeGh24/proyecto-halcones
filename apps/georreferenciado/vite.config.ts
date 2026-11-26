import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cada sistema se publica bajo su propia ruta (/georreferenciado/) para que los tres compartan dominio,
// sesión y datos de demostración. En desarrollo corre en el puerto 5174.
// Con VITE_ENRUTADOR=hash se compila la versión para ver en Claude (rutas relativas, sin servidor) en dist-artefacto/.
const artefacto = process.env.VITE_ENRUTADOR === "hash";

export default defineConfig({
  base: artefacto ? "./" : "/georreferenciado/",
  plugins: [react()],
  envDir: "../..",
  server: { port: 5174, strictPort: true },
  preview: { port: 5174 },
  build: { outDir: artefacto ? "../../dist-artefacto/georreferenciado" : "../../dist/georreferenciado", emptyOutDir: true, sourcemap: false },
});
