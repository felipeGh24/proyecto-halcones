// Sirve los tres sistemas ya compilados (dist/) bajo un mismo origen, como en producción:
//   http://localhost:4173/halcones/  ·  /georreferenciado/  ·  /analisis/
// Al compartir origen comparten la sesión y los datos de demostración entre pestañas.
// Uso: npm run build && npm run demo
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "dist");
const APPS = ["halcones", "georreferenciado", "analisis"];
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
  const app = ruta.split("/")[1];
  if (!APPS.includes(app)) {
    res.writeHead(302, { location: "/halcones/" });
    return res.end();
  }
  let archivo = join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ)) return res.writeHead(400).end();
  try {
    if (!(await stat(archivo)).isFile()) throw new Error();
  } catch {
    archivo = join(RAIZ, app, "index.html"); // rutas internas de la app (SPA)
  }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { "content-type": TIPOS[extname(archivo)] ?? "application/octet-stream", "x-content-type-options": "nosniff" });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end("No encontrado. ¿Ejecutaste npm run build?");
  }
}).listen(4173, () => console.log("Demo en http://localhost:4173/halcones/"));
