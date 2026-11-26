import { unidadVecinalDe } from "./geo";
import type { Punto } from "./tipos";

/**
 * Puntos de interés propios del municipio: edificios municipales, sedes, centros de salud, cuarteles, etc.
 * En la demo se guardan en el navegador al cargar una planilla CSV; con la base de datos serán la tabla puntos_interes.
 */
export type TipoPunto = "municipal" | "salud" | "bomberos" | "policia" | "educacion" | "seguridad" | "otro";

export const TIPOS_PUNTO: Record<TipoPunto, string> = {
  municipal: "Edificio municipal",
  salud: "Salud (SAPU, CESFAM)",
  bomberos: "Bomberos",
  policia: "Carabineros o PDI",
  educacion: "Educación",
  seguridad: "Seguridad municipal",
  otro: "Otro",
};

export interface PuntoInteres {
  id: string;
  nombre: string;
  tipo: TipoPunto;
  direccion: string;
  ubicacion: Punto;
  unidadVecinal: number | null;
}

const CLAVE = "plataforma.puntos-interes.v1";

export function leerPuntosInteres(): PuntoInteres[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as PuntoInteres[];
  } catch {
    return [];
  }
}

export function guardarPuntosInteres(p: PuntoInteres[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin espacio */
  }
}

export const PLANTILLA_CSV = "nombre;tipo;direccion;latitud;longitud\nEjemplo: Edificio consistorial;municipal;Dirección de ejemplo 123;-33.38;-70.67\n";

function tipoDesde(texto: string): TipoPunto {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/munic|gam|consist|delegac|dideco/.test(t)) return "municipal";
  if (/salud|sapu|cesfam|hospital|cecosf|consultorio|sar\b/.test(t)) return "salud";
  if (/bomber/.test(t)) return "bomberos";
  if (/carab|comisar|reten|pdi|polic/.test(t)) return "policia";
  if (/colegio|escuela|liceo|jardin|educ/.test(t)) return "educacion";
  if (/seguridad|halcon|base/.test(t)) return "seguridad";
  return (["municipal", "salud", "bomberos", "policia", "educacion", "seguridad", "otro"] as TipoPunto[]).includes(t as TipoPunto) ? (t as TipoPunto) : "otro";
}

/**
 * Lee una planilla CSV (separador «;» o «,») con columnas nombre, tipo, direccion, latitud, longitud.
 * Devuelve los puntos válidos y los errores por fila. Las filas sin coordenadas se informan para completarlas.
 */
export function leerCsvPuntos(texto: string): { puntos: PuntoInteres[]; errores: string[] } {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return { puntos: [], errores: ["El archivo está vacío."] };
  const sep = lineas[0].includes(";") ? ";" : ",";
  const cab = lineas[0].split(sep).map((c) => c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (...n: string[]) => cab.findIndex((c) => n.includes(c));
  const iN = col("nombre", "name");
  const iT = col("tipo", "categoria", "type");
  const iD = col("direccion", "address");
  const iLa = col("latitud", "lat", "y");
  const iLo = col("longitud", "lng", "lon", "x");
  if (iN < 0 || iLa < 0 || iLo < 0) return { puntos: [], errores: ["Faltan columnas: se necesitan nombre, latitud y longitud."] };
  const puntos: PuntoInteres[] = [];
  const errores: string[] = [];
  lineas.slice(1).forEach((l, i) => {
    const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
    const lat = Number((c[iLa] ?? "").replace(",", "."));
    const lng = Number((c[iLo] ?? "").replace(",", "."));
    if (!c[iN]) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      errores.push(`Fila ${i + 2} (${c[iN]}): sin coordenadas válidas.`);
      return;
    }
    const ubicacion = { lat, lng };
    puntos.push({ id: `poi-${i}-${c[iN].slice(0, 20)}`, nombre: c[iN], tipo: tipoDesde(iT >= 0 ? c[iT] ?? "" : c[iN]), direccion: iD >= 0 ? c[iD] ?? "" : "", ubicacion, unidadVecinal: unidadVecinalDe(ubicacion)?.uv ?? null });
  });
  return { puntos, errores };
}
