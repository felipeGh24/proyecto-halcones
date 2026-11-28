import { useEffect, useState } from "react";
import { direccionDe, infoDeClave, obtenerCliente, unidadVecinalCercana, type Procedimiento, type Punto } from "@plataforma/datos";
import { avisar, Boton, Campo, EntradaDireccion, Modal, Semaforo, useUsuario } from "@plataforma/ui";
import { BuscadorClave } from "../central/BuscadorClave";
import { posicionActual, type TurnoActual } from "./turnoActual";

/**
 * Procedimiento que le sale al patrullero en la calle, sin despacho de la Central.
 * Elige la clave, el sistema toma su ubicación (GPS) y propone la dirección; al crearlo queda a cargo y «en el lugar»,
 * y la Central lo ve en la cola marcado «iniciado en terreno». Al terminar completa el reporte igual que uno despachado.
 */
export function IniciarProcedimiento({ turno, onCerrar, onCreado }: { turno: TurnoActual; onCerrar: () => void; onCreado: (p: Procedimiento) => void }) {
  const usuario = useUsuario();
  const [clave, setClave] = useState<number | null>(null);
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [punto, setPunto] = useState<Punto | null>(null);
  const [gps, setGps] = useState<"buscando" | "ok" | "sin">("buscando");
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    void posicionActual().then((p) => {
      if (!vivo) return;
      if (p && unidadVecinalCercana(p)) {
        setGps("ok");
        setPunto(p);
        void direccionDe(p).then((d) => vivo && d && setDireccion((actual) => actual || d));
      } else {
        setGps("sin");
        // Sin GPS: parte desde la posición conocida de la unidad para que la Central igual lo ubique.
        setPunto(turno.movil?.posicion ?? turno.puesto?.ubicacion ?? null);
      }
    });
    return () => {
      vivo = false;
    };
  }, [turno.movil, turno.puesto]);

  const uv = punto ? unidadVecinalCercana(punto) : null;
  const listo = clave != null && direccion.trim().length >= 3 && !!punto;

  function crear() {
    setError("");
    try {
      const p = obtenerCliente().iniciarEnTerreno({ claveNumero: clave!, direccion, descripcion, ubicacion: punto! }, turno.unidadId, usuario);
      avisar(`${p.folio} creado: la Central ya lo ve y quedas a cargo`);
      onCreado(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el procedimiento");
    }
  }

  return (
    <Modal
      titulo="Iniciar procedimiento"
      subtitulo="Para lo que te sale en la calle sin despacho de la Central. Quedas a cargo y en procedimiento."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" icono="enviar" disabled={!listo} onClick={crear}>
            Crear y avisar a la Central
          </Boton>
        </>
      }
    >
      <div className="form-patrulla">
        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            {error}
          </div>
        )}
        <BuscadorClave valor={clave} onElegir={setClave} />
        {clave != null && (
          <p className="pequeno">
            <Semaforo claveNumero={clave} /> Prioridad {infoDeClave(clave).semaforo === "rojo" ? "crítica o alta" : infoDeClave(clave).semaforo === "amarillo" ? "media" : "baja"}
          </p>
        )}
        <Campo etiqueta="Dirección" htmlFor="dir-terreno" ayuda={gps === "buscando" ? "Buscando tu ubicación…" : gps === "ok" ? "Propuesta desde tu GPS: corrígela si hace falta." : "Sin GPS: escribe la dirección o la esquina y elige la sugerencia."}>
          <EntradaDireccion id="dir-terreno" valor={direccion} onCambio={setDireccion} onElegir={(s) => setPunto(s.punto)} placeholder="Calle y número, o esquina" />
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
        <Campo etiqueta="Qué pasa (opcional)" htmlFor="desc-terreno" ayuda="En pocas palabras. Los detalles van en el reporte al terminar.">
          <textarea id="desc-terreno" className="ui-entrada" value={descripcion} maxLength={500} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}
