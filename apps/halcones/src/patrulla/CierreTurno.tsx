import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checklistInicial, COMBUSTIBLE, novedadesChecklist, obtenerCliente, textoChecklist, type Movil, type TurnoPersonal } from "@plataforma/datos";
import { avisar, Boton, Campo, Modal, useSesion, useUsuario } from "@plataforma/ui";
import { FormularioChecklist, TextoParaCompartir } from "./ChecklistMovil";

/**
 * Cierre de turno. Con móvil: «CHECK LIST MÓVIL TÉRMINO DEL SERVICIO» con el formato oficial (km, combustible,
 * estado del móvil, equipamiento, accesorios y novedades), listo para copiar o compartir. Sin móvil: solo novedades.
 * El turno queda en el historial y la Central lo ve en la bitácora.
 */
export function CierreTurno({ movil, personal, bloqueado, modo = "salir", onCerrar }: { movil?: Movil; personal?: TurnoPersonal; bloqueado: boolean; modo?: "salir" | "cambiar"; onCerrar: () => void }) {
  const usuario = useUsuario();
  const { salir } = useSesion();
  const navegar = useNavigate();
  const [km, setKm] = useState("");
  const [combustible, setCombustible] = useState("3/4");
  // Parte del checklist del inicio: solo se corrige lo que cambió durante el turno.
  const [checklist, setChecklist] = useState(() => movil?.turno?.checklist ?? checklistInicial());
  const termino = useMemo(() => new Date(), []);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const kmInicial = movil?.turno?.kmInicial ?? null;
  const kmValido = !movil || (/^\d+$/.test(km) && (kmInicial == null || Number(km) >= kmInicial));
  const texto =
    movil?.turno &&
    textoChecklist({
      momento: "termino",
      fecha: new Date(movil.turno.iniciadoEn),
      horaInicio: new Date(movil.turno.iniciadoEn),
      horaTermino: termino,
      movil: movil.nombre,
      ppu: movil.turno.ppu ?? "",
      conductor: [movil.turno.halcon ? `H-${movil.turno.halcon}` : "", movil.turno.patrullero].filter(Boolean).join(" "),
      acompanante: movil.turno.acompanante,
      kmInicio: kmInicial,
      kmTermino: /^\d+$/.test(km) ? Number(km) : null,
      combustibleInicio: movil.turno.combustible,
      combustibleTermino: combustible,
      checklist,
    });

  function cerrar() {
    setError("");
    try {
      const cierre = movil
        ? { kmFinal: Number(km), combustibleFinal: combustible, novedadesChecklist: novedadesChecklist(checklist), observaciones: observaciones || checklist.novedades, checklistTermino: checklist, textoChecklist: texto || undefined }
        : { observaciones };
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
              <Campo etiqueta="Kilometraje final" htmlFor="kmf" error={km && !kmValido ? `No puede ser menor que el inicial (${kmInicial?.toLocaleString("es-CL")} km)` : undefined} ayuda={kmInicial != null ? `Inicial: ${kmInicial.toLocaleString("es-CL")}` : undefined}>
                <input id="kmf" className="ui-entrada" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} />
              </Campo>
              <Campo etiqueta="Combustible término" htmlFor="combf" ayuda={movil.turno ? `Inicio: ${movil.turno.combustible}` : undefined}>
                <select id="combf" className="ui-entrada" value={combustible} onChange={(e) => setCombustible(e.target.value)}>
                  {COMBUSTIBLE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>
            {kmInicial != null && kmValido && km && <p className="pequeno texto-2">Recorrido del turno: {(Number(km) - kmInicial).toLocaleString("es-CL")} km</p>}
            <p className="pequeno texto-3">Viene con lo que marcaste al iniciar el turno: corrige solo lo que cambió.</p>
            <FormularioChecklist valor={checklist} onCambio={setChecklist} />
            {texto && <TextoParaCompartir titulo="Checklist de término para compartir" texto={texto} />}
          </>
        )}
        <Campo etiqueta={movil ? "Novedades para el turno siguiente (opcional)" : "Novedades del turno (opcional)"} htmlFor="obs">
          <textarea id="obs" className="ui-entrada" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Lo que debe saber el turno siguiente" />
        </Campo>
      </div>
    </Modal>
  );
}
