import { useMemo, useState } from "react";
import {
  analizarPatrones,
  NIVELES,
  numero,
  obtenerClave,
  porcentaje,
  textoDias,
  textoFranja,
  TIPOS_RECOMENDACION,
  TURNOS,
  useDatos,
  type Punto,
  type Recomendacion,
} from "@plataforma/datos";
import { EscalaCoropleta, Mapa, type MarcaMapa } from "@plataforma/mapa";
import { Icono, Insignia, Segmentos, Tarjeta } from "@plataforma/ui";
import { BarrasIndice, Sparkline } from "./graficos";
import { MarcoAnalisis } from "./MarcoAnalisis";

const TONO: Record<Recomendacion["tipo"], "ok" | "info" | "alerta" | "neutro"> = {
  punto_fijo: "ok",
  patrullaje: "info",
  alza: "alerta",
  respuesta: "neutro",
};

type Vista = "indice" | "alza";

/** Patrones e inteligencia heurística: dónde hace falta patrullaje, punto fijo o refuerzo, y por qué. */
export function Patrones() {
  const { procedimientos } = useDatos();
  const a = useMemo(() => analizarPatrones(procedimientos), [procedimientos]);
  const [enfoque, setEnfoque] = useState<Punto | null>(null);
  const [abierta, setAbierta] = useState<string | null>(a.recomendaciones[0]?.id ?? null);
  const [vista, setVista] = useState<Vista>("indice");

  const coropleta = useMemo(() => {
    const out: Record<number, number> = {};
    if (vista === "indice") {
      const max = Math.max(...a.uvs.map((u) => u.indice), 1);
      a.uvs.forEach((u) => (out[Number(u.clave)] = u.indice / max));
    } else {
      a.uvs.forEach((u) => (out[Number(u.clave)] = Math.max(0, Math.min(1, u.z / 4))));
    }
    return out;
  }, [a, vista]);

  const marcas: MarcaMapa[] = a.recomendaciones
    .filter((r) => r.punto)
    .map((r) => ({ id: r.id, punto: r.punto!, tipo: r.tipo, texto: r.tipo === "punto_fijo" ? "Punto fijo" : "Patrullaje", titulo: r.titulo }));

  return (
    <MarcoAnalisis titulo="Patrones e inteligencia" subtitulo={`Motor heurístico · ${numero(a.analizados)} procedimientos de las últimas ${a.ventanaDias / 7} semanas`}>
      <div className="analisis">
        <div className="ui-tarjeta motor">
          <span className="motor__icono">
            <Icono nombre="grafico" tamano={22} />
          </span>
          <div>
            <h2 style={{ fontSize: 16 }}>Qué está aprendiendo el sistema</h2>
            <p className="texto-2 pequeno">
              Se recalcula con cada procedimiento nuevo. Usa reglas estadísticas explicables: concentración y gravedad por zona, repetición semana a semana, franja horaria y alzas frente a lo habitual. Cada recomendación trae su evidencia y su
              confianza según la cantidad de casos. Orienta la decisión; no la reemplaza.
            </p>
          </div>
          <div className="motor__cifras">
            <div>
              <strong className="num">{a.recomendaciones.length}</strong>
              <span>recomendaciones</span>
            </div>
            <div>
              <strong className="num">{a.focos.length}</strong>
              <span>focos detectados</span>
            </div>
            <div>
              <strong className="num">{a.uvs.filter((u) => u.nivel === "muy_alto" || u.nivel === "alto").length}</strong>
              <span>UV con conflicto alto</span>
            </div>
          </div>
        </div>

        <div className="patrones">
          <section className="patrones__lista" aria-label="Recomendaciones">
            {a.recomendaciones.map((r) => {
              const abiertaR = abierta === r.id;
              return (
                <article key={r.id} className={`ui-tarjeta rec ${abiertaR ? "rec--abierta" : ""}`}>
                  <button type="button" className="rec__cabeza" aria-expanded={abiertaR} onClick={() => setAbierta(abiertaR ? null : r.id)}>
                    <span className="rec__chips">
                      <Insignia tono={TONO[r.tipo]} punto>
                        {TIPOS_RECOMENDACION[r.tipo].etiqueta}
                      </Insignia>
                      {r.prioridad === 1 && <Insignia tono="peligro">Prioridad alta</Insignia>}
                      <span className="pequeno texto-3">Confianza {r.confianza}</span>
                    </span>
                    <strong>{r.titulo}</strong>
                    <span className="pequeno texto-2">{r.resumen}</span>
                  </button>
                  {abiertaR && (
                    <div className="rec__cuerpo">
                      <ul>
                        {r.evidencia.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                      {r.punto && (
                        <button type="button" className="ui-boton ui-boton--secundario" onClick={() => setEnfoque({ ...r.punto! })}>
                          <Icono nombre="pin" /> Ver en el mapa
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="ui-tarjeta patrones__mapa">
            <div className="patrones__barra">
              <Segmentos<Vista>
                etiqueta="Qué pintar"
                valor={vista}
                onCambio={setVista}
                opciones={[
                  { valor: "indice", texto: "Índice de conflicto" },
                  { valor: "alza", texto: "Alza en 14 días" },
                ]}
              />
            </div>
            <div className="patrones__lienzo">
              <Mapa coropleta={coropleta} etiquetas={{ barrios: true }} marcas={marcas} onMarca={(id) => setAbierta(id)} enfocar={enfoque} capas={{ procedimientos: false, moviles: false, recorridos: false }} />
            </div>
            <div className="patrones__escala">
              <EscalaCoropleta titulo={vista === "indice" ? "Índice de conflicto por UV" : "Fuerza del alza reciente por UV"} min={vista === "indice" ? "menor" : "sin alza"} max={vista === "indice" ? "mayor" : "alza fuerte"} />
            </div>
          </section>
        </div>

        <div className="analisis__grilla">
          <Tarjeta titulo="Conflicto por barrio" subtitulo="Índice ponderado por gravedad y dividido por la cantidad de unidades vecinales de cada barrio">
            <BarrasIndice filas={a.barrios.map((b) => ({ etiqueta: b.nombre.replace(/^Barrio /, ""), indice: b.indice, detalle: `· ${NIVELES[b.nivel].etiqueta.toLowerCase()}` }))} />
          </Tarjeta>
          <Tarjeta titulo="Franja y turno más críticos por barrio" subtitulo="Dónde y cuándo concentrar la presencia">
            <table className="ui-tabla">
              <thead>
                <tr>
                  <th>Barrio</th>
                  <th>Franja</th>
                  <th>Turno</th>
                  <th>Días</th>
                  <th className="derecha">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {a.barrios.map((b) => (
                  <tr key={b.clave}>
                    <td>{b.nombre.replace(/^Barrio /, "")}</td>
                    <td className="num">{textoFranja(b.franja)}</td>
                    <td>{TURNOS[b.turno].etiqueta}</td>
                    <td className="pequeno">{textoDias(b.diasTop)}</td>
                    <td className="derecha">
                      <Sparkline valores={b.semanal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>

          <Tarjeta titulo="Unidades vecinales con más conflicto" subtitulo="Las 15 primeras de 48, de mayor a menor índice" className="ancho-2" sinRelleno>
            <div className="tabla-uv">
              <table className="ui-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Unidad vecinal</th>
                    <th>Nivel</th>
                    <th className="derecha">Índice</th>
                    <th className="derecha">Proced.</th>
                    <th className="derecha">En rojo</th>
                    <th>Últimas 12 semanas</th>
                    <th className="derecha">14 días</th>
                    <th>Franja crítica</th>
                    <th>Lo más frecuente</th>
                    <th className="derecha">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {a.uvs.slice(0, 15).map((u, i) => (
                    <tr key={u.clave}>
                      <td className="num texto-3">{i + 1}</td>
                      <td>
                        <strong>{u.nombre}</strong>
                        <div className="pequeno texto-3">{u.barrio}</div>
                      </td>
                      <td>
                        <Insignia tono={u.nivel === "muy_alto" ? "peligro" : u.nivel === "alto" ? "alerta" : "neutro"}>{NIVELES[u.nivel].etiqueta}</Insignia>
                      </td>
                      <td className="derecha num">
                        <strong>{u.indice.toFixed(2).replace(".", ",")}</strong>
                      </td>
                      <td className="derecha num">{u.n}</td>
                      <td className="derecha num">{u.rojos}</td>
                      <td>
                        <Sparkline valores={u.semanal} />
                      </td>
                      <td className={`derecha num ${u.z >= 2 ? "alza" : ""}`}>
                        {u.esperado > 0 ? `${u.variacion >= 0 ? "+" : "−"}${Math.abs(Math.round(u.variacion * 100))} %` : "—"}
                      </td>
                      <td className="num">{textoFranja(u.franja)}</td>
                      <td className="pequeno">{u.claves.map((c) => obtenerClave(c.numero)?.nombre).join(", ")}</td>
                      <td className="derecha num">{u.cumplimiento == null ? "—" : porcentaje(u.cumplimiento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </div>
      </div>
    </MarcoAnalisis>
  );
}
