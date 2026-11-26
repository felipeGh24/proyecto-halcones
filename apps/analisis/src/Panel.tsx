import { useMemo } from "react";
import {
  cumplimientoPorSemaforo,
  duracion,
  horaPorDia,
  numero,
  obtenerClave,
  porcentaje,
  porDia,
  PRIORIDADES,
  ranking,
  resumen,
  SEMAFOROS,
  type Semaforo as TipoSemaforo,
} from "@plataforma/datos";
import { Indicador, Tarjeta, Vacio } from "@plataforma/ui";
import { BarrasHorizontales, GraficoEvolucion, MapaCalorHoras } from "./graficos";
import { BarraFiltros, useFiltros } from "./filtros";
import { MarcoAnalisis } from "./MarcoAnalisis";

function variacion(actual: number, anterior: number) {
  if (!anterior) return "sin periodo anterior";
  const d = (actual - anterior) / anterior;
  return `${d >= 0 ? "+" : "−"}${numero(Math.abs(d) * 100)} % vs periodo anterior`;
}

export function Panel() {
  const { actual, anterior, filtros, estado } = useFiltros();
  const r = useMemo(() => resumen(actual), [actual]);
  const ra = useMemo(() => resumen(anterior), [anterior]);
  const cumplimiento = useMemo(() => cumplimientoPorSemaforo(actual), [actual]);
  const dias = useMemo(() => {
    const conteo = porDia(actual);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" });
    const lista: { fecha: string; n: number }[] = [];
    for (let t = filtros.desde; t < filtros.hasta; t += 86400000) {
      const f = fmt.format(new Date(t));
      if (!lista.length || lista[lista.length - 1].fecha !== f) lista.push({ fecha: f, n: conteo.get(f) ?? 0 });
    }
    return lista;
  }, [actual, filtros.desde, filtros.hasta]);
  const matriz = useMemo(() => horaPorDia(actual), [actual]);
  const topClaves = useMemo(() => ranking(actual, (p) => p.claveNumero, 8), [actual]);
  const topUV = useMemo(() => ranking(actual, (p) => p.unidadVecinal, 8), [actual]);
  const barrioDe = (uv: number) => actual.find((p) => p.unidadVecinal === uv)?.barrio ?? "";
  const cumpleAlerta = r.cumplimiento != null && r.cumplimiento < 0.6;

  return (
    <MarcoAnalisis titulo="Panel de jefatura" subtitulo={`Últimos ${estado.periodo} días · ${numero(r.total)} procedimientos`}>
      <div className="analisis">
        <BarraFiltros />
        {r.total === 0 ? (
          <div className="ui-tarjeta">
            <Vacio icono="filtro" titulo="Sin procedimientos con estos filtros">
              Amplía el periodo o quita algún filtro.
            </Vacio>
          </div>
        ) : (
          <>
            <div className="ui-tarjeta kpis">
              <Indicador etiqueta="Procedimientos" valor={numero(r.total)} detalle={variacion(r.total, ra.total)} icono="lista" />
              <Indicador
                etiqueta="Cumplimiento de meta"
                valor={r.cumplimiento == null ? "—" : porcentaje(r.cumplimiento)}
                detalle={`llegó dentro del tiempo esperado (${numero(r.conMeta)} con meta)`}
                alerta={cumpleAlerta}
                icono="check"
              />
              <Indicador etiqueta="Respuesta (mediana)" valor={duracion(r.respuestaMediana)} detalle={`90 % llega antes de ${duracion(r.respuesta90)}`} icono="navegar" />
              <Indicador etiqueta="Despacho (mediana)" valor={duracion(r.despachoMediana)} detalle={`antes: ${duracion(ra.despachoMediana)}`} icono="reloj" />
              <Indicador etiqueta="Llegada (mediana)" valor={duracion(r.llegadaMediana)} detalle={`antes: ${duracion(ra.llegadaMediana)}`} icono="auto" />
              <Indicador etiqueta="Cancelados" valor={numero(r.cancelados)} detalle={r.total ? `${porcentaje(r.cancelados / r.total)} del total` : ""} icono="cerrar" />
            </div>

            <div className="analisis__grilla">
              <Tarjeta titulo="Cumplimiento de meta por semáforo" subtitulo="% de procedimientos que llegaron al lugar dentro del tiempo esperado" className="ancho-2">
                <div className="cumplimiento">
                  {(["rojo", "amarillo"] as TipoSemaforo[]).map((s) => {
                    const g = cumplimiento[s];
                    const f = g.total ? g.dentro / g.total : 0;
                    const metas = Object.values(PRIORIDADES).filter((p) => p.semaforo === s).map((p) => p.respuesta.toLowerCase());
                    return (
                      <div key={s} className="cumplimiento__fila">
                        <span className="cumplimiento__nombre">
                          <i style={{ background: SEMAFOROS[s].color }} aria-hidden /> {SEMAFOROS[s].etiqueta}
                          <span className="pequeno texto-3"> · meta {metas.join(" / ")}</span>
                        </span>
                        <span className="cumplimiento__pista" role="img" aria-label={`${porcentaje(f)} dentro de meta`}>
                          <i style={{ width: `${f * 100}%` }} />
                        </span>
                        <span className="num">
                          <strong>{g.total ? porcentaje(f) : "—"}</strong> <span className="pequeno texto-3">de {numero(g.total)}</span>
                        </span>
                      </div>
                    );
                  })}
                  <p className="pequeno texto-3">Las claves en verde (baja) no tienen tiempo de respuesta comprometido y no entran en este cálculo.</p>
                </div>
              </Tarjeta>

              <Tarjeta titulo="Evolución diaria" subtitulo="Procedimientos por día (gris) y promedio de 7 días (azul)" className="ancho-2">
                <GraficoEvolucion dias={dias} />
              </Tarjeta>

              <Tarjeta titulo="Cuándo pasa" subtitulo="Procedimientos por hora del día y día de la semana (más oscuro = más procedimientos)" className="ancho-2">
                <MapaCalorHoras matriz={matriz} />
              </Tarjeta>

              <Tarjeta titulo="Qué pasa" subtitulo="Claves más frecuentes, en procedimientos">
                <BarrasHorizontales unidad="Claves más frecuentes" filas={topClaves.map((c) => ({ etiqueta: `${c.clave} · ${obtenerClave(c.clave)?.nombre ?? ""}`, n: c.n }))} />
              </Tarjeta>

              <Tarjeta titulo="Dónde pasa" subtitulo="Unidades vecinales con más procedimientos">
                <BarrasHorizontales unidad="Unidades vecinales" filas={topUV.map((u) => ({ etiqueta: `UV ${String(u.clave).padStart(2, "0")}`, detalle: barrioDe(u.clave), n: u.n }))} />
              </Tarjeta>
            </div>
          </>
        )}
      </div>
    </MarcoAnalisis>
  );
}
