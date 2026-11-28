import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ROLES, SISTEMAS, tieneAcceso, type Sistema } from "@plataforma/datos";
import { Boton, Insignia, Reloj } from "./componentes";
import { LogoHalcones } from "./Logo";
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
  // Versión para ver en Claude: los tres sistemas son carpetas hermanas y se navega con rutas relativas.
  if (import.meta.env.VITE_ENRUTADOR === "hash") return `../${s}/index.html`;
  // En desarrollo (npm run dev:*) cada sistema corre en su propio puerto; en la demo compilada, bajo el mismo dominio
  // en cualquier puerto (antes fallaba si la demo arrancaba en 4174, 4175…).
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:${SISTEMAS[s].puertoDev}/${s}/`;
  return `/${s}/`;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Marco({ titulo, subtitulo, nav, acciones, persona, children }: { titulo: string; subtitulo?: string; nav: ItemNav[]; acciones?: ReactNode; /** Quién está operando (por ejemplo, la persona del turno de Central) si no es el nombre de la cuenta. */ persona?: { nombre: string; detalle: string }; children: ReactNode }) {
  const { sesion, sistema, salir } = useSesion();
  const navegar = useNavigate();
  const usuario = sesion!.usuario;
  const otros = (Object.keys(SISTEMAS) as Sistema[]).filter((s) => s !== sistema && tieneAcceso(usuario.rol, s));

  return (
    <div className="ui-marco">
      <aside className="ui-marco__lateral">
        <div className="ui-marco__marca">
          <LogoHalcones alto={34} variante="claro" className="ui-marco__logo-h" />
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
              {iniciales(persona?.nombre ?? usuario.nombre)}
            </span>
            <div className="ui-usuario__datos">
              <strong style={{ fontSize: 13 }}>{persona?.nombre ?? usuario.nombre}</strong>
              <span className="ui-usuario__rol">{persona?.detalle ?? ROLES[usuario.rol].etiqueta}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="ui-marco__contenido">{children}</main>
    </div>
  );
}
