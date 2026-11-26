import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerCliente, type Movil, type TurnoPersonal } from "@plataforma/datos";
import { avisar, Boton, Campo, Modal, useSesion, useUsuario } from "@plataforma/ui";
import { ITEMS_CHECKLIST } from "./InicioTurno";

/**
 * Cierre de turno: con móvil pide kilometraje final, combustible y novedades del checklist; sin móvil, solo novedades.
 * El turno queda en el historial y la Central lo ve en la bitácora.
 */
export function CierreTurno({ movil, personal, bloqueado, modo = "salir", onCerrar }: { movil?: Movil; personal?: TurnoPersonal; bloqueado: boolean; modo?: "salir" | "cambiar"; onCerrar: () => void }) {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const navegar = useNavigate();
  const [km, setKm] = useState("");
  const [combustible, setCombustible] = useState("1/2");
  const [novedades, setNovedades] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const kmInicial = movil?.turno?.kmInicial ?? null;
  const kmValido = !movil || (/^\d+$/.test(km) && (kmInicial == null || Number(km) >= kmInicial));

  function cerrar() {
    setError("");
    try {
      const cierre = { kmFinal: movil ? Number(km) : null, combustibleFinal: movil ? combustible : null, novedadesChecklist: novedades, observaciones };
      if (movil) obtenerCliente().cerrarTurno(movil.id, usuario, cierre);
      else if (personal) obtenerCliente().cerrarTurnoPersonal(personal.id, usuario, cierre);
      if (modo === "cambiar") {
        // La bitácora anterior queda cerrada; al no haber turno abierto, la app muestra el inicio de turno.
        avisar("Bitácora cerrada: elige el nuevo móvil o modalidad");
        onCerrar();
        return;
      }
      avisar("Turno cerrado y registrado");
      salir();
      navegar("/ingreso", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el turno");
    }
  }

  return (
    <Modal
      titulo={modo === "cambiar" ? "Cambiar de móvil o modalidad" : "Cerrar turno"}
      subtitulo={
        bloqueado
          ? "Tienes un procedimiento activo: finalízalo o pide a la Central que lo reasigne."
          : modo === "cambiar"
            ? `Primero se cierra la bitácora de ${movil ? movil.nombre : "tu puesto actual"}; después eliges el nuevo móvil, punto fijo o a pie.`
            : movil
              ? `${movil.nombre} quedará sin turno y la Central no podrá despacharle.`
              : "Tu turno quedará registrado en la bitácora."
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Volver</Boton>
          <Boton variante="primario" disabled={bloqueado || !kmValido} onClick={cerrar}>
            {modo === "cambiar" ? "Cerrar bitácora y continuar" : "Cerrar turno y salir"}
          </Boton>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            {error}
          </div>
        )}
        {movil && (
          <>
            <div className="dos-columnas">
              <Campo etiqueta="Kilometraje final" htmlFor="kmf" error={km && !kmValido ? `Debe ser mayor o igual a ${kmInicial}` : undefined} ayuda={kmInicial != null ? `Inicial: ${kmInicial.toLocaleString("es-CL")}` : undefined}>
                <input id="kmf" className="ui-entrada" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} />
              </Campo>
              <Campo etiqueta="Combustible" htmlFor="combf">
                <select id="combf" className="ui-entrada" value={combustible} onChange={(e) => setCombustible(e.target.value)}>
                  {["Reserva", "1/4", "1/2", "3/4", "Lleno"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>
            {kmInicial != null && kmValido && km && <p className="pequeno texto-2">Recorrido del turno: {(Number(km) - kmInicial).toLocaleString("es-CL")} km</p>}
            <fieldset className="checklist">
              <legend>¿Algo con novedad al entregar el móvil?</legend>
              <div className="novedades">
                {ITEMS_CHECKLIST.map((i) => {
                  const marcado = novedades.includes(i);
                  return (
                    <button key={i} type="button" className={`ui-boton ${marcado ? "ui-boton--primario" : "ui-boton--secundario"}`} aria-pressed={marcado} onClick={() => setNovedades((n) => (marcado ? n.filter((x) => x !== i) : [...n, i]))}>
                      {i}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}
        <Campo etiqueta="Novedades del turno (opcional)" htmlFor="obs">
          <textarea id="obs" className="ui-entrada" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Lo que debe saber el turno siguiente" />
        </Campo>
      </div>
    </Modal>
  );
}
