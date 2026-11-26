import { buscarLocal, unidadVecinalCercana as unidadVecinalDe } from "./geo";
import type { Punto } from "./tipos";

/**
 * Puntos de interés del municipio: recintos municipales (códigos GAMA), recintos asistenciales y otros lugares.
 *
 * El catálogo trae nombre, código y dirección de referencia entregados por el municipio. La ubicación exacta se fija
 * una vez en el mapa («Ubicar en el mapa») porque las direcciones son cruces de calles. En la demo las ubicaciones
 * quedan en este navegador; con la base de datos serán la tabla puntos_interes y las verá todo el equipo.
 */
export type TipoPunto = "municipal" | "salud" | "bomberos" | "policia" | "metro" | "educacion" | "seguridad" | "otro";
export type GrupoPunto = "recintos_municipales" | "asistenciales_noche" | "emergencias" | "propios";

export const TIPOS_PUNTO: Record<TipoPunto, string> = {
  municipal: "Recinto municipal",
  salud: "Salud (SAPU, 24 horas)",
  bomberos: "Bomberos",
  policia: "Carabineros o PDI",
  metro: "Estación de Metro",
  educacion: "Educación",
  seguridad: "Seguridad municipal",
  otro: "Otro",
};

export const GRUPOS_PUNTO: Record<GrupoPunto, string> = {
  recintos_municipales: "Recintos municipales (GAMA)",
  asistenciales_noche: "Recintos asistenciales de noche",
  emergencias: "Carabineros, bomberos y metro",
  propios: "Otros puntos cargados",
};

export interface PuntoInteres {
  id: string;
  /** Código de radio, por ejemplo «GAMA 1». */
  codigo?: string;
  /** Texto corto para el marcador del mapa, por ejemplo «G1». */
  corto?: string;
  nombre: string;
  tipo: TipoPunto;
  grupo: GrupoPunto;
  direccion: string;
  horario?: string;
  /** Texto con que se ubica en el callejero cuando la dirección oficial no es una esquina («Independencia con Manaos»). */
  ubicarCon?: string;
  /** null = todavía no se ha fijado en el mapa. */
  ubicacion: Punto | null;
  /** true si el punto lo calculó el sistema (esquina o número estimado) y nadie lo ha confirmado en el mapa. */
  estimado?: boolean;
  unidadVecinal: number | null;
}

type Semilla = Omit<PuntoInteres, "ubicacion" | "unidadVecinal" | "estimado">;

