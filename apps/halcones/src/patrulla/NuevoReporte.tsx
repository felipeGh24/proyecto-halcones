import { useEffect, useMemo, useState } from "react";
import {
  direccionDe,
  esActivo,
  obtenerClave,
  obtenerCliente,
  TIPOS_REPORTE,
  unidadVecinalDe,
  useDatos,
  type Adjunto,
  type Procedimiento,
  type Punto,
  type TipoReporte,
} from "@plataforma/datos";
import { avisar, Boton, Campo, EntradaDireccion, Modal, Segmentos, SelectorAdjuntos, useUsuario } from "@plataforma/ui";
import { posicionActual, type TurnoActual } from "./turnoActual";

/**
 * Reporte a la Central: hora y número de halcón automáticos; barrio y unidad vecinal se calculan desde la ubicación;
 * dirección, tipo (patrullaje preventivo, procedimiento, punto estático), observaciones y fotos o videos.
 */
export function NuevoReporte({ turno, procedimientoInicial, onCerrar }: { turno: TurnoActual; procedimientoInicial?: Procedimiento; onCerrar: () => void }) {
  const usuario = useUsuario();
  const { procedimientos } = useDatos();
  const [tipo, setTipo] = useState<TipoReporte>(procedimientoInicial ? "procedimiento" : turno.puesto?.modalidad === "punto_fijo" ? "punto_estatico" : "patrullaje_preventivo");
  const [procId, setProcId] = useState(procedimientoInicial?.id ?? "");
  const [direccion, setDireccion] = useState(procedimientoInicial?.direccion ?? (turno.puesto ? turno.puesto.lugar : ""));
  const [ubicacion, setUbicacion] = useState<Punto | null>(procedimientoInicial?.ubicacion ?? turno.puesto?.ubicacion ?? null);
  const [gps, setGps] = useState<"buscando" | "ok" | "sin">("buscando");
  const [observaciones, setObservaciones] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const ahora = useMemo(() => new Date(), []);

  // Procedimientos de este turno que se pueden adjuntar al reporte.
  const mios = procedimientos.filter((p) => turno.movil && p.movilId === turno.movil.id && new Date(p.creadoEn) >= new Date(turno.iniciadoEn)).reverse();
  const proc = procedimientos.find((p) => p.id === procId);

  useEffect(() => {
    let vivo = true;
    void posicionActual().then((p) => {
      if (!vivo) return;
      if (p && unidadVecinalDe(p)) {
        setGps("ok");
        if (!procedimientoInicial) {
          setUbicacion(p);
          // Con GPS, propone la dirección donde está el patrullero (si no la escribió él).
          void direccionDe(p).then((d) => {
            if (vivo && d) setDireccion((actual) => (actual.trim() && actual !== turno.puesto?.lugar ? actual : d));
          });
        }
      } else setGps("sin");
    });
    return () => {
      vivo = false;
    };
  }, [procedimientoInicial]);

  const uv = ubicacion ? unidadVecinalDe(ubicacion) : null;
  const valido = direccion.trim().length >= 3 && (tipo !== "procedimiento" || !!procId || observaciones.trim().length >= 5);

  function enviar() {
    const r = obtenerCliente().enviarReporte(
      { tipo, halcon: turno.halcon, unidad: turno.unidad, patrullero: turno.patrullero, direccion, ubicacion, procedimientoId: procId || null, observaciones, adjuntos },
      usuario,
    );
    avisar(`Reporte ${r.folio} enviado a la Central`);
    onCerrar();
  }

  return (
    <Modal
      titulo="Nuevo reporte"
      subtitulo={`${ahora.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" })} · ${turno.halcon ? `Halcón ${turno.halcon} · ` : ""}${turno.unidad}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" icono="enviar" disabled={!valido} onClick={enviar}>
            Enviar a la Central
          </Boton>
        </>
      }
    >
      <div className="form-patrulla">
        <div className="ui-campo">
          <span className="ui-campo__etiqueta">Tipo</span>
          <Segmentos<TipoReporte>
            etiqueta="Tipo de reporte"
            valor={tipo}
            onCambio={setTipo}
            opciones={(Object.keys(TIPOS_REPORTE) as TipoReporte[]).map((t) => ({ valor: t, texto: TIPOS_REPORTE[t] }))}
          />
        </div>
        {tipo === "procedimiento" && (
          <Campo etiqueta="Procedimiento que te despacharon" htmlFor="proc" ayuda={mios.length ? undefined : "No tienes procedimientos en este turno; describe lo ocurrido en observaciones."}>
            <select
              id="proc"
              className="ui-entrada"
              value={procId}
              onChange={(e) => {
                setProcId(e.target.value);
                const p = procedimientos.find((x) => x.id === e.target.value);
                if (p) {
                  setDireccion(p.direccion);
                  setUbicacion(p.ubicacion);
                }
              }}
            >
              <option value="">Sin procedimiento asociado</option>
              {mios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.folio} · {p.claveNumero} {obtenerClave(p.claveNumero)?.nombre} {esActivo(p.estado) ? "(en curso)" : ""}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo etiqueta="Dirección" htmlFor="dir-rep">
          <EntradaDireccion id="dir-rep" valor={direccion} onCambio={setDireccion} onElegir={(s) => setUbicacion(s.punto)} placeholder="Calle y número, o esquina" />
        </Campo>
        <div className="dos-columnas">
          <div className="dato">
            <span>Barrio</span>
            <strong>{uv?.barrio ?? "—"}</strong>
          </div>
          <div className="dato">
            <span>Unidad vecinal</span>
            <strong>{uv ? uv.nombre : "—"}</strong>
          </div>
        </div>
        <p className="pequeno texto-3">
          {proc
            ? "Ubicación del procedimiento."
            : gps === "buscando"
              ? "Buscando tu ubicación…"
              : gps === "ok"
                ? "Ubicación tomada del GPS del celular."
                : turno.puesto
                  ? "Sin GPS: se usa la ubicación de tu puesto."
                  : "Sin GPS: activa la ubicación del celular para registrar barrio y unidad vecinal."}
        </p>
        <Campo etiqueta="Observaciones" htmlFor="obs-rep">
          <textarea id="obs-rep" className="ui-entrada" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Qué viste o hiciste" />
        </Campo>
        <SelectorAdjuntos adjuntos={adjuntos} onCambio={setAdjuntos} />
      </div>
    </Modal>
  );
}

/** Añadir texto, fotos o videos a un reporte ya enviado. */
export function ComplementarReporte({ reporteId, folio, onCerrar }: { reporteId: string; folio: string; onCerrar: () => void }) {
  const usuario = useUsuario();
  const [texto, setTexto] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  return (
    <Modal
      titulo={`Añadir al reporte ${folio}`}
      subtitulo="La Central lo verá marcado como nuevo."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton
            variante="primario"
            disabled={!texto.trim() && !adjuntos.length}
            onClick={() => {
              obtenerCliente().complementarReporte(reporteId, texto, adjuntos, usuario);
              avisar(`Información añadida al reporte ${folio}`);
              onCerrar();
            }}
          >
            Añadir
          </Boton>
        </>
      }
    >
      <div className="form-patrulla">
        <Campo etiqueta="Qué agregas" htmlFor="comp">
          <textarea id="comp" className="ui-entrada" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <SelectorAdjuntos adjuntos={adjuntos} onCambio={setAdjuntos} />
      </div>
    </Modal>
  );
}
