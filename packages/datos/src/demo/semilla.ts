import { CLAVES, obtenerClave } from "../claves";
import { centroideUV, UNIDADES_VECINALES, unidadVecinalDe } from "../geo";
import type { EstadoProcedimiento, EventoProcedimiento, Movil, Procedimiento, Punto, RegistroTurno, Reporte, TipoMovil, TurnoPersonal } from "../tipos";

/**
 * Datos de ejemplo para el modo demostración. Todo es ficticio: no hay personas ni hechos reales.
 * Se generan con una semilla fija para que la demo sea reproducible.
 */

export function prng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Azar = ReturnType<typeof prng>;

function elegirPonderado<T>(azar: Azar, items: readonly T[], pesos: readonly number[]): T {
  const total = pesos.reduce((s, p) => s + p, 0);
  let r = azar() * total;
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const entre = (azar: Azar, min: number, max: number) => min + azar() * (max - min);

/** Frecuencia relativa de cada clave en la demo (las demás tienen peso 1). */
const PESO_CLAVE: Record<number, number> = {
  27: 60, 39: 45, 67: 40, 23: 38, 63: 35, 2: 30, 5: 28, 66: 26, 51: 22, 81: 20, 21: 20, 26: 18, 6: 18,
  37: 16, 15: 15, 44: 14, 55: 12, 79: 10, 57: 10, 71: 8, 76: 8, 22: 8, 42: 6, 13: 4, 25: 3, 36: 3, 41: 3,
};
const CLAVES_DEMO = CLAVES.filter((c) => ![3, 8, 14, 18, 19, 20, 24, 28, 29, 30, 31, 33, 43, 52, 53, 56, 58, 59, 62, 64, 65].includes(c.numero));
const PESOS_DEMO = CLAVES_DEMO.map((c) => PESO_CLAVE[c.numero] ?? 1);

/** Peso por hora del día (0–23): más actividad en la tarde y la noche. */
const PESO_HORA = [6, 5, 4, 3, 2, 2, 2, 3, 4, 5, 6, 6, 7, 7, 7, 8, 9, 10, 11, 12, 12, 11, 9, 7];
/** Peso por día (0 = lunes). */
const PESO_DIA = [9, 9, 9, 10, 12, 14, 12];

/** Algunas UV concentran más eventos, como en cualquier comuna. */
const UVS = UNIDADES_VECINALES.features.map((f) => f.properties.uv);
const PESO_UV = UVS.map((uv) => ([2, 5, 11, 17, 23, 30, 36, 41].includes(uv) ? 4 : [8, 14, 27, 44].includes(uv) ? 2.5 : 1));

export function puntoEnUV(azar: Azar, uv: number): Punto {
  const f = UNIDADES_VECINALES.features.find((x) => x.properties.uv === uv)!;
  const anillo = f.geometry.coordinates[0];
  const lngs = anillo.map((c) => c[0]);
  const lats = anillo.map((c) => c[1]);
  for (let i = 0; i < 200; i++) {
    const p = { lng: entre(azar, Math.min(...lngs), Math.max(...lngs)), lat: entre(azar, Math.min(...lats), Math.max(...lats)) };
    if (unidadVecinalDe(p)?.uv === uv) return { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) };
  }
  return { lat: anillo[0][1], lng: anillo[0][0] };
}

const RELATOS = [
  "Llamado de vecino informa la situación en la vía pública.",
  "Aviso recibido por cámara municipal.",
  "Patrullaje preventivo detecta la situación.",
  "Comerciante del sector solicita presencia.",
  "Junta de vecinos reporta el hecho.",
  "Denuncia telefónica a la Central.",
];

const RESULTADOS = [
  "Se atiende y se orienta a los involucrados.",
  "Se coordina con Carabineros.",
  "Situación normalizada en el lugar.",
  "Se entrega información al denunciante.",
  "Sin novedad al llegar al lugar.",
];

