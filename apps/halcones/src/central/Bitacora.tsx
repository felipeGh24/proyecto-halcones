import { useMemo } from "react";
import { ESTADOS, fechaHora, obtenerClave, useDatos } from "@plataforma/datos";
import { Vacio } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

/** Todo lo que pasó en las últimas 12 horas, en orden y con autor. */
export function Bitacora() {
  const { procedimientos } = useDatos();
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
