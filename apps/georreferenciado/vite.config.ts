import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cada sistema se publica bajo su propia ruta (/georreferenciado/) para que los tres compartan dominio,
// sesión y datos de demostración. En desarrollo corre en el puerto 5174.
export default defineConfig({
  base: "/georreferenciado/",
  plugins: [react()],
  envDir: "../..",
  server: { port: 5174, strictPort: true },
  preview: { port: 5174 },
  build: { outDir: "../../dist/georreferenciado", emptyOutDir: true, sourcemap: false },
});
