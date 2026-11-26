import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { filtrar, TURNOS, UNIDADES_VECINALES, useDatos, type Filtros, type Procedimiento, type Semaforo, type Turno } from "@plataforma/datos";
import { Segmentos } from "@plataforma/ui";

export type Periodo = 7 | 30 | 90;

interface Estado {
  periodo: Periodo;
  semaforo: Semaforo | "todos";
  turno: Turno | "todos";
  uv: number | "todas";
}

interface Ctx {
  estado: Estado;
  cambiar: (c: Partial<Estado>) => void;
  filtros: Filtros;
  actual: Procedimiento[];
  anterior: Procedimiento[];
}

const Contexto = createContext<Ctx | null>(null);

/** Los filtros son comunes a todas las pantallas de Análisis y afectan a todos los gráficos a la vez. */
export function ProveedorFiltros({ children }: { children: ReactNode }) {
  const { procedimientos } = useDatos();
  const [estado, setEstado] = useState<Estado>({ periodo: 30, semaforo: "todos", turno: "todos", uv: "todas" });
  const valor = useMemo(() => {
    const hasta = Date.now() + 1;
    const largo = estado.periodo * 86400000;
    const base = { semaforo: estado.semaforo, turno: estado.turno, unidadVecinal: estado.uv };
    const filtros: Filtros = { desde: hasta - largo, hasta, ...base };
    return {
      estado,
      cambiar: (c: Partial<Estado>) => setEstado((e) => ({ ...e, ...c })),
      filtros,
      actual: filtrar(procedimientos, filtros),
      anterior: filtrar(procedimientos, { desde: hasta - 2 * largo, hasta: hasta - largo, ...base }),
    };
  }, [procedimientos, estado]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useFiltros() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useFiltros fuera de ProveedorFiltros");
  return c;
}

export function BarraFiltros() {
  const { estado, cambiar } = useFiltros();
  return (
    <div className="filtros ui-tarjeta no-imprimir" role="search" aria-label="Filtros del análisis">
      <div className="filtros__grupo">
        <span className="ui-campo__etiqueta">Periodo</span>
        <Segmentos<string>
          etiqueta="Periodo"
          valor={String(estado.periodo)}
          onCambio={(v) => cambiar({ periodo: Number(v) as Periodo })}
          opciones={[
            { valor: "7", texto: "7 días" },
            { valor: "30", texto: "30 días" },
            { valor: "90", texto: "90 días" },
          ]}
        />
      </div>
      <div className="filtros__grupo">
        <span className="ui-campo__etiqueta">Semáforo</span>
        <Segmentos<Semaforo | "todos">
          etiqueta="Semáforo"
          valor={estado.semaforo}
          onCambio={(v) => cambiar({ semaforo: v })}
          opciones={[
            { valor: "todos", texto: "Todos" },
            { valor: "rojo", texto: "Rojo" },
            { valor: "amarillo", texto: "Amarillo" },
            { valor: "verde", texto: "Verde" },
          ]}
        />
      </div>
      <div className="filtros__grupo">
        <span className="ui-campo__etiqueta">Turno</span>
        <Segmentos<Turno | "todos">
          etiqueta="Turno"
          valor={estado.turno}
          onCambio={(v) => cambiar({ turno: v })}
          opciones={[{ valor: "todos", texto: "Todos" }, ...(Object.keys(TURNOS) as Turno[]).map((t) => ({ valor: t, texto: TURNOS[t].etiqueta }))]}
        />
      </div>
      <label className="filtros__grupo">
        <span className="ui-campo__etiqueta">Unidad vecinal</span>
        <select className="ui-entrada" value={String(estado.uv)} onChange={(e) => cambiar({ uv: e.target.value === "todas" ? "todas" : Number(e.target.value) })}>
          <option value="todas">Todas</option>
          {UNIDADES_VECINALES.features.map((f) => (
            <option key={f.properties.uv} value={f.properties.uv}>
              {f.properties.nombre} · {f.properties.barrio}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