/** Catálogo entregado por el municipio (26-11-2026). Faltan GAMA 7, 9, 10, 11 y 12 si existen. */
export const RECINTOS_CONCHALI: Semilla[] = [
  { id: "gama-1", codigo: "GAMA 1", corto: "G1", nombre: "Municipalidad (edificio consistorial)", tipo: "municipal", grupo: "recintos_municipales", direccion: "Independencia con La Palma" },
  { id: "gama-2", codigo: "GAMA 2", corto: "G2", nombre: "Dirección de Medio Ambiente, Aseo y Ornato (DIMAO)", tipo: "municipal", grupo: "recintos_municipales", direccion: "Palmilla con Teniente Ponce" },
  { id: "gama-3", codigo: "GAMA 3", corto: "G3", nombre: "Recinto Registro Civil", tipo: "municipal", grupo: "recintos_municipales", direccion: "Av. Dorsal esquina Independencia" },
  { id: "gama-4", codigo: "GAMA 4", corto: "G4", nombre: "Polideportivo", tipo: "municipal", grupo: "recintos_municipales", direccion: "Independencia con Cardenal Caro" },
  { id: "gama-5", codigo: "GAMA 5", corto: "G5", nombre: "Balneario Municipal", tipo: "municipal", grupo: "recintos_municipales", direccion: "Diego Silva con Laura" },
  { id: "gama-6", codigo: "GAMA 6", corto: "G6", nombre: "DIDECO (asistente social)", tipo: "municipal", grupo: "recintos_municipales", direccion: "Plaza Sagitario (Palmilla con Sagitario)" },
  { id: "gama-8", codigo: "GAMA 8", corto: "G8", nombre: "Bodegas de Cauquenes", tipo: "municipal", grupo: "recintos_municipales", direccion: "Cauquenes esquina Cristina" },
  { id: "gama-13", codigo: "GAMA 13", corto: "G13", nombre: "Sección de Reciclaje y Áreas Verdes", tipo: "municipal", grupo: "recintos_municipales", direccion: "Caletera Panamericana Norte con Cardenal Caro (frente a Unilever)" },
  { id: "gama-14", codigo: "GAMA 14", corto: "G14", nombre: "Espacio de la Mujer", tipo: "municipal", grupo: "recintos_municipales", direccion: "Independencia con Teniente Yávar" },
  // Salud de urgencia (Dirección de Salud de Conchalí, Coresam y Minsal; noviembre de 2026).
  { id: "asist-24h", corto: "SAR", nombre: "SAR Conchalí (urgencia 24 horas)", tipo: "salud", grupo: "asistenciales_noche", direccion: "Av. Independencia 5663", ubicarCon: "Independencia con Manaos", horario: "24 horas" },
  { id: "sapu-lucas-sierra", corto: "SAPU", nombre: "SAPU Lucas Sierra", tipo: "salud", grupo: "asistenciales_noche", direccion: "Av. Pedro Fontova 4107", ubicarCon: "Pedro Fontova esquina Pamplona", horario: "Atención nocturna" },
  { id: "sapu-bachelet", corto: "SAPU", nombre: "SAPU Alberto Bachelet Martínez", tipo: "salud", grupo: "asistenciales_noche", direccion: "Av. El Guanaco 3250", horario: "Atención nocturna" },
  // Carabineros (Prefectura Santiago Norte).
  { id: "cb-5-comisaria", corto: "5ª", nombre: "5ª Comisaría de Carabineros Conchalí", tipo: "policia", grupo: "emergencias", direccion: "Av. General Gambino 3739" },
  { id: "cb-subcomisaria-norte", corto: "SC", nombre: "Subcomisaría Conchalí Norte", tipo: "policia", grupo: "emergencias", direccion: "Av. Independencia 6208" },
  { id: "cb-reten-eneas-gonel", corto: "R", nombre: "Retén Eneas Gonel", tipo: "policia", grupo: "emergencias", direccion: "Armando Carrera 4041", ubicarCon: "Armando Carrera con Ciudad Real" },
  // Cuerpo de Bomberos Conchalí-Huechuraba (compañías con cuartel en Conchalí).
  { id: "bom-1", corto: "B1", nombre: "1ª Compañía de Bomberos «Pedro Aguirre Cerda»", tipo: "bomberos", grupo: "emergencias", direccion: "Av. Dorsal 1495" },
  { id: "bom-4", corto: "B4", nombre: "4ª Compañía de Bomberos", tipo: "bomberos", grupo: "emergencias", direccion: "Av. Cardenal José María Caro 1593" },
  { id: "bom-5", corto: "B5", nombre: "5ª Compañía de Bomberos «República Alemana»", tipo: "bomberos", grupo: "emergencias", direccion: "Av. El Guanaco 4488" },
  { id: "bom-7", corto: "B7", nombre: "7ª Compañía y Comandancia de Bomberos", tipo: "bomberos", grupo: "emergencias", direccion: "Av. Quilicura 2275" },
  // Metro Línea 3.
  { id: "metro-conchali", corto: "L3", nombre: "Metro Conchalí", tipo: "metro", grupo: "emergencias", direccion: "Av. Independencia con Av. Dorsal" },
  { id: "metro-vivaceta", corto: "L3", nombre: "Metro Vivaceta", tipo: "metro", grupo: "emergencias", direccion: "Av. Independencia 4765", ubicarCon: "Independencia con Los Zapadores" },
  { id: "metro-cardenal-caro", corto: "L3", nombre: "Metro Cardenal Caro", tipo: "metro", grupo: "emergencias", direccion: "Av. Cardenal José María Caro 1857", ubicarCon: "Cardenal Caro con Independencia" },
];

const CLAVE = "plataforma.puntos-interes.v2";

interface Guardado {
  ubicaciones: Record<string, Punto>;
  propios: PuntoInteres[];
}

function leerGuardado(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Guardado | null;
    return g ?? { ubicaciones: {}, propios: [] };
  } catch {
    return { ubicaciones: {}, propios: [] };
  }
}

function escribir(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
    window.dispatchEvent(new CustomEvent("plataforma-puntos"));
  } catch {
    /* sin espacio */
  }
}

/** Catálogo del municipio con las ubicaciones ya fijadas, más los puntos cargados desde planilla. */
export function leerPuntosInteres(): PuntoInteres[] {
  const g = leerGuardado();
  const catalogo = RECINTOS_CONCHALI.map((s) => {
    const fijada = g.ubicaciones[s.id] ?? null;
    const calculada = fijada ? null : ubicacionCalculada(s);
    const ubicacion = fijada ?? calculada;
    return { ...s, ubicacion, estimado: !fijada && !!calculada, unidadVecinal: ubicacion ? unidadVecinalDe(ubicacion)?.uv ?? null : null };
  });
  return [...catalogo, ...g.propios];
}

const cacheCalculadas = new Map<string, Punto | null>();

/**
 * Punto calculado con el callejero: solo esquinas o números entre direcciones conocidas.
 * Si la dirección no se puede ubicar con certeza razonable, queda sin ubicar para que el equipo la fije en el mapa.
 */
