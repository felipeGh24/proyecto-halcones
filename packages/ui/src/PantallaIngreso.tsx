import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CONTRASENA_DEMO, iniciarSesion, ROLES, SISTEMAS, tieneAcceso, USUARIOS_DEMO, type Sesion } from "@plataforma/datos";
import { Boton, Campo, Insignia } from "./componentes";
import { EmblemaHalcon, IlustracionCentralPatrulla } from "./Ilustraciones";
import { Icono } from "./Icono";
import { useSesion } from "./sesion";

/**
 * Pantalla de ingreso común a los tres sistemas.
 * En modo demostración lo dice claramente y ofrece las cuentas de ejemplo.
 */
export function PantallaIngreso({ puntos, destino }: { puntos: string[]; destino: (s: Sesion) => string }) {
  const { sistema, entrar } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const info = SISTEMAS[sistema];

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!correo.trim() || !contrasena) {
      setError("Ingresa tu correo institucional y tu contraseña.");
      return;
    }
    setEnviando(true);
    const r = await iniciarSesion(correo, contrasena, sistema);
    setEnviando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    entrar(r.sesion);
    const desde = (ubicacion.state as { desde?: string } | null)?.desde;
    navegar(desde && desde !== "/ingreso" ? desde : destino(r.sesion), { replace: true });
  }

  return (
    <main className="ui-ingreso">
      <aside className="ui-ingreso__lado">
        <div className="ui-ingreso__marca">
          <span className="ui-marco__logo">
            <EmblemaHalcon tamano={40} />
          </span>
          <div>
            <div className="ui-marco__nombre">Seguridad Pública</div>
            <div className="ui-marco__org">Municipalidad de Conchalí</div>
          </div>
        </div>
        <div>
          <IlustracionCentralPatrulla className="ui-ingreso__ilustracion" />
          <p className="ui-ingreso__sistema">
            {info.nombre}
          </p>
          <h1 className="ui-ingreso__titulo" style={{ marginTop: 8 }}>
            {info.descripcion}
          </h1>
          <ul className="ui-ingreso__lista">
            {puntos.map((p) => (
              <li key={p}>
                <Icono nombre="check" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="pequeno ui-ingreso__pie">Plataforma integrada: Halcones · Georreferenciado · Análisis de eventos</p>
      </aside>

      <section className="ui-ingreso__form">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: 24 }}>Ingresar</h2>
            <Insignia tono="demo">Demo</Insignia>
          </div>
          <p className="texto-2">Usa tu correo institucional. El acceso queda registrado.</p>
        </div>

        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            <Icono nombre="alerta" />
            {error}
          </div>
        )}

        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Correo institucional" htmlFor="correo">
            <input id="correo" className="ui-entrada" type="email" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@municipio.cl" />
          </Campo>
          <Campo etiqueta="Contraseña" htmlFor="contrasena">
            <div className="ui-ingreso__clave">
              <input id="contrasena" className="ui-entrada" type={ver ? "text" : "password"} autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
              <Boton className="ui-ingreso__ojo" variante="fantasma" soloIcono icono={ver ? "ojoNo" : "ojo"} onClick={() => setVer((v) => !v)}>
                {ver ? "Ocultar contraseña" : "Mostrar contraseña"}
              </Boton>
            </div>
          </Campo>
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            {enviando ? "Verificando…" : "Ingresar"}
          </Boton>
        </form>

        <div className="ui-demo">
          <div>
            <strong style={{ fontSize: 13 }}>Modo demostración</strong>
            <p className="pequeno texto-2">
              No es un acceso real: los datos son ficticios y se guardan solo en este navegador. Cualquier cuenta entra a los tres sistemas y a todas las pantallas; el rol solo define dónde llegas primero. Contraseña <code>{CONTRASENA_DEMO}</code>.
            </p>
          </div>
          <div className="ui-demo__cuentas">
            {USUARIOS_DEMO.map((u) => {
              const permitido = tieneAcceso(u.rol, sistema);
              return (
                <button
                  key={u.id}
                  type="button"
                  className="ui-demo__cuenta"
                  disabled={!permitido}
                  title={permitido ? `Completar con ${u.correo}` : `${ROLES[u.rol].etiqueta} no tiene acceso a ${info.nombre}`}
                  onClick={() => {
                    setCorreo(u.correo);
                    setContrasena(CONTRASENA_DEMO);
                    setError("");
                  }}
                >
                  <strong>{ROLES[u.rol].etiqueta}</strong>
                  <span>{u.correo}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="ui-ingreso__aviso">
          <Icono nombre="candado" tamano={14} /> Acceso exclusivo para personal autorizado. La sesión se cierra tras 30 minutos sin uso y el acceso se bloquea por 5 minutos tras 5 intentos fallidos.
        </p>
      </section>
    </main>
  );
}

export function PantallaSinAcceso() {
  const { salir, sistema } = useSesion();
  const navegar = useNavigate();
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="ui-tarjeta" style={{ padding: 32, maxWidth: 440, textAlign: "center", display: "grid", gap: 12 }}>
        <h1 style={{ fontSize: 20 }}>Sin acceso</h1>
        <p className="texto-2">Tu rol no tiene permiso para esta sección de {SISTEMAS[sistema].nombre}. Si crees que es un error, pide acceso al administrador.</p>
        <Boton variante="primario" onClick={() => navegar("/", { replace: true })}>
          Ir a mi inicio
        </Boton>
        <Boton onClick={salir}>Ingresar con otra cuenta</Boton>
      </div>
    </main>
  );
}
