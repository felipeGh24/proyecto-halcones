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
  /** Número o código de halcón del patrullero (opcional). */
  halcon?: string;
  acompanante: string;
  usuarioId: string;
  iniciadoEn: string;
  kmInicial: number | null;
  combustible: string;
  /** Ítems del checklist con observación (vacío = todo OK). */
  observaciones: string[];
  /** Detalle del checklist: descripción y fotos o videos por ítem con observación, más los generales. */
  checklistDetalle?: { item: string; descripcion: string; adjuntos: Adjunto[] }[];
  adjuntosGenerales?: Adjunto[];
}

/** Foto o video. El archivo vive en el almacenamiento (en la demo, en el navegador); aquí solo su referencia. */
export interface Adjunto {
  id: string;
  nombre: string;
  tipo: "imagen" | "video";
  bytes: number;
}

export type TipoReporte = "patrullaje_preventivo" | "procedimiento" | "punto_estatico";

export interface EntradaReporte {
  en: string;
  texto: string;
  adjuntos: Adjunto[];
}

/** Reporte que el patrullero envía a la Central. */
export interface Reporte {
  id: string;
  folio: string;
  creadoEn: string;
  usuarioId: string;
  patrullero: string;
  /** Número o código de halcón del patrullero. */
  halcon: string;
  /** Unidad (móvil o puesto) desde donde se envía. */
  unidad: string;
  tipo: TipoReporte;
  direccion: string;
  ubicacion: Punto | null;
  unidadVecinal: number | null;
  barrio: string | null;
  procedimientoId: string | null;
  observaciones: string;
  adjuntos: Adjunto[];
  /** Lo que se añade después al mismo reporte. */
  complementos: EntradaReporte[];
  leidoPorCentral: boolean;
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

export type Modalidad = "movil" | "punto_fijo" | "a_pie";

/** Personal en terreno sin móvil: punto fijo o patrullaje a pie. */
export interface TurnoPersonal {
  id: string;
  usuarioId: string;
  patrullero: string;
  halcon?: string;
  acompanante: string;
  modalidad: "punto_fijo" | "a_pie";
  /** Recinto o sector, por ejemplo «GAMA 1 · Municipalidad» o «UV 12 · Barrio Sur». */
  lugar: string;
  puntoId?: string;
  ubicacion: Punto;
  iniciadoEn: string;
}

/** Turno ya cerrado, para la bitácora y el análisis de dotación. */
export interface RegistroTurno {
  id: string;
  usuarioId: string;
  patrullero: string;
  acompanante: string;
  modalidad: Modalidad;
  unidad: string;
  iniciadoEn: string;
  cerradoEn: string;
  kmInicial: number | null;
  kmFinal: number | null;
  combustibleFinal: string | null;
  /** Ítems del checklist con novedad al cierre. */
  novedadesChecklist: string[];
  observaciones: string;
}

export interface CierreTurno {
  kmFinal?: number | null;
  combustibleFinal?: string | null;
  novedadesChecklist?: string[];
  observaciones?: string;
}
