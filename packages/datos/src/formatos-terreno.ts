import { UNIDADES_VECINALES } from "./geo";
import type { Reporte, TipoReporte } from "./tipos";

/**
 * Formatos oficiales que usa hoy el equipo de terreno de Conchalí (entregados el 28-11-2026):
 * reporte de patrullaje preventivo, servicio de punto estático, procedimiento y checklist del móvil.
 * El sistema genera el mismo texto, en el mismo orden, para copiarlo o compartirlo (por ejemplo, al grupo de WhatsApp).
 */

/* ---------------- Reportes ---------------- */

export const TITULO_REPORTE: Record<TipoReporte, string> = {
  patrullaje_preventivo: "PATRULLAJE PREVENTIVO",
  punto_estatico: "SERVICIO DE PUNTO ESTATICO",
  procedimiento: "PROCEDIMIENTO",
};

export const TIPO_EN_REPORTE: Record<TipoReporte, string> = {
  patrullaje_preventivo: "PATRULLAJE PREVENTIVO",
  punto_estatico: "PUNTO ESTATICO",
  procedimiento: "PROCEDIMIENTO",
};

/** Observaciones que el equipo escribe a diario, para no tipearlas cada vez. */
export const OBSERVACIONES_FRECUENTES: Record<TipoReporte, string[]> = {
  patrullaje_preventivo: ["SIN NOVEDAD A LA HORA"],
  punto_estatico: [
    "SE MANTIENE PUNTO FIJO REALIZANDO RESGUARDO TANTO A INSTALACIONES COMO USUARIOS DEL LUGAR. SIN OBSERVACIONES A LA HORA.",
    "SIN NOVEDAD A LA HORA",
  ],
  procedimiento: ["SIN NOVEDAD A LA HORA"],
};

