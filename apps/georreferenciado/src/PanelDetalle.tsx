import { ESTADOS, ESTADOS_MOVIL, hace, hora, movilesCercanos, obtenerClave, obtenerCliente, puede, useDatos } from "@plataforma/datos";
import type { Seleccion } from "@plataforma/mapa";
import { avisar, Boton, Insignia, Semaforo, useUsuario } from "@plataforma/ui";

/** Panel lateral del mapa: detalle del procedimiento o del móvil seleccionado. */
export function PanelDetalle({ seleccion, onCerrar, onSeleccionar }: { seleccion: NonNullable<Seleccion>; onCerrar: () => void; onSeleccionar: (s: Seleccion) => void }) {
  const { procedimientos, moviles } = useDatos();
  const usuario = useUsuario();

  if (seleccion.tipo === "movil") {
    const m = moviles.find((x) => x.id === seleccion.id);
    if (!m) return null;
    const p = procedimientos.find((x) => x.id === m.procedimientoId);
    const tono = ESTADOS_MOVIL[m.estado].tono;
    return (
      <div className="panel">
        <header className="panel__cabeza">
          <h2>{m.nombre}</h2>
          <Boton variante="fantasma" soloIcono icono="cerrar" onClick={onCerrar}>
            Cerrar detalle
          </Boton>
        </header>
        <div className="panel__cuerpo">
          <Insignia tono={tono === "neutro" ? "neutro" : tono} punto>
            {ESTADOS_MOVIL[m.estado].etiqueta}
          </Insignia>
          <p>{m.turno ? <><strong>{m.turno.patrullero}</strong>{m.turno.acompanante ? ` y ${m.turno.acompanante}` : ""}</> : "Sin patrullero en turno"}</p>
          <p className="pequeno texto-3">
            {m.tipo} · última señal {hace(m.ultimaSenal)}
          </p>
          {p ? (
            <Boton onClick={() => onSeleccionar({ tipo: "procedimiento", id: p.id })}>
              Ver {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
            </Boton>
          ) : (
            <p className="pequeno texto-2">Sin procedimiento asignado.</p>
          )}
        </div>
      </div>
    );
  }

  const p = procedimientos.find((x) => x.id === seleccion.id);
  if (!p) return null;
  const movil = moviles.find((m) => m.id === p.movilId);
  const cercanos = movilesCercanos(moviles, p.ubicacion, 3);
  const puedeDespachar = p.estado === "recibido" && puede(usuario.rol, "despachar");

  return (
    <div className="panel">
      <header className="panel__cabeza">
        <div className="detalle-fila">
          <Semaforo claveNumero={p.claveNumero} />
          <span className="pequeno texto-3 num">{p.folio}</span>
        </div>
        <Boton variante="fantasma" soloIcono icono="cerrar" onClick={onCerrar}>
          Cerrar detalle
        </Boton>
      </header>
      <div className="panel__cuerpo">
        <h2>
          {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
        </h2>
        <p className="texto-2">{p.direccion}</p>
        <p className="pequeno texto-3">{p.unidadVecinal ? `UV ${String(p.unidadVecinal).padStart(2, "0")} · ${p.barrio}` : ""}</p>
        <div className="detalle-fila">
          <Insignia tono={p.estado === "recibido" ? "peligro" : "info"} punto>
            {ESTADOS[p.estado].etiqueta}
          </Insignia>
          {movil && <span className="pequeno">{movil.nombre}</span>}
        </div>
        {puedeDespachar && (
          <div className="panel__bloque">
            <h3>Despachar desde el mapa</h3>
            {cercanos.length === 0 && <p className="pequeno texto-2">No hay móviles libres con patrullero en turno.</p>}
            {cercanos.map(({ movil: m, metros }, i) => (
              <div key={m.id} className="panel__movil">
                <span>
                  <strong>{m.nombre}</strong> <span className="pequeno texto-3 num">{(metros / 1000).toFixed(1)} km</span>
                  <span className="pequeno texto-2" style={{ display: "block" }}>{m.turno?.patrullero}</span>
                </span>
                <Boton
                  variante={i === 0 ? "primario" : "secundario"}
                  icono="enviar"
                  onClick={() => {
                    obtenerCliente().despachar(p.id, m.id, usuario);
                    avisar(`${p.folio} despachado a ${m.nombre}`);
                  }}
                >
                  Despachar
                </Boton>
              </div>
            ))}
          </div>
        )}
        <div className="panel__bloque">
          <h3>Línea de tiempo</h3>
          <ol className="mini-linea">
            {p.eventos.map((e, i) => (
              <li key={i}>
                <span className="num texto-3">{hora(e.en)}</span> {ESTADOS[e.estado].etiqueta}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
