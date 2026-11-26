import { ESTADOS_MOVIL, hace, obtenerClave, type Movil, type Procedimiento } from "@plataforma/datos";
import { Boton, Insignia } from "@plataforma/ui";

export function DetalleMovil({ movil: m, procedimientos, onVerProcedimiento }: { movil: Movil; procedimientos: Procedimiento[]; onVerProcedimiento: (id: string) => void }) {
  const proc = procedimientos.find((p) => p.id === m.procedimientoId);
  const tono = ESTADOS_MOVIL[m.estado].tono;
  return (
    <div className="detalle">
      <header className="detalle__cabeza">
        <div className="detalle__fila">
          <Insignia tono={tono === "neutro" ? "neutro" : tono} punto>
            {ESTADOS_MOVIL[m.estado].etiqueta}
          </Insignia>
          <span className="pequeno texto-3" style={{ marginLeft: "auto" }}>
            {m.tipo}
          </span>
        </div>
        <h2>{m.nombre}</h2>
        {m.turno ? (
          <p>
            <strong>{m.turno.patrullero}</strong>
            {m.turno.acompanante && <span className="texto-2"> y {m.turno.acompanante}</span>}
          </p>
        ) : (
          <p className="texto-2">Sin patrullero en turno</p>
        )}
        <p className="pequeno texto-3">Última señal {hace(m.ultimaSenal)}</p>
      </header>
      <div className="detalle__bloque">
        <h3>Procedimiento</h3>
        {proc ? (
          <>
            <p>
              <strong>
                {proc.claveNumero} · {obtenerClave(proc.claveNumero)?.nombre}
              </strong>
            </p>
            <p className="pequeno texto-2">{proc.direccion}</p>
            <Boton onClick={() => onVerProcedimiento(proc.id)}>Ver procedimiento</Boton>
          </>
        ) : (
          <p className="pequeno texto-2">Sin procedimiento asignado.</p>
        )}
      </div>
    </div>
  );
}
