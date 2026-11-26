import type { Turno } from "./tipos";

const ZONA = "America/Santiago";

const fmtHora = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA });
const fmtFechaHora = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ZONA,
});
const fmtFecha = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: ZONA });
const fmtPartes = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  weekday: "short",
  timeZone: ZONA,
});

export const hora = (iso: string) => fmtHora.format(new Date(iso));
export const fechaHora = (iso: string) => fmtFechaHora.format(new Date(iso));
export const fecha = (iso: string) => fmtFecha.format(new Date(iso));

const DIAS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Hora (0–23) y día de la semana (0 = lunes) en hora de Chile. */
export function partesLocales(iso: string): { hora: number; dia: number } {
  const partes = fmtPartes.formatToParts(new Date(iso));
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const d = DIAS.indexOf(partes.find((p) => p.type === "weekday")?.value ?? "Mon");
  return { hora: h, dia: d < 0 ? 0 : d };
}

export function turnoDe(iso: string): Turno {
  const { hora: h } = partesLocales(iso);
  if (h >= 7 && h < 14) return "manana";
  if (h >= 14 && h < 22) return "tarde";
  return "noche";
}

export const TURNOS: Record<Turno, { etiqueta: string; horario: string }> = {
  manana: { etiqueta: "Mañana", horario: "07:00 – 14:00" },
  tarde: { etiqueta: "Tarde", horario: "14:00 – 22:00" },
  noche: { etiqueta: "Noche", horario: "22:00 – 07:00" },
};

/** Minutos entre dos instantes ISO. */
export function minutosEntre(desde: string, hasta: string): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / 60000;
}

/** "4 min", "1 h 12 min", "—" */
export function duracion(minutos: number | null | undefined): string {
  if (minutos == null || !Number.isFinite(minutos)) return "—";
  if (minutos < 1) return "< 1 min";
  const m = Math.round(minutos);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function hace(iso: string, ahora = Date.now()): string {
  const min = (ahora - new Date(iso).getTime()) / 60000;
  if (min < 1) return "recién";
  return `hace ${duracion(min)}`;
}

export const numero = (n: number, decimales = 0) =>
  n.toLocaleString("es-CL", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const porcentaje = (fraccion: number) => `${numero(fraccion * 100, 0)} %`;
