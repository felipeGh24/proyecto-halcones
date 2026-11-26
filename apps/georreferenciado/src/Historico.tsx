import { useMemo, useState } from "react";
import { filtrar, numero, ranking, useDatos, type Semaforo as TipoSemaforo } from "@plataforma/datos";
import { Mapa } from "@plataforma/mapa";
import { Segmentos } from "@plataforma/ui";
import { MarcoGeo } from "./MarcoGeo";

type Periodo = "7" | "30" | "90";

/** Dónde se concentran los procedimientos: mapa de calor y ranking por unidad vecinal. */
export function Historico() {
  const { procedimientos } = useDatos();
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [semaforo, setSemaforo] = useState<TipoSemaforo | "todos">("todos");
  const lista = useMemo(() => {
    const hasta = Date.now();
    return filtrar(procedimientos, { desde: hasta - Number(periodo) * 86400000, hasta: hasta + 1, semaforo });
  }, [procedimientos, periodo, semaforo]);
  const top = useMemo(() => ranking(lista, (p) => p.unidadVecinal, 10), [lista]);
  const max = top[0]?.n ?? 1;
  const barrioDe = (uv: number) => lista.find((p) => p.unidadVecinal === uv)?.barrio ?? "";

  return (
    <MarcoGeo titulo="Histórico y calor" subtitulo={`${numero(lista.length)} procedimientos en el periodo`}>
      <div className="geo geo--historico">
        <aside className="geo__panel ui-tarjeta">
          <div className="grupo">
            <span className="ui-campo__etiqueta">Periodo</span>
            <Segmentos<Periodo> etiqueta="Periodo" valor={periodo} onCambio={setPeriodo} opciones={[{ valor: "7", texto: "7 días" }, { valor: "30", texto: "30 días" }, { valor: "90", texto: "90 días" }]} />
          </div>
          <div className="grupo">
            <span className="ui-campo__etiqueta">Semáforo</span>
            <Segmentos<TipoSemaforo | "todos">
              etiqueta="Semáforo"
              valor={semaforo}
              onCambio={setSemaforo}
              opciones={[{ valor: "todos", texto: "Todos" }, { valor: "rojo", texto: "Rojo" }, { valor: "amarillo", texto: "Amarillo" }, { valor: "verde", texto: "Verde" }]}
            />
          </div>
          <div className="grupo">
            <span className="ui-campo__etiqueta">Unidades vecinales con más procedimientos</span>
            <ol className="ranking">
              {top.map((r) => (
                <li key={r.clave}>
                  <span className="ranking__nombre">
                    UV {String(r.clave).padStart(2, "0")} <span className="texto-3 pequeno">{barrioDe(r.clave)}</span>
                  </span>
                  <span className="ranking__barra" aria-hidden>
                    <i style={{ width: `${(r.n / max) * 100}%` }} />
                  </span>
                  <span className="num">{r.n}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <section className="geo__mapa ui-tarjeta">
          <Mapa calor={lista} capas={{ calor: true, procedimientos: false, moviles: false, recorridos: false }} />
        </section>
      </div>
    </MarcoGeo>
  );
}
