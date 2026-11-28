import { useState } from "react";
import {
  ESTADOS,
  SIGUIENTE,
  duracion,
  esActivo,
  hora,
  infoDeClave,
  obtenerClave,
  obtenerCliente,
  puede,
  tiemposDe,
  TEXTO_ACCION,
  unidadesActivas,
  type EstadoUnidad,
  useDatos,
  type Movil,
  type Procedimiento,
} from "@plataforma/datos";
import { avisar, Boton, Campo, EntradaDireccion, Insignia, Modal, Semaforo, useUsuario } from "@plataforma/ui";
import { enlaceGoogleMaps } from "@plataforma/mapa";
import { BuscadorClave } from "./BuscadorClave";
import { SelectorUnidades } from "./SelectorUnidades";

const ESTADO_UNIDAD: Record<EstadoUnidad, string> = { asignado: "despachada", en_camino: "en camino", en_el_lugar: "en el lugar", liberado: "liberada" };
import { ListaDespacho } from "./ListaDespacho";

export function Detalle({ procedimiento: p, moviles, procedimientos }: { procedimiento: Procedimiento; moviles: Movil[]; procedimientos: Procedimiento[] }) {
  const usuario = useUsuario();
  const cliente = obtenerCliente();
  const [cancelando, setCancelando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  const [editando, setEditando] = useState(false);
  const { auditoria, personal } = useDatos();
  const [eleccion, setEleccion] = useState<string[]>([]);
  const [agregando, setAgregando] = useState(false);
  const [paraAgregar, setParaAgregar] = useState<string[]>([]);
  const unidades = unidadesActivas(p);

  function enviar(ids: string[]) {
    try {
      cliente.agregarUnidades(p.id, ids, usuario);
      avisar(`${p.folio}: ${ids.length === 1 ? "unidad despachada" : `${ids.length} unidades despachadas`}. Les llega el aviso en su app.`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo despachar");
    }
    setEleccion([]);
    setParaAgregar([]);
    setAgregando(false);
  }
  function liberar(id: string) {
    try {
      cliente.liberarUnidad(p.id, id, usuario);
      avisar("Unidad liberada: vuelve a estar disponible");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo liberar");
    }
  }
  function dejarACargo(id: string) {
    try {
      cliente.despachar(p.id, id, usuario);
      avisar("Cambió la unidad a cargo");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo cambiar");
    }
  }
  const cambios = auditoria.filter((a) => a.procedimientoId === p.id && (a.accion === "editar" || a.accion === "cancelar" || a.accion === "despachar"));
  const info = infoDeClave(p.claveNumero);
  const activo = esActivo(p.estado);
  const sig = SIGUIENTE[p.estado];
  const t = tiemposDe(p);
  const puedeDespachar = puede(usuario.rol, "despachar") && activo;

  function despachar(m: Movil) {
    try {
      cliente.despachar(p.id, m.id, usuario);
      avisar(`${p.folio} despachado a ${m.nombre} (${m.turno?.patrullero ?? ""})`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo despachar");
    }
    setReasignando(false);
  }

  return (
    <div className="detalle">
      <header className="detalle__cabeza">
        <div className="detalle__fila">
          <Semaforo claveNumero={p.claveNumero} />
          <Insignia tono={activo ? (p.estado === "recibido" ? "peligro" : "info") : "neutro"} punto>
            {ESTADOS[p.estado].etiqueta}
          </Insignia>
          {p.origen === "terreno" && <Insignia tono="alerta">Iniciado en terreno</Insignia>}
          <span className="pequeno texto-3 num" style={{ marginLeft: "auto" }}>
            {p.folio}
          </span>
        </div>
        <h2>
          {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
        </h2>
        <p className="texto-2">
          {p.direccion}{" "}
          <a className="pequeno" href={enlaceGoogleMaps(p.ubicacion)} target="_blank" rel="noopener noreferrer">
            Ver en Google Maps ↗
          </a>
        </p>
        <p className="pequeno texto-3">
          {p.unidadVecinal ? `UV ${String(p.unidadVecinal).padStart(2, "0")} · ${p.barrio}` : "Fuera de las unidades vecinales"} · meta {info.respuesta.toLowerCase()}
        </p>
      </header>

      {p.descripcion && <p className="detalle__relato">{p.descripcion}</p>}

      {activo && p.estado === "recibido" && puedeDespachar && (
        <div className="detalle__bloque">
          <h3>Despachar unidades</h3>
          <p className="pequeno texto-3">Marca una o varias: la primera va a cargo y las demás de apoyo. A cada una le llega el aviso en su app.</p>
          <SelectorUnidades punto={p.ubicacion} moviles={moviles} personal={personal} procedimientos={procedimientos} seleccion={eleccion} onCambio={setEleccion} />
          <Boton variante="primario" icono="enviar" disabled={!eleccion.length} onClick={() => enviar(eleccion)}>
            {eleccion.length > 1 ? `Despachar ${eleccion.length} unidades` : "Despachar"}
          </Boton>
        </div>
      )}

      {activo && p.estado !== "recibido" && (
        <div className="detalle__bloque">
          <h3>Unidades enviadas ({unidades.length})</h3>
          <ul className="detalle__unidades">
            {unidades.map((u) => (
              <li key={u.id}>
                <span>
                  <strong>{u.nombre}</strong>
                  <span className="pequeno texto-2"> · {u.patrullero}</span>
                  <div className="pequeno texto-3">
                    {u.aCargo ? "A cargo" : "Apoyo"} · {ESTADO_UNIDAD[u.estado]} · {u.recibidoEn ? `aviso visto ${hora(u.recibidoEn)}` : "aviso sin confirmar"}
                  </div>
                </span>
                {puedeDespachar && (
                  <span className="detalle__unidades-acciones">
                    {!u.aCargo && (
                      <>
                        <button type="button" className="enlace pequeno" onClick={() => dejarACargo(u.id)}>
                          Dejar a cargo
                        </button>
                        <button type="button" className="enlace pequeno" onClick={() => liberar(u.id)}>
                          Liberar
                        </button>
                      </>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="pequeno texto-3">La unidad a cargo avanza los estados desde su app; las de apoyo informan cuando van en camino, llegan y terminan.</p>
          <div className="detalle__acciones">
            {sig && puede(usuario.rol, "cambiar_estado") && (
              <Boton variante="secundario" onClick={() => cliente.cambiarEstado(p.id, sig, usuario, { nota: "Registrado por la Central" })}>
                Marcar «{ESTADOS[sig].etiqueta}»
              </Boton>
            )}
            {puedeDespachar && (
              <Boton variante="secundario" icono="mas" onClick={() => setAgregando(true)}>
                Agregar unidades
              </Boton>
            )}
            {puedeDespachar && (
              <Boton variante="fantasma" onClick={() => setReasignando(true)}>
                Cambiar unidad a cargo
              </Boton>
            )}
          </div>
        </div>
      )}

      {cambios.length > 0 && (
        <div className="detalle__bloque">
          <h3>Cambios registrados</h3>
          <ul className="detalle__cambios">
            {cambios.map((a) => (
              <li key={a.id}>
                <span className="num pequeno texto-3">{hora(a.en)}</span>{" "}
                <strong>{TEXTO_ACCION[a.accion]}</strong> <span className="pequeno">· {a.nombre}</span>
                <div className="pequeno texto-2">{a.detalle}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="detalle__bloque">
        <h3>Línea de tiempo</h3>
        <ol className="linea">
          {p.eventos.map((e, i) => (
            <li key={i} className={`linea__paso linea__paso--${e.estado}`}>
              <span className="linea__hora num">{hora(e.en)}</span>
              <div>
                <strong>{ESTADOS[e.estado].etiqueta}</strong>
                <div className="pequeno texto-3">
                  {e.porNombre}
                  {e.nota ? ` · ${e.nota}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <dl className="tiempos">
          <div>
            <dt>Despacho</dt>
            <dd className="num">{duracion(t.despacho)}</dd>
          </div>
          <div>
            <dt>Llegada</dt>
            <dd className="num">{duracion(t.llegada)}</dd>
          </div>
          <div>
            <dt>Respuesta</dt>
            <dd className="num">
              {duracion(t.respuesta)}
              {t.dentroDeMeta != null && <Insignia tono={t.dentroDeMeta ? "ok" : "alerta"}>{t.dentroDeMeta ? "En meta" : "Fuera de meta"}</Insignia>}
            </dd>
          </div>
        </dl>
      </div>

      {activo && (
        <div className="detalle__pie">
          {puede(usuario.rol, "crear_procedimiento") && (
            <Boton icono="documento" onClick={() => setEditando(true)}>
              Corregir datos
            </Boton>
          )}
          {puede(usuario.rol, "cancelar_procedimiento") && (
            <Boton variante="peligro" onClick={() => setCancelando(true)}>
              Cancelar procedimiento
            </Boton>
          )}
        </div>
      )}
      {editando && <EditarProcedimiento procedimiento={p} onCerrar={() => setEditando(false)} />}

      {cancelando && <ConfirmarCancelacion procedimiento={p} onCerrar={() => setCancelando(false)} />}
      {agregando && (
        <Modal
          titulo={`Agregar unidades a ${p.folio}`}
          subtitulo="Van de apoyo. Les llega el aviso en su app al instante."
          onCerrar={() => setAgregando(false)}
          pie={
            <>
              <Boton onClick={() => setAgregando(false)}>Volver</Boton>
              <Boton variante="primario" icono="enviar" disabled={!paraAgregar.length} onClick={() => enviar(paraAgregar)}>
                Enviar {paraAgregar.length || ""} {paraAgregar.length === 1 ? "unidad" : "unidades"}
              </Boton>
            </>
          }
        >
          <SelectorUnidades punto={p.ubicacion} moviles={moviles} personal={personal} procedimientos={procedimientos} seleccion={paraAgregar} onCambio={setParaAgregar} excluir={unidades.map((u) => u.id)} conACargo={false} />
        </Modal>
      )}
      {reasignando && (
        <Modal titulo={`Reasignar ${p.folio}`} subtitulo="El móvil actual queda disponible." onCerrar={() => setReasignando(false)}>
          <ListaDespacho punto={p.ubicacion} moviles={moviles} procedimientos={procedimientos} onElegir={despachar} textoBoton="Asignar" />
        </Modal>
      )}
    </div>
  );
}

function ConfirmarCancelacion({ procedimiento: p, onCerrar }: { procedimiento: Procedimiento; onCerrar: () => void }) {
  const usuario = useUsuario();
  const [motivo, setMotivo] = useState("");
  return (
    <Modal
      titulo={`¿Cancelar ${p.folio}?`}
      subtitulo="Esta acción no se puede deshacer y queda registrada."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Volver</Boton>
          <Boton
            variante="peligro"
            disabled={motivo.trim().length < 5}
            onClick={() => {
              obtenerCliente().cambiarEstado(p.id, "cancelado", usuario, { nota: motivo.trim() });
              avisar(`${p.folio} cancelado`);
              onCerrar();
            }}
          >
            Cancelar procedimiento
          </Boton>
        </>
      }
    >
      <label className="ui-campo">
        <span className="ui-campo__etiqueta">Motivo (obligatorio)</span>
        <textarea className="ui-entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el denunciante anuló el llamado" />
      </label>
    </Modal>
  );
}

/** Corregir clave, dirección o descripción. Queda registrado el antes y el después, con el motivo. */
function EditarProcedimiento({ procedimiento: p, onCerrar }: { procedimiento: Procedimiento; onCerrar: () => void }) {
  const usuario = useUsuario();
  const [clave, setClave] = useState<number | null>(p.claveNumero);
  const [direccion, setDireccion] = useState(p.direccion);
  const [descripcion, setDescripcion] = useState(p.descripcion);
  const [ubicacion, setUbicacion] = useState(p.ubicacion);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const hayCambios = clave !== p.claveNumero || direccion.trim() !== p.direccion || descripcion.trim() !== p.descripcion || ubicacion !== p.ubicacion;
  return (
    <Modal
      titulo={`Corregir ${p.folio}`}
      subtitulo="El cambio queda registrado con tu nombre, la hora, el valor anterior y el motivo."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Volver</Boton>
          <Boton
            variante="primario"
            disabled={!hayCambios || clave == null || direccion.trim().length < 3 || motivo.trim().length < 3}
            onClick={() => {
              try {
                obtenerCliente().editarProcedimiento(p.id, { claveNumero: clave!, direccion, descripcion, ubicacion }, usuario, motivo);
                avisar(`${p.folio} corregido`);
                onCerrar();
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo guardar");
              }
            }}
          >
            Guardar corrección
          </Boton>
        </>
      }
    >
      <div className="form-patrulla">
        {error && <div className="ui-alerta ui-alerta--error">{error}</div>}
        <BuscadorClave valor={clave} onElegir={setClave} />
        <Campo etiqueta="Dirección" htmlFor="editar-dir" ayuda="Si eliges una sugerencia, también se corrige el punto en el mapa.">
          <EntradaDireccion id="editar-dir" valor={direccion} onCambio={setDireccion} onElegir={(s) => setUbicacion(s.punto)} />
        </Campo>
        <Campo etiqueta="Descripción" htmlFor="editar-desc">
          <textarea id="editar-desc" className="ui-entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
        </Campo>
        <Campo etiqueta="Motivo de la corrección (obligatorio)" htmlFor="editar-motivo">
          <input id="editar-motivo" className="ui-entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el vecino corrigió el número" />
        </Campo>
      </div>
    </Modal>
  );
}
