// Convierte scripts/datos/calles-conchali.txt en packages/datos/src/geo/calles-osm.ts (calles embebidas en el sistema).
//
// Cómo se obtuvo el archivo (repetir para actualizar las calles o para otro municipio):
//   1. Consulta en Overpass (https://overpass-turbo.eu), cambiando el nombre de la comuna:
//        [out:json][timeout:120];
//        area["name"="Conchalí"]["admin_level"="8"]->.c;
//        way(area.c)["highway"~"^(primary|secondary|tertiary|trunk|motorway|residential|unclassified|living_street|
//          primary_link|secondary_link|tertiary_link|trunk_link|motorway_link|pedestrian|footway|service)$"];
//        out geom;
//   2. Se descartan servicios, veredas y peatonales sin nombre (salvo puentes/pasarelas), se simplifica a 2,5 m
//      y se guarda en formato compacto: una cabecera JSON {tipos, nombres} y, por tramo,
//      «nombre(base36) tipo banderas dx,dy,…» con coordenadas ×1e5 en diferencias (base36), tramos separados por «;».
// Datos © colaboradores de OpenStreetMap, licencia ODbL: el mapa debe mostrar ese crédito.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const texto = readFileSync(join(raiz, "scripts/datos/calles-conchali.txt"), "utf8");
const tramos = texto.slice(texto.indexOf("\n") + 1).split(";").length;
writeFileSync(
  join(raiz, "packages/datos/src/geo/calles-osm.ts"),
  `/* Generado con «node scripts/calles-osm.mjs» desde OpenStreetMap (© colaboradores de OpenStreetMap, ODbL).\n * ${tramos} tramos de calles de Conchalí, descargados el 26-11-2026. No editar a mano. */\nexport const CALLES_OSM = ${JSON.stringify(texto)};\n`,
);
console.log(`calles-osm.ts: ${tramos} tramos`);
