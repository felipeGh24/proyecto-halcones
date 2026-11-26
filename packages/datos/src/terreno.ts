import { partesLocales } from "./formato";
import { UNIDADES_VECINALES } from "./geo";
import type { Procedimiento, RegistroTurno, Reporte, TipoReporte } from "./tipos";

/**
 * Trabajo en terreno: qué hacen los equipos además de responder procedimientos.
 * Cruza los reportes (patrullaje preventivo, punto estático, procedimiento) con dónde ocurren los procedimientos
 * para encontrar «brechas de cobertura»: unidades vecinales con mucho conflicto y poca presencia preventiva.
 */
export interface CoberturaUV {
  uv: number;
  nombre: string;
  barrio: string;
  procedimientos: number;
  presencia: number;
  /** Proporción de procedimientos de la comuna en esta UV menos proporción de presencia preventiva (−1 a 1). */
  brecha: number;
}

export interface AnalisisTerreno {
  total: number;
  porTipo: Record<TipoReporte, number>;
  conAdjuntos: number;
  adjuntos: number;
  porDia: { fecha: string; patrullaje_preventivo: number; procedimiento: number; punto_estatico: number }[];
  horas: number[][];
  cobertura: CoberturaUV[];
  brechas: CoberturaUV[];
  turnos: number;
  kmRecorridos: number;
  horasEnTurno: number;
  novedadesVehiculo: { etiqueta: string; n: number }[];
  porPatrullero: { etiqueta: string; n: number }[];
}

const FECHA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" });
const PRESENCIA: TipoReporte[] = ["patrullaje_preventivo", "punto_estatico"];

export function analizarTerreno(reportes: Reporte[], procedimientos: Procedimiento[], turnos: RegistroTurno[], desde: number, hasta: number): AnalisisTerreno {
  const enRango = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= desde && t < hasta;
  };
  const rs = reportes.filter((r) => enRango(r.creadoEn));
  const ps = procedimientos.filter((p) => p.estado !== "cancelado" && enRango(p.creadoEn));
  const ts = turnos.filter((t) => enRango(t.cerradoEn));

  const porTipo: Record<TipoReporte, number> = { patrullaje_preventivo: 0, procedimiento: 0, punto_estatico: 0 };
  const horas = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const dias = new Map<string, AnalisisTerreno["porDia"][number]>();
  for (let t = desde; t < hasta; t += 86400000) {
    const f = FECHA.format(new Date(t));
    if (!dias.has(f)) dias.set(f, { fecha: f, patrullaje_preventivo: 0, procedimiento: 0, punto_estatico: 0 });
  }
  const patrulleros = new Map<string, number>();
  let conAdjuntos = 0;
  let adjuntos = 0;
  for (const r of rs) {
    porTipo[r.tipo]++;
    const n = r.adjuntos.length + r.complementos.reduce((s, c) => s + c.adjuntos.length, 0);
    if (n) conAdjuntos++;
    adjuntos += n;
    const { hora, dia } = partesLocales(r.creadoEn);
    horas[dia][hora]++;
    const d = dias.get(FECHA.format(new Date(r.creadoEn)));
    if (d) d[r.tipo]++;
    const quien = r.halcon ? `Halcón ${r.halcon}` : r.patrullero;
    patrulleros.set(quien, (patrulleros.get(quien) ?? 0) + 1);
  }

  // Cobertura: conflicto (procedimientos) frente a presencia preventiva (reportes preventivos y puntos estáticos).
  const procUV = new Map<number, number>();
  for (const p of ps) if (p.unidadVecinal != null) procUV.set(p.unidadVecinal, (procUV.get(p.unidadVecinal) ?? 0) + 1);
  const presUV = new Map<number, number>();
  for (const r of rs) if (PRESENCIA.includes(r.tipo) && r.unidadVecinal != null) presUV.set(r.unidadVecinal, (presUV.get(r.unidadVecinal) ?? 0) + 1);
  const totalProc = ps.length || 1;
  const totalPres = [...presUV.values()].reduce((a, b) => a + b, 0) || 1;
  const cobertura: CoberturaUV[] = UNIDADES_VECINALES.features.map((f) => {
    const uv = f.properties.uv;
    const procedimientos = procUV.get(uv) ?? 0;
    const presencia = presUV.get(uv) ?? 0;
    return { uv, nombre: f.properties.nombre, barrio: f.properties.barrio, procedimientos, presencia, brecha: procedimientos / totalProc - presencia / totalPres };
  });
  // Brecha relevante: al menos 4 procedimientos y la UV pesa en conflicto bastante más de lo que pesa en presencia.
  const brechas = cobertura.filter((c) => c.procedimientos >= 4 && c.brecha > 0.01).sort((a, b) => b.brecha - a.brecha);

  const novedades = new Map<string, number>();
  for (const t of ts) for (const n of t.novedadesChecklist) novedades.set(n, (novedades.get(n) ?? 0) + 1);
  const ordenar = (m: Map<string, number>) => [...m.entries()].map(([etiqueta, n]) => ({ etiqueta, n })).sort((a, b) => b.n - a.n);

  return {
    total: rs.length,
    porTipo,
    conAdjuntos,
    adjuntos,
    porDia: [...dias.values()],
    horas,
    cobertura,
    brechas,
    turnos: ts.length,
    kmRecorridos: ts.reduce((s, t) => s + (t.kmFinal != null && t.kmInicial != null ? Math.max(0, t.kmFinal - t.kmInicial) : 0), 0),
    horasEnTurno: ts.reduce((s, t) => s + (new Date(t.cerradoEn).getTime() - new Date(t.iniciadoEn).getTime()) / 3600000, 0),
    novedadesVehiculo: ordenar(novedades).slice(0, 8),
    porPatrullero: ordenar(patrulleros).slice(0, 10),
  };
}