const fechaCL = (d: Date) => d.toLocaleDateString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" }).replace(/-/g, "/");
const horaCL = (d: Date) => d.toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** «Barrio Vivaceta-Barón» → «VIVACETA BARON», como lo escribe el equipo. */
export function barrioCorto(barrio: string | null | undefined): string {
  return (barrio ?? "")
    .replace(/^Barrio\s+/i, "")
    .replace(/-/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/** «07 JHON AHUMADA»: número de halcón con dos dígitos y nombre. */
export function halconEnReporte(halcon: string, patrullero: string): string {
  const n = halcon.trim();
  const numero = /^\d$/.test(n) ? `0${n}` : n;
  return [numero, patrullero.trim().toUpperCase()].filter(Boolean).join(" ");
}

/** Texto del reporte en el formato oficial. */
export function textoReporte(r: Pick<Reporte, "tipo" | "creadoEn" | "halcon" | "patrullero" | "unidadVecinal" | "barrio" | "direccion" | "observaciones">): string {
  const d = new Date(r.creadoEn);
  const uv = r.unidadVecinal != null ? String(r.unidadVecinal).padStart(2, "0") : "—";
  return [
    TITULO_REPORTE[r.tipo],
    "",
    `FECHA: ${fechaCL(d)}`,
    `HORA: ${horaCL(d)}`,
    `HALCÓN: ${halconEnReporte(r.halcon, r.patrullero) || "—"}`,
    `UNIDAD VECINAL: ${uv}`,
    `BARRIO: ${barrioCorto(r.barrio) || "—"}`,
    `DIRECCIÓN: ${r.direccion.trim().toUpperCase() || "—"}`,
    `TIPO DE REPORTE: ${TIPO_EN_REPORTE[r.tipo]}`,
    "OBSERVACIONES:",
    r.observaciones.trim().toUpperCase() || "SIN NOVEDAD A LA HORA",
  ].join("\n");
}

/** Nombre de la unidad vecinal con dos dígitos, para listas. */
export function uvConNombre(uv: number | null): string {
  if (uv == null) return "—";
  const f = UNIDADES_VECINALES.features.find((x) => x.properties.uv === uv);
  return f ? `${String(uv).padStart(2, "0")} · ${f.properties.nombre}` : String(uv).padStart(2, "0");
}

/* ---------------- Checklist del móvil ---------------- */

export const COMBUSTIBLE = ["Reserva", "1/4", "1/2", "3/4", "+3/4", "FULL"] as const;

/** Estado del móvil: cada ítem con sus respuestas; la primera es la buena. */
export const ESTADO_MOVIL: { id: string; nombre: string; opciones: string[] }[] = [
  { id: "aseo", nombre: "Aseo móvil", opciones: ["Bien", "Regular", "Mal"] },
  { id: "neumaticos", nombre: "Neumáticos", opciones: ["Buen estado", "Regular", "Mal estado"] },
  { id: "luces", nombre: "Luces", opciones: ["Funciona", "Falla"] },
  { id: "balizas", nombre: "Balizas", opciones: ["Funcionando", "Falla"] },
  { id: "sirena", nombre: "Sirena", opciones: ["Funcionando", "Falla"] },
  { id: "radio_tx", nombre: "Radio transmisor", opciones: ["Funcionando", "Falla"] },
  { id: "carroceria", nombre: "Carrocería", opciones: ["Buenas", "Con daño"] },
  { id: "interior", nombre: "Interior", opciones: ["Buen estado", "Regular", "Mal estado"] },
  { id: "radio_musical", nombre: "Radio musical", opciones: ["Funcionando", "Falla"] },
];

/** Equipamiento: cantidad que debe tener el móvil. */
export const EQUIPAMIENTO: { id: string; nombre: string; esperado: number }[] = [
  { id: "extintor", nombre: "Extintor", esperado: 1 },
  { id: "botiquin", nombre: "Botiquín", esperado: 1 },
  { id: "gata", nombre: "Gata", esperado: 1 },
  { id: "llave_ruedas", nombre: "Llave de ruedas", esperado: 1 },
  { id: "rueda_repuesto", nombre: "Rueda repuesto", esperado: 1 },
  { id: "triangulos", nombre: "Triángulos", esperado: 1 },
  { id: "busca_camino", nombre: "Busca camino & control", esperado: 1 },
];

export interface ChecklistMovil {
  estado: Record<string, string>;
  /** Porcentaje de urea (AdBlue); null si el móvil no usa. */
  urea: number | null;
  equipamiento: Record<string, number>;
  conos: number;
  aseoInterior: "Con aseo" | "Sin aseo";
  novedades: string;
}

export const CONOS_ESPERADOS = 3;

export function checklistInicial(): ChecklistMovil {
  return {
    estado: Object.fromEntries(ESTADO_MOVIL.map((i) => [i.id, i.opciones[0]])),
    urea: null,
    equipamiento: Object.fromEntries(EQUIPAMIENTO.map((i) => [i.id, i.esperado])),
    conos: CONOS_ESPERADOS,
    aseoInterior: "Con aseo",
    novedades: "",
  };
}

/** Lo que está distinto de lo esperado (para avisar a la Central y para el análisis de flota). */
export function novedadesChecklist(c: ChecklistMovil): string[] {
  const out: string[] = [];
  for (const i of ESTADO_MOVIL) if (c.estado[i.id] && c.estado[i.id] !== i.opciones[0]) out.push(`${i.nombre}: ${c.estado[i.id]}`);
  for (const i of EQUIPAMIENTO) if ((c.equipamiento[i.id] ?? 0) < i.esperado) out.push(`${i.nombre}: ${c.equipamiento[i.id] ?? 0}`);
  if (c.conos < CONOS_ESPERADOS) out.push(`Conos: ${c.conos}`);
  if (c.aseoInterior === "Sin aseo") out.push("Aseo interior: sin aseo");
  if (c.urea != null && c.urea < 20) out.push(`Urea: ${c.urea}%`);
  return out;
}

export interface DatosChecklistTexto {
  momento: "inicio" | "termino";
  fecha: Date;
  horaInicio: Date;
  horaTermino?: Date | null;
  movil: string;
  ppu: string;
  conductor: string;
  acompanante: string;
  kmInicio: number | null;
  kmTermino?: number | null;
  combustibleInicio: string;
  combustibleTermino?: string | null;
  checklist: ChecklistMovil;
}

const km = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-CL"));

/** Texto del checklist en el formato oficial («CHECK LIST MÓVIL TÉRMINO DEL SERVICIO»). */
export function textoChecklist(d: DatosChecklistTexto): string {
  const c = d.checklist;
  const termino = d.momento === "termino";
  return [
    `CHECK LIST MÓVIL ${termino ? "TÉRMINO" : "INICIO"} DEL SERVICIO`,
    "",
    `Fecha: ${fechaCL(d.fecha)}`,
    `Hora inicio: ${horaCL(d.horaInicio)}`,
    ...(termino ? [`Hora término: ${d.horaTermino ? horaCL(d.horaTermino) : "—"}`] : []),
    "",
    `Móvil: ${d.movil.toUpperCase()}`,
    `PPU: ${d.ppu.trim().toUpperCase() || "—"}`,
    "",
    `Conductor: ${d.conductor.trim().toUpperCase() || "—"}`,
    `Acompañante: ${d.acompanante.trim() ? d.acompanante.trim().toUpperCase() : "s/a"}`,
    "",
    `Km inicio: ${km(d.kmInicio)}`,
    ...(termino ? [`Km término: ${km(d.kmTermino)}`] : []),
    "",
    `Combustible inicio: ${d.combustibleInicio}`,
    ...(termino ? [`Combustible término: ${d.combustibleTermino ?? "—"}`] : []),
    "",
    "ESTADO DEL MÓVIL",
    ...ESTADO_MOVIL.map((i) => `${i.nombre}: ${(c.estado[i.id] ?? "—").toUpperCase()}`),
    `Capacidad de Urea: ${c.urea == null ? "—" : `${c.urea}%`}`,
    "",
    "EQUIPAMIENTO",
    ...EQUIPAMIENTO.map((i) => `${i.nombre}: ${c.equipamiento[i.id] ?? 0}`),
    "",
    "OTROS ACCESORIOS",
    `Conos: ${c.conos}`,
    `Aseo interior: ${c.aseoInterior.toLowerCase()}`,
    "",
    "NOVEDADES",
    c.novedades.trim() || "Sin novedades",
  ].join("\n");
}

/* ---------------- Patentes (PPU) por móvil ---------------- */

const CLAVE_PPU = "plataforma.ppu-moviles.v1";
/** Patentes conocidas (se completan desde la app del patrullero y quedan para el próximo turno). */
const PPU_BASE: Record<string, string> = { "MOVIL-13": "VXWW-84" };

export function leerPpu(movilId: string): string {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PPU) ?? "{}") as Record<string, string>;
    return g[movilId] ?? PPU_BASE[movilId] ?? "";
  } catch {
    return PPU_BASE[movilId] ?? "";
  }
}

export function guardarPpu(movilId: string, ppu: string) {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PPU) ?? "{}") as Record<string, string>;
    g[movilId] = ppu.trim().toUpperCase();
    localStorage.setItem(CLAVE_PPU, JSON.stringify(g));
  } catch {
    /* sin almacenamiento */
  }
}