export const MOVILES_BASE: { id: string; nombre: string; tipo: TipoMovil }[] = [
  ...Array.from({ length: 17 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `MOVIL-${n}`, nombre: `Móvil ${n}`, tipo: "Móvil" as TipoMovil };
  }),
  ...[13, 14, 15, 16].map((n) => ({ id: `ALPHA-${n}`, nombre: `Alpha ${n}`, tipo: "Alpha" as TipoMovil })),
  ...[1, 2].map((n) => ({ id: `RAM-0${n}`, nombre: `RAM 0${n}`, tipo: "RAM" as TipoMovil })),
];

const SISTEMA = { porUsuarioId: "sistema-demo", porNombre: "Operador Demo" };

function evento(estado: EstadoProcedimiento, t: number, extra: Partial<EventoProcedimiento> = {}): EventoProcedimiento {
  return { estado, en: new Date(t).toISOString(), ...SISTEMA, ...extra };
}

/** Tiempos simulados en minutos según la prioridad. */
function tiempos(azar: Azar, prioridad: string) {
  const urgente = prioridad === "critica" || prioridad === "alta";
  const despacho = prioridad === "critica" ? entre(azar, 0.3, 1.5) : prioridad === "alta" ? entre(azar, 0.5, 2.5) : prioridad === "media" ? entre(azar, 2, 8) : entre(azar, 4, 35);
  const salida = entre(azar, 0.2, urgente ? 1 : 2);
  const viaje = urgente ? entre(azar, 1, 6) : entre(azar, 2, prioridad === "baja" ? 18 : 10);
  const atencion = entre(azar, 1, 4);
  const duracion = entre(azar, 8, prioridad === "critica" ? 90 : 45);
  return { despacho, salida, viaje, atencion, duracion };
}

export interface DatosDemo {
  procedimientos: Procedimiento[];
  moviles: Movil[];
  personal: TurnoPersonal[];
  historialTurnos: RegistroTurno[];
  reportes: Reporte[];
  secuencia: number;
  secuenciaReportes: number;
}

/**
 * Punto de partida real: la flota de 23 móviles sin turno y nada más.
 * Sin procedimientos, sin patrulleros y sin reportes: todo lo que aparezca lo crean los usuarios.
 */
export function datosVacios(semilla = 7): DatosDemo {
  const azar = prng(semilla);
  const moviles: Movil[] = MOVILES_BASE.map((m) => ({
    ...m,
    estado: "sin_turno",
    posicion: puntoEnUV(azar, UVS[Math.floor(azar() * UVS.length)]),
    ultimaSenal: new Date().toISOString(),
    procedimientoId: null,
    turno: null,
  }));
  return { procedimientos: [], moviles, personal: [], historialTurnos: [], reportes: [], secuencia: 0, secuenciaReportes: 0 };
}

