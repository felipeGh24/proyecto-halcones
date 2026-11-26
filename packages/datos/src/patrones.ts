import { obtenerClave } from "./claves";
import { partesLocales, turnoDe } from "./formato";
import { UNIDADES_VECINALES, unidadVecinalDe } from "./geo";
import { mediana, tiemposDe } from "./indicadores";
import { infoDeClave } from "./semaforo";
import type { Prioridad, Procedimiento, Punto, Turno } from "./tipos";

/**
 * Motor de patrones (inteligencia heurística).
 *
 * No es una caja negra: son reglas estadísticas explicables que se recalculan con cada procedimiento nuevo,
 * así que «aprende» a medida que la operación registra datos. Cada recomendación trae su evidencia y su nivel
 * de confianza según la cantidad de casos. Sirve para orientar decisiones; no reemplaza el criterio de la jefatura.
 *
 * 1. Índice de conflicto por unidad vecinal y barrio: suma ponderada por gravedad (crítica 5, alta 3, media 2,
 *    baja 1) dividida por el promedio comunal. 1,0 = promedio de la comuna.
 * 2. Tendencia: últimos 14 días contra el promedio de los 28 anteriores, con prueba de Poisson (z).
 * 3. Focos: celdas de unos 250 m. Un foco persistente (activo en la mitad o más de las semanas) y concentrado
 *    en una franja horaria sugiere un punto fijo; uno disperso en horarios sugiere patrullaje preventivo.
 * 4. Respuesta: unidades vecinales donde la meta se cumple bastante menos que en la comuna sugieren
 *    ubicar un móvil de espera cerca en la franja de más demanda.
 */

const PESO: Record<Prioridad, number> = { critica: 5, alta: 3, media: 2, baja: 1 };
const DIA = 86400000;
const DIAS_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export type Nivel = "muy_alto" | "alto" | "medio" | "bajo";
export type Confianza = "alta" | "media" | "baja";

export const NIVELES: Record<Nivel, { etiqueta: string; orden: number }> = {
  muy_alto: { etiqueta: "Muy alto", orden: 0 },
  alto: { etiqueta: "Alto", orden: 1 },
  medio: { etiqueta: "Medio", orden: 2 },
  bajo: { etiqueta: "Bajo", orden: 3 },
};

export interface Franja {
  desde: number;
  hasta: number;
  participacion: number;
}

export interface Zona {
  clave: string;
  nombre: string;
  barrio: string;
  n: number;
  puntaje: number;
  indice: number;
  nivel: Nivel;
  rojos: number;
  recientes: number;
  esperado: number;
  z: number;
  /** Variación de los últimos 14 días frente a lo esperado (0,25 = +25 %). */
  variacion: number;
  franja: Franja;
  turno: Turno;
  diasTop: number[];
  claves: { numero: number; n: number }[];
  cumplimiento: number | null;
  respuestaMediana: number | null;
  /** Procedimientos por semana, de la más antigua a la más reciente. */
  semanal: number[];
}

export interface Celda {
  id: string;
  centro: Punto;
  n: number;
  semanasActivas: number;
  persistencia: number;
  franja: Franja;
  diasTop: number[];
  claves: { numero: number; n: number }[];
  uv: number | null;
  barrio: string | null;
}

export type TipoRecomendacion = "punto_fijo" | "patrullaje" | "alza" | "respuesta";

export interface Recomendacion {
  id: string;
  tipo: TipoRecomendacion;
  titulo: string;
  resumen: string;
  evidencia: string[];
  prioridad: 1 | 2 | 3;
  confianza: Confianza;
  zona?: string;
  uv?: number;
  punto?: Punto;
  franja?: Franja;
  diasTop?: number[];
}

export interface AnalisisPatrones {
  generadoEn: string;
  ventanaDias: number;
  analizados: number;
  uvs: Zona[];
  barrios: Zona[];
  focos: Celda[];
  recomendaciones: Recomendacion[];
  cumplimientoComuna: number | null;
}

