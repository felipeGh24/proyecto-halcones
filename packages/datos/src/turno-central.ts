import { esActivo } from "./estados";
import { infoDeClave } from "./semaforo";
import { mediana } from "./indicadores";
import type { Movil, Procedimiento, RegistroAccion, Reporte, ResumenTurnoCentral, TurnoCentral, TurnoPersonal } from "./tipos";

/**
 * Resumen de un turno de la Central: qué se hizo entre `desde` y `hasta`, quién estuvo
 * y qué queda pendiente para el turno siguiente. Se usa en vivo (antes de cerrar) y se guarda al cerrar.
 */
export function resumirTurnoCentral(
  datos: { procedimientos: Procedimiento[]; moviles: Movil[]; personal: TurnoPersonal[]; reportes: Reporte[]; auditoria: RegistroAccion[]; turnosCentral: TurnoCentral[] },
  desde: string,
  hasta: string,
): ResumenTurnoCentral {
  const t0 = new Date(desde).getTime();
  const t1 = new Date(hasta).getTime();
  const dentro = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= t0 && t <= t1;
  };
  const acciones = datos.auditoria.filter((a) => dentro(a.en)).sort((a, b) => (a.en < b.en ? -1 : 1));
  const creados = datos.procedimientos.filter((p) => dentro(p.creadoEn));
  const contar = (estado: string) => datos.procedimientos.filter((p) => p.eventos.some((e) => e.estado === estado && dentro(e.en))).length;
  const despachos = datos.procedimientos.flatMap((p) => {
    const asig = p.eventos.find((e) => e.estado === "asignado");
    return asig && dentro(asig.en) ? [(new Date(asig.en).getTime() - new Date(p.creadoEn).getTime()) / 60000] : [];
  });
  const nombreMovil = (id: string | null) => (id ? datos.moviles.find((m) => m.id === id)?.nombre ?? id : null);
  const personas = datos.turnosCentral
    .filter((t) => new Date(t.iniciadoEn).getTime() <= t1 && (!t.cerradoEn || new Date(t.cerradoEn).getTime() >= t0))
    .map((t) => ({ nombre: t.nombre, halcon: t.halcon, rol: t.rol, desde: t.iniciadoEn, hasta: t.cerradoEn }));
  const reportes = datos.reportes.filter((r) => dentro(r.creadoEn));
  return {
    desde,
    hasta,
    personas,
    creados: creados.length,
    despachados: contar("asignado"),
    finalizados: contar("finalizado"),
    cancelados: contar("cancelado"),
    editados: acciones.filter((a) => a.accion === "editar").length,
    rojosCreados: creados.filter((p) => infoDeClave(p.claveNumero).semaforo === "rojo").length,
    despachoMedianaMin: mediana(despachos),
    activosQueSiguen: datos.procedimientos
      .filter((p) => esActivo(p.estado))
      .sort((a, b) => (a.creadoEn < b.creadoEn ? -1 : 1))
      .map((p) => ({ id: p.id, folio: p.folio, claveNumero: p.claveNumero, estado: p.estado, direccion: p.direccion, movil: nombreMovil(p.movilId), creadoEn: p.creadoEn })),
    reportesRecibidos: reportes.length,
    reportesSinLeer: datos.reportes.filter((r) => !r.leidoPorCentral).length,
    movilesConTurno: datos.moviles.filter((m) => m.turno).map((m) => `${m.nombre} · ${m.turno!.patrullero}`),
    personalEnTerreno: datos.personal.length,
    acciones,
  };
}

export const TEXTO_ACCION: Record<RegistroAccion["accion"], string> = {
  crear: "Creó",
  despachar: "Despachó",
  estado: "Cambió estado",
  editar: "Modificó",
  cancelar: "Canceló",
  apoyo: "Pidió apoyo",
  turno_movil: "Turno de móvil",
  turno_personal: "Turno a pie / punto fijo",
  reporte: "Reporte",
  reporte_leido: "Leyó reporte",
  turno_central: "Turno de Central",
  datos_demo: "Datos de la demo",
};
