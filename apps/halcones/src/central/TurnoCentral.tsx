import { useMemo, useState, type ReactNode } from "react";
import {
  duracion,
  ESTADOS,
  fechaHora,
  hora,
  obtenerClave,
  obtenerCliente,
  resumirTurnoCentral,
  ROLES,
  TEXTO_ACCION,
  TURNOS,
  turnoCentralAbierto,
  turnoDe,
  ultimoTurnoCentralCerrado,
  useDatos,
  type RegistroAccion,
  type ResumenTurnoCentral,
  type Turno,
  type TurnoCentral,
} from "@plataforma/datos";
import { avisar, Boton, Campo, Icono, Indicador, Insignia, Modal, Segmentos, Semaforo, useSesion, useUsuario } from "@plataforma/ui";

const CLAVE_ULTIMO_CIERRE = "plataforma.central.ultimo-cierre";

/**
 * Puerta de la Central: nadie opera sin abrir turno (nombre, n.º de halcón y turno).
 * Así cada acción queda a nombre de alguien y el cierre del turno sabe quién estuvo.
 */
export function PuertaCentral({ children }: { children: ReactNode }) {
  const usuario = useUsuario();
  const { turnosCentral } = useDatos();
  const abierto = turnoCentralAbierto(turnosCentral, usuario.id);
  if (!abierto) return <InicioTurnoCentral />;
  return <>{children}</>;
}

/** Insignia del turno en la barra superior y botón para cerrarlo. */
export function BarraTurnoCentral() {
  const usuario = useUsuario();
  const { turnosCentral } = useDatos();
  const [cerrando, setCerrando] = useState(false);
  const t = turnoCentralAbierto(turnosCentral, usuario.id);
  if (!t) return null;
  return (
    <>
      <Boton variante="secundario" icono="salir" onClick={() => setCerrando(true)} title={`Turno ${TURNOS[t.turno].etiqueta} desde ${hora(t.iniciadoEn)}`}>
        Cerrar turno
      </Boton>
      {cerrando && <CierreTurnoCentral turno={t} onCerrar={() => setCerrando(false)} />}
    </>
  );
}

