import type { Punto } from "../tipos";
import { buscarCalle, calleEnPunto, calles, centroCalle, esquinas, metros, normalizarTexto, puntoMasCercano, type Calle } from "./callejero";

/**
 * Buscador de direcciones propio (sin servicios externos). Entiende cómo escribe la gente:
 *  - esquinas: «A con B», «A esquina B», «A esq. B», «A y B», «A / B», «A & B», «A c/ B», «esquina de A con B», «A - B»
 *  - abreviaturas y errores: «Avda. Independensia», «Gral. Gambino», «Cdl. Caro», sin tildes
 *  - número: «Independencia 5663», «Independencia #5663», «Independencia N° 5663», «5663 Independencia»
 *  - lugares conocidos (GAMA, SAPU, metro, puntos fijos) y direcciones que el equipo ya corrigió antes.
 *
 * La numeración se calcula entre números conocidos de la misma calle (anclas). Cada dirección que un operador
 * corrige en el mapa queda como ancla nueva, así que el buscador mejora con el uso.
 */
export type TipoSugerencia = "direccion" | "esquina" | "calle" | "lugar";

export interface SugerenciaLocal {
  texto: string;
  detalle: string;
  punto: Punto;
  tipo: TipoSugerencia;
  /** true cuando el punto es estimado y conviene confirmarlo en el mapa. */
  aproximado?: boolean;
}

export interface LugarBuscable {
  nombre: string;
  /** Otros textos con que se puede buscar (código «GAMA 4», «G4», dirección). */
  claves: string[];
  punto: Punto;
  detalle: string;
}

export interface Ancla {
  calle: string;
  numero: number;
  punto: Punto;
}

/** Números conocidos con certeza (direcciones oficiales en esquinas). */
const ANCLAS_BASE: { calle: string; numero: number; esquinaCon: string }[] = [
  // Municipalidad de Conchalí, Av. Independencia 3499 (esquina La Palma).
  { calle: "Avenida Independencia", numero: 3499, esquinaCon: "La Palma" },
  // Metro Vivaceta, Av. Independencia 4765 (esquina Los Zapadores).
  { calle: "Avenida Independencia", numero: 4765, esquinaCon: "Avenida Los Zapadores" },
  // Metro Cardenal Caro, Av. José María Caro 1857 (esquina Independencia).
  { calle: "Avenida Diagonal Cardenal José María Caro", numero: 1857, esquinaCon: "Avenida Independencia" },
];

let anclasExtra: Ancla[] = [];
let lugares: LugarBuscable[] = [];

/** Agrega anclas de numeración (direcciones corregidas por el equipo). */
export function registrarAnclas(a: Ancla[]) {
  anclasExtra = a;
}

/** Lugares conocidos que también se pueden buscar por nombre. */
export function registrarLugares(l: LugarBuscable[]) {
  lugares = l;
}

let cacheAnclas: Ancla[] | null = null;
function anclas(): Ancla[] {
  if (!cacheAnclas) {
    const mapa = calles();
    cacheAnclas = ANCLAS_BASE.flatMap((a) => {
      const c = mapa.get(a.calle);
      const o = mapa.get(a.esquinaCon);
      const p = c && o ? esquinas(c, o)[0] : undefined;
      return p ? [{ calle: a.calle, numero: a.numero, punto: p }] : [];
    });
  }
  return [...cacheAnclas, ...anclasExtra];
}

/* ---------------- Lectura de lo escrito ---------------- */

const SEPARADORES = [
  /\s+(?:esquina\s+(?:de\s+|con\s+)?|esq\.?\s+(?:de\s+|con\s+)?)/i,
  /\s+con\s+/i,
  /\s*\/\s*/,
  /\s*&\s*/,
  /\s+c\/\s*/i,
  /\s+(?:y|e)\s+/i,
  /\s+-\s+/,
  /\s*,\s*/,
  /\s+x\s+/i,
];

