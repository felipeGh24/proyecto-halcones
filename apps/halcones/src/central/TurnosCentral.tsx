import { useState } from "react";
import { duracion, fechaHora, hora, TURNOS, useDatos } from "@plataforma/datos";
import { Boton, Insignia, Vacio } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";
import { VistaResumen } from "./TurnoCentral";

/** Historial de turnos de la Central: quién estuvo, qué hizo y qué dejó pendiente. */
export function TurnosCentral() {
  const { turnosCentral } = useDatos();
  const cerrados = turnosCentral.filter((t) => t.cerradoEn).sort((a, b) => (a.cerradoEn! < b.cerradoEn! ? 1 : -1));
  const abiertos = turnosCentral.filter((t) => !t.cerradoEn);
  const [sel, setSel] = useState<string | null>(cerrados[0]?.id ?? null);
  const t = cerrados.find((x) => x.id === sel);
  return (
    <MarcoCentral titulo="Turnos de la Central" subtitulo={`${abiertos.length} en turno ahora · ${cerrados.length} turnos cerrados`}>
      <div className="pagina reportes">
        <div className="reportes__lista ui-tarjeta">
          {abiertos.length > 0 && (
            <div className="reportes__cabeza">
              <span className="pequeno texto-3">En turno ahora</span>
              {abiertos.map((a) => (
                <span key={a.id} className="pequeno">
                  <strong>{a.nombre}</strong>
                  {a.halcon ? ` · Halcón ${a.halcon}` : ""} · {TURNOS[a.turno].etiqueta} desde {hora(a.iniciadoEn)}
                </span>
              ))}
            </div>
          )}
          {cerrados.length === 0 ? (
            <Vacio icono="personas" titulo="Aún no hay turnos cerrados">
              Al cerrar un turno con «Cerrar turno» (arriba a la derecha) su resumen queda guardado aquí.
            </Vacio>
          ) : (
            <ul>
              {cerrados.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`reporte-fila ${c.id === sel ? "reporte-fila--sel" : ""}`} onClick={() => setSel(c.id)}>
                    <span className="reporte-fila__arriba">
                      <strong>
                        {c.nombre}
                        {c.halcon ? ` · Halcón ${c.halcon}` : ""}
                      </strong>
                      <span className="pequeno texto-3 num">{fechaHora(c.cerradoEn!)}</span>
                    </span>
                    <span className="pequeno">
                      Turno {TURNOS[c.turno].etiqueta} · {duracion((new Date(c.cerradoEn!).getTime() - new Date(c.iniciadoEn).getTime()) / 60000)}
                    </span>
                    {c.resumen && (
                      <span className="reporte-fila__chips">
                        <Insignia>{c.resumen.creados} creados</Insignia>
                        {c.resumen.editados + c.resumen.cancelados > 0 && <Insignia tono="alerta">{c.resumen.editados + c.resumen.cancelados} modificados o cancelados</Insignia>}
                        {c.resumen.activosQueSiguen.length > 0 && <Insignia tono="info">{c.resumen.activosQueSiguen.length} quedaron activos</Insignia>}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="reportes__detalle ui-tarjeta">
          {!t?.resumen ? (
            <Vacio icono="documento" titulo="Elige un turno para ver su resumen" />
          ) : (
            <article className="reporte">
              <div className="turno-central__cerrado-cabeza">
                <div>
                  <h2>
                    {t.nombre}
                    {t.halcon ? ` · Halcón ${t.halcon}` : ""}
                  </h2>
                  <p className="pequeno texto-2">
                    Turno {TURNOS[t.turno].etiqueta} · {fechaHora(t.iniciadoEn)} a {hora(t.cerradoEn!)}
                  </p>
                </div>
                <Boton icono="imprimir" onClick={() => window.print()}>
                  Imprimir
                </Boton>
              </div>
              {t.novedadesRecepcion && <p className="turno-central__nota">Al recibir: {t.novedadesRecepcion}</p>}
              {t.novedadesEntrega && <p className="turno-central__nota">Al entregar: {t.novedadesEntrega}</p>}
              <VistaResumen resumen={t.resumen} />
            </article>
          )}
        </div>
      </div>
    </MarcoCentral>
  );
}
