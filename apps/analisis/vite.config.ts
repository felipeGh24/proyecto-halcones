import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cada sistema se publica bajo su propia ruta (/analisis/) para que los tres compartan dominio,
// sesión y datos de demostración. En desarrollo corre en el puerto 5175.
export default defineConfig({
  base: "/analisis/",
  plugins: [react()],
  envDir: "../..",
  server: { port: 5175, strictPort: true },
  preview: { port: 5175 },
  build: { outDir: "../../dist/analisis", emptyOutDir: true, sourcemap: false },
});
