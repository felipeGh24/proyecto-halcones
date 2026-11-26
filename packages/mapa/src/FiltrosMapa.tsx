import { useEffect, useState } from "react";
import { leerPuntosFijos, leerPuntosInteres, type Punto, type PuntoFijo, type PuntoInteres } from "@plataforma/datos";

/**
 * Módulo de filtros del mapa: qué lugares se muestran (GAMA, salud de urgencia, Carabineros, bomberos, metro,
 * puntos fijos) y lista de cada grupo para ir directo a uno. Al tocar un lugar, el mapa lo centra y lo destaca.
 */
export type GrupoFiltro = "gama" | "salud" | "policia" | "bomberos" | "metro" | "fijos" | "otros";

export const GRUPOS_FILTRO: { id: GrupoFiltro; nombre: string; color: string; letra: string }[] = [
  { id: "gama", nombre: "Recintos municipales (GAMA)", color: "#0F766E", letra: "G" },
  { id: "salud", nombre: "SAPU y SAR", color: "#6941C6", letra: "S" },
  { id: "policia", nombre: "Carabineros", color: "#155B75", letra: "C" },
  { id: "bomberos", nombre: "Bomberos", color: "#C11574", letra: "B" },
  { id: "metro", nombre: "Metro Línea 3", color: "#E11D48", letra: "L3" },
  { id: "fijos", nombre: "Puntos fijos", color: "#7C3AED", letra: "PF" },
  { id: "otros", nombre: "Otros puntos cargados", color: "#475467", letra: "•" },
];

export type Filtros = Record<GrupoFiltro, boolean>;
export const FILTROS_INICIALES: Filtros = { gama: true, salud: true, policia: true, bomberos: true, metro: true, fijos: true, otros: false };

export function grupoDe(p: PuntoInteres): GrupoFiltro {
  if (p.grupo === "recintos_municipales") return "gama";
  if (p.tipo === "salud") return "salud";
  if (p.tipo === "policia") return "policia";
  if (p.tipo === "bomberos") return "bomberos";
  if (p.tipo === "metro") return "metro";
  return "otros";
}

/** Lugares del municipio que se actualizan solos cuando alguien los ubica o agrega. */
export function useLugares() {
  const [puntos, setPuntos] = useState<PuntoInteres[]>(() => leerPuntosInteres());
  const [fijos, setFijos] = useState<PuntoFijo[]>(() => leerPuntosFijos());
  useEffect(() => {
    const leer = () => {
      setPuntos(leerPuntosInteres());
      setFijos(leerPuntosFijos());
    };
    window.addEventListener("plataforma-puntos", leer);
    window.addEventListener("storage", leer);
    return () => {
      window.removeEventListener("plataforma-puntos", leer);
      window.removeEventListener("storage", leer);
    };
  }, []);
  return { puntos, fijos };
}

const CLAVE = "plataforma.filtros-mapa.v1";
export function useFiltros(): [Filtros, (f: Filtros) => void] {
  const [f, setF] = useState<Filtros>(() => {
    try {
      return { ...FILTROS_INICIALES, ...(JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<Filtros>) };
    } catch {
      return FILTROS_INICIALES;
    }
  });
  return [
    f,
    (n) => {
      setF(n);
      try {
        localStorage.setItem(CLAVE, JSON.stringify(n));
      } catch {
        /* sin almacenamiento */
      }
    },
  ];
}

interface Props {
  puntos: PuntoInteres[];
  fijos: PuntoFijo[];
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  resaltado: string | null;
  onElegir: (id: string | null, punto: Punto | null) => void;
  /** Para ubicar un lugar que todavía no tiene punto (abre la pantalla correspondiente). */
  onUbicar?: (id: string) => void;
}

