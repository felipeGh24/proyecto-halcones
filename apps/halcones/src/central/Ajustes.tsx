import { useState } from "react";
import { obtenerCliente, useDatos } from "@plataforma/datos";
import { avisar, Boton, Modal, Tarjeta } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

type Accion = "vacio" | "ejemplo" | null;

/** Ajustes de la demostración: partir de cero o cargar datos de ejemplo para mostrar el análisis. */
export function Ajustes() {
  const { procedimientos, reportes, moviles } = useDatos();
  const [confirmar, setConfirmar] = useState<Accion>(null);

  return (
    <MarcoCentral titulo="Ajustes de la demo" subtitulo="Solo administrador y supervisor">
      <div className="pagina" style={{ maxWidth: 900 }}>
        <Tarjeta titulo="Datos actuales">
          <p className="texto-2">
            {procedimientos.length} procedimientos · {reportes.length} reportes · {moviles.filter((m) => m.turno).length} móviles con turno abierto. Todo se guarda solo en este navegador.
          </p>
        </Tarjeta>
        <Tarjeta titulo="Partir de cero" subtitulo="Borra procedimientos, reportes y turnos. Deja la flota de 23 móviles sin turno y el catálogo de 81 claves.">
          <Boton variante="peligro" onClick={() => setConfirmar("vacio")}>
            Vaciar todos los datos
          </Boton>
        </Tarjeta>
        <Tarjeta titulo="Datos de ejemplo" subtitulo="Carga 90 días de procedimientos ficticios, con focos y un alza, para mostrar Análisis y el motor de patrones. Reemplaza lo actual.">
          <Boton onClick={() => setConfirmar("ejemplo")}>Cargar datos de ejemplo</Boton>
        </Tarjeta>
      </div>
      {confirmar && (
        <Modal
          titulo={confirmar === "vacio" ? "¿Vaciar todos los datos?" : "¿Cargar datos de ejemplo?"}
          subtitulo="Se reemplaza todo lo que hay en este navegador. No se puede deshacer."
          onCerrar={() => setConfirmar(null)}
          pie={
            <>
              <Boton onClick={() => setConfirmar(null)}>Volver</Boton>
              <Boton
                variante={confirmar === "vacio" ? "peligro" : "primario"}
                onClick={() => {
                  obtenerCliente().reiniciar(confirmar);
                  avisar(confirmar === "vacio" ? "Datos vaciados: la operación parte de cero" : "Datos de ejemplo cargados");
                  setConfirmar(null);
                }}
              >
                {confirmar === "vacio" ? "Vaciar" : "Cargar ejemplo"}
              </Boton>
            </>
          }
        >
          <p className="texto-2">Los patrulleros con sesión abierta deberán iniciar turno de nuevo.</p>
        </Modal>
      )}
    </MarcoCentral>
  );
}
