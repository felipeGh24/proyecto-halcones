import { obtenerClave } from "./claves";
import { minutosEntre, partesLocales, turnoDe } from "./formato";
import { infoDeClave } from "./semaforo";
import type { EstadoProcedimiento, Procedimiento, Semaforo, Turno } from "./tipos";

/**
 * Indicadores de operación calculados desde la línea de tiempo de cada procedimiento.
 * Las mismas fórmulas se replican en las vistas SQL (supabase/migrations) para Power BI u otras herramientas.
 */

export interface Tiempos {
  /** Asignado − Recibido */
  despacho: number | null;
  /** En el lugar − Asignado */
  llegada: number | null;
  /** En el lugar − Recibido */
  respuesta: number | null;
  /** Finalizado − En el lugar */
  enLugar: number | null;
  /** null si la clave no tiene meta o si no llegó al lugar. */
  dentroDeMeta: boolean | null;
}

function instante(p: Procedimiento, estado: EstadoProcedimiento): string | null {
  return p.eventos.find((e) => e.estado === estado)?.en ?? null;
}

export function tiemposDe(p: Procedimiento): Tiempos {
  const rec = instante(p, "recibido");
  const asi = instante(p, "asignado");
  const lug = instante(p, "en_el_lugar");
  const fin = instante(p, "finalizado");
  const despacho = rec && asi ? minutosEntre(rec, asi) : null;
  const llegada = asi && lug ? minutosEntre(asi, lug) : null;
  const respuesta = rec && lug ? minutosEntre(rec, lug) : null;
  const meta = infoDeClave(p.claveNumero).metaMinutos;
  return {
    despacho,
    llegada,
    respuesta,
    enLugar: lug && fin ? minutosEntre(lug, fin) : null,
    dentroDeMeta: meta == null || respuesta == null ? null : respuesta <= meta,
  };
}

export interface Filtros {
  desde: number;
  hasta: number;
  semaforo?: Semaforo | "todos";
  turno?: Turno | "todos";
  unidadVecinal?: number | "todas";
  claveNumero?: number | "todas";
}

export function filtrar(procs: Procedimiento[], f: Filtros): Procedimiento[] {
  return procs.filter((p) => {
    const t = new Date(p.creadoEn).getTime();
    if (t < f.desde || t >= f.hasta) return false;
    if (f.semaforo && f.semaforo !== "todos" && infoDeClave(p.claveNumero).semaforo !== f.semaforo) return false;
    if (f.turno && f.turno !== "todos" && turnoDe(p.creadoEn) !== f.turno) return false;
    if (f.unidadVecinal != null && f.unidadVecinal !== "todas" && p.unidadVecinal !== f.unidadVecinal) return false;
    if (f.claveNumero != null && f.claveNumero !== "todas" && p.claveNumero !== f.claveNumero) return false;
    return true;
  });
}

export function mediana(valores: number[]): number | null {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function percentil(valores: number[], p: number): number | null {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.floor(p * v.length))];
}

export interface Resumen {
  total: number;
  finalizados: number;
  cancelados: number;
  activos: number;
  despachoMediana: number | null;
  llegadaMediana: number | null;
  respuestaMediana: number | null;
  respuesta90: number | null;
  cumplimiento: number | null;
  conMeta: number;
}

export function resumen(procs: Procedimiento[]): Resumen {
  const t = procs.map(tiemposDe);
  const conMeta = t.filter((x) => x.dentroDeMeta !== null);
  const resp = t.map((x) => x.respuesta).filter((x): x is number => x != null);
  return {
    total: procs.length,
    finalizados: procs.filter((p) => p.estado === "finalizado").length,
    cancelados: procs.filter((p) => p.estado === "cancelado").length,
    activos: procs.filter((p) => !["finalizado", "cancelado"].includes(p.estado)).length,
    despachoMediana: mediana(t.map((x) => x.despacho).filter((x): x is number => x != null)),
    llegadaMediana: mediana(t.map((x) => x.llegada).filter((x): x is number => x != null)),
    respuestaMediana: mediana(resp),
    respuesta90: percentil(resp, 0.9),
    cumplimiento: conMeta.length ? conMeta.filter((x) => x.dentroDeMeta).length / conMeta.length : null,
    conMeta: conMeta.length,
  };
}

/** Cantidad por día (clave AAAA-MM-DD en hora de Chile). */
export function porDia(procs: Procedimiento[]): Map<string, number> {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" });
  const m = new Map<string, number>();
  for (const p of procs) {
    const k = fmt.format(new Date(p.creadoEn));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Matriz 7 × 24 (lunes a domingo × hora). */
export function horaPorDia(procs: Procedimiento[]): number[][] {
  const m = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const p of procs) {
    const { hora, dia } = partesLocales(p.creadoEn);
    m[dia][hora]++;
  }
  return m;
}

export function ranking<K>(procs: Procedimiento[], clave: (p: Procedimiento) => K | null, limite = 10): { clave: K; n: number }[] {
  const m = new Map<K, number>();
  for (const p of procs) {
    const k = clave(p);
    if (k != null) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([k, n]) => ({ clave: k, n })).sort((a, b) => b.n - a.n).slice(0, limite);
}

export function cumplimientoPorSemaforo(procs: Procedimiento[]) {
  const grupos: Record<Semaforo, { dentro: number; total: number }> = {
    rojo: { dentro: 0, total: 0 },
    amarillo: { dentro: 0, total: 0 },
    verde: { dentro: 0, total: 0 },
  };
  for (const p of procs) {
    const t = tiemposDe(p);
    if (t.dentroDeMeta === null) continue;
    const s = infoDeClave(p.claveNumero).semaforo;
    grupos[s].total++;
    if (t.dentroDeMeta) grupos[s].dentro++;
  }
  return grupos;
}

export function nombreClave(numero: number): string {
  const c = obtenerClave(numero);
  return c ? `${c.numero} · ${c.nombre}` : String(numero);
}
