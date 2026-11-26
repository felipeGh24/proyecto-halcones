import type { Punto } from "../tipos";
import uvJson from "./unidades-vecinales.json";

/**
 * Unidades vecinales de Conchalí (48 polígonos), convertidas del KML entregado por el municipio.
 * En producción vivirán en la tabla unidades_vecinales (PostGIS); aquí sirven para el modo demostración.
 */
export interface PropiedadesUV {
  uv: number;
  nombre: string;
  barrio: string;
}

type Anillo = [number, number][];
export interface FeatureUV {
  type: "Feature";
  properties: PropiedadesUV;
  geometry: { type: "Polygon"; coordinates: Anillo[] };
}
export interface ColeccionUV {
  type: "FeatureCollection";
  features: FeatureUV[];
}

export const UNIDADES_VECINALES = uvJson as unknown as ColeccionUV;

export const LIMITES_COMUNA = (() => {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const f of UNIDADES_VECINALES.features)
    for (const [lng, lat] of f.geometry.coordinates[0]) {
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
  return { minLng, minLat, maxLng, maxLat };
})();

export const CENTRO_COMUNA: Punto = {
  lat: (LIMITES_COMUNA.minLat + LIMITES_COMUNA.maxLat) / 2,
  lng: (LIMITES_COMUNA.minLng + LIMITES_COMUNA.maxLng) / 2,
};

function dentroDeAnillo(p: Punto, anillo: Anillo): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const cruza = yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/** Unidad vecinal que contiene el punto, o null si está fuera de la comuna. */
export function unidadVecinalDe(p: Punto): PropiedadesUV | null {
  for (const f of UNIDADES_VECINALES.features) {
    const [exterior, ...huecos] = f.geometry.coordinates;
    if (dentroDeAnillo(p, exterior) && !huecos.some((h) => dentroDeAnillo(p, h))) return f.properties;
  }
  return null;
}

const cacheCentro = new Map<number, Punto>();

/** Punto interior representativo de la UV: el promedio de sus vértices si cae dentro; si no, el punto interior más cercano a él. */
export function centroideUV(uv: number): Punto | null {
  if (cacheCentro.has(uv)) return cacheCentro.get(uv)!;
  const f = UNIDADES_VECINALES.features.find((x) => x.properties.uv === uv);
  if (!f) return null;
  const anillo = f.geometry.coordinates[0];
  let lat = 0, lng = 0;
  for (const [x, y] of anillo) { lng += x; lat += y; }
  const centro = { lat: lat / anillo.length, lng: lng / anillo.length };
  let mejor: Punto | null = unidadVecinalDe(centro)?.uv === uv ? centro : null;
  if (!mejor) {
    const xs = anillo.map((c) => c[0]);
    const ys = anillo.map((c) => c[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let dMin = Infinity;
    const pasos = 40;
    for (let i = 1; i < pasos; i++)
      for (let j = 1; j < pasos; j++) {
        const p = { lng: x0 + ((x1 - x0) * i) / pasos, lat: y0 + ((y1 - y0) * j) / pasos };
        if (unidadVecinalDe(p)?.uv !== uv) continue;
        const d = (p.lng - centro.lng) ** 2 + (p.lat - centro.lat) ** 2;
        if (d < dMin) { dMin = d; mejor = p; }
      }
  }
  const resultado = mejor ?? { lat: anillo[0][1], lng: anillo[0][0] };
  cacheCentro.set(uv, resultado);
  return resultado;
}

/** Distancia aproximada en metros (haversine). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const BARRIOS = [...new Set(UNIDADES_VECINALES.features.map((f) => f.properties.barrio))].sort();

export * from "./callejero";
export * from "./buscador-local";

/**
 * Unidad vecinal del punto o, si cae justo en el borde de la comuna (avenidas límite como Independencia),
 * la de la UV que está a menos de ~120 m. null si está realmente fuera de Conchalí.
 */
export function unidadVecinalCercana(p: Punto): PropiedadesUV | null {
  const propia = unidadVecinalDe(p);
  if (propia) return propia;
  for (const r of [0.0004, 0.0008, 0.0012])
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const uv = unidadVecinalDe({ lat: p.lat + dy * r, lng: p.lng + dx * r });
      if (uv) return uv;
    }
  return null;
}
