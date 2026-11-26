// Portada de la versión para ver en Claude: abre Halcones al entrar.
// Uso: npm run build:artefacto  →  dist-artefacto/ (index.html + halcones/ + georreferenciado/ + analisis/)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const salida = join(dirname(fileURLToPath(import.meta.url)), "..", "dist-artefacto", "index.html");
writeFileSync(
  salida,
  `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plataforma de Seguridad Pública · demo</title>
<script>location.replace("halcones/index.html#/ingreso");</script>
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px">
<p>Abriendo Halcones… Si no se abre, entra a <a href="halcones/index.html#/ingreso">Halcones</a>,
<a href="georreferenciado/index.html">Georreferenciado</a> o <a href="analisis/index.html">Análisis de eventos</a>.</p>
</body>
</html>
`,
);
console.log("Portada lista:", salida);
