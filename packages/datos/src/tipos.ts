/**
 * Modelo de datos común de la plataforma.
 * Es el mismo contrato que usan Halcones, Georreferenciado y Análisis,
 * y refleja las tablas de supabase/migrations/0001_esquema_inicial.sql.
 */

export type Prioridad = "critica" | "alta" | "media" | "baja";
export type Semaforo = "rojo" | "amarillo" | "verde";

export interface Clave {
  numero: number;
  nombre: string;
  prioridad: Prioridad;
}

/** Los 7 estados oficiales del procedimiento. */
export type EstadoProcedimiento =
  | "recibido"
  | "asignado"
  | "en_desplazamiento"
  | "en_el_lugar"
  | "en_procedimiento"
  | "finalizado"
  | "cancelado";

export interface Punto {
  lat: number;
  lng: number;
}

export interface EventoProcedimiento {
  estado: EstadoProcedimiento;
  /** ISO 8601 */
  en: string;
  porUsuarioId: string;
  porNombre: string;
  nota?: string;
  ubicacion?: Punto;
}

export interface Procedimiento {
  id: string;
  /** Folio legible, por ejemplo P-2026-000123 */
  folio: string;
  claveNumero: number;
  descripcion: string;
  direccion: string;
  ubicacion: Punto;
  unidadVecinal: number | null;
  barrio: string | null;
  estado: EstadoProcedimiento;
  movilId: string | null;
  resultado?: string;
  /** ISO 8601 de la recepción (primer evento). */
  creadoEn: string;
  eventos: EventoProcedimiento[];
}

export type TipoMovil = "Móvil" | "Alpha" | "RAM";
/** sin_turno: ningún patrullero ha iniciado turno en el móvil; no se le puede despachar. */
export type EstadoMovil = "sin_turno" | "disponible" | "asignado" | "en_procedimiento" | "fuera_de_servicio";

/** Turno abierto por el patrullero desde su app al salir en un móvil. */
export interface TurnoMovil {
  patrullero: string;
  acompanante: string;
  usuarioId: string;
  iniciadoEn: string;
  kmInicial: number | null;
  combustible: string;
  /** Ítems del checklist con observación (vacío = todo OK). */
  observaciones: string[];
}

export interface Movil {
  id: string;
  nombre: string;
  tipo: TipoMovil;
  estado: EstadoMovil;
  posicion: Punto;
  /** ISO 8601 de la última posición recibida. */
  ultimaSenal: string;
  procedimientoId: string | null;
  turno: TurnoMovil | null;
}

export type Rol = "administrador" | "jefatura" | "supervisor" | "operador" | "patrullero" | "analista";

export type Sistema = "halcones" | "georreferenciado" | "analisis";

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  /** Solo para patrulleros: móvil habitual. */
  movilId?: string;
}

export interface Sesion {
  usuario: Usuario;
  iniciadaEn: string;
  modo: "demo" | "supabase";
}

export type Turno = "manana" | "tarde" | "noche";
