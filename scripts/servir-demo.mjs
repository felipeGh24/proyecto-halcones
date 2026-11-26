// Sirve los tres sistemas ya compilados bajo un mismo origen, como en producción:
//   http://localhost:4173/halcones/  ·  /georreferenciado/  ·  /analisis/
// Al compartir origen comparten la sesión y los datos de demostración entre pestañas.
// Uso: npm run build && npm run demo   (en la demo empaquetada: doble clic en «Iniciar demo»)
// Funciona con cualquier Node.js 18 o superior y no necesita instalar nada.
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { exec } from "node:child_process";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
// En el repositorio el script está en scripts/ y dist/ en la raíz; en la demo empaquetada, dist/ está al lado.
const RAIZ = existsSync(join(AQUI, "dist")) ? join(AQUI, "dist") : join(AQUI, "..", "dist");
const APPS = ["halcones", "georreferenciado", "analisis"];
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

if (!existsSync(join(RAIZ, "halcones", "index.html"))) {
  console.error(`\nNo se encontró la carpeta dist con los sistemas en:\n  ${RAIZ}\n¿Descomprimiste el zip completo? (En el repositorio: ejecuta primero «npm run build»).\n`);
  process.exit(1);
}

function abrirNavegador(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

const servidor = createServer(async (req, res) => {
  try {
    const ruta = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
    const app = ruta.split(/[\\/]/)[1];
    if (!APPS.includes(app)) {
      res.writeHead(302, { location: "/halcones/" });
      return res.end();
    }
    let archivo = join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ + sep)) return res.writeHead(400).end();
    try {
      if (!(await stat(archivo)).isFile()) throw new Error("no es archivo");
    } catch {
      archivo = join(RAIZ, app, "index.html"); // rutas internas de la app (SPA)
    }
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { "content-type": TIPOS[extname(archivo)] ?? "application/octet-stream", "x-content-type-options": "nosniff", "cache-control": "no-cache" });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
});

// Si el puerto 4173 está ocupado, prueba los siguientes.
function escuchar(puerto, intentos = 10) {
  servidor.once("error", (e) => {
    if (e.code === "EADDRINUSE" && intentos > 0) return escuchar(puerto + 1, intentos - 1);
    console.error("\nNo se pudo iniciar la demo:", e.message);
    process.exit(1);
  });
  servidor.listen(puerto, () => {
    const url = `http://localhost:${puerto}/halcones/ingreso`;
    console.log("\n  Plataforma de Seguridad Pública · demo");
    console.log(`  Halcones:          http://localhost:${puerto}/halcones/`);
    console.log(`  Georreferenciado:  http://localhost:${puerto}/georreferenciado/`);
    console.log(`  Análisis:          http://localhost:${puerto}/analisis/`);
    console.log("\n  Deja esta ventana abierta mientras usas los sistemas. Para terminar, ciérrala.\n");
    if (!process.argv.includes("--sin-navegador")) abrirNavegador(url);
  });
}

escuchar(Number(process.env.PUERTO) || 4173);
