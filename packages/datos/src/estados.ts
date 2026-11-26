import type { EstadoMovil, EstadoProcedimiento } from "./tipos";

export const ESTADOS: Record<EstadoProcedimiento, { etiqueta: string; corta: string; activo: boolean; orden: number }> = {
  recibido: { etiqueta: "Recibido", corta: "Recibido", activo: true, orden: 0 },
  asignado: { etiqueta: "Asignado", corta: "Asignado", activo: true, orden: 1 },
  en_desplazamiento: { etiqueta: "En desplazamiento", corta: "En camino", activo: true, orden: 2 },
  en_el_lugar: { etiqueta: "En el lugar", corta: "En el lugar", activo: true, orden: 3 },
  en_procedimiento: { etiqueta: "En procedimiento", corta: "En proc.", activo: true, orden: 4 },
  finalizado: { etiqueta: "Finalizado", corta: "Finalizado", activo: false, orden: 5 },
  cancelado: { etiqueta: "Cancelado", corta: "Cancelado", activo: false, orden: 6 },
};

/** Transiciones permitidas. La cancelación es posible desde cualquier estado activo. */
export const SIGUIENTE: Partial<Record<EstadoProcedimiento, EstadoProcedimiento>> = {
  asignado: "en_desplazamiento",
  en_desplazamiento: "en_el_lugar",
  en_el_lugar: "en_procedimiento",
  en_procedimiento: "finalizado",
};

export function esActivo(estado: EstadoProcedimiento): boolean {
  return ESTADOS[estado].activo;
}

export const ESTADOS_MOVIL: Record<EstadoMovil, { etiqueta: string; tono: "ok" | "info" | "alerta" | "neutro" }> = {
  sin_turno: { etiqueta: "Sin turno", tono: "neutro" },
  disponible: { etiqueta: "Disponible", tono: "ok" },
  asignado: { etiqueta: "Asignado", tono: "info" },
  en_procedimiento: { etiqueta: "En procedimiento", tono: "alerta" },
  fuera_de_servicio: { etiqueta: "Fuera de servicio", tono: "neutro" },
};

export const TIPOS_REPORTE: Record<import("./tipos").TipoReporte, string> = {
  patrullaje_preventivo: "Patrullaje preventivo",
  procedimiento: "Procedimiento",
  punto_estatico: "Punto estático",
};