export function FiltrosMapa({ puntos, fijos, filtros, onFiltros, resaltado, onElegir, onUbicar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState<GrupoFiltro | null>("gama");
  const activos = GRUPOS_FILTRO.filter((g) => filtros[g.id]).length;
  const items = (g: GrupoFiltro) =>
    g === "fijos"
      ? fijos.filter((p) => p.activo).map((p) => ({ id: p.id, titulo: p.nombre, sub: p.direccion || "Sin dirección", punto: p.ubicacion, estimado: false, corto: "PF" }))
      : puntos.filter((p) => grupoDe(p) === g).map((p) => ({ id: p.id, titulo: p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre, sub: p.direccion, punto: p.ubicacion, estimado: !!p.estimado, corto: p.corto ?? "" }));

  return (
    <div className={`filtros-mapa ${abierto ? "filtros-mapa--abierto" : ""}`}>
      <button type="button" className="filtros-mapa__boton" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" />
        </svg>
        Filtros <span className="filtros-mapa__cuenta">{activos}</span>
      </button>
      {abierto && (
        <div className="filtros-mapa__panel" role="region" aria-label="Filtros del mapa">
          <div className="filtros-mapa__cabeza">
            <strong>Qué mostrar en el mapa</strong>
            <span className="pequeno texto-3">Toca un lugar para ubicarlo.</span>
          </div>
          <ul className="filtros-mapa__grupos">
            {GRUPOS_FILTRO.map((g) => {
              const lista = items(g.id);
              if (g.id === "otros" && !lista.length) return null;
              const abiertoG = grupoAbierto === g.id;
              return (
                <li key={g.id}>
                  <div className="filtros-mapa__fila">
                    <label className="filtros-mapa__interruptor">
                      <input type="checkbox" checked={filtros[g.id]} onChange={(e) => onFiltros({ ...filtros, [g.id]: e.target.checked })} />
                      <span className="filtros-mapa__icono" style={{ background: g.color }} aria-hidden="true">
                        {g.letra}
                      </span>
                      <span>
                        {g.nombre} <span className="texto-3">({lista.length})</span>
                      </span>
                    </label>
                    <button type="button" className="filtros-mapa__ver" aria-expanded={abiertoG} aria-label={`${abiertoG ? "Ocultar" : "Ver"} lista de ${g.nombre}`} onClick={() => setGrupoAbierto(abiertoG ? null : g.id)}>
                      {abiertoG ? "−" : "+"}
                    </button>
                  </div>
                  {abiertoG && (
                    <ul className="filtros-mapa__lista">
                      {lista.map((x) => (
                        <li key={x.id}>
                          {x.punto ? (
                            <button
                              type="button"
                              aria-pressed={resaltado === x.id}
                              onClick={() => {
                                if (!filtros[g.id]) onFiltros({ ...filtros, [g.id]: true });
                                onElegir(resaltado === x.id ? null : x.id, resaltado === x.id ? null : x.punto);
                                // Se cierra para que el lugar elegido quede a la vista en el mapa.
                                if (resaltado !== x.id) setAbierto(false);
                              }}
                            >
                              <span className="filtros-mapa__nombre">{x.titulo}</span>
                              <span className="filtros-mapa__sub">
                                {x.sub}
                                {x.estimado ? " · calculada" : ""}
                              </span>
                            </button>
                          ) : (
                            <div className="filtros-mapa__sin">
                              <span className="filtros-mapa__nombre">{x.titulo}</span>
                              <span className="filtros-mapa__sub">Falta ubicarlo en el mapa{x.sub ? ` · ${x.sub}` : ""}</span>
                              {onUbicar && (
                                <button type="button" className="ui-boton ui-boton--secundario" onClick={() => onUbicar(x.id)}>
                                  Ubicar
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                      {!lista.length && <li className="pequeno texto-3">No hay lugares en este grupo.</li>}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Puntos de interés que se ven con los filtros actuales. */
export function puntosVisibles(puntos: PuntoInteres[], filtros: Filtros) {
  return puntos.filter((p) => filtros[grupoDe(p)]);
}
