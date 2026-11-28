import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CONTRASENA_DEMO, iniciarSesion, ROLES, SISTEMAS, tieneAcceso, USUARIOS_DEMO, type Sesion } from "@plataforma/datos";
import { Boton, Campo, Insignia } from "./componentes";
import { EmblemaHalcon, IlustracionCentralPatrulla } from "./Ilustraciones";
import { Icono } from "./Icono";
import { useSesion } from "./sesion";
import { LogoHalcones } from "./Logo";
import { debeMostrarEntrada, EntradaAnimada } from "./Entrada";

/** «Pantalla al lado» del ingreso de Halcones: la Central y el celular del patrullero, con datos de ejemplo. */
function VistaHalcones() {
  return (
    <div className="vista-h" aria-hidden="true">
      <div className="vista-h__pantalla">
        <div className="vista-h__barra">
          <i /> <i /> <i /> <span>Central de Operaciones</span>
        </div>
        <div className="vista-h__cuerpo">
          <div className="vista-h__kpis">
            <div><b>14</b><span>Móviles en turno</span></div>
            <div><b>6</b><span>Procedimientos activos</span></div>
            <div><b>7:40</b><span>Llegada promedio</span></div>
          </div>
          <div className="vista-h__mapa">
            <span className="vista-h__punto vista-h__punto--1" />
            <span className="vista-h__punto vista-h__punto--2" />
            <span className="vista-h__punto vista-h__punto--3" />
            <span className="vista-h__alerta" />
          </div>
          <ul className="vista-h__cola">
            <li><em className="rojo" />67 · Robo<small>Independencia 3499</small></li>
            <li><em className="ambar" />2 · Riña<small>Pasarela Mall</small></li>
            <li><em className="verde" />Ronda preventiva<small>UV 09</small></li>
          </ul>
        </div>
      </div>
      <div className="vista-h__celular">
        <div className="vista-h__aviso">
          <strong>Te despacharon</strong>
          <span>67 · Robo · a 600 m</span>
          <b>Entendido</b>
        </div>
      </div>
    </div>
  );
}

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
  const esHalcones = sistema === "halcones";
  const [entrada, setEntrada] = useState(() => esHalcones && debeMostrarEntrada());

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
    <main className={`ui-ingreso${esHalcones ? " ui-ingreso--halcones" : ""}`}>
      {entrada && <EntradaAnimada onFin={() => setEntrada(false)} />}
      {esHalcones ? (
        <aside className="ui-ingreso__lado ingreso-h">
          <div className="ingreso-h__marca">
            <LogoHalcones tamano={76} />
            <div>
              <p className="ingreso-h__sistema">Sistema</p>
              <p className="ingreso-h__nombre">HALCONES</p>
              <p className="ingreso-h__org">Seguridad Pública · Municipalidad de Conchalí</p>
            </div>
          </div>
          <VistaHalcones />
          <ul className="ingreso-h__puntos">
            {puntos.slice(0, 3).map((p) => (
              <li key={p}>
                <Icono nombre="check" />
                {p}
              </li>
            ))}
          </ul>
          <p className="pequeno ui-ingreso__pie">Plataforma integrada: Halcones · Georreferenciado · Análisis de eventos</p>
        </aside>
      ) : (
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
      )}

      <section className="ui-ingreso__form">
        {esHalcones && (
          <div className="ingreso-h__movil">
            <LogoHalcones tamano={60} />
            <div>
              <strong>HALCONES</strong>
              <span>Seguridad Pública · Conchalí</span>
            </div>
          </div>
        )}
        <div className="ingreso-demo-cinta" role="note">
          <Icono nombre="alerta" tamano={16} /> MODO DEMOSTRACIÓN · datos ficticios, solo en este navegador
        </div>
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
