import type { Punto } from "./tipos";
import { buscarLocal, calleYNumero, direccionLocal, esquinaLocal, LIMITES_COMUNA, normalizarTexto, registrarAnclas, registrarLugares, unidadVecinalCercana, unidadVecinalDe, distanciaMetros } from "./geo";
import { leerPuntosInteres } from "./puntos-interes";
import { leerPuntosFijos } from "./puntos-fijos";

/**
 * Direcciones ↔ puntos, solo dentro de Conchalí.
 *
 * Primero busca en el callejero propio (geo/buscador-local.ts: calles de OpenStreetMap embebidas, sin internet).
 * Solo si ahí no encuentra nada consulta el servicio público de OpenStreetMap (Nominatim), que pide como máximo
 * una consulta por segundo y no garantiza disponibilidad. Para vender: instancia propia de Nominatim/Photon o un proveedor con contrato,
 * configurable con VITE_GEOCODIFICADOR_URL («ninguno» lo desactiva y queda solo el clic en el mapa).
 *
 * Entiende «calle número» y esquinas: «Independencia con La Palma», «Av. Dorsal esq. Independencia», «Pedro Fontova / Pamplona».
 */
export interface SugerenciaDireccion {
  texto: string;
  detalle: string;
  punto: Punto;
  tipo: "direccion" | "esquina" | "calle" | "lugar";
  /** true cuando el punto es estimado y conviene confirmarlo en el mapa. */
  aproximado?: boolean;
  /** Si existe, el punto se obtiene al elegir la sugerencia (por ejemplo, Google Places). */
  resolver?: () => Promise<Punto>;
}

/* ---------------- Direcciones aprendidas ---------------- */

const CLAVE_APRENDIDAS = "plataforma.direcciones-aprendidas.v1";
interface Aprendida {
  texto: string;
  punto: Punto;
}

function leerAprendidas(): Record<string, Aprendida> {
  try {
    return (JSON.parse(localStorage.getItem(CLAVE_APRENDIDAS) ?? "null") as Record<string, Aprendida> | null) ?? {};
  } catch {
    return {};
  }
}

/**
 * Guarda una dirección con el punto que confirmó el operador. La próxima vez aparece exacta y, si es «calle número»,
 * sirve de referencia para estimar los demás números de esa calle.
 */
export function recordarDireccion(texto: string, punto: Punto) {
  const t = texto.trim();
  if (t.length < 4 || !unidadVecinalCercana(punto)) return;
  const a = leerAprendidas();
  a[normalizarTexto(t)] = { texto: t, punto };
  try {
    localStorage.setItem(CLAVE_APRENDIDAS, JSON.stringify(a));
  } catch {
    /* sin espacio */
  }
}

/** Lugares y referencias que el buscador local usa además de las calles. */
function prepararBuscadorLocal() {
  const aprendidas = Object.values(leerAprendidas());
  registrarAnclas(aprendidas.flatMap((a) => {
    const n = calleYNumero(a.texto);
    return n ? [{ ...n, punto: a.punto }] : [];
  }));
  registrarLugares([
    ...leerPuntosInteres()
      .filter((p) => p.ubicacion)
      .map((p) => ({ nombre: p.nombre, claves: [p.codigo ?? "", p.corto ?? "", p.codigo ? p.codigo.replace(/\s+/g, "") : ""].filter((x) => x.length >= 2), punto: p.ubicacion!, detalle: `${p.codigo ? `${p.codigo} · ` : ""}${p.direccion}` })),
    ...leerPuntosFijos()
      .filter((p) => p.ubicacion && p.activo)
      .map((p) => ({ nombre: `Punto fijo ${p.nombre}`, claves: [p.nombre], punto: p.ubicacion!, detalle: p.direccion || "Punto fijo" })),
    ...aprendidas.map((a) => ({ nombre: a.texto, claves: [], punto: a.punto, detalle: "Dirección usada antes · punto confirmado" })),
  ]);
}

const URL_BASE = (() => {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GEOCODIFICADOR_URL;
    return v === undefined || v === "" ? "https://nominatim.openstreetmap.org" : v;
  } catch {
    return "https://nominatim.openstreetmap.org";
  }
})();

export const geocodificadorActivo = () => URL_BASE !== "ninguno" && typeof fetch === "function";

const MARGEN = 0.004;
const VIEWBOX = [LIMITES_COMUNA.minLng - MARGEN, LIMITES_COMUNA.maxLat + MARGEN, LIMITES_COMUNA.maxLng + MARGEN, LIMITES_COMUNA.minLat - MARGEN].join(",");
const SEPARADOR_ESQUINA = /\s+(?:con|esq\.?|esquina(?:\s+de)?|c\/|y)\s+|\s*\/\s*|\s*&\s*/i;

