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
  type Movil,
  type Procedimiento,
} from "@plataforma/datos";
import { avisar, Boton, Insignia, Modal, Semaforo, useUsuario } from "@plataforma/ui";
import { ListaDespacho } from "./ListaDespacho";

export function Detalle({ procedimiento: p, moviles, procedimientos }: { procedimiento: Procedimiento; moviles: Movil[]; procedimientos: Procedimiento[] }) {
  const usuario = useUsuario();
  const cliente = obtenerCliente();
  const [cancelando, setCancelando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  const info = infoDeClave(p.claveNumero);
  const movil = moviles.find((m) => m.id === p.movilId);
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
          <span className="pequeno texto-3 num" style={{ marginLeft: "auto" }}>
            {p.folio}
          </span>
        </div>
        <h2>
          {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
        </h2>
        <p className="texto-2">{p.direccion}</p>
        <p className="pequeno texto-3">
          {p.unidadVecinal ? `UV ${String(p.unidadVecinal).padStart(2, "0")} · ${p.barrio}` : "Fuera de las unidades vecinales"} · meta {info.respuesta.toLowerCase()}
        </p>
      </header>

      {p.descripcion && <p className="detalle__relato">{p.descripcion}</p>}

      {activo && p.estado === "recibido" && puedeDespachar && (
        <div className="detalle__bloque">
          <h3>Despachar a un móvil en turno</h3>
          <ListaDespacho punto={p.ubicacion} moviles={moviles} procedimientos={procedimientos} onElegir={despachar} />
        </div>
      )}

      {activo && p.estado !== "recibido" && (
        <div className="detalle__bloque">
          <h3>Móvil asignado</h3>
          <p>
            <strong>{movil?.nombre ?? "—"}</strong>
            {movil?.turno && <span> · {movil.turno.patrullero}{movil.turno.acompanante ? ` y ${movil.turno.acompanante}` : ""}</span>}
          </p>
          <p className="pequeno texto-3">El patrullero avanza los estados desde su app.</p>
          <div className="detalle__acciones">
            {sig && puede(usuario.rol, "cambiar_estado") && (
              <Boton variante="secundario" onClick={() => cliente.cambiarEstado(p.id, sig, usuario, { nota: "Registrado por la Central" })}>
                Marcar «{ESTADOS[sig].etiqueta}»
              </Boton>
            )}
            {puedeDespachar && (
              <Boton variante="fantasma" onClick={() => setReasignando(true)}>
                Reasignar
              </Boton>
            )}
          </div>
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

      {activo && puede(usuario.rol, "cancelar_procedimiento") && (
        <div className="detalle__pie">
          <Boton variante="peligro" onClick={() => setCancelando(true)}>
            Cancelar procedimiento
          </Boton>
        </div>
      )}

      {cancelando && <ConfirmarCancelacion procedimiento={p} onCerrar={() => setCancelando(false)} />}
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
