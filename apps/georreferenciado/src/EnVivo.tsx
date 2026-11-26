import { useMemo, useState } from "react";
import { esActivo, normalizar, obtenerClave, useDatos, type Punto } from "@plataforma/datos";
import { CAPAS_INICIALES, LeyendaMapa, Mapa, type Capas, type Seleccion } from "@plataforma/mapa";
import { Icono, Insignia, Semaforo } from "@plataforma/ui";
import { MarcoGeo } from "./MarcoGeo";
import { PanelDetalle } from "./PanelDetalle";

const NOMBRES_CAPAS: { clave: keyof Capas; texto: string }[] = [
  { clave: "procedimientos", texto: "Procedimientos activos" },
  { clave: "moviles", texto: "Móviles" },
  { clave: "recorridos", texto: "Recorridos al destino" },
  { clave: "unidadesVecinales", texto: "Unidades vecinales" },
  { clave: "calor", texto: "Mapa de calor (últimos 30 días)" },
];

export function EnVivo() {
  const { procedimientos, moviles } = useDatos();
  const [capas, setCapas] = useState<Capas>(CAPAS_INICIALES);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [texto, setTexto] = useState("");
  const [enfoque, setEnfoque] = useState<Punto | null>(null);

  const activos = useMemo(() => procedimientos.filter((p) => esActivo(p.estado)), [procedimientos]);
  const calor = useMemo(() => {
    if (!capas.calor) return [];
    const desde = Date.now() - 30 * 86400000;
    return procedimientos.filter((p) => new Date(p.creadoEn).getTime() >= desde);
  }, [procedimientos, capas.calor]);

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim());
    if (q.length < 2) return [];
    const procs = activos
      .filter((p) => normalizar(`${p.folio} ${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre} ${p.direccion}`).includes(q))
      .map((p) => ({ tipo: "procedimiento" as const, id: p.id, titulo: `${p.claveNumero} · ${obtenerClave(p.claveNumero)?.nombre}`, sub: p.direccion, punto: p.ubicacion, clave: p.claveNumero }));
    const movs = moviles
      .filter((m) => normalizar(m.nombre).includes(q))
      .map((m) => ({ tipo: "movil" as const, id: m.id, titulo: m.nombre, sub: m.tipo, punto: m.posicion, clave: null }));
    return [...procs, ...movs].slice(0, 6);
  }, [texto, activos, moviles]);

  return (
    <MarcoGeo titulo="Mapa en vivo" subtitulo={`${activos.length} procedimientos activos · ${moviles.filter((m) => m.estado === "disponible").length} móviles disponibles`}>
      <div className="geo">
        <aside className="geo__panel ui-tarjeta">
          <div className="geo__buscar">
            <Icono nombre="buscar" />
            <input className="ui-entrada" type="search" placeholder="Folio, clave, dirección o móvil" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar en el mapa" />
          </div>
          {resultados.length > 0 && (
            <ul className="geo__resultados">
              {resultados.map((r) => (
                <li key={`${r.tipo}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSeleccion({ tipo: r.tipo, id: r.id });
                      setEnfoque({ ...r.punto });
                      setTexto("");
                    }}
                  >
                    <strong>{r.titulo}</strong>
                    <span className="pequeno texto-3">{r.sub}</span>
                    {r.clave != null ? <Semaforo claveNumero={r.clave} /> : <Insignia>Móvil</Insignia>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <fieldset className="geo__capas">
            <legend>Capas</legend>
            {NOMBRES_CAPAS.map((c) => (
              <label key={c.clave} className="interruptor">
                <input type="checkbox" checked={capas[c.clave]} onChange={(e) => setCapas((x) => ({ ...x, [c.clave]: e.target.checked }))} />
                <span>{c.texto}</span>
              </label>
            ))}
          </fieldset>
          <LeyendaMapa />
        </aside>

        <section className="geo__mapa ui-tarjeta" aria-label="Mapa">
          <Mapa procedimientos={procedimientos} moviles={moviles} calor={calor} capas={capas} seleccion={seleccion} onSeleccionar={setSeleccion} enfocar={enfoque} />
        </section>

        {seleccion && (
          <aside className="geo__detalle ui-tarjeta">
            <PanelDetalle seleccion={seleccion} onCerrar={() => setSeleccion(null)} onSeleccionar={setSeleccion} />
          </aside>
        )}
      </div>
    </MarcoGeo>
  );
}