const cache = new Map<string, unknown>();
let ultima = 0;

/** Respeta el límite de una consulta por segundo del servicio público. */
async function turno(signal?: AbortSignal) {
  const espera = Math.max(0, ultima + 1100 - Date.now());
  ultima = Date.now() + espera;
  if (espera) await new Promise((ok) => setTimeout(ok, espera));
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
}

async function pedir<T>(ruta: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = `${URL_BASE}${ruta}?${new URLSearchParams({ format: "jsonv2", "accept-language": "es", ...params })}`;
  if (cache.has(url)) return cache.get(url) as T;
  await turno(signal);
  const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`El buscador de direcciones respondió ${r.status}`);
  const j = (await r.json()) as T;
  cache.set(url, j);
  return j;
}

interface ResultadoNominatim {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  type?: string;
  addresstype?: string;
  address?: Record<string, string>;
  geojson?: { type: string; coordinates: unknown };
}

/** Quita «Conchalí», «Santiago», «Chile» y abreviaturas para que la búsqueda sea más precisa. */
export function limpiarDireccion(t: string): string {
  return t
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(frente a|al lado de|cerca de|a pasos de)\b.*$/i, " ")
    .replace(/,?\s*(conchal[ií]|santiago|regi[oó]n metropolitana|chile)(?=[\s,.]|$)/gi, " ")
    .replace(/\bav(da)?\.?\s/gi, "Avenida ")
    .replace(/\bpje\.?\s/gi, "Pasaje ")
    .replace(/\bgral\.?\s/gi, "General ")
    .replace(/\btte\.?\s/gi, "Teniente ")
    .replace(/\bpdte\.?\s/gi, "Presidente ")
    .replace(/\bn[°º]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide «A con B» en dos calles; null si no es una esquina. */
export function partirEsquina(t: string): [string, string] | null {
  // «Plaza Sagitario (Palmilla con Sagitario)»: la esquina viene entre paréntesis.
  const entre = /\(([^)]*)\)/.exec(t)?.[1];
  if (entre && SEPARADOR_ESQUINA.test(entre)) return partirEsquina(entre);
  const limpio = limpiarDireccion(t);
  const partes = (limpio.includes(",") ? limpio.split(",").pop()! : limpio).split(SEPARADOR_ESQUINA).map((s) => s.trim()).filter(Boolean);
  if (partes.length !== 2) return null;
  // «Calle 123 y …» no es esquina si la primera parte ya trae número.
  if (/\d{2,}/.test(partes[0]) && !/^\d/.test(partes[0])) return null;
  return [partes[0], partes[1]];
}

const enComuna = (p: Punto) => !!unidadVecinalDe(p);

function textoDe(r: ResultadoNominatim): { texto: string; detalle: string } {
  const a = r.address ?? {};
  const calle = a.road ?? a.pedestrian ?? a.footway ?? r.name ?? r.display_name.split(",")[0];
  const numero = a.house_number ? ` ${a.house_number}` : "";
  const lugar = r.name && r.name !== calle ? `${r.name} · ` : "";
  return { texto: `${lugar}${calle}${numero}`, detalle: [a.neighbourhood ?? a.suburb, a.city_district ?? a.city ?? "Conchalí"].filter(Boolean).join(", ") };
}

/** Vértices de las calles con ese nombre dentro de la comuna (para calcular esquinas). */
async function verticesDeCalle(nombre: string, signal?: AbortSignal): Promise<Punto[]> {
  const rs = await pedir<ResultadoNominatim[]>("/search", { street: nombre, city: "Conchalí", countrycodes: "cl", viewbox: VIEWBOX, bounded: "1", polygon_geojson: "1", limit: "10" }, signal);
  const pts: Punto[] = [];
  for (const r of rs) {
    const g = r.geojson;
    if (!g) continue;
    const lineas = g.type === "LineString" ? [g.coordinates as number[][]] : g.type === "MultiLineString" ? (g.coordinates as number[][][]) : g.type === "Point" ? [[g.coordinates as number[]]] : [];
    for (const l of lineas) for (const [lng, lat] of l) pts.push({ lat, lng });
  }
  return pts;
}

/** Punto donde se cruzan (o se acercan más) dos calles; null si están a más de 60 m. */
export function cruceMasCercano(a: Punto[], b: Punto[]): Punto | null {
  let mejor: { d: number; p: Punto } | null = null;
  for (const p of a)
    for (const q of b) {
      const d = distanciaMetros(p, q);
      if (!mejor || d < mejor.d) mejor = { d, p: { lat: (p.lat + q.lat) / 2, lng: (p.lng + q.lng) / 2 } };
    }
  return mejor && mejor.d <= 60 ? mejor.p : null;
}