export function generarDemo(ahora = Date.now(), dias = 90, semilla = 2026): DatosDemo {
  const azar = prng(semilla);
  const procedimientos: Procedimiento[] = [];
  let secuencia = 0;
  const MIN = 60000;

  // Histórico: unos 9 procedimientos al día, finalizados o cancelados.
  for (let d = dias; d >= 1; d--) {
    const base = ahora - d * 86400000;
    const diaSemana = (new Date(base).getUTCDay() + 6) % 7;
    const cantidad = Math.round(entre(azar, 6, 10) * (PESO_DIA[diaSemana] / 10));
    const inicioDia = Math.floor(base / 86400000) * 86400000 + 3 * 3600000; // medianoche de Chile ≈ 03:00 UTC
    for (let i = 0; i < cantidad; i++) {
      // Una parte de los casos ocurre en focos fijos, para que la demo tenga patrones reales que descubrir.
      const foco = azar() < 0.2 ? FOCOS[Math.floor(azar() * FOCOS.length)] : null;
      if (foco && !foco.dias.includes(diaSemana) && azar() < 0.7) continue;
      const h = foco ? foco.horas[Math.floor(azar() * foco.horas.length)] : elegirPonderado(azar, PESO_HORA.map((_, k) => k), PESO_HORA);
      const t0 = inicioDia + h * 3600000 + azar() * 3600000;
      procedimientos.push(historico(azar, ++secuencia, t0, foco ?? undefined));
    }
    // Alza reciente en una unidad vecinal (últimas dos semanas).
    if (d <= 14 && azar() < 0.75) {
      const t0 = inicioDia + (17 + Math.floor(azar() * 6)) * 3600000;
      procedimientos.push(historico(azar, ++secuencia, t0, { uv: 36, claves: [67, 39, 21, 5], radio: 0 }));
    }
  }

  // Móviles: posición inicial en la comuna.
  // Móviles: 16 con un patrullero en turno (nombres ficticios), 5 sin turno y 2 fuera de servicio.
  // El Móvil 03 parte sin turno para que el patrullero de la demo lo abra desde su app.
  const SIN_TURNO = new Set(["MOVIL-03", "MOVIL-08", "MOVIL-12", "ALPHA-15", "RAM-02"]);
  const FUERA = new Set(["MOVIL-17", "ALPHA-16"]);
  const inicioTurno = new Date(ahora - entre(azar, 2, 5) * 3600000).toISOString();
  let n = 0;
  const moviles: Movil[] = MOVILES_BASE.map((m) => {
    const uv = elegirPonderado(azar, UVS, PESO_UV);
    const enTurno = !SIN_TURNO.has(m.id) && !FUERA.has(m.id);
    if (enTurno) n++;
    return {
      ...m,
      estado: FUERA.has(m.id) ? "fuera_de_servicio" : enTurno ? "disponible" : "sin_turno",
      posicion: puntoEnUV(azar, uv),
      ultimaSenal: new Date(ahora - entre(azar, 5, 40) * 1000).toISOString(),
      procedimientoId: null,
      turno: enTurno
        ? {
            patrullero: `Patrullero ${String(n).padStart(2, "0")}`,
            acompanante: azar() < 0.6 ? `Patrullero ${String(n + 20).padStart(2, "0")}` : "",
            usuarioId: `u-demo-${n}`,
            iniciadoEn: inicioTurno,
            kmInicial: Math.round(entre(azar, 20000, 140000)),
            combustible: "3/4",
            observaciones: azar() < 0.15 ? ["Neumáticos"] : [],
          }
        : null,
    };
  });

  // Turno en curso: algunos procedimientos activos en distintos estados.
  const activos: { clave: number; estado: EstadoProcedimiento; hace: number }[] = [
    { clave: 13, estado: "recibido", hace: 1.5 },
    { clave: 66, estado: "recibido", hace: 4 },
    { clave: 39, estado: "recibido", hace: 9 },
    { clave: 2, estado: "asignado", hace: 6 },
    { clave: 67, estado: "en_desplazamiento", hace: 11 },
    { clave: 27, estado: "en_el_lugar", hace: 19 },
    { clave: 63, estado: "en_procedimiento", hace: 31 },
    { clave: 51, estado: "en_procedimiento", hace: 42 },
  ];
  const orden: EstadoProcedimiento[] = ["recibido", "asignado", "en_desplazamiento", "en_el_lugar", "en_procedimiento"];
  let movilLibre = 0;
  for (const a of activos) {
    const uv = elegirPonderado(azar, UVS, PESO_UV);
    const ubic = puntoEnUV(azar, uv);
    const props = unidadVecinalDe(ubic);
    const t0 = ahora - a.hace * MIN;
    const eventos: EventoProcedimiento[] = [];
    const pasos = orden.slice(0, orden.indexOf(a.estado) + 1);
    pasos.forEach((estado, k) => eventos.push(evento(estado, t0 + k * (a.hace / pasos.length) * MIN)));
    let movilId: string | null = null;
    if (a.estado !== "recibido") {
      while (moviles[movilLibre].estado !== "disponible") movilLibre++;
      const m = moviles[movilLibre];
      movilId = m.id;
      m.estado = ["en_el_lugar", "en_procedimiento"].includes(a.estado) ? "en_procedimiento" : "asignado";
      m.procedimientoId = `PROC-${secuencia + 1}`;
      if (m.estado === "en_procedimiento") m.posicion = ubic;
    }
    secuencia++;
    procedimientos.push({
      id: `PROC-${secuencia}`,
      folio: folio(secuencia),
      claveNumero: a.clave,
      descripcion: RELATOS[Math.floor(azar() * RELATOS.length)],
      direccion: `Sector ${props?.nombre ?? "sin UV"}, ${props?.barrio ?? "Conchalí"} (punto de ejemplo)`,
      ubicacion: ubic,
      unidadVecinal: props?.uv ?? null,
      barrio: props?.barrio ?? null,
      estado: a.estado,
      movilId,
      creadoEn: eventos[0].en,
      eventos,
    });
  }

  // Personal sin móvil (ficticio): dos puntos fijos y una pareja a pie.
  const personal: TurnoPersonal[] = [
    { id: "pers-1", usuarioId: "u-demo-p1", patrullero: "Patrullero 41", acompanante: "", modalidad: "punto_fijo", lugar: "Punto fijo de ejemplo · UV 41", ubicacion: puntoEnUV(azar, 41), iniciadoEn: inicioTurno },
    { id: "pers-2", usuarioId: "u-demo-p2", patrullero: "Patrullero 42", acompanante: "", modalidad: "punto_fijo", lugar: "Punto fijo de ejemplo · UV 02", ubicacion: puntoEnUV(azar, 2), iniciadoEn: inicioTurno },
    { id: "pers-3", usuarioId: "u-demo-p3", patrullero: "Patrullero 43", acompanante: "Patrullero 44", modalidad: "a_pie", lugar: "Patrullaje a pie · UV 30", ubicacion: puntoEnUV(azar, 30), iniciadoEn: inicioTurno },
  ];
  const { reportes, historialTurnos } = generarTerreno(azar, procedimientos, ahora, Math.min(dias, 45));
  return { procedimientos, moviles, personal, historialTurnos, reportes, secuencia, secuenciaReportes: reportes.length };

  function historico(azar: Azar, n: number, t0: number, foco?: { uv: number; claves: number[]; radio: number }): Procedimiento {
    const clave = foco ? obtenerClave(foco.claves[Math.floor(azar() * foco.claves.length)])! : elegirPonderado(azar, CLAVES_DEMO, PESOS_DEMO);
    const prioridad = obtenerClave(clave.numero)!.prioridad;
    const uv = foco ? foco.uv : elegirPonderado(azar, UVS, PESO_UV);
    let ubic = foco?.radio ? cercaDe(azar, centroideUV(foco.uv)!, foco.radio) : puntoEnUV(azar, uv);
    if (!unidadVecinalDe(ubic)) ubic = puntoEnUV(azar, uv);
    const props = unidadVecinalDe(ubic);
    const movil = MOVILES_BASE[Math.floor(azar() * MOVILES_BASE.length)];
    const tt = tiempos(azar, prioridad);
    const eventos: EventoProcedimiento[] = [evento("recibido", t0)];
    let t = t0;
    let estado: EstadoProcedimiento = "finalizado";
    if (azar() < 0.04) {
      t += tt.despacho * MIN;
      eventos.push(evento("cancelado", t, { nota: "Anulado por el denunciante." }));
      estado = "cancelado";
    } else {
      t += tt.despacho * MIN; eventos.push(evento("asignado", t));
      t += tt.salida * MIN; eventos.push(evento("en_desplazamiento", t));
      t += tt.viaje * MIN; eventos.push(evento("en_el_lugar", t, { ubicacion: ubic }));
      t += tt.atencion * MIN; eventos.push(evento("en_procedimiento", t));
      t += tt.duracion * MIN; eventos.push(evento("finalizado", t));
    }
    return {
      id: `PROC-${n}`,
      folio: folio(n),
      claveNumero: clave.numero,
      descripcion: RELATOS[Math.floor(azar() * RELATOS.length)],
      direccion: `Sector ${props?.nombre ?? "sin UV"}, ${props?.barrio ?? "Conchalí"} (punto de ejemplo)`,
      ubicacion: ubic,
      unidadVecinal: props?.uv ?? null,
      barrio: props?.barrio ?? null,
      estado,
      movilId: estado === "cancelado" ? null : movil.id,
      resultado: estado === "finalizado" ? RESULTADOS[Math.floor(azar() * RESULTADOS.length)] : undefined,
      creadoEn: eventos[0].en,
      eventos,
    };
  }
}

