import { ESTADOS, obtenerClave, unidadesEnTurno, type Movil, type Procedimiento, type Punto, type TurnoPersonal } from "@plataforma/datos";
import { Insignia } from "@plataforma/ui";

const distancia = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

/**
 * Qué unidades van a un procedimiento: móviles y personal en punto fijo o a pie.
 * Se marcan con un toque; la primera marcada queda «a cargo» (avanza los estados) y las demás van de apoyo.
 * Las ocupadas se muestran con el procedimiento que atienden, pero no se pueden marcar.
 */
export function SelectorUnidades({
  punto,
  moviles,
  personal,
  procedimientos,
  seleccion,
  onCambio,
  excluir = [],
  conACargo = true,
}: {
  punto: Punto;
  moviles: Movil[];
  personal: TurnoPersonal[];
  procedimientos: Procedimiento[];
  /** Ids elegidos; el primero es el que va a cargo. */
  seleccion: string[];
  onCambio: (ids: string[]) => void;
  /** Unidades que ya van al procedimiento (no se vuelven a ofrecer). */
  excluir?: string[];
  conACargo?: boolean;
}) {
  const todas = unidadesEnTurno(moviles, personal, punto).filter((u) => !excluir.includes(u.id));
  const libres = todas.filter((u) => u.libre);
  const ocupadas = todas.filter((u) => !u.libre);

  function alternar(id: string) {
    onCambio(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  }

  if (!todas.length) {
    return <p className="pequeno texto-2">No hay unidades en turno. Aparecen cuando un patrullero abre su turno en la app (en móvil, punto fijo o a pie).</p>;
  }

  return (
    <div className="unidades">
      <div className="unidades__atajos" role="group" aria-label="Selección rápida">
        <button type="button" className="ui-boton ui-boton--secundario" disabled={!libres.length} onClick={() => onCambio(libres.slice(0, 1).map((u) => u.id))}>
          Solo la más cercana
        </button>
        <button type="button" className="ui-boton ui-boton--secundario" disabled={!libres.length} onClick={() => onCambio(libres.filter((u) => u.tipo === "movil").map((u) => u.id))}>
          Todos los móviles libres ({libres.filter((u) => u.tipo === "movil").length})
        </button>
        <button type="button" className="ui-boton ui-boton--secundario" disabled={!libres.length} onClick={() => onCambio(libres.map((u) => u.id))}>
          Todas las unidades libres ({libres.length})
        </button>
        <button type="button" className="ui-boton ui-boton--fantasma" disabled={!seleccion.length} onClick={() => onCambio([])}>
          Ninguna
        </button>
      </div>
      <ul className="unidades__lista">
        {libres.map((u) => {
          const i = seleccion.indexOf(u.id);
          const marcada = i >= 0;
          return (
            <li key={u.id} className={marcada ? "elegida" : ""}>
              <label className="unidades__fila">
                <input type="checkbox" checked={marcada} onChange={() => alternar(u.id)} aria-label={`${u.nombre}, ${u.patrullero}`} />
                <span className="unidades__nombre">
                  <strong>{u.nombre}</strong>
                  <span className="pequeno texto-2">
                    {u.patrullero} · {u.detalle}
                  </span>
                </span>
                <span className="pequeno texto-3 num">{distancia(u.metros)}</span>
                {marcada && conACargo ? (
                  i === 0 ? (
                    <Insignia tono="ok">A cargo</Insignia>
                  ) : (
                    <button
                      type="button"
                      className="enlace pequeno"
                      onClick={(e) => {
                        e.preventDefault();
                        onCambio([u.id, ...seleccion.filter((x) => x !== u.id)]);
                      }}
                    >
                      Dejar a cargo
                    </button>
                  )
                ) : (
                  <Insignia tono={marcada ? "info" : "ok"} punto={!marcada}>{marcada ? "Apoyo" : "Libre"}</Insignia>
                )}
              </label>
            </li>
          );
        })}
        {ocupadas.map((u) => {
          const p = procedimientos.find((x) => x.id === u.procedimientoId);
          return (
            <li key={u.id} className="ocupada">
              <div className="unidades__fila">
                <input type="checkbox" disabled aria-label={`${u.nombre} ocupada`} />
                <span className="unidades__nombre">
                  <strong>{u.nombre}</strong>
                  <span className="pequeno texto-2">{u.patrullero}</span>
                </span>
                <span className="pequeno texto-3 num">{distancia(u.metros)}</span>
                <Insignia tono="info" punto>
                  {p ? `${ESTADOS[p.estado].etiqueta} · ${p.folio}` : "Ocupada"}
                </Insignia>
              </div>
              {p && <span className="pequeno texto-3 unidades__en">{`${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre ?? ""} · ${p.direccion}`}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