/** Quita la comuna, referencias y signos que no ayudan a ubicar. */
export function limpiar(texto: string): string {
  let t = texto;
  const entre = /\(([^)]*)\)/.exec(t)?.[1];
  if (entre && SEPARADORES.slice(0, 6).some((s) => s.test(entre))) t = entre;
  return t
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(frente a|al lado de|cerca de|a pasos de|a media cuadra de|altura|al llegar a)\b.*$/i, " ")
    .replace(/,?\s*(conchal[ií]|santiago|regi[oó]n metropolitana|rm|chile)(?=[\s,.]|$)/gi, " ")
    .replace(/^\s*(?:esquina|esq\.?)\s+(?:de\s+)?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Separa «calle número»; también acepta el número antes («5663 Independencia»). */
export function partirNumero(t: string): { calle: string; numero: number } | null {
  const despues = /^(.*?[a-zñáéíóú.]{2,})\s*(?:#|n[°º.]?|nro\.?|num\.?|n[úu]mero)?\s*(\d{1,5})(?:\s*[-/]?\s*[a-z])?\s*(?:depto\.?.*|dpto\.?.*|casa.*|block.*|interior.*)?$/i.exec(t);
  if (despues) return { calle: despues[1].trim(), numero: Number(despues[2]) };
  const antes = /^(\d{1,5})\s+(.*[a-zñ].*)$/i.exec(t);
  if (antes) return { calle: antes[2].trim(), numero: Number(antes[1]) };
  return null;
}

/** Todas las formas de partir el texto en dos calles. */
export function candidatosEsquina(t: string): [string, string][] {
  const out: [string, string][] = [];
  for (const s of SEPARADORES) {
    const partes = t.split(s).map((x) => x.trim()).filter(Boolean);
    if (partes.length === 2 && !/^\d+$/.test(partes[0]) && !/^\d+$/.test(partes[1])) out.push([partes[0], partes[1]]);
    // «A con B y C» (entre calles): se usa el primer cruce.
    if (partes.length === 3 && s.source.includes("con")) out.push([partes[0], partes[1].split(/\s+(?:y|e)\s+/i)[0]]);
  }
  return out;
}

/* ---------------- Búsqueda ---------------- */

function textoEsquina(a: Calle, b: Calle) {
  return `${a.nombre} con ${b.nombre}`;
}

function buscarEsquinas(t: string): SugerenciaLocal[] {
  const out: SugerenciaLocal[] = [];
  for (const [x, y] of candidatosEsquina(t)) {
    const ca = buscarCalle(x, 3).filter((c) => c.puntaje >= 0.6);
    const cb = buscarCalle(y, 3).filter((c) => c.puntaje >= 0.6);
    for (const a of ca)
      for (const b of cb) {
        if (a.calle === b.calle) continue;
        const ps = esquinas(a.calle, b.calle);
        ps.forEach((p, i) =>
          out.push({ texto: textoEsquina(a.calle, b.calle), detalle: ps.length > 1 ? `Esquina ${i + 1} de ${ps.length} · Conchalí` : "Esquina · Conchalí", punto: p, tipo: "esquina", aproximado: false }),
        );
      }
    if (out.length) break;
  }
  return out;
}

/** Ubica un número en la calle con las anclas conocidas (interpolando o extrapolando a lo largo de la calle). */
function ubicarNumero(c: Calle, numero: number): { punto: Punto; aproximado: boolean } | null {
  const propias = anclas()
    .filter((a) => a.calle === c.nombre)
    .sort((a, b) => a.numero - b.numero);
  const exacta = propias.find((a) => a.numero === numero);
  if (exacta) return { punto: exacta.punto, aproximado: false };
  if (propias.length < 2) return null;
  // Dos anclas más cercanas al número (o las dos de un extremo, para extrapolar poco).
  let [a, b] = [propias[0], propias[1]];
  for (let i = 0; i + 1 < propias.length; i++) if (propias[i].numero <= numero) [a, b] = [propias[i], propias[i + 1]];
  const k = (numero - a.numero) / (b.numero - a.numero);
  if (k < -1.5 || k > 3) return null; // demasiado lejos de lo conocido
  const estimado = { lat: a.punto.lat + (b.punto.lat - a.punto.lat) * k, lng: a.punto.lng + (b.punto.lng - a.punto.lng) * k };
  const sobre = puntoMasCercano(c, estimado);
  if (sobre.distancia > 250) return null;
  return { punto: sobre.punto, aproximado: true };
}

function buscarLugares(t: string): SugerenciaLocal[] {
  const n = normalizarTexto(t);
  if (n.length < 2) return [];
  return lugares
    .map((l) => {
      const textos = [l.nombre, ...l.claves].map(normalizarTexto);
      const exacto = textos.some((x) => x === n);
      const contiene = textos.some((x) => x.includes(n) || (n.length >= 4 && n.split(" ").every((p) => x.includes(p))));
      return { l, puntaje: exacto ? 2 : contiene ? 1 : 0 };
    })
    .filter((x) => x.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 4)
    .map(({ l }) => ({ texto: l.nombre, detalle: l.detalle, punto: l.punto, tipo: "lugar" as const }));
}

/** Sugerencias para lo que escribe el operador, de la más probable a la menos probable. */
export function buscarLocal(texto: string, maximo = 6): SugerenciaLocal[] {
  const t = limpiar(texto);
  if (t.length < 3) return [];
  const out: SugerenciaLocal[] = [...buscarLugares(t)];
  const conNumero = partirNumero(t);
  const esq = conNumero ? [] : buscarEsquinas(t);
  out.push(...esq);
  if (conNumero) {
    for (const { calle } of buscarCalle(conNumero.calle, 2).filter((c) => c.puntaje >= 0.6)) {
      const u = ubicarNumero(calle, conNumero.numero);
      out.push(
        u
          ? { texto: `${calle.nombre} ${conNumero.numero}`, detalle: u.aproximado ? "Número estimado · confirma el punto en el mapa" : "Dirección · Conchalí", punto: u.punto, tipo: "direccion", aproximado: u.aproximado }
          : { texto: `${calle.nombre} ${conNumero.numero}`, detalle: "Número sin ubicar: el punto queda en la calle, muévelo a la casa", punto: centroCalle(calle), tipo: "calle", aproximado: true },
      );
    }
  }
  if (!esq.length && !conNumero)
    for (const { calle, puntaje } of buscarCalle(t, 4))
      if (puntaje >= 0.6) out.push({ texto: calle.nombre, detalle: "Calle · elige el punto exacto en el mapa", punto: centroCalle(calle), tipo: "calle", aproximado: true });
  const vistos = new Set<string>();
  return out
    .filter((s) => {
      const k = `${s.texto}|${s.punto.lat.toFixed(4)}|${s.punto.lng.toFixed(4)}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, maximo);
}

/** Esquina entre dos calles escritas por separado. */
export function esquinaLocal(a: string, b: string): SugerenciaLocal | null {
  return buscarEsquinas(`${a} con ${b}`)[0] ?? null;
}

/** Texto de dirección para un punto tocado en el mapa: «Calle con Calle» o «Calle (cerca de Calle)». */
export function direccionLocal(p: Punto): string | null {
  const c = calleEnPunto(p);
  if (!c) return null;
  let mejor: { otra: Calle; d: number } | null = null;
  for (const otra of calles().values()) {
    if (otra === c || otra.esPasaje) continue;
    if (puntoMasCercano(otra, p).distancia > 150) continue;
    for (const e of esquinas(c, otra)) {
      const d = metros(e, p);
      if (d <= 120 && (!mejor || d < mejor.d)) mejor = { otra, d };
    }
  }
  if (!mejor) return c.nombre;
  return mejor.d <= 25 ? `${c.nombre} con ${mejor.otra.nombre}` : `${c.nombre} (cerca de ${mejor.otra.nombre})`;
}

/** Si el texto es «calle número», la calle oficial y el número (para guardar anclas). */
export function calleYNumero(texto: string): { calle: string; numero: number } | null {
  const n = partirNumero(limpiar(texto));
  if (!n) return null;
  const c = buscarCalle(n.calle, 1)[0];
  return c && c.puntaje >= 0.6 ? { calle: c.calle.nombre, numero: n.numero } : null;
}
