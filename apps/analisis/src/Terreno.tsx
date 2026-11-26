import { useMemo } from "react";
import { analizarTerreno, numero, porcentaje, TIPOS_REPORTE, useDatos, type TipoReporte } from "@plataforma/datos";
import { Indicador, Tarjeta, Vacio } from "@plataforma/ui";
import { BarrasHorizontales, ColumnasApiladas, DispersionCobertura, MapaCalorHoras } from "./graficos";
import { BarraFiltros, useFiltros } from "./filtros";
import { MarcoAnalisis } from "./MarcoAnalisis";

const SERIES: { clave: TipoReporte; etiqueta: string; color: string }[] = [
  { clave: "patrullaje_preventivo", etiqueta: TIPOS_REPORTE.patrullaje_preventivo, color: "#1D4ED8" },
  { clave: "punto_estatico", etiqueta: TIPOS_REPORTE.punto_estatico, color: "#0F766E" },
  { clave: "procedimiento", etiqueta: TIPOS_REPORTE.procedimiento, color: "#98A2B3" },
];

/**
 * Trabajo en terreno: lo que reportan los equipos (no solo lo que despacha la Central).
 * Responde: ¿estamos patrullando donde está el conflicto? ¿qué fallas tienen los móviles?
 */
export function Terreno() {
  const { reportes, procedimientos, historialTurnos } = useDatos();
  const { filtros, estado } = useFiltros();
  const t = useMemo(() => analizarTerreno(reportes, procedimientos, historialTurnos, filtros.desde, filtros.hasta), [reportes, procedimientos, historialTurnos, filtros.desde, filtros.hasta]);
  const presencia = t.porTipo.patrullaje_preventivo + t.porTipo.punto_estatico;
  const totalProc = t.cobertura.reduce((s, c) => s + c.procedimientos, 0) || 1;
  const totalPres = t.cobertura.reduce((s, c) => s + c.presencia, 0) || 1;
  const brechas = new Set(t.brechas.slice(0, 6).map((b) => b.uv));

  return (
    <MarcoAnalisis titulo="Trabajo en terreno" subtitulo={`Últimos ${estado.periodo} días · ${numero(t.total)} reportes de los equipos`}>
      <div className="analisis">
        <BarraFiltros />
        {t.total === 0 && t.turnos === 0 ? (
          <div className="ui-tarjeta">
            <Vacio icono="documento" titulo="Aún no hay reportes de terreno en este periodo">
              Aparecen cuando los patrulleros envían reportes desde su app y cierran turnos. Para ver un ejemplo, carga los datos de muestra en Halcones › Ajustes de la demo.
            </Vacio>
          </div>
        ) : (
          <>
            <div className="ui-tarjeta kpis">
              <Indicador etiqueta="Reportes" valor={numero(t.total)} detalle={`${numero(t.total / Math.max(1, estado.periodo))} por día`} icono="documento" />
              <Indicador etiqueta="Patrullaje preventivo" valor={numero(t.porTipo.patrullaje_preventivo)} detalle={t.total ? `${porcentaje(t.porTipo.patrullaje_preventivo / t.total)} de los reportes` : ""} icono="navegar" />
              <Indicador etiqueta="Puntos estáticos" valor={numero(t.porTipo.punto_estatico)} detalle="presencia fija en sectores" icono="pin" />
              <Indicador etiqueta="Con fotos o videos" valor={t.total ? porcentaje(t.conAdjuntos / t.total) : "—"} detalle={`${numero(t.adjuntos)} archivos`} icono="ojo" />
              <Indicador etiqueta="Turnos cerrados" valor={numero(t.turnos)} detalle={`${numero(Math.round(t.horasEnTurno))} h en servicio`} icono="reloj" />
              <Indicador etiqueta="Km recorridos" valor={numero(t.kmRecorridos)} detalle={t.turnos ? `${numero(Math.round(t.kmRecorridos / t.turnos))} km por turno` : ""} icono="auto" />
            </div>

            {t.brechas.length > 0 && (
              <div className="destacadas">
                {t.brechas.slice(0, 3).map((b) => (
                  <div key={b.uv} className="ui-tarjeta destacada destacada--alerta">
                    <span className="pequeno texto-3">Brecha de cobertura</span>
                    <strong>
                      {b.nombre} · {b.barrio}
                    </strong>
                    <span className="pequeno texto-2">
                      {porcentaje(b.procedimientos / totalProc)} de los procedimientos y {porcentaje(b.presencia / totalPres)} del patrullaje preventivo.
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="analisis__grilla">
              <Tarjeta titulo="¿Patrullamos donde está el conflicto?" subtitulo="Cada punto es una unidad vecinal. En rojo, las que tienen bastante menos presencia preventiva que procedimientos." className="ancho-2">
                {presencia === 0 ? (
                  <Vacio icono="navegar" titulo="Sin patrullajes preventivos ni puntos estáticos reportados" />
                ) : (
                  <div className="cobertura">
                    <DispersionCobertura
                      puntos={t.cobertura
                        .filter((c) => c.procedimientos || c.presencia)
                        .map((c) => ({ etiqueta: `UV ${String(c.uv).padStart(2, "0")}`, x: c.procedimientos / totalProc, y: c.presencia / totalPres, brecha: brechas.has(c.uv) }))}
                    />
                    <div className="cobertura__tabla">
                      <h3 className="pestana__sub">Dónde sumar rondas</h3>
                      {t.brechas.length === 0 ? (
                        <p className="pequeno texto-2">La presencia preventiva acompaña al conflicto en todas las unidades vecinales.</p>
                      ) : (
                        <table className="ui-tabla tabla--compacta">
                          <thead>
                            <tr>
                              <th>Unidad vecinal</th>
                              <th className="num">Proced.</th>
                              <th className="num">Rondas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.brechas.slice(0, 8).map((b) => (
                              <tr key={b.uv}>
                                <td>
                                  {b.nombre}
                                  <div className="pequeno texto-3">{b.barrio}</div>
                                </td>
                                <td className="num">{numero(b.procedimientos)}</td>
                                <td className="num">{numero(b.presencia)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </Tarjeta>

              <Tarjeta titulo="Reportes por día" subtitulo="Según el tipo de reporte enviado desde la app del patrullero" className="ancho-2">
                <ColumnasApiladas dias={t.porDia} series={SERIES} unidad="Reportes por día y tipo" />
              </Tarjeta>

              <Tarjeta titulo="Cuándo reportan" subtitulo="Reportes por hora y día de la semana (más oscuro = más reportes)" className="ancho-2">
                <MapaCalorHoras matriz={t.horas} />
              </Tarjeta>

              <Tarjeta titulo="Reportes por halcón" subtitulo="Quién reporta más en el periodo">
                {t.porPatrullero.length ? <BarrasHorizontales unidad="Reportes por halcón" filas={t.porPatrullero.map((p) => ({ etiqueta: p.etiqueta, n: p.n }))} /> : <Vacio icono="personas" titulo="Sin reportes" />}
              </Tarjeta>

              <Tarjeta titulo="Novedades de los móviles" subtitulo="Ítems del checklist con observación al cerrar turno">
                {t.novedadesVehiculo.length ? (
                  <BarrasHorizontales unidad="Novedades del checklist" filas={t.novedadesVehiculo.map((n) => ({ etiqueta: n.etiqueta, n: n.n }))} />
                ) : (
                  <Vacio icono="check" titulo="Sin novedades en los móviles" />
                )}
              </Tarjeta>
            </div>
          </>
        )}
      </div>
    </MarcoAnalisis>
  );
}
