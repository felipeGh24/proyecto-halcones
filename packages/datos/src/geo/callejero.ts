import type { Punto } from "../tipos";
import { CALLES_OSM } from "./calles-osm";

/**
 * Callejero de Conchalí embebido en el sistema (OpenStreetMap, ODbL).
 *
 * Permite dibujar las calles y ubicar direcciones sin depender de ningún servicio externo: funciona sin internet,
 * en redes municipales que bloquean sitios y en la página de demostración. Se actualiza con scripts/calles-osm.mjs.
 */
export interface Via {
  nombre: string;
  tipo: string;
  puente: boolean;
  tunel: boolean;
  puntos: Punto[];
}

export interface Calle {
  /** Nombre oficial como viene en OpenStreetMap («Avenida Independencia»). */
  nombre: string;
  /** Palabras normalizadas sin el tipo de vía («independencia»). */
  palabras: string[];
  esPasaje: boolean;
  /** Importancia de la vía: 3 autopista o avenida principal, 0 pasaje. */
  rango: number;
  tramos: Punto[][];
}

const RANGO: Record<string, number> = { motorway: 3, trunk: 3, primary: 3, secondary: 2, tertiary: 2, unclassified: 1, residential: 1, living_street: 0, service: 0, pedestrian: 0, footway: 0 };

let cacheVias: Via[] | null = null;

/** Tramos de calles decodificados del formato compacto. */
export function vias(): Via[] {
  if (cacheVias) return cacheVias;
  const corte = CALLES_OSM.indexOf("\n");
  const cab = JSON.parse(CALLES_OSM.slice(0, corte)) as { tipos: string[]; nombres: string[] };
  cacheVias = CALLES_OSM.slice(corte + 1)
    .split(";")
    .map((fila) => {
      const [n, t, b, d] = fila.split(" ");
      const nums = d.split(",").map((x) => parseInt(x, 36));
      const puntos: Punto[] = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        x += nums[i];
        y += nums[i + 1];
        puntos.push({ lng: x / 1e5, lat: y / 1e5 });
      }
      const f = Number(b);
      return { nombre: cab.nombres[parseInt(n, 36)], tipo: cab.tipos[Number(t)], puente: (f & 1) === 1, tunel: (f & 2) === 2, puntos };
    });
  return cacheVias;
}

/* ---------------- Normalización de nombres ---------------- */

const ABREVIATURAS: Record<string, string> = {
  av: "avenida", avda: "avenida", avd: "avenida", ave: "avenida",
  pje: "pasaje", psje: "pasaje", pj: "pasaje", pasj: "pasaje",
  gral: "general", gnral: "general", grl: "general",
  tte: "teniente", tnte: "teniente",
  pdte: "presidente", pte: "presidente",
  cdl: "cardenal", card: "cardenal", cardl: "cardenal",
  sta: "santa", sto: "santo", sn: "san",
  dr: "doctor", dra: "doctora", prof: "profesor", ing: "ingeniero",
  cap: "capitan", cpt: "capitan", cmdte: "comandante", sgto: "sargento", cabo: "cabo", mons: "monsenor",
  pob: "poblacion", villa: "villa", jm: "jose maria", "j.m": "jose maria",
};

/** Palabras que indican el tipo de vía; no sirven para distinguir calles. */
const TIPOS_VIA = new Set(["avenida", "calle", "pasaje", "autopista", "acceso", "diagonal", "camino", "caletera", "ruta", "callejon", "costanera"]);
const VACIAS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/** «Avda. Cardenal J. M. Caro» → «avenida cardenal j m caro» (sin tildes ni signos, abreviaturas expandidas). */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª]/g, " ")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => ABREVIATURAS[p] ?? p)
    .join(" ");
}

/** Palabras que distinguen la calle: sin tipo de vía ni artículos. */
export function palabrasClave(texto: string): string[] {
  return normalizarTexto(texto)
    .split(" ")
    .filter((p) => p && !TIPOS_VIA.has(p) && !VACIAS.has(p));
}