function InicioTurnoCentral() {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const datos = useDatos();
  const [nombre, setNombre] = useState(usuario.nombre.includes("Demo") ? "" : usuario.nombre);
  const [halcon, setHalcon] = useState("");
  const [turno, setTurno] = useState<Turno>(() => turnoDe(new Date().toISOString()));
  const [novedades, setNovedades] = useState("");
  const [error, setError] = useState("");
  const anterior = ultimoTurnoCentralCerrado(datos.turnosCentral);
  const [miCierre, setMiCierre] = useState<TurnoCentral | null>(() => {
    try {
      const id = sessionStorage.getItem(CLAVE_ULTIMO_CIERRE);
      return id ? datos.turnosCentral.find((t) => t.id === id) ?? null : null;
    } catch {
      return null;
    }
  });
  // Lo que sigue abierto ahora mismo (lo que recibe quien entra).
  const pendientes = useMemo(() => resumirTurnoCentral(datos, new Date().toISOString(), new Date().toISOString()), [datos]);

  function iniciar() {
    setError("");
    if (nombre.trim().length < 3) return setError("Escribe tu nombre y apellido.");
    if (!halcon.trim()) return setError("Escribe tu número de halcón.");
    try {
      obtenerCliente().iniciarTurnoCentral({ nombre, halcon, turno, novedadesRecepcion: novedades }, usuario);
      sessionStorage.removeItem(CLAVE_ULTIMO_CIERRE);
      avisar(`Turno ${TURNOS[turno].etiqueta} iniciado. Todo lo que hagas queda a tu nombre.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el turno");
    }
  }

  return (
    <main className="turno-central">
      <header className="turno-central__cabeza no-imprimir">
        <div>
          <span className="pequeno texto-3">Halcones · Central de Operaciones</span>
          <h1>Inicio de turno en la Central</h1>
        </div>
        <span className="turno-central__acciones">
          <Insignia tono="demo">Demo</Insignia>
          <Boton variante="fantasma" icono="salir" onClick={salir}>
            Salir
          </Boton>
        </span>
      </header>

      {miCierre?.resumen && (
        <section className="ui-tarjeta turno-central__cerrado">
          <div className="turno-central__cerrado-cabeza">
            <div>
              <Insignia tono="ok">Turno cerrado y guardado</Insignia>
              <h2>
                Resumen de tu turno · {miCierre.nombre}
                {miCierre.halcon ? ` · Halcón ${miCierre.halcon}` : ""}
              </h2>
              <p className="pequeno texto-2">
                {TURNOS[miCierre.turno].etiqueta} · {fechaHora(miCierre.iniciadoEn)} a {hora(miCierre.cerradoEn!)} ({duracion((new Date(miCierre.cerradoEn!).getTime() - new Date(miCierre.iniciadoEn).getTime()) / 60000)})
              </p>
            </div>
            <span className="turno-central__acciones no-imprimir">
              <Boton icono="imprimir" onClick={() => window.print()}>
                Imprimir
              </Boton>
              <Boton
                variante="fantasma"
                onClick={() => {
                  sessionStorage.removeItem(CLAVE_ULTIMO_CIERRE);
                  setMiCierre(null);
                }}
              >
                Ocultar
              </Boton>
            </span>
          </div>
          {miCierre.novedadesEntrega && <p className="turno-central__nota">Novedades que dejaste: {miCierre.novedadesEntrega}</p>}
          <VistaResumen resumen={miCierre.resumen} />
        </section>
      )}

      <div className="turno-central__grilla no-imprimir">
        <form
          className="ui-tarjeta turno-central__form"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar();
          }}
        >
          <h2>Tus datos</h2>
          <p className="pequeno texto-2">Todo lo que hagas en la Central (crear, despachar, modificar, cancelar) quedará registrado con estos datos.</p>
          {error && (
            <div className="ui-alerta ui-alerta--error" role="alert">
              {error}
            </div>
          )}
          <Campo etiqueta="Nombre y apellido" htmlFor="tc-nombre">
            <input id="tc-nombre" className="ui-entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" placeholder="Ej.: Camila Rojas" />
          </Campo>
          <Campo etiqueta="N.º de halcón" htmlFor="tc-halcon">
            <input id="tc-halcon" className="ui-entrada" inputMode="numeric" value={halcon} onChange={(e) => setHalcon(e.target.value.slice(0, 10))} placeholder="Ej.: 3" />
          </Campo>
          <div className="ui-campo">
            <span className="ui-campo__etiqueta">Turno</span>
            <Segmentos<Turno>
              etiqueta="Turno"
              valor={turno}
              onCambio={setTurno}
              opciones={(Object.keys(TURNOS) as Turno[]).map((t) => ({ valor: t, texto: `${TURNOS[t].etiqueta} · ${TURNOS[t].horario}` }))}
            />
          </div>
          <Campo etiqueta="Novedades al recibir (opcional)" htmlFor="tc-nov">
            <textarea id="tc-nov" className="ui-entrada" value={novedades} onChange={(e) => setNovedades(e.target.value)} placeholder="Ej.: recibo con radio de base fallando" />
          </Campo>
          <p className="pequeno texto-3">Entras como {ROLES[usuario.rol].etiqueta} ({usuario.correo}).</p>
          <Boton type="submit" variante="primario" grande bloque icono="check">
            Iniciar turno en la Central
          </Boton>
        </form>

        <section className="ui-tarjeta turno-central__recibe">
          <h2>Recibes el turno</h2>
          {anterior ? (
            <div className="turno-central__anterior">
              <p>
                <strong>
                  {anterior.nombre}
                  {anterior.halcon ? ` · Halcón ${anterior.halcon}` : ""}
                </strong>{" "}
                cerró el turno {TURNOS[anterior.turno].etiqueta} a las {hora(anterior.cerradoEn!)} ({fechaHora(anterior.cerradoEn!)}).
              </p>
              {anterior.novedadesEntrega ? <p className="turno-central__nota">«{anterior.novedadesEntrega}»</p> : <p className="pequeno texto-3">No dejó novedades escritas.</p>}
              {anterior.resumen && (
                <p className="pequeno texto-2">
                  En su turno: {anterior.resumen.creados} creados, {anterior.resumen.despachados} despachos, {anterior.resumen.finalizados} finalizados, {anterior.resumen.cancelados} cancelados y {anterior.resumen.editados} modificados.
                </p>
              )}
            </div>
          ) : (
            <p className="pequeno texto-3">No hay un turno anterior cerrado en el sistema.</p>
          )}
          <h3 className="turno-central__sub">Procedimientos activos que siguen ({pendientes.activosQueSiguen.length})</h3>
          <ListaPendientes pendientes={pendientes.activosQueSiguen} />
          <h3 className="turno-central__sub">Móviles con turno ({pendientes.movilesConTurno.length})</h3>
          {pendientes.movilesConTurno.length ? (
            <ul className="turno-central__chips">
              {pendientes.movilesConTurno.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="pequeno texto-3">Ningún móvil tiene turno abierto.</p>
          )}
          {pendientes.reportesSinLeer > 0 && <p className="pequeno">Hay {pendientes.reportesSinLeer} reportes de terreno sin leer.</p>}
        </section>
      </div>
    </main>
  );
}

function CierreTurnoCentral({ turno, onCerrar }: { turno: TurnoCentral; onCerrar: () => void }) {
  const usuario = useUsuario();
  const datos = useDatos();
  const [novedades, setNovedades] = useState("");
  const [error, setError] = useState("");
  const resumen = useMemo(() => resumirTurnoCentral(datos, turno.iniciadoEn, new Date().toISOString()), [datos, turno.iniciadoEn]);
  return (
    <Modal
      ancho
      titulo="Cerrar turno de la Central"
      subtitulo={`${turno.nombre}${turno.halcon ? ` · Halcón ${turno.halcon}` : ""} · turno ${TURNOS[turno.turno].etiqueta} desde ${hora(turno.iniciadoEn)}. Revisa el resumen: queda guardado y lo recibe el turno siguiente.`}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Seguir en el turno</Boton>
          <Boton
            variante="primario"
            icono="check"
            onClick={() => {
              try {
                const c = obtenerCliente().cerrarTurnoCentral(turno.id, novedades, usuario);
                sessionStorage.setItem(CLAVE_ULTIMO_CIERRE, c.id);
                avisar("Turno cerrado y guardado");
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo cerrar el turno");
              }
            }}
          >
            Cerrar turno y guardar
          </Boton>
        </>
      }
    >
      {error && (
        <div className="ui-alerta ui-alerta--error" role="alert">
          {error}
        </div>
      )}
      <VistaResumen resumen={resumen} />
      <Campo etiqueta="Novedades para el turno siguiente" htmlFor="tc-entrega" ayuda="Lo verá quien entre a la Central después de ti.">
        <textarea id="tc-entrega" className="ui-entrada" value={novedades} onChange={(e) => setNovedades(e.target.value)} placeholder="Ej.: P-000012 espera a Carabineros; Móvil 05 con falla de sirena" />
      </Campo>
    </Modal>
  );
}

function ListaPendientes({ pendientes }: { pendientes: ResumenTurnoCentral["activosQueSiguen"] }) {
  if (!pendientes.length) return <p className="pequeno texto-3">No quedan procedimientos activos.</p>;
  return (
    <ul className="turno-central__pendientes">
      {pendientes.map((p) => (
        <li key={p.id}>
          <Semaforo claveNumero={p.claveNumero} />
          <span>
            <strong>
              {p.folio} · {p.claveNumero} {obtenerClave(p.claveNumero)?.nombre}
            </strong>
            <span className="pequeno texto-2">
              {" "}
              · {ESTADOS[p.estado].etiqueta}
              {p.movil ? ` · ${p.movil}` : " · sin móvil"}
            </span>
            <div className="pequeno texto-3">
              {p.direccion} · desde {hora(p.creadoEn)}
            </div>
          </span>
        </li>
      ))}
    </ul>
  );
}

type FiltroAccion = "todo" | "cambios" | "procedimientos" | "turnos";
const FILTROS: Record<FiltroAccion, (a: RegistroAccion) => boolean> = {
  todo: () => true,
  cambios: (a) => a.accion === "editar" || a.accion === "cancelar" || a.accion === "datos_demo",
  procedimientos: (a) => ["crear", "despachar", "estado", "editar", "cancelar", "apoyo"].includes(a.accion),
  turnos: (a) => a.accion.startsWith("turno"),
};

/** Resumen de un turno: cifras, quién estuvo, qué quedó abierto y todo lo que se hizo. */
export function VistaResumen({ resumen }: { resumen: ResumenTurnoCentral }) {
  const [filtro, setFiltro] = useState<FiltroAccion>("todo");
  const acciones = resumen.acciones.filter(FILTROS[filtro]);
  const cambios = resumen.acciones.filter(FILTROS.cambios).length;
  return (
    <div className="resumen-turno">
      <div className="resumen-turno__kpis">
        <Indicador etiqueta="Creados" valor={resumen.creados} detalle={`${resumen.rojosCreados} en rojo`} icono="mas" />
        <Indicador etiqueta="Despachos" valor={resumen.despachados} detalle={resumen.despachoMedianaMin != null ? `mediana ${duracion(resumen.despachoMedianaMin)}` : "—"} icono="enviar" />
        <Indicador etiqueta="Finalizados" valor={resumen.finalizados} icono="check" />
        <Indicador etiqueta="Cancelados" valor={resumen.cancelados} alerta={resumen.cancelados > 0} icono="cerrar" />
        <Indicador etiqueta="Modificados" valor={resumen.editados} alerta={resumen.editados > 0} icono="documento" />
        <Indicador etiqueta="Activos que siguen" valor={resumen.activosQueSiguen.length} alerta={resumen.activosQueSiguen.length > 0} icono="alerta" />
        <Indicador etiqueta="Reportes recibidos" valor={resumen.reportesRecibidos} detalle={`${resumen.reportesSinLeer} sin leer`} icono="documento" />
        <Indicador etiqueta="Móviles con turno" valor={resumen.movilesConTurno.length} detalle={`${resumen.personalEnTerreno} a pie o punto fijo`} icono="auto" />
      </div>

      <div className="resumen-turno__dos">
        <section>
          <h3 className="turno-central__sub">Quiénes estuvieron en la Central</h3>
          {resumen.personas.length ? (
            <ul className="resumen-turno__personas">
              {resumen.personas.map((p, i) => (
                <li key={i}>
                  <Icono nombre="personas" tamano={16} />
                  <span>
                    <strong>{p.nombre}</strong>
                    {p.halcon ? ` · Halcón ${p.halcon}` : ""} <span className="pequeno texto-3">· {ROLES[p.rol].etiqueta}</span>
                    <div className="pequeno texto-3">
                      {hora(p.desde)} a {p.hasta ? hora(p.hasta) : "sigue en turno"}
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pequeno texto-3">Sin registro de turnos de Central.</p>
          )}
        </section>
        <section>
          <h3 className="turno-central__sub">Procedimientos activos que siguen</h3>
          <ListaPendientes pendientes={resumen.activosQueSiguen} />
        </section>
      </div>

      <section>
        <div className="resumen-turno__cabeza-acciones">
          <h3 className="turno-central__sub">Qué se hizo ({resumen.acciones.length} acciones)</h3>
          <Segmentos<FiltroAccion>
            etiqueta="Filtrar acciones"
            valor={filtro}
            onCambio={setFiltro}
            opciones={[
              { valor: "todo", texto: "Todo" },
              { valor: "cambios", texto: `Modificado o cancelado (${cambios})` },
              { valor: "procedimientos", texto: "Procedimientos" },
              { valor: "turnos", texto: "Turnos" },
            ]}
          />
        </div>
        {acciones.length ? (
          <table className="ui-tabla resumen-turno__tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Folio</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {acciones.map((a) => (
                <tr key={a.id} className={a.accion === "cancelar" || a.accion === "editar" ? "resumen-turno__fila--cambio" : ""}>
                  <td className="num">{hora(a.en)}</td>
                  <td>{a.nombre}</td>
                  <td>{TEXTO_ACCION[a.accion]}</td>
                  <td className="num">{a.folio ?? "—"}</td>
                  <td>{a.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="pequeno texto-3">Sin acciones en este filtro.</p>
        )}
      </section>
    </div>
  );
}
