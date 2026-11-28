import { useState } from "react";
import { fechaHora, hora, normalizar, obtenerClave, obtenerCliente, TIPOS_REPORTE, useDatos, type Reporte, type TipoReporte, textoReporte } from "@plataforma/datos";
import { Insignia, Segmentos, useUsuario, Vacio, VistaAdjuntos, TextoParaCompartir } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

type Filtro = "todos" | "sin_leer";

/** Bandeja de reportes que envían los patrulleros, con sus fotos, videos y lo añadido después. */
export function Reportes() {
  const { reportes, procedimientos } = useDatos();
  const usuario = useUsuario();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoReporte | "">("");
  const [texto, setTexto] = useState("");
  const [limite, setLimite] = useState(100);
  const q = normalizar(texto.trim());
  const filtrados = reportes.filter(
    (r) =>
      (filtro === "todos" || !r.leidoPorCentral) &&
      (!tipo || r.tipo === tipo) &&
      (!q || normalizar(`${r.folio} ${r.direccion} ${r.halcon} ${r.unidad} ${r.patrullero} ${r.observaciones} ${r.barrio ?? ""}`).includes(q)),
  );
  const lista = filtrados.slice(0, limite);
  const hoy = new Date().toDateString();
  const cuando = (iso: string) => (new Date(iso).toDateString() === hoy ? hora(iso) : fechaHora(iso));
  const sel = reportes.find((r) => r.id === abierto) ?? null;
  const sinLeer = reportes.filter((r) => !r.leidoPorCentral).length;

  function abrir(r: Reporte) {
    setAbierto(r.id);
    if (!r.leidoPorCentral) obtenerCliente().marcarReporteLeido(r.id, usuario);
  }

  return (
    <MarcoCentral titulo="Reportes de terreno" subtitulo={`${reportes.length} reportes · ${sinLeer} sin leer`}>
      <div className="pagina reportes">
        <div className="reportes__lista ui-tarjeta">
          <div className="reportes__cabeza">
            <Segmentos<Filtro>
              etiqueta="Filtrar"
              valor={filtro}
              onCambio={setFiltro}
              opciones={[
                { valor: "todos", texto: `Todos ${reportes.length}` },
                { valor: "sin_leer", texto: `Sin leer ${sinLeer}` },
              ]}
            />
            <div className="reportes__filtros">
              <input className="ui-entrada" type="search" placeholder="Buscar halcón, dirección, folio…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar reportes" />
              <select className="ui-entrada" value={tipo} onChange={(e) => setTipo(e.target.value as TipoReporte | "")} aria-label="Tipo de reporte">
                <option value="">Todos los tipos</option>
                {(Object.keys(TIPOS_REPORTE) as TipoReporte[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPOS_REPORTE[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {lista.length === 0 ? (
            <Vacio icono="documento" titulo="Sin reportes">
              Los reportes que envían los patrulleros desde su app aparecen aquí al instante.
            </Vacio>
          ) : (
            <ul>
              {lista.map((r) => (
                <li key={r.id}>
                  <button type="button" className={`reporte-fila ${r.id === abierto ? "reporte-fila--sel" : ""} ${r.leidoPorCentral ? "" : "reporte-fila--nuevo"}`} onClick={() => abrir(r)}>
                    <span className="reporte-fila__arriba">
                      <strong>{TIPOS_REPORTE[r.tipo]}</strong>
                      <span className="pequeno texto-3 num">{cuando(r.creadoEn)}</span>
                    </span>
                    <span className="pequeno">
                      {r.halcon ? `Halcón ${r.halcon} · ` : ""}
                      {r.unidad} · {r.patrullero}
                    </span>
                    <span className="pequeno texto-3">{r.direccion || "Sin dirección"}</span>
                    <span className="reporte-fila__chips">
                      {!r.leidoPorCentral && <Insignia tono="info">Nuevo</Insignia>}
                      {r.adjuntos.length + r.complementos.reduce((s, c) => s + c.adjuntos.length, 0) > 0 && (
                        <Insignia>{r.adjuntos.length + r.complementos.reduce((s, c) => s + c.adjuntos.length, 0)} adjuntos</Insignia>
                      )}
                      {r.complementos.length > 0 && <Insignia>+{r.complementos.length} añadidos</Insignia>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {filtrados.length > lista.length && (
            <button type="button" className="ui-boton ui-boton--fantasma reportes__mas" onClick={() => setLimite((l) => l + 100)}>
              Mostrar más ({filtrados.length - lista.length} restantes)
            </button>
          )}
        </div>
        <div className="reportes__detalle ui-tarjeta">
          {!sel ? (
            <Vacio icono="documento" titulo="Elige un reporte para verlo" />
          ) : (
            <article className="reporte">
              <header>
                <span className="pequeno texto-3 num">{sel.folio}</span>
                <h2>{TIPOS_REPORTE[sel.tipo]}</h2>
              </header>
              <dl className="reporte__datos">
                <div>
                  <dt>Hora</dt>
                  <dd className="num">{fechaHora(sel.creadoEn)}</dd>
                </div>
                <div>
                  <dt>N.º de halcón</dt>
                  <dd>{sel.halcon || "—"}</dd>
                </div>
                <div>
                  <dt>Unidad</dt>
                  <dd>{sel.unidad}</dd>
                </div>
                <div>
                  <dt>Patrullero</dt>
                  <dd>{sel.patrullero}</dd>
                </div>
                <div>
                  <dt>Barrio</dt>
                  <dd>{sel.barrio ?? "—"}</dd>
                </div>
                <div>
                  <dt>Unidad vecinal</dt>
                  <dd>{sel.unidadVecinal ? `UV ${String(sel.unidadVecinal).padStart(2, "0")}` : "—"}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{sel.direccion || "—"}</dd>
                </div>
              </dl>
              {sel.procedimientoId && (() => {
                const p = procedimientos.find((x) => x.id === sel.procedimientoId);
                return p ? (
                  <p className="reporte__proc">
                    Procedimiento: <strong>{p.folio}</strong> · {p.claveNumero} {obtenerClave(p.claveNumero)?.nombre}
                  </p>
                ) : null;
              })()}
              <section>
                <h3>Observaciones</h3>
                <p>{sel.observaciones || <span className="texto-3">Sin observaciones</span>}</p>
                {sel.adjuntos.length > 0 && <VistaAdjuntos adjuntos={sel.adjuntos} />}
              </section>
              <TextoParaCompartir titulo="Texto con el formato del equipo" texto={textoReporte(sel)} />
              {sel.complementos.map((c, i) => (
                <section key={i} className="reporte__complemento">
                  <h3>Añadido a las {hora(c.en)}</h3>
                  {c.texto && <p>{c.texto}</p>}
                  {c.adjuntos.length > 0 && <VistaAdjuntos adjuntos={c.adjuntos} />}
                </section>
              ))}
            </article>
          )}
        </div>
      </div>
    </MarcoCentral>
  );
}
