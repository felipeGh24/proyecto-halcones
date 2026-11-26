import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ROLES, SISTEMAS, tieneAcceso, type Sistema } from "@plataforma/datos";
import { Boton, Insignia, Reloj } from "./componentes";
import { Icono, type NombreIcono } from "./Icono";
import { useSesion } from "./sesion";

export interface ItemNav {
  a: string;
  texto: string;
  icono: NombreIcono;
  cuenta?: number;
  fin?: boolean;
}

/** Dirección de cada sistema. En la demo publicada viven bajo el mismo dominio (/halcones, /georreferenciado, /analisis). */
function urlSistema(s: Sistema): string {
  const enDesarrollo = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== "4173";
  return enDesarrollo ? `${location.protocol}//${location.hostname}:${SISTEMAS[s].puertoDev}/${s}/` : `/${s}/`;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Marco({ titulo, subtitulo, nav, acciones, children }: { titulo: string; subtitulo?: string; nav: ItemNav[]; acciones?: ReactNode; children: ReactNode }) {
  const { sesion, sistema, salir } = useSesion();
  const navegar = useNavigate();
  const usuario = sesion!.usuario;
  const otros = (Object.keys(SISTEMAS) as Sistema[]).filter((s) => s !== sistema && tieneAcceso(usuario.rol, s));

  return (
    <div className="ui-marco">
      <aside className="ui-marco__lateral">
        <div className="ui-marco__marca">
          <span className="ui-marco__logo">
            <Icono nombre="escudo" />
          </span>
          <div>
            <div className="ui-marco__nombre">{SISTEMAS[sistema].nombre}</div>
            <div className="ui-marco__org">Seguridad Pública · Conchalí</div>
          </div>
        </div>
        <nav className="ui-marco__nav" aria-label="Navegación principal">
          {nav.map((i) => (
            <NavLink key={i.a} to={i.a} end={i.fin} className="ui-nav">
              <Icono nombre={i.icono} />
              {i.texto}
              {i.cuenta != null && <span className="ui-nav__cuenta">{i.cuenta}</span>}
            </NavLink>
          ))}
          {otros.length > 0 && <div className="ui-marco__seccion">Otros sistemas</div>}
          {otros.map((s) => (
            <a key={s} className="ui-nav" href={urlSistema(s)}>
              <Icono nombre={s === "halcones" ? "escudo" : s === "georreferenciado" ? "mapa" : "grafico"} />
              {SISTEMAS[s].nombre}
            </a>
          ))}
        </nav>
        <div className="ui-marco__pie">
          <Boton
            variante="fantasma"
            icono="salir"
            bloque
            style={{ justifyContent: "flex-start" }}
            onClick={() => {
              salir();
              navegar("/ingreso", { replace: true });
            }}
          >
            Cerrar sesión
          </Boton>
        </div>
      </aside>

      <header className="ui-marco__superior">
        <div className="ui-marco__titulo">
          <h1>{titulo}</h1>
          {subtitulo && <span className="pequeno texto-3">{subtitulo}</span>}
        </div>
        <div className="ui-marco__acciones">
          {acciones}
          {sesion?.modo === "demo" && (
            <Insignia tono="demo" punto>
              Demo
            </Insignia>
          )}
          <Reloj />
          <div className="ui-usuario">
            <span className="ui-avatar" aria-hidden>
              {iniciales(usuario.nombre)}
            </span>
            <div className="ui-usuario__datos">
              <strong style={{ fontSize: 13 }}>{usuario.nombre}</strong>
              <span className="ui-usuario__rol">{ROLES[usuario.rol].etiqueta}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="ui-marco__contenido">{children}</main>
    </div>
  );
}
