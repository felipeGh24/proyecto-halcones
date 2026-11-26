import { useMemo, useState } from "react";
import { ESTADOS, duracion, esActivo, unidadesActivas, fechaHora, infoDeClave, normalizar, obtenerClave, tiemposDe, useDatos, type Semaforo as TipoSemaforo } from "@plataforma/datos";
import { Insignia, Modal, Segmentos, Semaforo, Vacio } from "@plataforma/ui";
import { Detalle } from "./Detalle";
import { MarcoCentral } from "./MarcoCentral";

type Vista = "activos" | "hoy" | "todos";

export function ListaProcedimientos() {
  const { procedimientos, moviles } = useDatos();
  const [vista, setVista] = useState<Vista>("activos");
  const [semaforo, setSemaforo] = useState<TipoSemaforo | "todos">("todos");
  const [texto, setTexto] = useState("");
  const [limite, setLimite] = useState(100);
  const [abierto, setAbierto] = useState<string | null>(null);
  const sel = procedimientos.find((p) => p.id === abierto);

  const lista = useMemo(() => {
    const desdeHoy = Date.now() - 24 * 3600 * 1000;
    const q = normalizar(texto.trim());
    return procedimientos
      .filter((p) => (vista === "activos" ? esActivo(p.estado) : vista === "hoy" ? new Date(p.creadoEn).getTime() >= desdeHoy : true))
      .filter((p) => semaforo === "todos" || infoDeClave(p.claveNumero).semaforo === semaforo)
      .filter((p) => !q || normalizar(`${p.folio} ${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre} ${p.direccion} ${p.barrio ?? ""}`).includes(q))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }, [procedimientos, vista, semaforo, texto]);

  return (
    <MarcoCentral titulo="Procedimientos" subtitulo={`${lista.length} resultados`}>
      <div className="pagina">
        <div className="barra-filtros">
          <Segmentos<Vista>
            etiqueta="Periodo"
            valor={vista}
            onCambio={(v) => {
              setVista(v);
              setLimite(100);
            }}
            opciones={[
              { valor: "activos", texto: "Activos" },
              { valor: "hoy", texto: "Últimas 24 h" },
              { valor: "todos", texto: "Todos" },
            ]}
          />
          <Segmentos<TipoSemaforo | "todos">
            etiqueta="Semáforo"
            valor={semaforo}
            onCambio={setSemaforo}
            opciones={[
              { valor: "todos", texto: "Todos" },
              { valor: "rojo", texto: "Rojo" },
              { valor: "amarillo", texto: "Amarillo" },
              { valor: "verde", texto: "Verde" },
            ]}
          />
          <input className="ui-entrada" style={{ maxWidth: 320 }} type="search" placeholder="Buscar folio, clave, dirección o barrio" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />
        </div>
        <div className="ui-tarjeta tabla-contenedor">
          {lista.length === 0 ? (
            <Vacio icono="buscar" titulo="Sin resultados">
              Prueba con otro filtro o texto.
            </Vacio>
          ) : (
            <table className="ui-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Recibido</th>
                  <th>Clave</th>
                  <th>Semáforo</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Móvil</th>
                  <th className="derecha">Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, limite).map((p) => {
                  const t = tiemposDe(p);
                  return (
                    <tr
                      key={p.id}
                      className={`fila-clic ${p.id === abierto ? "seleccionada" : ""}`}
                      tabIndex={0}
                      onClick={() => setAbierto(p.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setAbierto(p.id))}
                      aria-label={`Abrir ${p.folio}`}
                    >
                      <td className="num">{p.folio}</td>
                      <td className="num">{fechaHora(p.creadoEn)}</td>
                      <td>
                        {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
                      </td>
                      <td>
                        <Semaforo claveNumero={p.claveNumero} />
                      </td>
                      <td>
                        <div>{p.unidadVecinal ? `UV ${String(p.unidadVecinal).padStart(2, "0")}` : "—"}</div>
                        <div className="pequeno texto-3">{p.barrio}</div>
                      </td>
                      <td>
                        <Insignia tono={p.estado === "recibido" ? "peligro" : esActivo(p.estado) ? "info" : "neutro"}>{ESTADOS[p.estado].etiqueta}</Insignia>
                      </td>
                      <td>
                        {(() => {
                          const us = unidadesActivas(p);
                          const principal = moviles.find((m) => m.id === p.movilId)?.nombre ?? us[0]?.nombre;
                          return principal ? `${principal}${us.length > 1 ? ` +${us.length - 1}` : ""}` : "—";
                        })()}
                      </td>
                      <td className="derecha num">
                        {duracion(t.respuesta)}
                        {t.dentroDeMeta === false && <span className="texto-3"> · fuera de meta</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {sel && (
            <Modal ancho titulo={`${sel.folio} · ${sel.claveNumero} ${obtenerClave(sel.claveNumero)?.nombre ?? ""}`} onCerrar={() => setAbierto(null)}>
              <Detalle procedimiento={sel} moviles={moviles} procedimientos={procedimientos} />
            </Modal>
          )}
          {lista.length > limite && (
            <div style={{ padding: 16, textAlign: "center" }}>
              <button className="ui-boton ui-boton--secundario" type="button" onClick={() => setLimite((l) => l + 200)}>
                Mostrar más ({lista.length - limite} restantes)
              </button>
            </div>
          )}
        </div>
      </div>
    </MarcoCentral>
  );
}
