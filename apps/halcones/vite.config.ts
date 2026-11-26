import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cada sistema se publica bajo su propia ruta (/halcones/) para que los tres compartan dominio,
// sesión y datos de demostración. En desarrollo corre en el puerto 5173.
export default defineConfig({
  base: "/halcones/",
  plugins: [react()],
  envDir: "../..",
  server: { port: 5173, strictPort: true },
  preview: { port: 5173 },
  build: { outDir: "../../dist/halcones", emptyOutDir: true, sourcemap: false },
});
