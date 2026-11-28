import { useState } from "react";
import { ESTADOS, hace, infoDeClave, obtenerClave, type Movil, type Procedimiento } from "@plataforma/datos";
import { IlustracionTodoEnOrden, Insignia, Segmentos, Semaforo, Vacio } from "@plataforma/ui";

/** Orden de la cola: semáforo, luego los no despachados, luego los más antiguos. */
export function ordenarCola(procs: Procedimiento[]): Procedimiento[] {
  return [...procs].sort((a, b) => {
    const pa = infoDeClave(a.claveNumero).orden;
    const pb = infoDeClave(b.claveNumero).orden;
    const sa = infoDeClave(a.claveNumero).semaforo === "rojo" ? 0 : pa;
    const sb = infoDeClave(b.claveNumero).semaforo === "rojo" ? 0 : pb;
    if (sa !== sb) return sa - sb;
    const da = a.estado === "recibido" ? 0 : 1;
    const db = b.estado === "recibido" ? 0 : 1;
    if (da !== db) return da - db;
    if (pa !== pb) return pa - pb;
    return a.creadoEn.localeCompare(b.creadoEn);
  });
}

type Filtro = "todos" | "sin_despachar" | "en_curso";

export function Cola({ procedimientos, moviles, seleccionId, onSeleccionar }: { procedimientos: Procedimiento[]; moviles: Movil[]; seleccionId: string | null; onSeleccionar: (id: string) => void }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const lista = procedimientos.filter((p) => (filtro === "todos" ? true : filtro === "sin_despachar" ? p.estado === "recibido" : p.estado !== "recibido"));
  const sinDespachar = procedimientos.filter((p) => p.estado === "recibido").length;

  return (
    <div className="cola">
      <header className="cola__cabeza">
        <h2 style={{ fontSize: 15 }}>Cola de procedimientos</h2>
        <Segmentos<Filtro>
          etiqueta="Filtrar cola"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { valor: "todos", texto: `Todos ${procedimientos.length}` },
            { valor: "sin_despachar", texto: `Sin despachar ${sinDespachar}` },
            { valor: "en_curso", texto: "En curso" },
          ]}
        />
      </header>
      <ul className="cola__lista" aria-label="Procedimientos activos">
        {lista.length === 0 && (
          <li>
            <Vacio icono="check" ilustracion={<IlustracionTodoEnOrden className="ilustracion-vacia" />} titulo={filtro === "sin_despachar" ? "Todo despachado" : "Sin procedimientos activos"}>
              Los nuevos procedimientos aparecen aquí al instante.
            </Vacio>
          </li>
        )}
        {lista.map((p) => {
          const info = infoDeClave(p.claveNumero);
          const movil = moviles.find((m) => m.id === p.movilId);
          const esperando = p.estado === "recibido";
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={p.id === seleccionId}
                className={`tarjeta-proc tarjeta-proc--${info.semaforo} ${p.id === seleccionId ? "tarjeta-proc--sel" : ""} ${esperando && info.semaforo === "rojo" ? "tarjeta-proc--urgente" : ""}`}
                onClick={() => onSeleccionar(p.id)}
              >
                <span className="tarjeta-proc__fila">
                  <Semaforo claveNumero={p.claveNumero} />
                  <span className="tarjeta-proc__tiempo num">{hace(p.creadoEn)}</span>
                </span>
                <strong className="tarjeta-proc__clave">
                  {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
                </strong>
                <span className="tarjeta-proc__dir">{p.direccion}</span>
                <span className="tarjeta-proc__fila">
                  <Insignia tono={esperando ? "peligro" : "info"} punto>
                    {ESTADOS[p.estado].etiqueta}
                  </Insignia>
                  {p.origen === "terreno" && <Insignia tono="alerta">Iniciado en terreno</Insignia>}
                  <span className="pequeno texto-3">{movil ? movil.nombre : `${p.folio}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
