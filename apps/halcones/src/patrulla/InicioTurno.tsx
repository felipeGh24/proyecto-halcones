import { Link } from "react-router-dom";
import { pedirPermisoNotificaciones } from "./AvisoDespacho";
import { useState } from "react";
import { centroideUV, checklistInicial, COMBUSTIBLE, guardarPpu, leerPpu, novedadesChecklist, compararMoviles, leerPuntosFijos, leerPuntosInteres, obtenerCliente, UNIDADES_VECINALES, useDatos, type Modalidad, accesoTotalActivo } from "@plataforma/datos";
import { FormularioChecklist } from "./ChecklistMovil";
import { avisar, Boton, Campo, Insignia, Segmentos, SelectorAdjuntos, useUsuario, LogoHalcones, IlustracionPatrulla } from "@plataforma/ui";
import type { Adjunto } from "@plataforma/datos";


/**
 * Inicio de turno del patrullero.
 * - En móvil: elige el móvil en que sale, su nombre, acompañante y checklist. El móvil queda «Libre» para despacho.
 * - En punto fijo: elige el recinto (por ejemplo un GAMA) o una unidad vecinal.
 * - A pie: elige el sector (unidad vecinal).
 */
export function InicioTurno() {
  const usuario = useUsuario();
  const { moviles } = useDatos();
  const [recintos] = useState(() => leerPuntosInteres().filter((p) => p.ubicacion && p.grupo === "recintos_municipales"));
  const [fijos] = useState(() => leerPuntosFijos().filter((p) => p.activo && p.ubicacion));
  const [modalidad, setModalidad] = useState<Modalidad>("movil");
  const [movilId, setMovilId] = useState("");
  const [nombre, setNombre] = useState(usuario.nombre);
  const [acompanante, setAcompanante] = useState("");
  const [km, setKm] = useState("");
  const [combustible, setCombustible] = useState("FULL");
  const [checklist, setChecklist] = useState(checklistInicial);
  const [ppu, setPpu] = useState("");
  const [lugar, setLugar] = useState("");
  const [halcon, setHalcon] = useState("");
  const [generales, setGenerales] = useState<Adjunto[]>([]);
  const [error, setError] = useState("");
  const conMovil = modalidad === "movil";
  const faltan = [
    nombre.trim().length < 3 && "tu nombre",
    conMovil && !movilId && "el móvil",
    conMovil && !/^\d+$/.test(km) && "el kilometraje inicial (solo números)",
    !conMovil && !lugar && "el lugar",
  ].filter(Boolean) as string[];
  const listo = faltan.length === 0;
  // Orden de la flota: Móvil 01 a 17, Alpha y RAM (los ocupados quedan en su lugar, deshabilitados).
  const ordenados = [...moviles].sort(compararMoviles);

  function iniciar() {
    setError("");
    // Para que los avisos de despacho lleguen aunque el celular tenga la app en segundo plano.
    pedirPermisoNotificaciones();
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
            observaciones: novedadesChecklist(checklist),
            adjuntosGenerales: generales,
            ppu: ppu.trim().toUpperCase(),
            checklist,
          },
          usuario,
        );
        if (ppu.trim()) guardarPpu(movilId, ppu);
      } else {
        const fijo = fijos.find((r) => r.id === lugar);
        const recinto = recintos.find((r) => r.id === lugar);
        const uv = lugar.startsWith("uv-") ? Number(lugar.slice(3)) : null;
        const ubicacion = fijo?.ubicacion ?? recinto?.ubicacion ?? (uv ? centroideUV(uv) : null);
        if (!ubicacion) throw new Error("Elige un lugar válido.");
        obtenerCliente().iniciarTurnoPersonal(
          {
            patrullero: nombre.trim(),
            halcon: halcon.trim(),
            acompanante: acompanante.trim(),
            modalidad,
            lugar: fijo ? fijo.nombre : recinto ? `${recinto.codigo ? `${recinto.codigo} · ` : ""}${recinto.nombre}` : `UV ${String(uv).padStart(2, "0")}`,
            puntoId: fijo?.id ?? recinto?.id,
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
        <LogoHalcones alto={34} variante="claro" />
        <div className="patrulla__cabeza-texto">
          <h1 className="patrulla__titulo">Inicio de turno</h1>
          <div className="pequeno texto-3">Halcones · app del patrullero</div>
        </div>
        <span className="patrulla__cabeza-acciones">
          {accesoTotalActivo() && (
            <Link to="/central" className="patrulla__enlace">
              Ir a la Central
            </Link>
          )}
          <Insignia tono="demo">Demo</Insignia>
        </span>
      </header>
      <main className="patrulla__cuerpo" style={{ display: "grid", gap: 16 }}>
        {error && (
          <div className="ui-alerta ui-alerta--error" role="alert">
            {error}
          </div>
        )}
        <div className="patrulla__bienvenida">
          <IlustracionPatrulla className="patrulla__ilustracion" />
          <p>
            <strong>Buen turno.</strong> Elige cómo sales hoy y revisa el móvil antes de partir.
          </p>
        </div>
        <Segmentos<Modalidad>
          etiqueta="Servicio"
          valor={modalidad}
          onCambio={(m) => {
            setModalidad(m);
            setLugar("");
          }}
          opciones={[
            { valor: "movil", texto: "En móvil" },
            { valor: "punto_fijo", texto: "Punto estático" },
            { valor: "a_pie", texto: "Otro servicio" },
          ]}
        />
        {conMovil ? (
          <Campo etiqueta="Móvil en que sales" htmlFor="movil" ayuda="Los móviles que ya tienen un patrullero en turno no se pueden elegir.">
            <select
              id="movil"
              className="ui-entrada"
              value={movilId}
              onChange={(e) => {
                setMovilId(e.target.value);
                setPpu(leerPpu(e.target.value));
              }}
            >
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
              {modalidad === "punto_fijo" && fijos.length > 0 && (
                <optgroup label="Puntos fijos">
                  {fijos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                      {r.direccion ? ` · ${r.direccion}` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {modalidad === "punto_fijo" && recintos.length > 0 && (
                <optgroup label="Recintos municipales (GAMA)">
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
              <Campo etiqueta="Combustible inicio" htmlFor="comb">
                <select id="comb" className="ui-entrada" value={combustible} onChange={(e) => setCombustible(e.target.value)}>
                  {COMBUSTIBLE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo etiqueta="PPU (patente)" htmlFor="ppu" ayuda="Queda guardada para el próximo turno en este móvil.">
              <input id="ppu" className="ui-entrada" value={ppu} maxLength={10} autoCapitalize="characters" placeholder="Ej.: VXWW-84" onChange={(e) => setPpu(e.target.value.toUpperCase())} />
            </Campo>
            <FormularioChecklist valor={checklist} onCambio={setChecklist} />
            <fieldset className="checklist">
              <legend>Fotos y videos del móvil (opcional)</legend>
              <p className="pequeno texto-3">Por ejemplo, los cuatro costados y el tablero al salir.</p>
              <SelectorAdjuntos adjuntos={generales} onCambio={setGenerales} />
            </fieldset>
          </>
        )}
      </main>
      <footer className="patrulla__pie">
        {!listo && (
          <p className="patrulla__falta" id="inicio-falta" aria-live="polite">
            Falta: {faltan.join(", ")}.
          </p>
        )}
        <Boton variante="primario" grande bloque disabled={!listo} onClick={iniciar} aria-describedby={listo ? undefined : "inicio-falta"}>
          Iniciar turno
        </Boton>
      </footer>
    </div>
  );
}