/** Focos ficticios de la demo: lugar, horas, días (0 = lunes) y claves típicas. */
const FOCOS = [
  { uv: 2, horas: [22, 23, 0, 1], dias: [4, 5], claves: [27, 66, 23, 5], radio: 70 },
  { uv: 30, horas: [11, 13, 15, 17, 19, 21], dias: [0, 1, 2, 3, 4, 5, 6], claves: [67, 39, 15], radio: 90 },
  { uv: 41, horas: [19, 20, 21, 22], dias: [3, 4, 5], claves: [26, 37, 23], radio: 70 },
  { uv: 17, horas: [7, 8, 18, 19], dias: [0, 1, 2, 3, 4], claves: [2, 51, 81], radio: 80 },
];

function cercaDe(azar: Azar, c: Punto, metros: number): Punto {
  const r = (metros / 111320) * Math.sqrt(azar());
  const a = azar() * 2 * Math.PI;
  return { lat: +(c.lat + r * Math.sin(a)).toFixed(6), lng: +(c.lng + (r * Math.cos(a)) / Math.cos((c.lat * Math.PI) / 180)).toFixed(6) };
}

export function folio(n: number): string {
  return `P-${String(n).padStart(6, "0")}`;
}

/** Presencia preventiva de ejemplo: deliberadamente baja en UV 36 y 23 para que aparezcan brechas de cobertura. */
const PESO_PRESENCIA = UVS.map((uv) => ([36, 23].includes(uv) ? 0.3 : [2, 5, 11, 17, 30, 41].includes(uv) ? 4 : [8, 14, 27, 44].includes(uv) ? 2 : 1));
const NOVEDADES_DEMO = ["Neumáticos", "Luces y baliza", "Carrocería", "Radio", "Sirena"];
const OBS_PREVENTIVO = ["Sin novedad en el sector.", "Se recorre plaza y alrededores, sin novedad.", "Se conversa con vecinos; reportan luminaria apagada.", "Vehículo abandonado en pasaje, se informa.", "Grupo en esquina se retira al paso del móvil."];