/** Otros nombres con que la gente conoce algunas calles. */
const ALIAS: [string, string][] = [
  ["panamericana", "Avenida Presidente Eduardo Frei Montalva"],
  ["ruta 5", "Avenida Presidente Eduardo Frei Montalva"],
  ["caletera", "Avenida Presidente Eduardo Frei Montalva"],
  ["norte sur", "Avenida Presidente Eduardo Frei Montalva"],
  ["vespucio", "Avenida Américo Vespucio"],
  ["circunvalacion", "Avenida Américo Vespucio"],
  ["jose maria caro", "Avenida Diagonal Cardenal José María Caro"],
  ["cardenal caro", "Avenida Diagonal Cardenal José María Caro"],
];

let cacheCalles: Map<string, Calle> | null = null;

/** Calles agrupadas por nombre (una calle suele venir en muchos tramos). */
export function calles(): Map<string, Calle> {
  if (cacheCalles) return cacheCalles;
  cacheCalles = new Map();
  for (const v of vias()) {
    if (!v.nombre) continue;
    const c = cacheCalles.get(v.nombre);
    if (c) {
      c.tramos.push(v.puntos);
      c.rango = Math.max(c.rango, RANGO[v.tipo] ?? 1);
    } else
      cacheCalles.set(v.nombre, {
        nombre: v.nombre,
        palabras: palabrasClave(v.nombre),
        esPasaje: /^pasaje\b/.test(normalizarTexto(v.nombre)),
        rango: RANGO[v.tipo] ?? 1,
        tramos: [v.puntos],
      });
  }
  return cacheCalles;
}

/* ---------------- Parecido entre palabras ---------------- */

function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = t;
    }
  }
  return fila[b.length];
}

/** 1 = igual; 0,9 = la palabra escrita es el comienzo; menos según errores de tipeo; 0 = distinta. */
function parecido(escrita: string, real: string): number {
  if (escrita === real) return 1;
  if (escrita.length >= 3 && real.startsWith(escrita)) return 0.9;
  if (escrita.length === 1 && real.startsWith(escrita)) return 0.75; // iniciales: «j m caro»
  if (escrita.length < 4) return 0;
  const errores = distanciaEdicion(escrita, real.slice(0, Math.max(escrita.length, Math.min(real.length, escrita.length + 1))));
  const tolerados = escrita.length >= 8 ? 2 : 1;
  return errores <= tolerados ? 0.85 - errores * 0.05 : 0;
}

export interface Coincidencia {
  calle: Calle;
  puntaje: number;
}

/**
 * Calles que coinciden con lo escrito, de la más probable a la menos probable.
 * Cada palabra escrita tiene que parecerse a alguna palabra del nombre (en cualquier orden).
 */
export function buscarCalle(escrito: string, maximo = 5): Coincidencia[] {
  const norm = normalizarTexto(escrito);
  const pidePasaje = /\bpasaje\b/.test(norm);
  const alias = ALIAS.find(([a]) => norm === a || norm.endsWith(` ${a}`) || norm.startsWith(`${a} `));
  const buscadas = palabrasClave(escrito);
  if (!buscadas.length) return [];
  const resultado: Coincidencia[] = [];
  for (const c of calles().values()) {
    let suma = 0;
    let ok = true;
    for (const b of buscadas) {
      const mejor = Math.max(0, ...c.palabras.map((p) => parecido(b, p)));
      if (mejor === 0) {
        ok = false;
        break;
      }
      suma += mejor;
    }
    const porAlias = alias && c.nombre === alias[1];
    if (!ok && !porAlias) continue;
    let puntaje = porAlias ? 1.05 : suma / buscadas.length;
    puntaje -= 0.03 * Math.max(0, c.palabras.length - buscadas.length);
    puntaje += c.rango * 0.01;
    if (c.esPasaje !== pidePasaje) puntaje -= c.esPasaje ? 0.12 : 0.04;
    resultado.push({ calle: c, puntaje });
  }
  return resultado.sort((a, b) => b.puntaje - a.puntaje).slice(0, maximo);
}

/* ---------------- Geometría ---------------- */

const M_LAT = 110574;
const M_LNG = 111320 * Math.cos((33.39 * Math.PI) / 180);

export function metros(a: Punto, b: Punto): number {
  return Math.hypot((a.lng - b.lng) * M_LNG, (a.lat - b.lat) * M_LAT);
}

