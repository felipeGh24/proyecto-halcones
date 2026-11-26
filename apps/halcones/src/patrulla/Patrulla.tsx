import { Link } from "react-router-dom";
import { useState } from "react";
import { ESTADOS, SIGUIENTE, hace, infoDeClave, obtenerClave, obtenerCliente, procedimientoDeUnidad, unidadesActivas, useDatos, type EstadoProcedimiento, type EstadoUnidad, accesoTotalActivo } from "@plataforma/datos";
import { AvisoDespacho } from "./AvisoDespacho";
import { avisar, Boton, Icono, Insignia, Modal, Semaforo, useUsuario, type NombreIcono } from "@plataforma/ui";
import { CierreTurno } from "./CierreTurno";
import { InicioTurno } from "./InicioTurno";
import { NuevoReporte } from "./NuevoReporte";
import { PestanaBitacora, PestanaReportes, PestanaTurno } from "./Pestanas";
import { posicionActual, useTurnoActual } from "./turnoActual";

const TEXTO_BOTON: Partial<Record<EstadoProcedimiento, string>> = {
  en_desplazamiento: "Voy en camino",
  en_el_lugar: "Llegué al lugar",
  en_procedimiento: "Iniciar procedimiento",
  finalizado: "Finalizar procedimiento",
};

type Pestana = "inicio" | "reportes" | "bitacora" | "turno";
const PESTANAS: { id: Pestana; texto: string; icono: NombreIcono }[] = [
  { id: "inicio", texto: "Inicio", icono: "inicio" },
  { id: "reportes", texto: "Reportes", icono: "documento" },
  { id: "bitacora", texto: "Bitácora", icono: "reloj" },
  { id: "turno", texto: "Mi turno", icono: "auto" },
];

