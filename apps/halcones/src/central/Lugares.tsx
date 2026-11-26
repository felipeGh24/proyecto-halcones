import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { direccionDe, eliminarPuntoFijo, guardarPuntoFijo, GRUPOS_PUNTO, ubicarPunto, unidadVecinalCercana, type Punto, type PuntoFijo } from "@plataforma/datos";
import { Mapa, useLugares } from "@plataforma/mapa";
import { avisar, Boton, Campo, EntradaDireccion, Segmentos, Vacio } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

type Vista = "fijos" | "lugares";
interface Borrador {
  id?: string;
  nombre: string;
  direccion: string;
  ubicacion: Punto | null;
  notas: string;
  activo: boolean;
}
const VACIO: Borrador = { nombre: "", direccion: "", ubicacion: null, notas: "", activo: true };

/**
 * Lugares y puntos fijos: el equipo agrega los puntos donde deja personal apostado (Metro, pasarelas…) y
 * ubica o corrige los lugares del mapa (GAMA, SAPU, Carabineros, bomberos). Todo queda disponible para
 * despachar desde la Central y para que el patrullero elija su punto fijo al iniciar turno.
 */
export function Lugares() {
  const { puntos, fijos } = useLugares();
  const [params, setParams] = useSearchParams();
  const pedido = params.get("ubicar");
  const [vista, setVista] = useState<Vista>(pedido && !pedido.startsWith("pf-") ? "lugares" : "fijos");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [ubicando, setUbicando] = useState<string | null>(pedido && !pedido.startsWith("pf-") ? pedido : null);
  const [enfoque, setEnfoque] = useState<Punto | null>(null);
  const [porEliminar, setPorEliminar] = useState<string | null>(null);

  useEffect(() => {
    if (!pedido?.startsWith("pf-")) return;
    const p = fijos.find((x) => x.id === pedido);
    if (p) editar(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  function editar(p: PuntoFijo) {
    setVista("fijos");
    setBorrador({ id: p.id, nombre: p.nombre, direccion: p.direccion, ubicacion: p.ubicacion, notas: p.notas ?? "", activo: p.activo });
    if (p.ubicacion) setEnfoque({ ...p.ubicacion });
  }

  function clicMapa(p: Punto) {
    if (borrador) {
      setBorrador({ ...borrador, ubicacion: p });
      if (!borrador.direccion.trim()) void direccionDe(p).then((d) => d && setBorrador((b) => (b && !b.direccion.trim() ? { ...b, direccion: d } : b)));
    } else if (ubicando) {
      if (!unidadVecinalCercana(p)) return avisar("Ese punto está fuera de Conchalí");
      ubicarPunto(ubicando, p);
      const l = puntos.find((x) => x.id === ubicando);
      avisar(`${l?.codigo ?? l?.nombre ?? "Lugar"} ubicado`);
      setUbicando(null);
      setParams({});
    }
  }

  function guardar() {
    if (!borrador) return;
    if (borrador.nombre.trim().length < 3) return avisar("Escribe el nombre del punto fijo");
    if (borrador.ubicacion && !unidadVecinalCercana(borrador.ubicacion)) return avisar("El punto está fuera de Conchalí");
    const g = guardarPuntoFijo(borrador);
    avisar(g.ubicacion ? `Punto fijo «${g.nombre}» guardado` : `Punto fijo «${g.nombre}» guardado; falta marcarlo en el mapa`);
    setBorrador(null);
    setParams({});
  }

  const uvBorrador = borrador?.ubicacion ? unidadVecinalCercana(borrador.ubicacion) : null;
  const editandoMapa = !!borrador || !!ubicando;

  return (
    <MarcoCentral titulo="Lugares y puntos fijos" subtitulo="Lo que se ve en el mapa y dónde puede apostarse el personal">
      <div className="pagina lugares">
        <section className="ui-tarjeta lugares__lista">
          <div className="lugares__cabeza">
            <Segmentos
              etiqueta="Qué editar"
              valor={vista}
              onCambio={(v) => {
                setVista(v);
                setBorrador(null);
                setUbicando(null);
              }}
              opciones={[
                { valor: "fijos", texto: `Puntos fijos (${fijos.length})` },
                { valor: "lugares", texto: `Lugares del mapa (${puntos.length})` },
              ]}
            />
            {vista === "fijos" && !borrador && (
              <Boton variante="primario" icono="mas" onClick={() => setBorrador({ ...VACIO })}>
                Agregar punto fijo
              </Boton>
            )}
          </div>

          {vista === "fijos" && borrador && (
            <form
              className="lugares__form"
              onSubmit={(e) => {
                e.preventDefault();
                guardar();
              }}
            >
              <h2>{borrador.id ? "Editar punto fijo" : "Nuevo punto fijo"}</h2>
              <Campo etiqueta="Nombre" htmlFor="pf-nombre" ayuda="Así lo verán la Central y el patrullero. Ej.: Metro Conchalí, Pasarela Vespucio.">
                <input id="pf-nombre" className="ui-entrada" value={borrador.nombre} maxLength={60} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Dirección o esquina" htmlFor="pf-dir" ayuda="Elige una sugerencia o haz clic en el mapa para marcar el punto exacto.">
                <EntradaDireccion
                  id="pf-dir"
                  valor={borrador.direccion}
                  onCambio={(t) => setBorrador({ ...borrador, direccion: t })}
                  onElegir={(s) => {
                    setBorrador((b) => (b ? { ...b, ubicacion: s.punto } : b));
                    setEnfoque({ ...s.punto });
                  }}
                />
              </Campo>
              <p className={`lugares__punto ${borrador.ubicacion ? "" : "lugares__punto--falta"}`}>
                {borrador.ubicacion ? `Unidad vecinal: ${uvBorrador ? `${uvBorrador.nombre} · ${uvBorrador.barrio}` : "fuera de la comuna"}` : "Falta marcar el punto: haz clic en el mapa."}
              </p>
              <Campo etiqueta="Indicaciones (opcional)" htmlFor="pf-notas" ayuda="Horario, con quién coordinar, dónde ubicarse.">
                <textarea id="pf-notas" className="ui-entrada" value={borrador.notas} maxLength={300} onChange={(e) => setBorrador({ ...borrador, notas: e.target.value })} />
              </Campo>
              <label className="lugares__activo">
                <input type="checkbox" checked={borrador.activo} onChange={(e) => setBorrador({ ...borrador, activo: e.target.checked })} />
                Activo (el patrullero lo puede elegir al iniciar turno)
              </label>
              <div className="lugares__acciones">
                <Boton onClick={() => setBorrador(null)}>Cancelar</Boton>
                <Boton variante="primario" type="submit">
                  Guardar punto fijo
                </Boton>
              </div>
            </form>
          )}

          {vista === "fijos" && !borrador && (
            <ul className="lugares__items">
              {!fijos.length && (
                <li>
                  <Vacio icono="pin" titulo="Sin puntos fijos">
                    Agrega el primero con «Agregar punto fijo».
                  </Vacio>
                </li>
              )}
              {fijos.map((p) => (
                <li key={p.id} className={p.activo ? "" : "lugares__inactivo"}>
                  <span className="lugares__pf" aria-hidden="true">
                    PF
                  </span>
                  <span className="lugares__texto">
                    <strong>{p.nombre}</strong>
                    <span className="pequeno texto-3">
                      {p.direccion || "Sin dirección"}
                      {p.unidadVecinal ? ` · UV ${String(p.unidadVecinal).padStart(2, "0")}` : ""}
                      {!p.activo ? " · inactivo" : ""}
                    </span>
                    {!p.ubicacion && <span className="lugares__falta">Falta marcarlo en el mapa</span>}
                  </span>
                  <span className="lugares__botones">
                    {p.ubicacion && <Boton variante="fantasma" icono="pin" soloIcono aria-label={`Ver ${p.nombre} en el mapa`} onClick={() => setEnfoque({ ...p.ubicacion! })} />}
                    <Boton onClick={() => editar(p)}>{p.ubicacion ? "Editar" : "Ubicar"}</Boton>
                    {porEliminar === p.id ? (
                      <Boton
                        variante="peligro"
                        onClick={() => {
                          eliminarPuntoFijo(p.id);
                          setPorEliminar(null);
                          avisar(`Punto fijo «${p.nombre}» eliminado`);
                        }}
                      >
                        Confirmar
                      </Boton>
                    ) : (
                      <Boton variante="fantasma" icono="cerrar" soloIcono aria-label={`Eliminar ${p.nombre}`} onClick={() => setPorEliminar(p.id)} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {vista === "lugares" && (
            <div className="lugares__grupos">
              {ubicando && (
                <p className="lugares__aviso" role="status">
                  Haz clic en el mapa donde está <strong>{puntos.find((x) => x.id === ubicando)?.nombre}</strong>.{" "}
                  <button type="button" className="enlace" onClick={() => setUbicando(null)}>
                    Cancelar
                  </button>
                </p>
              )}
              {(Object.keys(GRUPOS_PUNTO) as (keyof typeof GRUPOS_PUNTO)[]).map((g) => {
                const lista = puntos.filter((p) => p.grupo === g);
                if (!lista.length) return null;
                return (
                  <section key={g}>
                    <h2 className="lugares__grupo">{GRUPOS_PUNTO[g]}</h2>
                    <ul className="lugares__items">
                      {lista.map((p) => (
                        <li key={p.id} className={ubicando === p.id ? "lugares__sel" : ""}>
                          <span className={`mapa-poi mapa-poi--${p.tipo}`} aria-hidden="true">
                            {p.corto ?? "•"}
                          </span>
                          <span className="lugares__texto">
                            <strong>{p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre}</strong>
                            <span className="pequeno texto-3">{p.direccion}</span>
                            {!p.ubicacion ? <span className="lugares__falta">Sin ubicar</span> : p.estimado ? <span className="lugares__calc">Ubicación calculada por la esquina: confírmala</span> : null}
                          </span>
                          <span className="lugares__botones">
                            {p.ubicacion && <Boton variante="fantasma" icono="pin" soloIcono aria-label={`Ver ${p.nombre} en el mapa`} onClick={() => setEnfoque({ ...p.ubicacion! })} />}
                            {p.estimado && (
                              <Boton
                                onClick={() => {
                                  ubicarPunto(p.id, p.ubicacion);
                                  avisar(`${p.codigo ?? p.nombre}: ubicación confirmada`);
                                }}
                              >
                                Confirmar
                              </Boton>
                            )}
                            <Boton
                              variante={p.ubicacion ? "fantasma" : "primario"}
                              onClick={() => {
                                setUbicando(p.id);
                                if (p.ubicacion) setEnfoque({ ...p.ubicacion });
                              }}
                            >
                              {p.ubicacion ? "Mover" : "Ubicar"}
                            </Boton>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <section className={`ui-tarjeta lugares__mapa ${editandoMapa ? "lugares__mapa--editando" : ""}`} aria-label="Mapa">
          <Mapa
            onClicMapa={editandoMapa ? clicMapa : undefined}
            marcador={borrador?.ubicacion ?? null}
            onMoverMarcador={(p) => borrador && setBorrador({ ...borrador, ubicacion: p })}
            enfocar={enfoque}
            etiquetas={{ barrios: true }}
            puntosInteres={puntos}
            puntosFijos={fijos.filter((p) => p.id !== borrador?.id)}
            resaltado={ubicando}
            capas={{ procedimientos: false, moviles: false, recorridos: false }}
          />
          {editandoMapa && <span className="lugares__guia">Haz clic en el mapa para marcar el punto</span>}
        </section>
      </div>
    </MarcoCentral>
  );
}