/** Punto de la calle más cercano a p, con la distancia. */
export function puntoMasCercano(c: Calle, p: Punto): { punto: Punto; distancia: number } {
  let mejor = { punto: c.tramos[0][0], distancia: Infinity };
  for (const t of c.tramos)
    for (let i = 0; i + 1 < t.length; i++) {
      const [a, b] = [t[i], t[i + 1]];
      const ax = (b.lng - a.lng) * M_LNG;
      const ay = (b.lat - a.lat) * M_LAT;
      const px = (p.lng - a.lng) * M_LNG;
      const py = (p.lat - a.lat) * M_LAT;
      const largo = ax * ax + ay * ay || 1e-9;
      const k = Math.max(0, Math.min(1, (px * ax + py * ay) / largo));
      const q = { lng: a.lng + (b.lng - a.lng) * k, lat: a.lat + (b.lat - a.lat) * k };
      const d = metros(p, q);
      if (d < mejor.distancia) mejor = { punto: q, distancia: d };
    }
  return mejor;
}

function cruceSegmentos(a: Punto, b: Punto, c: Punto, d: Punto): Punto | null {
  const r = { x: b.lng - a.lng, y: b.lat - a.lat };
  const s = { x: d.lng - c.lng, y: d.lat - c.lat };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-14) return null;
  const t = ((c.lng - a.lng) * s.y - (c.lat - a.lat) * s.x) / den;
  const u = ((c.lng - a.lng) * r.y - (c.lat - a.lat) * r.x) / den;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { lng: a.lng + r.x * t, lat: a.lat + r.y * t };
}

/**
 * Esquinas donde se cruzan dos calles (pueden ser varias si una calle es curva o tiene dos tramos).
 * Si no se cortan, el punto donde más se acercan, siempre que estén a menos de 80 m (calles que terminan en «T»).
 */
export function esquinas(a: Calle, b: Calle): Punto[] {
  const encontrados: Punto[] = [];
  for (const ta of a.tramos)
    for (let i = 0; i + 1 < ta.length; i++)
      for (const tb of b.tramos)
        for (let j = 0; j + 1 < tb.length; j++) {
          const p = cruceSegmentos(ta[i], ta[i + 1], tb[j], tb[j + 1]);
          if (p) encontrados.push(p);
        }
  if (!encontrados.length) {
    let mejor: { d: number; p: Punto } | null = null;
    for (const t of a.tramos)
      for (const p of t) {
        const q = puntoMasCercano(b, p);
        if (!mejor || q.distancia < mejor.d) mejor = { d: q.distancia, p: { lat: (p.lat + q.punto.lat) / 2, lng: (p.lng + q.punto.lng) / 2 } };
      }
    if (mejor && mejor.d <= 80) encontrados.push(mejor.p);
  }
  // Agrupa los cruces que están a menos de 80 m (una avenida con bandejas cruza dos veces la misma calle).
  const grupos: Punto[][] = [];
  for (const p of encontrados) {
    const g = grupos.find((x) => metros(x[0], p) < 80);
    if (g) g.push(p);
    else grupos.push([p]);
  }
  return grupos.map((g) => ({ lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lng, 0) / g.length }));
}

/** Punto medio representativo de la calle (el vértice más cercano al promedio). */
export function centroCalle(c: Calle): Punto {
  const todos = c.tramos.flat();
  const m = { lat: todos.reduce((s, p) => s + p.lat, 0) / todos.length, lng: todos.reduce((s, p) => s + p.lng, 0) / todos.length };
  return puntoMasCercano(c, m).punto;
}

/** Calle con nombre más cercana a un punto (máximo 60 m). */
export function calleEnPunto(p: Punto): Calle | null {
  let mejor: { c: Calle; d: number } | null = null;
  for (const c of calles().values()) {
    const d = puntoMasCercano(c, p).distancia;
    if (d <= 60 && (!mejor || d < mejor.d - (c.rango - mejor.c.rango) * 3)) mejor = { c, d };
  }
  return mejor?.c ?? null;
}

/** Calles en formato GeoJSON para dibujarlas en el mapa. */
export function callesGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: vias().map((v) => ({
      type: "Feature" as const,
      properties: { nombre: v.nombre, rango: RANGO[v.tipo] ?? 1, puente: v.puente ? 1 : 0 },
      geometry: { type: "LineString" as const, coordinates: v.puntos.map((p) => [p.lng, p.lat]) },
    })),
  };
}
