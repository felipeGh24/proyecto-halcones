import { ESTADOS, movilesEnTurno, obtenerClave, type Movil, type Procedimiento, type Punto } from "@plataforma/datos";
import { Boton, Insignia } from "@plataforma/ui";

function distancia(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * Móviles con un patrullero en turno, como los ve la Central al despachar:
 * primero los libres por cercanía; después los ocupados, con el procedimiento que atienden.
 * Los móviles sin turno no aparecen: nadie ha salido en ellos.
 */
export function ListaDespacho({
  punto,
  moviles,
  procedimientos,
  elegido,
  onElegir,
  textoBoton = "Despachar",
}: {
  punto: Punto;
  moviles: Movil[];
  procedimientos: Procedimiento[];
  /** Modo selección (formulario): marca el elegido en vez de despachar al instante. */
  elegido?: string | null;
  onElegir: (m: Movil) => void;
  textoBoton?: string;
}) {
  const lista = movilesEnTurno(moviles, punto);
  const libres = lista.filter((x) => x.libre);
  const ocupados = lista.filter((x) => !x.libre);
  const sinTurno = moviles.filter((m) => m.estado === "sin_turno").length;

  if (lista.length === 0) {
    return <p className="pequeno texto-2">Ningún patrullero ha iniciado turno. Los móviles aparecen aquí cuando el patrullero abre su turno en la app.</p>;
  }

  return (
    <div className="despacho">
      {libres.length === 0 && <p className="pequeno texto-2">Todos los móviles en turno están ocupados.</p>}
      <ul className="despacho__lista">
        {libres.map(({ movil: m, metros }, i) => (
          <li key={m.id} className={elegido === m.id ? "elegido" : ""}>
            <div className="despacho__movil">
              <strong>{m.nombre}</strong>
              <span className="pequeno texto-2">
                {m.turno!.patrullero}
                {m.turno!.acompanante ? ` y ${m.turno!.acompanante}` : ""}
              </span>
            </div>
            <span className="pequeno texto-3 num">{distancia(metros)}</span>
            <Insignia tono="ok" punto>
              Libre
            </Insignia>
            <Boton variante={elegido === m.id || (elegido === undefined && i === 0) ? "primario" : "secundario"} icono={elegido === undefined ? "enviar" : undefined} onClick={() => onElegir(m)} aria-pressed={elegido === undefined ? undefined : elegido === m.id}>
              {elegido === undefined ? textoBoton : elegido === m.id ? "Elegido" : "Elegir"}
            </Boton>
          </li>
        ))}
        {ocupados.map(({ movil: m, metros }) => {
          const p = procedimientos.find((x) => x.id === m.procedimientoId);
          return (
            <li key={m.id} className="ocupado">
              <div className="despacho__movil">
                <strong>{m.nombre}</strong>
                <span className="pequeno texto-2">{m.turno!.patrullero}</span>
              </div>
              <span className="pequeno texto-3 num">{distancia(metros)}</span>
              <Insignia tono="info" punto>
                {p ? ESTADOS[p.estado].etiqueta : "Ocupado"}
              </Insignia>
              <span className="pequeno texto-3 despacho__en">{p ? `${p.folio} · ${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre ?? ""}` : ""}</span>
            </li>
          );
        })}
      </ul>
      {sinTurno > 0 && <p className="pequeno texto-3">{sinTurno} móviles sin turno no se muestran.</p>}
    </div>
  );
}