export function ubicacionCalculada(s: { id: string; direccion: string; ubicarCon?: string }): Punto | null {
  if (cacheCalculadas.has(s.id)) return cacheCalculadas.get(s.id)!;
  const r = buscarLocal(s.ubicarCon ?? s.direccion, 3).find((x) => x.tipo === "esquina" || x.tipo === "direccion");
  const p = r && unidadVecinalDe(r.punto) ? r.punto : null;
  cacheCalculadas.set(s.id, p);
  return p;
}

export function ubicarPunto(id: string, punto: Punto | null) {
  const g = leerGuardado();
  if (g.propios.some((p) => p.id === id)) {
    g.propios = g.propios.map((p) => (p.id === id ? { ...p, ubicacion: punto, unidadVecinal: punto ? unidadVecinalDe(punto)?.uv ?? null : null } : p));
  } else if (punto) g.ubicaciones[id] = punto;
  else delete g.ubicaciones[id];
  escribir(g);
}

export function guardarPuntosPropios(p: PuntoInteres[]) {
  escribir({ ...leerGuardado(), propios: p });
}

export const PLANTILLA_CSV = "codigo;nombre;tipo;direccion;latitud;longitud\nGAMA 99;Ejemplo de recinto;municipal;Calle A con calle B;-33.38;-70.67\n";

function tipoDesde(texto: string): TipoPunto {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/munic|gama|consist|delegac|dideco/.test(t)) return "municipal";
  if (/salud|sapu|cesfam|hospital|cecosf|consultorio|sar\b|24/.test(t)) return "salud";
  if (/bomber/.test(t)) return "bomberos";
  if (/carab|comisar|reten|pdi|polic/.test(t)) return "policia";
  if (/colegio|escuela|liceo|jardin|educ/.test(t)) return "educacion";
  if (/seguridad|halcon/.test(t)) return "seguridad";
  return "otro";
}

/**
 * Lee una planilla CSV (separador «;» o «,») con columnas codigo, nombre, tipo, direccion, latitud, longitud.
 * Las filas sin coordenadas se cargan igual, marcadas para ubicarlas en el mapa.
 */
export function leerCsvPuntos(texto: string): { puntos: PuntoInteres[]; errores: string[] } {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return { puntos: [], errores: ["El archivo está vacío."] };
  const sep = lineas[0].includes(";") ? ";" : ",";
  const cab = lineas[0].split(sep).map((c) => c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (...n: string[]) => cab.findIndex((c) => n.includes(c));
  const iC = col("codigo", "code");
  const iN = col("nombre", "name");
  const iT = col("tipo", "categoria", "type");
  const iD = col("direccion", "address");
  const iLa = col("latitud", "lat", "y");
  const iLo = col("longitud", "lng", "lon", "x");
  if (iN < 0) return { puntos: [], errores: ["Falta la columna «nombre»."] };
  const puntos: PuntoInteres[] = [];
  const errores: string[] = [];
  lineas.slice(1).forEach((l, i) => {
    const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ""));
    if (!c[iN]) return;
    const lat = iLa >= 0 ? Number((c[iLa] ?? "").replace(",", ".")) : NaN;
    const lng = iLo >= 0 ? Number((c[iLo] ?? "").replace(",", ".")) : NaN;
    const valido = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
    if (!valido) errores.push(`Fila ${i + 2} (${c[iN]}): sin coordenadas; ubícala en el mapa.`);
    const ubicacion = valido ? { lat, lng } : null;
    const codigo = iC >= 0 ? c[iC] || undefined : undefined;
    puntos.push({
      id: `propio-${i}-${c[iN].slice(0, 24)}`,
      codigo,
      corto: codigo ? codigo.replace(/^gama\s*/i, "G").slice(0, 5) : undefined,
      nombre: c[iN],
      tipo: tipoDesde(`${iT >= 0 ? c[iT] ?? "" : ""} ${codigo ?? ""} ${c[iN]}`),
      grupo: "propios",
      direccion: iD >= 0 ? c[iD] ?? "" : "",
      ubicacion,
      unidadVecinal: ubicacion ? unidadVecinalDe(ubicacion)?.uv ?? null : null,
    });
  });
  return { puntos, errores };
}

/** Exporta los puntos con sus coordenadas, para respaldo o para cargarlos en otro equipo. */
export function puntosACsv(p: PuntoInteres[]): string {
  const filas = p.map((x) => [x.codigo ?? "", x.nombre, x.tipo, x.direccion, x.ubicacion?.lat ?? "", x.ubicacion?.lng ?? ""].join(";"));
  return "﻿" + ["codigo;nombre;tipo;direccion;latitud;longitud", ...filas].join("\r\n");
}