function generarTerreno(azar: Azar, procedimientos: Procedimiento[], ahora: number, dias: number): { reportes: Reporte[]; historialTurnos: RegistroTurno[] } {
  const reportes: Reporte[] = [];
  const historialTurnos: RegistroTurno[] = [];
  const HORA = 3600000;
  let n = 0;
  const nuevo = (r: Omit<Reporte, "id" | "folio" | "leidoPorCentral" | "complementos" | "adjuntos"> & { adjuntos?: Reporte["adjuntos"] }) => {
    n++;
    reportes.push({ adjuntos: [], ...r, id: `REP-demo-${n}`, folio: `R-${String(n).padStart(5, "0")}`, leidoPorCentral: true, complementos: [] });
  };
  for (let d = dias - 1; d >= 0; d--) {
    const inicioDia = Math.floor((ahora - d * 86400000) / 86400000) * 86400000 + 3 * HORA;
    // Turnos cerrados: día (08–20) y noche (20–08) de seis móviles.
    for (const [k, base] of MOVILES_BASE.slice(0, 6).entries())
      for (const h0 of [8, 20]) {
        const ini = inicioDia + h0 * HORA;
        const fin = ini + 12 * HORA;
        if (fin > ahora) continue;
        const km0 = 40000 + k * 9000 + (dias - d) * 160;
        historialTurnos.push({
          id: `TUR-demo-${base.id}-${d}-${h0}`,
          usuarioId: `u-demo-${k}`,
          patrullero: `Patrullero ${String(k + 1 + (h0 === 20 ? 10 : 0)).padStart(2, "0")}`,
          acompanante: "",
          modalidad: "movil",
          unidad: base.nombre,
          iniciadoEn: new Date(ini).toISOString(),
          cerradoEn: new Date(fin).toISOString(),
          kmInicial: km0,
          kmFinal: km0 + Math.round(entre(azar, 45, 110)),
          combustibleFinal: azar() < 0.3 ? "1/4" : "1/2",
          novedadesChecklist: azar() < 0.18 ? [NOVEDADES_DEMO[Math.floor(azar() * NOVEDADES_DEMO.length)]] : [],
          observaciones: "",
        });
      }
    const cantidad = Math.round(entre(azar, 6, 10));
    for (let i = 0; i < cantidad; i++) {
      const t = inicioDia + elegirPonderado(azar, PESO_HORA.map((_, k) => k), PESO_HORA) * HORA + azar() * HORA;
      if (t > ahora) continue;
      const estatico = azar() < 0.2;
      const uv = estatico ? [41, 2, 30][Math.floor(azar() * 3)] : elegirPonderado(azar, UVS, PESO_PRESENCIA);
      const ubicacion = puntoEnUV(azar, uv);
      const props = unidadVecinalDe(ubicacion);
      const halcon = String(1 + Math.floor(azar() * 18));
      nuevo({
        creadoEn: new Date(t).toISOString(),
        usuarioId: `u-demo-h${halcon}`,
        patrullero: `Patrullero ${halcon.padStart(2, "0")}`,
        halcon,
        unidad: estatico ? `Punto fijo · UV ${String(uv).padStart(2, "0")}` : MOVILES_BASE[Math.floor(azar() * 6)].nombre,
        tipo: estatico ? "punto_estatico" : "patrullaje_preventivo",
        direccion: `Sector ${props?.nombre ?? `UV ${uv}`}`,
        ubicacion,
        unidadVecinal: props?.uv ?? null,
        barrio: props?.barrio ?? null,
        procedimientoId: null,
        observaciones: OBS_PREVENTIVO[Math.floor(azar() * OBS_PREVENTIVO.length)],
      });
    }
  }
  // Reporte de cierre para cerca de la mitad de los procedimientos finalizados del periodo.
  const desde = ahora - dias * 86400000;
  for (const p of procedimientos) {
    if (p.estado !== "finalizado" || !p.movilId || new Date(p.creadoEn).getTime() < desde || azar() > 0.5) continue;
    const fin = p.eventos[p.eventos.length - 1]?.en ?? p.creadoEn;
    const halcon = String(1 + Math.floor(azar() * 18));
    nuevo({
      creadoEn: fin,
      usuarioId: `u-demo-h${halcon}`,
      patrullero: `Patrullero ${halcon.padStart(2, "0")}`,
      halcon,
      unidad: MOVILES_BASE.find((m) => m.id === p.movilId)?.nombre ?? p.movilId,
      tipo: "procedimiento",
      direccion: p.direccion,
      ubicacion: p.ubicacion,
      unidadVecinal: p.unidadVecinal,
      barrio: p.barrio,
      procedimientoId: p.id,
      observaciones: p.resultado ?? "Procedimiento finalizado.",
    });
  }
  reportes.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  return { reportes, historialTurnos: historialTurnos.reverse() };
}