/** App del patrullero (celular): inicio, reportes, bitácora y turno. */
export function Patrulla() {
  const usuario = useUsuario();
  const { procedimientos } = useDatos();
  const turno = useTurnoActual(usuario);
  const [pestana, setPestana] = useState<Pestana>("inicio");
  const [finalizando, setFinalizando] = useState(false);
  const [apoyo, setApoyo] = useState(false);
  const [cerrando, setCerrando] = useState<null | "salir" | "cambiar">(null);
  const [enviando, setEnviando] = useState(false);
  const [reportar, setReportar] = useState(false);

  if (!turno) return <InicioTurno />;

  // A cargo o de apoyo: la Central puede enviar a varias unidades (móviles, puntos fijos o a pie) al mismo procedimiento.
  const envio = procedimientoDeUnidad(procedimientos, turno.unidadId);
  const asignado = envio?.procedimiento;
  const deApoyo = !!envio && !envio.unidad.aCargo;
  const sig = asignado && !deApoyo ? SIGUIENTE[asignado.estado] : undefined;
  const sigApoyo: { estado: EstadoUnidad; texto: string } | null = !deApoyo
    ? null
    : envio!.unidad.estado === "asignado"
      ? { estado: "en_camino", texto: "Voy en camino" }
      : envio!.unidad.estado === "en_camino"
        ? { estado: "en_el_lugar", texto: "Llegué al lugar" }
        : { estado: "liberado", texto: "Terminé mi apoyo" };
  const otras = asignado ? unidadesActivas(asignado).filter((u) => u.id !== turno.unidadId) : [];

  function avanzarApoyo(estado: EstadoUnidad) {
    if (!asignado) return;
    obtenerCliente().actualizarUnidad(asignado.id, turno!.unidadId, estado, usuario);
    avisar(estado === "liberado" ? "Apoyo terminado: quedas disponible" : estado === "en_camino" ? "En camino" : "En el lugar");
  }

  async function avanzar(estado: EstadoProcedimiento, resultado?: string) {
    if (!asignado) return;
    setEnviando(true);
    const ubicacion = await posicionActual();
    obtenerCliente().cambiarEstado(asignado.id, estado, usuario, { ubicacion, resultado, nota: ubicacion ? "Ubicación del celular registrada" : undefined });
    setEnviando(false);
    avisar(`Estado: ${ESTADOS[estado].etiqueta}`);
  }

  return (
    <div className="patrulla patrulla--con-pestanas">
      <header className="patrulla__cabeza">
        <div>
          <strong className="patrulla__titulo">
            {turno.halcon ? `Halcón ${turno.halcon} · ` : ""}
            {turno.movil ? turno.movil.nombre : turno.puesto?.modalidad === "punto_fijo" ? "Punto fijo" : "A pie"}
          </strong>
          <div className="pequeno texto-3">
            {turno.patrullero}
            {turno.acompanante ? ` y ${turno.acompanante}` : ""} · desde {new Date(turno.iniciadoEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
          </div>
        </div>
        <span className="patrulla__cabeza-acciones">
          {accesoTotalActivo() && (
            <Link to="/central" className="patrulla__enlace">
              Ir a la Central
            </Link>
          )}
          <Insignia tono="demo">Demo</Insignia>
        </span>
      </header>

      <main className="patrulla__cuerpo">
        {pestana === "inicio" && (
          <div className="patrulla__inicio">
            {asignado ? (
              <section className={`patrulla__proc patrulla__proc--${infoDeClave(asignado.claveNumero).semaforo}`} aria-live="polite">
                <div className="detalle__fila">
                  <Semaforo claveNumero={asignado.claveNumero} />
                  <Insignia tono="info" punto>
                    {ESTADOS[asignado.estado].etiqueta}
                  </Insignia>
                  <Insignia tono={deApoyo ? "alerta" : "ok"}>{deApoyo ? "De apoyo" : "A cargo"}</Insignia>
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
                {otras.length > 0 && (
                  <p className="pequeno patrulla__otras">
                    <Icono nombre="personas" tamano={16} /> También van: {otras.map((o) => `${o.nombre} (${o.patrullero})${o.aCargo ? " · a cargo" : ""}`).join(", ")}
                  </p>
                )}
                <a className="ui-boton ui-boton--secundario ui-boton--grande ui-boton--bloque" href={`https://www.google.com/maps/dir/?api=1&destination=${asignado.ubicacion.lat},${asignado.ubicacion.lng}`} target="_blank" rel="noreferrer noopener">
                  <Icono nombre="navegar" tamano={22} /> Cómo llegar
                </a>
                {sig && (
                  <Boton variante="primario" grande bloque disabled={enviando} onClick={() => (sig === "finalizado" ? setFinalizando(true) : avanzar(sig))}>
                    {enviando ? "Enviando…" : TEXTO_BOTON[sig]}
                  </Boton>
                )}
                {sigApoyo && (
                  <Boton variante="primario" grande bloque onClick={() => avanzarApoyo(sigApoyo.estado)}>
                    {sigApoyo.texto}
                  </Boton>
                )}
              </section>
            ) : (
              <section className="patrulla__libre">
                <span className="ui-vacio__icono">
                  <Icono nombre="check" />
                </span>
                <h1>{turno.movil ? "Disponible" : "En servicio"}</h1>
                <p className="texto-2">
                  {turno.movil ? `La Central te ve como libre en ${turno.movil.nombre}. Cuando te despache, el procedimiento aparecerá aquí al instante.` : `La Central te ve en ${turno.puesto!.lugar}.`}
                </p>
              </section>
            )}
            <Boton variante="secundario" grande bloque icono="documento" onClick={() => setReportar(true)}>
              Enviar reporte
            </Boton>
            <Boton variante="peligro" grande bloque icono="sirena" onClick={() => setApoyo(true)}>
              Solicitar apoyo
            </Boton>
          </div>
        )}
        {pestana === "reportes" && <PestanaReportes turno={turno} onNuevo={() => setReportar(true)} />}
        {pestana === "bitacora" && <PestanaBitacora turno={turno} />}
        {pestana === "turno" && <PestanaTurno turno={turno} onCambiar={() => setCerrando("cambiar")} onCerrar={() => setCerrando("salir")} />}
      </main>

      <nav className="patrulla__pestanas" aria-label="Secciones">
        {PESTANAS.map((p) => (
          <button key={p.id} type="button" aria-current={pestana === p.id ? "page" : undefined} onClick={() => setPestana(p.id)}>
            <Icono nombre={p.icono} tamano={22} />
            {p.texto}
          </button>
        ))}
      </nav>

      {envio && !envio.unidad.recibidoEn && <AvisoDespacho procedimiento={envio.procedimiento} unidad={envio.unidad} />}
      {reportar && <NuevoReporte turno={turno} procedimientoInicial={asignado} onCerrar={() => setReportar(false)} />}
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
                  const pos = (await posicionActual()) ?? asignado?.ubicacion ?? turno.movil?.posicion ?? turno.puesto!.ubicacion;
                  obtenerCliente().pedirApoyo(turno.movil?.id ?? "", usuario, pos);
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
      {cerrando && <CierreTurno movil={turno.movil} personal={turno.puesto} bloqueado={!!asignado} modo={cerrando} onCerrar={() => setCerrando(null)} />}
    </div>
  );
}

function Finalizar({ onCerrar, onConfirmar }: { onCerrar: () => void; onConfirmar: (resultado: string) => void }) {
  const [resultado, setResultado] = useState("");
  const opciones = ["Situación normalizada en el lugar", "Se coordina con Carabineros", "Se orienta a los involucrados", "Sin novedad al llegar"];
  return (
    <Modal
      titulo="Finalizar procedimiento"
      subtitulo="¿Cómo terminó? Después puedes enviar el reporte con fotos."
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
