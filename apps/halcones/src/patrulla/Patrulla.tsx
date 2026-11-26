import { useState } from "react";
import { ESTADOS, SIGUIENTE, esActivo, hace, infoDeClave, obtenerClave, obtenerCliente, useDatos, type EstadoProcedimiento, type Punto } from "@plataforma/datos";
import { avisar, Boton, Icono, Insignia, Modal, Semaforo, useUsuario } from "@plataforma/ui";
import { CierreTurno } from "./CierreTurno";
import { InicioTurno } from "./InicioTurno";

const TEXTO_BOTON: Partial<Record<EstadoProcedimiento, string>> = {
  en_desplazamiento: "Voy en camino",
  en_el_lugar: "Llegué al lugar",
  en_procedimiento: "Iniciar procedimiento",
  finalizado: "Finalizar procedimiento",
};

/** Posición actual del celular, si el patrullero la comparte (no bloquea si no hay permiso). */
function posicionActual(): Promise<Punto | undefined> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => ok(undefined),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 },
    );
  });
}

export function Patrulla() {
  const usuario = useUsuario();
  const { procedimientos, moviles, personal } = useDatos();
  const [finalizando, setFinalizando] = useState(false);
  const [apoyo, setApoyo] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // El turno vive en los datos compartidos: el móvil o el puesto (punto fijo, a pie) que abrió este usuario.
  const movil = moviles.find((m) => m.turno?.usuarioId === usuario.id);
  const puesto = personal.find((p) => p.usuarioId === usuario.id);
  const turno = movil?.turno ?? puesto;
  if (!turno) return <InicioTurno />;
  const titulo = movil ? movil.nombre : puesto!.modalidad === "punto_fijo" ? "Punto fijo" : "Patrullaje a pie";

  const asignado = movil ? procedimientos.find((p) => p.movilId === movil.id && esActivo(p.estado) && p.estado !== "recibido") : undefined;
  const sig = asignado ? SIGUIENTE[asignado.estado] : undefined;

  async function avanzar(estado: EstadoProcedimiento, resultado?: string) {
    if (!asignado) return;
    setEnviando(true);
    const ubicacion = await posicionActual();
    obtenerCliente().cambiarEstado(asignado.id, estado, usuario, { ubicacion, resultado, nota: ubicacion ? "Ubicación del celular registrada" : undefined });
    setEnviando(false);
    avisar(`Estado: ${ESTADOS[estado].etiqueta}`);
  }

  return (
    <div className="patrulla">
      <header className="patrulla__cabeza">
        <div>
          <strong>{titulo}</strong>
          <div className="pequeno texto-3">
            {turno.patrullero}
            {turno.acompanante ? ` y ${turno.acompanante}` : ""} · turno desde {new Date(turno.iniciadoEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
          </div>
        </div>
        <Insignia tono="demo">Demo</Insignia>
      </header>

      <main className="patrulla__cuerpo">
        {asignado ? (
          <section className={`patrulla__proc patrulla__proc--${infoDeClave(asignado.claveNumero).semaforo}`} aria-live="polite">
            <div className="detalle__fila">
              <Semaforo claveNumero={asignado.claveNumero} />
              <Insignia tono="info" punto>
                {ESTADOS[asignado.estado].etiqueta}
              </Insignia>
            </div>
            <h1>
              {asignado.claveNumero} · {obtenerClave(asignado.claveNumero)?.nombre}
            </h1>
            <p className="patrulla__dir">
              <Icono nombre="pin" /> {asignado.direccion}
            </p>
            {asignado.descripcion && <p className="texto-2">{asignado.descripcion}</p>}
            <p className="pequeno texto-3">
              {asignado.folio} · recibido {hace(asignado.creadoEn)}
            </p>
            <a
              className="ui-boton ui-boton--secundario ui-boton--grande ui-boton--bloque"
              href={`https://www.google.com/maps/dir/?api=1&destination=${asignado.ubicacion.lat},${asignado.ubicacion.lng}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Icono nombre="navegar" tamano={22} /> Cómo llegar
            </a>
            {sig && (
              <Boton variante="primario" grande bloque disabled={enviando} onClick={() => (sig === "finalizado" ? setFinalizando(true) : avanzar(sig))}>
                {enviando ? "Enviando…" : TEXTO_BOTON[sig]}
              </Boton>
            )}
          </section>
        ) : (
          <section className="patrulla__libre">
            <span className="ui-vacio__icono">
              <Icono nombre="check" />
            </span>
            <h1>{movil ? "Disponible" : "En servicio"}</h1>
            <p className="texto-2">
              {movil
                ? `La Central te ve como libre en ${movil.nombre}. Cuando te despache, el procedimiento aparecerá aquí al instante.`
                : `La Central te ve en ${puesto!.lugar}. Si necesitas otro móvil, usa «Solicitar apoyo».`}
            </p>
          </section>
        )}
      </main>

      <footer className="patrulla__pie">
        <Boton variante="peligro" grande bloque icono="sirena" onClick={() => setApoyo(true)}>
          Solicitar apoyo
        </Boton>
        <Boton variante="fantasma" bloque onClick={() => setCerrando(true)}>
          Cerrar turno
        </Boton>
      </footer>

      {finalizando && asignado && (
        <Finalizar
          onCerrar={() => setFinalizando(false)}
          onConfirmar={(r) => {
            setFinalizando(false);
            void avanzar("finalizado", r);
          }}
        />
      )}
      {apoyo && (
        <Modal
          titulo="¿Solicitar apoyo?"
          subtitulo="La Central recibe una alerta con tu ubicación."
          onCerrar={() => setApoyo(false)}
          pie={
            <>
              <Boton onClick={() => setApoyo(false)}>Volver</Boton>
              <Boton
                variante="peligro"
                onClick={async () => {
                  const pos = (await posicionActual()) ?? asignado?.ubicacion ?? movil?.posicion ?? puesto!.ubicacion;
                  obtenerCliente().pedirApoyo(movil?.id ?? "", usuario, pos);
                  setApoyo(false);
                  avisar("Apoyo solicitado a la Central");
                }}
              >
                Solicitar apoyo
              </Boton>
            </>
          }
        >
          <p className="texto-2">Úsalo cuando necesites otro móvil en tu ubicación.</p>
        </Modal>
      )}
      {cerrando && <CierreTurno movil={movil} personal={puesto} bloqueado={!!asignado} onCerrar={() => setCerrando(false)} />}
    </div>
  );
}

function Finalizar({ onCerrar, onConfirmar }: { onCerrar: () => void; onConfirmar: (resultado: string) => void }) {
  const [resultado, setResultado] = useState("");
  const opciones = ["Situación normalizada en el lugar", "Se coordina con Carabineros", "Se orienta a los involucrados", "Sin novedad al llegar"];
  return (
    <Modal
      titulo="Finalizar procedimiento"
      subtitulo="¿Cómo terminó?"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Volver</Boton>
          <Boton variante="primario" disabled={resultado.trim().length < 3} onClick={() => onConfirmar(resultado.trim())}>
            Finalizar
          </Boton>
        </>
      }
    >
      <div style={{ display: "grid", gap: 8 }}>
        {opciones.map((o) => (
          <Boton key={o} variante={resultado === o ? "primario" : "secundario"} grande bloque onClick={() => setResultado(o)}>
            {o}
          </Boton>
        ))}
        <textarea className="ui-entrada" placeholder="Otro resultado o detalle" value={opciones.includes(resultado) ? "" : resultado} onChange={(e) => setResultado(e.target.value)} />
      </div>
    </Modal>
  );
}