const confianzaDe = (n: number): Confianza => (n >= 30 ? "alta" : n >= 12 ? "media" : "baja");
const nivelDe = (indice: number): Nivel => (indice >= 1.75 ? "muy_alto" : indice >= 1.25 ? "alto" : indice >= 0.75 ? "medio" : "bajo");
export const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, "0")}:00`;
export const textoFranja = (f: Franja) => `${hh(f.desde)}–${hh(f.hasta)}`;
export const textoDias = (d: number[]) => d.map((x) => DIAS_SEMANA[x]).join(" y ");

/** Ventana de `largo` horas consecutivas (circular) con más casos. */
function mejorFranja(porHora: number[], largo: number): Franja {
  const total = porHora.reduce((s, v) => s + v, 0) || 1;
  let mejor = 0;
  let inicio = 0;
  for (let h = 0; h < 24; h++) {
    let s = 0;
    for (let k = 0; k < largo; k++) s += porHora[(h + k) % 24];
    if (s > mejor) {
      mejor = s;
      inicio = h;
    }
  }
  return { desde: inicio, hasta: (inicio + largo) % 24, participacion: mejor / total };
}

function topDias(porDia: number[], n = 2) {
  return porDia.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, n).map((x) => x.i).sort((a, b) => a - b);
}

function topClaves(procs: Procedimiento[], n = 3) {
  const m = new Map<number, number>();
  procs.forEach((p) => m.set(p.claveNumero, (m.get(p.claveNumero) ?? 0) + 1));
  return [...m.entries()].map(([numero, c]) => ({ numero, n: c })).sort((a, b) => b.n - a.n).slice(0, n);
}

function turnoDominante(procs: Procedimiento[]): Turno {
  const c: Record<Turno, number> = { manana: 0, tarde: 0, noche: 0 };
  procs.forEach((p) => c[turnoDe(p.creadoEn)]++);
  return (Object.keys(c) as Turno[]).sort((a, b) => c[b] - c[a])[0];
}

function describirZona(clave: string, nombre: string, barrio: string, procs: Procedimiento[], ahora: number, semanas: number): Omit<Zona, "indice" | "nivel"> {
  const porHora = Array(24).fill(0) as number[];
  const porDia = Array(7).fill(0) as number[];
  const semanal = Array(semanas).fill(0) as number[];
  let puntaje = 0;
  let rojos = 0;
  let recientes = 0;
  let previos = 0;
  const conMeta: boolean[] = [];
  const resp: number[] = [];
  for (const p of procs) {
    const t = new Date(p.creadoEn).getTime();
    const { hora, dia } = partesLocales(p.creadoEn);
    porHora[hora]++;
    porDia[dia]++;
    const s = semanas - 1 - Math.floor((ahora - t) / (7 * DIA));
    if (s >= 0) semanal[s]++;
    const info = infoDeClave(p.claveNumero);
    puntaje += PESO[info.prioridad];
    if (info.semaforo === "rojo") rojos++;
    if (ahora - t <= 14 * DIA) recientes++;
    else if (ahora - t <= 42 * DIA) previos++;
    const ti = tiemposDe(p);
    if (ti.dentroDeMeta !== null) conMeta.push(ti.dentroDeMeta);
    if (ti.respuesta != null) resp.push(ti.respuesta);
  }
  const esperado = previos / 2;
  const z = (recientes - esperado) / Math.sqrt(Math.max(esperado, 1));
  return {
    clave,
    nombre,
    barrio,
    n: procs.length,
    puntaje,
    rojos,
    recientes,
    esperado,
    z,
    variacion: esperado > 0 ? recientes / esperado - 1 : 0,
    franja: mejorFranja(porHora, 4),
    turno: turnoDominante(procs),
    diasTop: topDias(porDia),
    claves: topClaves(procs),
    cumplimiento: conMeta.length ? conMeta.filter(Boolean).length / conMeta.length : null,
    respuestaMediana: mediana(resp),
    semanal,
  };
}

function conIndice(zonas: Omit<Zona, "indice" | "nivel">[]): Zona[] {
  const prom = zonas.reduce((s, z) => s + z.puntaje, 0) / Math.max(zonas.length, 1) || 1;
  return zonas
    .map((z) => {
      const indice = z.puntaje / prom;
      return { ...z, indice, nivel: nivelDe(indice) };
    })
    .sort((a, b) => b.indice - a.indice);
}

/** Celdas de unos 250 m × 250 m en Conchalí. */
const TAM_LAT = 0.00225;
const TAM_LNG = 0.0027;

export function analizarPatrones(todos: Procedimiento[], ahora = Date.now(), ventanaDias = 84): AnalisisPatrones {
  const desde = ahora - ventanaDias * DIA;
  const semanas = Math.ceil(ventanaDias / 7);
  const procs = todos.filter((p) => p.estado !== "cancelado" && new Date(p.creadoEn).getTime() >= desde);

  // 1) Unidades vecinales y barrios
  const porUV = new Map<number, Procedimiento[]>();
  const porBarrio = new Map<string, Procedimiento[]>();
  for (const p of procs) {
    if (p.unidadVecinal != null) porUV.set(p.unidadVecinal, [...(porUV.get(p.unidadVecinal) ?? []), p]);
    if (p.barrio) porBarrio.set(p.barrio, [...(porBarrio.get(p.barrio) ?? []), p]);
  }
  const uvs = conIndice(
    UNIDADES_VECINALES.features.map((f) => describirZona(String(f.properties.uv), f.properties.nombre, f.properties.barrio, porUV.get(f.properties.uv) ?? [], ahora, semanas)),
  );
  const nombresBarrio = [...new Set(UNIDADES_VECINALES.features.map((f) => f.properties.barrio))];
  // El barrio se compara por unidad vecinal para no castigar a los barrios con más UV.
  const uvsPorBarrio = (b: string) => UNIDADES_VECINALES.features.filter((f) => f.properties.barrio === b).length;
  const barrios = conIndice(
    nombresBarrio.map((b) => {
      const z = describirZona(b, b, b, porBarrio.get(b) ?? [], ahora, semanas);
      return { ...z, puntaje: z.puntaje / uvsPorBarrio(b) };
    }),
  );

  // 2) Focos (celdas)
  const celdas = new Map<string, Procedimiento[]>();
  for (const p of procs) {
    const id = `${Math.floor(p.ubicacion.lat / TAM_LAT)}:${Math.floor(p.ubicacion.lng / TAM_LNG)}`;
    celdas.set(id, [...(celdas.get(id) ?? []), p]);
  }
  const conteos = [...celdas.values()].map((v) => v.length).sort((a, b) => a - b);
  const umbral = Math.max(8, conteos[Math.floor(conteos.length * 0.95)] ?? 8);
  const focos: Celda[] = [...celdas.entries()]
    .filter(([, v]) => v.length >= umbral)
    .map(([id, v]) => {
      const porHora = Array(24).fill(0) as number[];
      const porDia = Array(7).fill(0) as number[];
      const sem = new Set<number>();
      let lat = 0;
      let lng = 0;
      for (const p of v) {
        const { hora, dia } = partesLocales(p.creadoEn);
        porHora[hora]++;
        porDia[dia]++;
        sem.add(Math.floor((ahora - new Date(p.creadoEn).getTime()) / (7 * DIA)));
        lat += p.ubicacion.lat;
        lng += p.ubicacion.lng;
      }
      const centro = { lat: lat / v.length, lng: lng / v.length };
      const uv = unidadVecinalDe(centro);
      return {
        id,
        centro,
        n: v.length,
        semanasActivas: sem.size,
        persistencia: sem.size / semanas,
        franja: mejorFranja(porHora, 4),
        diasTop: topDias(porDia),
        claves: topClaves(v),
        uv: uv?.uv ?? null,
        barrio: uv?.barrio ?? null,
      };
    })
    .sort((a, b) => b.n - a.n);

  // 3) Recomendaciones
  const recs: Recomendacion[] = [];
  const nombreUV = (uv: number | null) => (uv == null ? "sector sin UV" : `UV ${String(uv).padStart(2, "0")}`);
  const listaClaves = (c: { numero: number; n: number }[]) => c.map((x) => `${obtenerClave(x.numero)?.nombre.toLowerCase()} (${x.n})`).join(", ");

  for (const f of focos.slice(0, 8)) {
    const zona = `${nombreUV(f.uv)}${f.barrio ? ` · ${f.barrio}` : ""}`;
    if (f.persistencia >= 0.5 && f.franja.participacion >= 0.45) {
      recs.push({
        id: `fijo-${f.id}`,
        tipo: "punto_fijo",
        titulo: `Punto fijo en ${zona}, ${textoFranja(f.franja)}`,
        resumen: `Foco que se repite casi todas las semanas y se concentra en la misma franja: un punto fijo puede prevenirlo mejor que el patrullaje.`,
        evidencia: [
          `${f.n} procedimientos en un radio de unos 150 m en las últimas ${semanas} semanas.`,
          `Activo en ${f.semanasActivas} de ${semanas} semanas (${Math.round(f.persistencia * 100)} %).`,
          `${Math.round(f.franja.participacion * 100)} % ocurre entre ${textoFranja(f.franja)}, sobre todo ${textoDias(f.diasTop)}.`,
          `Lo más frecuente: ${listaClaves(f.claves)}.`,
        ],
        prioridad: f.n >= umbral * 1.5 ? 1 : 2,
        confianza: confianzaDe(f.n),
        zona,
        uv: f.uv ?? undefined,
        punto: f.centro,
        franja: f.franja,
        diasTop: f.diasTop,
      });
    } else {
      recs.push({
        id: `foco-${f.id}`,
        tipo: "patrullaje",
        titulo: `Patrullaje preventivo en ${zona}`,
        resumen: `Punto con alta concentración de procedimientos. Conviene pasar con frecuencia en la franja de más casos.`,
        evidencia: [
          `${f.n} procedimientos en un radio de unos 150 m (umbral de foco: ${umbral}).`,
          `Franja con más casos: ${textoFranja(f.franja)} (${Math.round(f.franja.participacion * 100)} %), sobre todo ${textoDias(f.diasTop)}.`,
          `Lo más frecuente: ${listaClaves(f.claves)}.`,
        ],
        prioridad: 2,
        confianza: confianzaDe(f.n),
        zona,
        uv: f.uv ?? undefined,
        punto: f.centro,
        franja: f.franja,
        diasTop: f.diasTop,
      });
    }
  }

  for (const u of uvs.filter((x) => x.nivel === "muy_alto").slice(0, 4)) {
    recs.push({
      id: `uv-${u.clave}`,
      tipo: "patrullaje",
      titulo: `Reforzar el patrullaje en ${u.nombre} · ${u.barrio}`,
      resumen: `Unidad vecinal con conflicto muy alto: ${u.indice.toFixed(1).replace(".", ",")} veces el promedio de la comuna, ponderado por gravedad.`,
      evidencia: [
        `${u.n} procedimientos en ${semanas} semanas, ${u.rojos} en rojo.`,
        `Franja de más casos: ${textoFranja(u.franja)} (${Math.round(u.franja.participacion * 100)} %), sobre todo ${textoDias(u.diasTop)}.`,
        `Lo más frecuente: ${listaClaves(u.claves)}.`,
      ],
      prioridad: 1,
      confianza: confianzaDe(u.n),
      zona: `${u.nombre} · ${u.barrio}`,
      uv: Number(u.clave),
      franja: u.franja,
      diasTop: u.diasTop,
    });
  }

  for (const u of uvs.filter((x) => x.z >= 2 && x.recientes >= 5).sort((a, b) => b.z - a.z).slice(0, 4)) {
    recs.push({
      id: `alza-${u.clave}`,
      tipo: "alza",
      titulo: `Alza en ${u.nombre} · ${u.barrio}: ${u.variacion >= 0 ? "+" : ""}${Math.round(u.variacion * 100)} % en 14 días`,
      resumen: `Los procedimientos de las últimas dos semanas superan claramente lo habitual en esta unidad vecinal.`,
      evidencia: [
        `${u.recientes} procedimientos en los últimos 14 días; lo esperado según las 4 semanas anteriores era ${u.esperado.toFixed(1).replace(".", ",")}.`,
        `La diferencia es estadísticamente fuerte (z = ${u.z.toFixed(1).replace(".", ",")}; desde 2 se considera alza).`,
        `Lo más frecuente: ${listaClaves(u.claves)}.`,
      ],
      prioridad: u.z >= 3 ? 1 : 2,
      confianza: confianzaDe(u.recientes * 2),
      zona: `${u.nombre} · ${u.barrio}`,
    });
  }

  const totalMeta = procs.map(tiemposDe).filter((t) => t.dentroDeMeta !== null);
  const cumplimientoComuna = totalMeta.length ? totalMeta.filter((t) => t.dentroDeMeta).length / totalMeta.length : null;
  if (cumplimientoComuna != null) {
    for (const u of uvs.filter((x) => x.cumplimiento != null && x.rojos >= 8 && x.cumplimiento < cumplimientoComuna - 0.15).slice(0, 3)) {
      recs.push({
        id: `resp-${u.clave}`,
        tipo: "respuesta",
        titulo: `Móvil de espera cerca de ${u.nombre} · ${u.barrio}, ${textoFranja(u.franja)}`,
        resumen: `Aquí la meta de respuesta se cumple bastante menos que en el resto de la comuna. Tener un móvil esperando cerca en la franja de más demanda acorta la llegada.`,
        evidencia: [
          `Cumplimiento de meta: ${Math.round((u.cumplimiento ?? 0) * 100)} % frente a ${Math.round(cumplimientoComuna * 100)} % de la comuna.`,
          `Respuesta mediana: ${u.respuestaMediana ? Math.round(u.respuestaMediana) : "—"} min.`,
          `${u.rojos} procedimientos en rojo en el periodo.`,
        ],
        prioridad: 2,
        confianza: confianzaDe(u.rojos * 2),
        zona: `${u.nombre} · ${u.barrio}`,
        franja: u.franja,
      });
    }
  }

  const rango: Record<Confianza, number> = { alta: 0, media: 1, baja: 2 };
  recs.sort((a, b) => a.prioridad - b.prioridad || rango[a.confianza] - rango[b.confianza]);
  // Una sola recomendación de presencia (punto fijo o patrullaje) por unidad vecinal: la más fuerte.
  //    Un punto fijo es más preciso que un refuerzo general, así que gana si ambos apuntan a la misma UV.
  const vistas = new Set<number>();
  const descartar = new Set<string>();
  for (const r of [...recs].sort((a, b) => Number(b.tipo === "punto_fijo") - Number(a.tipo === "punto_fijo"))) {
    if ((r.tipo !== "punto_fijo" && r.tipo !== "patrullaje") || r.uv == null) continue;
    if (vistas.has(r.uv)) descartar.add(r.id);
    else vistas.add(r.uv);
  }
  const finales = recs.filter((r) => !descartar.has(r.id));
  return { generadoEn: new Date(ahora).toISOString(), ventanaDias, analizados: procs.length, uvs, barrios, focos, recomendaciones: finales.slice(0, 12), cumplimientoComuna };
}

export const TIPOS_RECOMENDACION: Record<TipoRecomendacion, { etiqueta: string }> = {
  punto_fijo: { etiqueta: "Punto fijo" },
  patrullaje: { etiqueta: "Patrullaje" },
  alza: { etiqueta: "Alerta de alza" },
  respuesta: { etiqueta: "Tiempo de respuesta" },
};

/** Contexto del sector para quien crea un procedimiento: qué ha pasado cerca de ese punto. */
export function historialCercano(todos: Procedimiento[], punto: Punto, ahora = Date.now(), metros = 200, dias = 30) {
  const desde = ahora - dias * DIA;
  const dLat = metros / 111320;
  const dLng = metros / (111320 * Math.cos((punto.lat * Math.PI) / 180));
  const cerca = todos.filter((p) => {
    if (new Date(p.creadoEn).getTime() < desde) return false;
    const x = (p.ubicacion.lng - punto.lng) / dLng;
    const y = (p.ubicacion.lat - punto.lat) / dLat;
    return x * x + y * y <= 1;
  });
  return { n: cerca.length, claves: topClaves(cerca, 3), metros, dias };
}