export async function buscarEsquina(a: string, b: string, signal?: AbortSignal): Promise<SugerenciaDireccion | null> {
  const local = esquinaLocal(a, b);
  if (local) return local;
  if (!geocodificadorActivo()) return null;
  const [va, vb] = [await verticesDeCalle(a, signal), await verticesDeCalle(b, signal)];
  const p = cruceMasCercano(va, vb);
  if (!p || !enComuna(p)) return null;
  return { texto: `${a} con ${b}`, detalle: "Esquina · Conchalí", punto: p, tipo: "esquina" };
}

/** Sugerencias para lo que escribe el operador. Nunca devuelve puntos fuera de Conchalí. */
export async function buscarDirecciones(texto: string, signal?: AbortSignal): Promise<SugerenciaDireccion[]> {
  prepararBuscadorLocal();
  const locales = buscarLocal(texto);
  // Con una esquina, un lugar conocido o un número ubicado, el callejero propio basta.
  if (locales.some((s) => s.tipo !== "calle") || !geocodificadorActivo()) return locales;
  const limpio = limpiarDireccion(texto);
  if (limpio.length < 4) return locales;
  const esquina = partirEsquina(texto);
  if (esquina) {
    const e = await buscarEsquina(esquina[0], esquina[1], signal).catch(() => null);
    return e ? [e, ...locales] : locales;
  }
  try {
    const remotos = await buscarRemoto(limpio, signal);
    return [...remotos.filter((r) => r.tipo === "direccion"), ...locales, ...remotos.filter((r) => r.tipo !== "direccion")].slice(0, 6);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return locales;
  }
}

async function buscarRemoto(limpio: string, signal?: AbortSignal): Promise<SugerenciaDireccion[]> {
  const rs = await pedir<ResultadoNominatim[]>("/search", { q: `${limpio}, Conchalí`, countrycodes: "cl", viewbox: VIEWBOX, bounded: "1", addressdetails: "1", limit: "8" }, signal);
  const vistos = new Set<string>();
  const out: SugerenciaDireccion[] = [];
  for (const r of rs) {
    const punto = { lat: Number(r.lat), lng: Number(r.lon) };
    if (!enComuna(punto)) continue;
    const { texto: t, detalle } = textoDe(r);
    if (vistos.has(t)) continue;
    vistos.add(t);
    out.push({ texto: t, detalle, punto, tipo: r.address?.house_number ? "direccion" : r.category === "highway" ? "calle" : "lugar" });
  }
  return out.slice(0, 6);
}

/** Dirección aproximada de un punto marcado en el mapa (calle y número si se conoce). */
export async function direccionDe(p: Punto, signal?: AbortSignal): Promise<string | null> {
  const local = direccionLocal(p);
  if (local || !geocodificadorActivo()) return local;
  try {
    const r = await pedir<ResultadoNominatim>("/reverse", { lat: p.lat.toFixed(6), lon: p.lng.toFixed(6), zoom: "18", addressdetails: "1" }, signal);
    if (!r?.address) return null;
    const { texto } = textoDe(r);
    return texto || null;
  } catch {
    return null;
  }
}

/**
 * Ubica solos los recintos que no tienen punto, a partir de su esquina.
 * Devuelve cuántos quedaron ubicados y cuáles hay que ubicar a mano.
 */
export async function ubicarRecintosAutomaticamente(
  recintos: { id: string; direccion: string; ubicacion: Punto | null }[],
  guardar: (id: string, p: Punto) => void,
  progreso?: (hechos: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ ubicados: string[]; pendientes: string[] }> {
  const faltan = recintos.filter((r) => !r.ubicacion);
  const ubicados: string[] = [];
  const pendientes: string[] = [];
  for (let i = 0; i < faltan.length; i++) {
    const r = faltan[i];
    progreso?.(i, faltan.length);
    try {
      const esquina = partirEsquina(r.direccion);
      const s = esquina ? await buscarEsquina(esquina[0], esquina[1], signal) : (await buscarDirecciones(r.direccion, signal))[0] ?? null;
      if (s) {
        guardar(r.id, s.punto);
        ubicados.push(r.id);
      } else pendientes.push(r.id);
    } catch (e) {
      if ((e as Error).name === "AbortError") break;
      pendientes.push(r.id);
    }
  }
  progreso?.(faltan.length, faltan.length);
  return { ubicados, pendientes };
}
