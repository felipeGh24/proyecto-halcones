import { useMemo } from "react";
import { ESTADOS, fechaHora, obtenerClave, useDatos } from "@plataforma/datos";
import { Tarjeta } from "@plataforma/ui";
import { Vacio } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

/** Todo lo que pasó en las últimas 12 horas, en orden y con autor. */
export function Bitacora() {
  const { procedimientos, historialTurnos } = useDatos();
  const entradas = useMemo(() => {
    const desde = Date.now() - 12 * 3600 * 1000;
    return procedimientos
      .flatMap((p) => p.eventos.map((e) => ({ p, e })))
      .filter(({ e }) => new Date(e.en).getTime() >= desde)
      .sort((a, b) => b.e.en.localeCompare(a.e.en));
  }, [procedimientos]);

  return (
    <MarcoCentral titulo="Bitácora del turno" subtitulo="Últimas 12 horas">
      <div className="pagina">
        <Tarjeta titulo="Turnos cerrados" subtitulo="Entregas de turno con kilometraje y novedades" sinRelleno>
          {historialTurnos.length === 0 ? (
            <p className="pequeno texto-2" style={{ padding: "12px 20px 18px" }}>
              Aún no se ha cerrado ningún turno en esta demo.
            </p>
          ) : (
            <div className="tabla-contenedor" style={{ maxHeight: 320 }}>
              <table className="ui-tabla">
                <thead>
                  <tr>
                    <th>Cierre</th>
                    <th>Unidad</th>
                    <th>Patrulleros</th>
                    <th>Inicio</th>
                    <th className="derecha">Km recorridos</th>
                    <th>Combustible</th>
                    <th>Novedades</th>
                  </tr>
                </thead>
                <tbody>
                  {historialTurnos.slice(0, 50).map((t) => (
                    <tr key={t.id}>
                      <td className="num">{fechaHora(t.cerradoEn)}</td>
                      <td>{t.unidad}</td>
                      <td>
                        {t.patrullero}
                        {t.acompanante ? ` y ${t.acompanante}` : ""}
                      </td>
                      <td className="num">{fechaHora(t.iniciadoEn)}</td>
                      <td className="derecha num">{t.kmFinal != null && t.kmInicial != null ? (t.kmFinal - t.kmInicial).toLocaleString("es-CL") : "—"}</td>
                      <td>{t.combustibleFinal ?? "—"}</td>
                      <td className="pequeno">{[...t.novedadesChecklist, t.observaciones].filter(Boolean).join(" · ") || "Sin novedades"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
        <div className="ui-tarjeta tabla-contenedor">
          {entradas.length === 0 ? (
            <Vacio icono="reloj" titulo="Sin movimientos en las últimas 12 horas" />
          ) : (
            <table className="ui-tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Folio</th>
                  <th>Clave</th>
                  <th>Movimiento</th>
                  <th>Por</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {entradas.slice(0, 300).map(({ p, e }, i) => (
                  <tr key={`${p.id}-${i}`}>
                    <td className="num">{fechaHora(e.en)}</td>
                    <td className="num">{p.folio}</td>
                    <td>
                      {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
                    </td>
                    <td>{ESTADOS[e.estado].etiqueta}</td>
                    <td>{e.porNombre}</td>
                    <td className="texto-2">{e.nota ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MarcoCentral>
  );
}
