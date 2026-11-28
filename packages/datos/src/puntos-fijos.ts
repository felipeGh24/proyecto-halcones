import { buscarLocal, unidadVecinalCercana } from "./geo";
import type { Punto } from "./tipos";

/**
 * Puntos fijos: lugares donde el municipio deja personal apostado durante el turno (estaciones de metro,
 * pasos bajo nivel, pasarelas, plazas…). El patrullero elige uno al iniciar turno a pie o en punto fijo, y la
 * Central lo ve en el mapa y puede despacharlo desde ahí.
 *
 * En la demo se guardan en este navegador; con la base de datos serán la tabla puntos_fijos y los verá todo el equipo.
 */
export interface PuntoFijo {
  id: string;
  nombre: string;
  direccion: string;
  /** null = falta marcarlo en el mapa. */
  ubicacion: Punto | null;
  unidadVecinal: number | null;
  /** Observaciones para el personal (horario, con quién coordinar, etc.). */
  notas?: string;
  activo: boolean;
}

/** Puntos fijos iniciales entregados por el municipio (26-11-2026). Los sin dirección quedan para marcarlos en el mapa. */
const INICIALES: { id: string; nombre: string; direccion: string; ubicarCon?: string }[] = [
  { id: "pf-metro-conchali", nombre: "Metro Conchalí", direccion: "Av. Independencia con Av. Dorsal" },
  { id: "pf-metro-vivaceta", nombre: "Metro Vivaceta", direccion: "Av. Independencia con Av. Los Zapadores" },
  { id: "pf-metro-cardenal-caro", nombre: "Metro Cardenal Caro", direccion: "Av. Independencia con Av. Cardenal José María Caro" },
  { id: "pf-paso-bajo-nivel", nombre: "Paso Bajo Nivel", direccion: "" },
  // Informado el 28-11-2026: «Módulo de Prevención Pasarela Mall», UV 10, Barrio Sur. Falta marcar el punto exacto.
  { id: "pf-pasarela", nombre: "Pasarela Mall (Módulo de Prevención)", direccion: "Módulo de Prevención Pasarela Mall · UV 10, Barrio Sur" },
];

const CLAVE = "plataforma.puntos-fijos.v1";

function ubicar(direccion: string): Punto | null {
  if (!direccion.trim()) return null;
  const r = buscarLocal(direccion, 3).find((x) => x.tipo === "esquina" || x.tipo === "direccion");
  return r && unidadVecinalCercana(r.punto) ? r.punto : null;
}

function conUV(p: Omit<PuntoFijo, "unidadVecinal">): PuntoFijo {
  return { ...p, unidadVecinal: p.ubicacion ? unidadVecinalCercana(p.ubicacion)?.uv ?? null : null };
}

function iniciales(): PuntoFijo[] {
  return INICIALES.map((i) => conUV({ id: i.id, nombre: i.nombre, direccion: i.direccion, ubicacion: ubicar(i.ubicarCon ?? i.direccion), activo: true }));
}

export function leerPuntosFijos(): PuntoFijo[] {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as PuntoFijo[] | null;
    if (Array.isArray(g)) return g;
  } catch {
    /* sin almacenamiento */
  }
  return iniciales();
}

function escribir(lista: PuntoFijo[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent("plataforma-puntos"));
  } catch {
    /* sin espacio */
  }
}

/** Crea o actualiza un punto fijo; calcula la unidad vecinal desde el punto. */
export function guardarPuntoFijo(p: Omit<PuntoFijo, "unidadVecinal" | "id"> & { id?: string }): PuntoFijo {
  const lista = leerPuntosFijos();
  const id = p.id ?? `pf-${Date.now().toString(36)}`;
  const nuevo = conUV({ ...p, id, nombre: p.nombre.trim(), direccion: p.direccion.trim() });
  escribir(lista.some((x) => x.id === id) ? lista.map((x) => (x.id === id ? nuevo : x)) : [...lista, nuevo]);
  return nuevo;
}

export function eliminarPuntoFijo(id: string) {
  escribir(leerPuntosFijos().filter((x) => x.id !== id));
}

/** Vuelve a la lista inicial (solo demo). */
export function restablecerPuntosFijos() {
  escribir(iniciales());
}
