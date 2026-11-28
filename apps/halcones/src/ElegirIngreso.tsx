import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLES, puedeIniciarComo, useDatos, type ModoHalcones } from "@plataforma/datos";
import { Boton, EmblemaHalcon, IlustracionCentral, IlustracionPatrulla, Insignia, useSesion } from "@plataforma/ui";

const OPCIONES: { modo: ModoHalcones; titulo: string; texto: string; ruta: string }[] = [
  { modo: "central", titulo: "Central de Operaciones", texto: "Crear y despachar procedimientos, ver la flota y los reportes.", ruta: "/central" },
  { modo: "patrulla", titulo: "Patrullero", texto: "Móvil, punto estático u otro servicio. Checklist, reportes y procedimientos.", ruta: "/patrulla" },
];

/** Después del ingreso: el mismo usuario elige si entra como Central o como patrullero, según su rol. */
export function ElegirIngreso() {
  const { sesion, salir } = useSesion();
  const navegar = useNavigate();
  const { moviles } = useDatos();
  const [error, setError] = useState("");
  if (!sesion) return null;
  const u = sesion.usuario;
  const enTurno = moviles.some((m) => m.turno?.usuarioId === u.id);

  function elegir(modo: ModoHalcones, ruta: string) {
    if (!puedeIniciarComo(u.rol, modo)) {
      setError(`Tu rol (${ROLES[u.rol].etiqueta}) no permite iniciar como ${modo === "central" ? "Central" : "patrullero"}. Si es un error, pide el acceso al administrador.`);
      return;
    }
    navegar(ruta, { replace: true });
  }

  return (
    <main className="elegir">
      <div className="elegir__caja">
        <header className="elegir__cabeza">
          <EmblemaHalcon tamano={40} />
          <div>
            <h1>¿Cómo deseas iniciar?</h1>
            <p className="texto-2">
              {u.nombre} · {ROLES[u.rol].etiqueta}
            </p>
          </div>
        </header>
        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            {error}
          </div>
        )}
        <div className="elegir__opciones">
          {OPCIONES.map((o) => {
            const permitido = puedeIniciarComo(u.rol, o.modo);
            return (
              <button key={o.modo} type="button" data-modo={o.modo} className={`elegir__opcion${permitido ? "" : " elegir__opcion--bloqueada"}`} onClick={() => elegir(o.modo, o.ruta)}>
                {o.modo === "central" ? <IlustracionCentral className="elegir__ilustracion" /> : <IlustracionPatrulla className="elegir__ilustracion" />}
                <strong>{o.titulo}</strong>
                <span className="texto-2">{o.texto}</span>
                {!permitido && <Insignia tono="neutro">Tu rol no lo permite</Insignia>}
                {permitido && o.modo === "patrulla" && enTurno && <Insignia tono="ok">Tienes un turno abierto</Insignia>}
              </button>
            );
          })}
        </div>
        <Boton onClick={salir}>Ingresar con otra cuenta</Boton>
      </div>
    </main>
  );
}
