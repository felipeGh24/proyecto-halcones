import { obtenerClave } from "./claves";
import type { Prioridad, Semaforo } from "./tipos";

export interface InfoPrioridad {
  prioridad: Prioridad;
  etiqueta: string;
  semaforo: Semaforo;
  /** Tiempo de respuesta esperado en minutos (recepción → en el lugar). null = según disponibilidad. */
  metaMinutos: number | null;
  respuesta: string;
  /** Orden en la cola: menor = más urgente. */
  orden: number;
}

/**
 * Semáforo heredado del sistema anterior: crítica y alta en rojo, media en amarillo, baja en verde.
 * La meta de la crítica ("inmediata") se mide como 3 minutos; ajustable por organización.
 */
export const PRIORIDADES: Record<Prioridad, InfoPrioridad> = {
  critica: { prioridad: "critica", etiqueta: "Crítica", semaforo: "rojo", metaMinutos: 3, respuesta: "Inmediata", orden: 0 },
  alta: { prioridad: "alta", etiqueta: "Alta", semaforo: "rojo", metaMinutos: 5, respuesta: "Hasta 5 min", orden: 1 },
  media: { prioridad: "media", etiqueta: "Media", semaforo: "amarillo", metaMinutos: 15, respuesta: "Hasta 15 min", orden: 2 },
  baja: { prioridad: "baja", etiqueta: "Baja", semaforo: "verde", metaMinutos: null, respuesta: "Según disponibilidad", orden: 3 },
};

export const SEMAFOROS: Record<Semaforo, { etiqueta: string; color: string; fondo: string }> = {
  rojo: { etiqueta: "Rojo", color: "#B42318", fondo: "#FEF3F2" },
  amarillo: { etiqueta: "Amarillo", color: "#DC6803", fondo: "#FFFAEB" },
  verde: { etiqueta: "Verde", color: "#079455", fondo: "#ECFDF3" },
};

export function infoDeClave(numero: number): InfoPrioridad {
  const clave = obtenerClave(numero);
  return PRIORIDADES[clave?.prioridad ?? "baja"];
}

export function semaforoDeClave(numero: number): Semaforo {
  return infoDeClave(numero).semaforo;
}
