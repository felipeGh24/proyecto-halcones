import { useState } from "react";
import { centroideUV, leerPuntosInteres, obtenerCliente, UNIDADES_VECINALES, useDatos, type Modalidad } from "@plataforma/datos";
import { avisar, Boton, Campo, Insignia, Segmentos, SelectorAdjuntos, useUsuario } from "@plataforma/ui";
import type { Adjunto } from "@plataforma/datos";

export const ITEMS_CHECKLIST = ["Luces y baliza", "Sirena", "Radio", "Neumáticos", "Botiquín", "Extintor", "Carrocería", "Documentos del móvil"];

/**
 * Inicio de turno del patrullero.
 * - En móvil: elige el móvil en que sale, su nombre, acompañante y checklist. El móvil queda «Libre» para despacho.
 * - En punto fijo: elige el recinto (por ejemplo un GAMA) o una unidad vecinal.
 * - A pie: elige el sector (unidad vecinal).
 */
export function InicioTurno() {
  const usuario = useUsuario();
  const { moviles } = useDatos();
  const [recintos] = useState(() => leerPuntosInteres().filter((p) => p.ubicacion));
  const [modalidad, setModalidad] = useState<Modalidad>("movil");
  const [movilId, setMovilId] = useState("");
  const [nombre, setNombre] = useState(usuario.nombre);
  const [acompanante, setAcompanante] = useState("");
  const [km, setKm] = useState("");
  const [combustible, setCombustible] = useState("3/4");
  const [checklist, setChecklist] = useState<Record<string, "ok" | "observacion">>(() => Object.fromEntries(ITEMS_CHECKLIST.map((i) => [i, "ok"])));
  const [lugar, setLugar] = useState("");
  const [halcon, setHalcon] = useState("");
  const [detalle, setDetalle] = useState<Record<string, { descripcion: string; adjuntos: Adjunto[] }>>({});
  const [generales, setGenerales] = useState<Adjunto[]>([]);
  const [error, setError] = useState("");
  const conMovil = modalidad === "movil";
  const listo = nombre.trim().length >= 3 && (conMovil ? movilId && /^\d+$/.test(km) : !!lugar);
  const ordenados = [...moviles].sort((a, b) => Number(!!a.turno) - Number(!!b.turno) || a.nombre.localeCompare(b.nombre));

  function iniciar() {
    setError("");
    try {
      if (conMovil) {
        obtenerCliente().iniciarTurno(
          movilId,
          {
            patrullero: nombre.trim(),
            halcon: halcon.trim(),
            acompanante: acompanante.trim(),
            kmInicial: Number(km),
            combustible,
            observaciones: Object.entries(checklist).filter(([, v]) => v === "observacion").map(([k]) => k),
            checklistDetalle: Object.entries(checklist)
              .filter(([, v]) => v === "observacion")
              .map(([item]) => ({ item, descripcion: detalle[item]?.descripcion.trim() ?? "", adjuntos: detalle[item]?.adjuntos ?? [] })),
            adjuntosGenerales: generales,
          },
          usuario,
        );
      } else {
        const recinto = recintos.find((r) => r.id === lugar);
        const uv = lugar.startsWith("uv-") ? Number(lugar.slice(3)) : null;
        const ubicacion = recinto?.ubicacion ?? (uv ? centroideUV(uv) : null);
        if (!ubicacion) throw new Error("Elige un lugar válido.");
        obtenerCliente().iniciarTurnoPersonal(
          {
            patrullero: nombre.trim(),
            halcon: halcon.trim(),
            acompanante: acompanante.trim(),
            modalidad,
            lugar: recinto ? `${recinto.codigo ? `${recinto.codigo} · ` : ""}${recinto.nombre}` : `UV ${String(uv).padStart(2, "0")}`,
            puntoId: recinto?.id,
            ubicacion,
          },
          usuario,
        );
      }
      avisar("Turno iniciado: la Central ya te ve en servicio");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el turno");
    }
  }

  return (
    <div className="patrulla">
      <header className="patrulla__cabeza">
        <div>
          <strong>Inicio de turno</strong>
          <div className="pequeno texto-3">Halcones · app del patrullero</div>
        </div>
        <Insignia tono="demo">Demo</Insignia>
      </header>
      <main className="patrulla__cuerpo" style={{ display: "grid", gap: 16 }}>
        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            {error}
          </div>
        )}
        <Segmentos<Modalidad>
          etiqueta="Modalidad"
          valor={modalidad}
          onCambio={(m) => {
            setModalidad(m);
            setLugar("");
          }}
          opciones={[
            { valor: "movil", texto: "En móvil" },
            { valor: "punto_fijo", texto: "Punto fijo" },
            { valor: "a_pie", texto: "A pie" },
          ]}
        />
        {conMovil ? (
          <Campo etiqueta="Móvil en que sales" htmlFor="movil" ayuda="Los móviles que ya tienen un patrullero en turno no se pueden elegir.">
            <select id="movil" className="ui-entrada" value={movilId} onChange={(e) => setMovilId(e.target.value)}>
              <option value="">Elegir móvil…</option>
              {ordenados.map((m) => (
                <option key={m.id} value={m.id} disabled={!!m.turno || m.estado === "fuera_de_servicio"}>
                  {m.nombre}
                  {m.turno ? ` — en turno: ${m.turno.patrullero}` : m.estado === "fuera_de_servicio" ? " — fuera de servicio" : ""}
                </option>
              ))}
            </select>
          </Campo>
        ) : (
          <Campo etiqueta={modalidad === "punto_fijo" ? "Dónde está tu punto fijo" : "Sector que patrullas"} htmlFor="lugar">
            <select id="lugar" className="ui-entrada" value={lugar} onChange={(e) => setLugar(e.target.value)}>
              <option value="">Elegir…</option>
              {modalidad === "punto_fijo" && recintos.length > 0 && (
                <optgroup label="Recintos">
                  {recintos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo ? `${r.codigo} · ` : ""}
                      {r.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Unidades vecinales">
                {UNIDADES_VECINALES.features.map((f) => (
                  <option key={f.properties.uv} value={`uv-${f.properties.uv}`}>
                    {f.properties.nombre} · {f.properties.barrio}
                  </option>
                ))}
              </optgroup>
            </select>
          </Campo>
        )}
        <Campo etiqueta="Tu nombre" htmlFor="nombre" ayuda="Así te verá la Central.">
          <input id="nombre" className="ui-entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        </Campo>
        <Campo etiqueta="N.º de halcón (opcional)" htmlFor="halcon" ayuda="Aparece en tus reportes.">
          <input id="halcon" className="ui-entrada" inputMode="numeric" value={halcon} onChange={(e) => setHalcon(e.target.value.slice(0, 10))} placeholder="Ej.: 12" />
        </Campo>
        <Campo etiqueta="Acompañante (opcional)" htmlFor="acomp">
          <input id="acomp" className="ui-entrada" value={acompanante} onChange={(e) => setAcompanante(e.target.value)} />
        </Campo>
        {conMovil && (
          <>
            <div className="dos-columnas">
              <Campo etiqueta="Kilometraje inicial" htmlFor="km">
                <input id="km" className="ui-entrada" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} placeholder="Ej.: 84250" />
              </Campo>
              <Campo etiqueta="Combustible" htmlFor="comb">
                <select id="comb" className="ui-entrada" value={combustible} onChange={(e) => setCombustible(e.target.value)}>
                  {["1/4", "1/2", "3/4", "Lleno"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>
            <fieldset className="checklist">
              <legend>Checklist del móvil</legend>
              {ITEMS_CHECKLIST.map((i) => (
                <div key={i} className="checklist__bloque">
                  <div className="checklist__item">
                    <span>{i}</span>
                    <Segmentos
                      etiqueta={i}
                      valor={checklist[i]}
                      onCambio={(v) => setChecklist((c) => ({ ...c, [i]: v }))}
                      opciones={[
                        { valor: "ok", texto: "OK" },
                        { valor: "observacion", texto: "Observación" },
                      ]}
                    />
                  </div>
                  {checklist[i] === "observacion" && (
                    <div className="checklist__obs">
                      <textarea
                        className="ui-entrada"
                        placeholder={`Describe la observación de ${i.toLowerCase()}`}
                        value={detalle[i]?.descripcion ?? ""}
                        onChange={(e) => setDetalle((d) => ({ ...d, [i]: { descripcion: e.target.value, adjuntos: d[i]?.adjuntos ?? [] } }))}
                      />
                      <SelectorAdjuntos
                        adjuntos={detalle[i]?.adjuntos ?? []}
                        onCambio={(a) => setDetalle((d) => ({ ...d, [i]: { descripcion: d[i]?.descripcion ?? "", adjuntos: a } }))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </fieldset>
            <fieldset className="checklist">
              <legend>Fotos y videos del móvil (opcional)</legend>
              <p className="pequeno texto-3">Por ejemplo, los cuatro costados y el tablero al salir.</p>
              <SelectorAdjuntos adjuntos={generales} onCambio={setGenerales} />
            </fieldset>
          </>
        )}
      </main>
      <footer className="patrulla__pie">
        <Boton variante="primario" grande bloque disabled={!listo} onClick={iniciar}>
          Iniciar turno
        </Boton>
      </footer>
    </div>
  );
}
