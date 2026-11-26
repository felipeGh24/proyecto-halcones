import { useState } from "react";
import { obtenerCliente, useDatos } from "@plataforma/datos";
import { avisar, Boton, Campo, Insignia, Segmentos, useUsuario } from "@plataforma/ui";

const ITEMS = ["Luces y baliza", "Sirena", "Radio", "Neumáticos", "Botiquín", "Extintor", "Carrocería", "Documentos del móvil"];

/**
 * Inicio de turno del patrullero: elige el móvil en que sale, confirma su nombre y el de su acompañante,
 * y revisa el móvil. Al iniciar, el móvil aparece como «Libre» en la Central y ya se le puede despachar.
 */
export function InicioTurno() {
  const usuario = useUsuario();
  const { moviles } = useDatos();
  const [movilId, setMovilId] = useState("");
  const [nombre, setNombre] = useState(usuario.nombre);
  const [acompanante, setAcompanante] = useState("");
  const [km, setKm] = useState("");
  const [combustible, setCombustible] = useState("3/4");
  const [checklist, setChecklist] = useState<Record<string, "ok" | "observacion">>(() => Object.fromEntries(ITEMS.map((i) => [i, "ok"])));
  const [error, setError] = useState("");
  const listo = movilId && nombre.trim().length >= 3 && /^\d+$/.test(km);
  const ordenados = [...moviles].sort((a, b) => Number(!!a.turno) - Number(!!b.turno) || a.nombre.localeCompare(b.nombre));

  function iniciar() {
    setError("");
    try {
      obtenerCliente().iniciarTurno(
        movilId,
        {
          patrullero: nombre.trim(),
          acompanante: acompanante.trim(),
          kmInicial: Number(km),
          combustible,
          observaciones: Object.entries(checklist).filter(([, v]) => v === "observacion").map(([k]) => k),
        },
        usuario,
      );
      avisar("Turno iniciado: la Central ya te ve disponible");
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
        <Campo etiqueta="Tu nombre" htmlFor="nombre" ayuda="Así te verá la Central al despachar.">
          <input id="nombre" className="ui-entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        </Campo>
        <Campo etiqueta="Acompañante (opcional)" htmlFor="acomp">
          <input id="acomp" className="ui-entrada" value={acompanante} onChange={(e) => setAcompanante(e.target.value)} />
        </Campo>
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
          {ITEMS.map((i) => (
            <div key={i} className="checklist__item">
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
          ))}
        </fieldset>
      </main>
      <footer className="patrulla__pie">
        <Boton variante="primario" grande bloque disabled={!listo} onClick={iniciar}>
          Iniciar turno
        </Boton>
      </footer>
    </div>
  );
}
