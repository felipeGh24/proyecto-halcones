import { useState, type FormEvent } from "react";
import { centroideUV, historialCercano, leerPuntosInteres, obtenerClave, movilesCercanos, obtenerCliente, puede, UNIDADES_VECINALES, unidadVecinalDe, useDatos, type Punto } from "@plataforma/datos";
import { Mapa } from "@plataforma/mapa";
import { avisar, Boton, Campo, Modal, useUsuario } from "@plataforma/ui";
import { BuscadorClave } from "./BuscadorClave";
import { ListaDespacho } from "./ListaDespacho";

/**
 * Crear un procedimiento en menos de 30 segundos:
 * clave con semáforo → punto exacto en el mapa → dirección → crear (y despachar al más cercano).
 * La unidad vecinal y el barrio se calculan solos desde el punto.
 */
export function NuevoProcedimiento({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: string) => void }) {
  const usuario = useUsuario();
  const { moviles, procedimientos } = useDatos();
  const [movilElegido, setMovilElegido] = useState<string | null>(null);
  const [clave, setClave] = useState<number | null>(null);
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [punto, setPunto] = useState<Punto | null>(null);
  const [enfoque, setEnfoque] = useState<Punto | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [calle, setCalle] = useState<string | null>(null);
  const [puntos] = useState(() => leerPuntosInteres());
  const [avisoRecinto, setAvisoRecinto] = useState("");
  const [verLista, setVerLista] = useState(false);
  const uv = punto ? unidadVecinalDe(punto) : null;
  const historial = punto ? historialCercano(procedimientos, punto) : null;
  const masCercano = punto ? movilesCercanos(moviles, punto, 1)[0] : undefined;
  // Móvil a despachar: el que eligió el operador si sigue libre; si no, el libre más cercano.
  const elegidoLibre = moviles.find((m) => m.id === movilElegido && m.estado === "disponible" && m.turno);
  const destino = elegidoLibre ?? masCercano?.movil;
  const puedeDespachar = puede(usuario.rol, "despachar");

  function validar() {
    const e: Record<string, string> = {};
    if (clave == null) e.clave = "Elige una clave.";
    if (!punto) e.punto = "Marca el punto exacto en el mapa.";
    else if (!uv) e.punto = "El punto está fuera de la comuna. Revísalo.";
    if (direccion.trim().length < 3) e.direccion = "Escribe la dirección o una referencia.";
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function crear(despachar: boolean) {
    if (!validar()) return;
    const cliente = obtenerCliente();
    const p = cliente.crearProcedimiento({ claveNumero: clave!, direccion, descripcion, ubicacion: punto! }, usuario);
    if (despachar && destino) cliente.despachar(p.id, destino.id, usuario);
    avisar(despachar && destino ? `${p.folio} creado y despachado a ${destino.nombre} (${destino.turno?.patrullero ?? ""})` : `${p.folio} creado; queda en la cola sin despachar`);
    onCreado(p.id);
  }

  return (
    <Modal
      ancho
      titulo="Nuevo procedimiento"
      subtitulo="Clave, punto exacto y dirección. El resto lo completa el sistema."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante={puedeDespachar ? "secundario" : "primario"} onClick={() => crear(false)}>
            {puedeDespachar ? "Crear sin despachar" : "Crear"}
          </Boton>
          {puedeDespachar && (
            <Boton variante="primario" icono="enviar" onClick={() => crear(true)} disabled={!destino} title={destino ? "" : punto ? "No hay móviles libres con patrullero en turno" : "Marca el punto en el mapa para asignar el móvil más cercano"}>
              Crear y despachar{destino ? ` a ${destino.nombre}` : ""}
            </Boton>
          )}
        </>
      }
    >
      <form
        className="nuevo"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          crear(puedeDespachar);
        }}
      >
        <div className="nuevo__datos">
          <BuscadorClave valor={clave} onElegir={setClave} error={errores.clave} />
          <Campo etiqueta="Dirección" htmlFor="direccion" error={errores.direccion} ayuda="Calle y número, o esquina. Al marcar el punto se propone la calle más cercana.">
            <input id="direccion" className={`ui-entrada nuevo__direccion ${errores.direccion ? "ui-entrada--error" : ""}`} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número y referencia" autoComplete="off" />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="descripcion" ayuda="Qué pasa, en pocas palabras. Evita datos personales que no sean necesarios.">
            <textarea id="descripcion" className="ui-entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
          </Campo>
          {puedeDespachar && (
            <section className="asignacion" aria-label="Asignación del móvil">
              <span className="ui-campo__etiqueta">Móvil asignado automáticamente</span>
              {!punto ? (
                <span className="ui-campo__ayuda">Marca el punto en el mapa: el sistema elige el móvil libre con patrullero en turno más cercano.</span>
              ) : destino ? (
                <div className="asignacion__elegido">
                  <div>
                    <strong>{destino.nombre}</strong>
                    <span className="pequeno texto-2"> · {destino.turno?.patrullero}</span>
                    <div className="pequeno texto-3">{elegidoLibre ? "Elegido por el operador" : "El libre más cercano al punto"}</div>
                  </div>
                  <button type="button" className="ui-boton ui-boton--fantasma" onClick={() => setVerLista((v) => !v)}>
                    {verLista ? "Ocultar móviles" : "Cambiar móvil"}
                  </button>
                </div>
              ) : (
                <span className="ui-campo__error">No hay móviles libres con patrullero en turno. Se creará sin despachar.</span>
              )}
              {punto && verLista && <ListaDespacho punto={punto} moviles={moviles} procedimientos={procedimientos} elegido={destino?.id ?? null} onElegir={(m) => setMovilElegido(m.id)} />}
            </section>
          )}
          <details className="ayudas">
            <summary>Ayudas para ubicar (opcional): unidad vecinal o recinto</summary>
            <div className="ayudas__cuerpo">
          <Campo etiqueta="Unidad vecinal" htmlFor="uv" ayuda="Acerca el mapa; después marca el punto exacto con un clic.">
            <select
              id="uv"
              className="ui-entrada"
              defaultValue=""
              onChange={(e) => {
                const c = centroideUV(Number(e.target.value));
                if (c) setEnfoque(c);
              }}
            >
              <option value="" disabled>
                Elegir…
              </option>
              {UNIDADES_VECINALES.features.map((f) => (
                <option key={f.properties.uv} value={f.properties.uv}>
                  {f.properties.nombre} · {f.properties.barrio}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Recinto (GAMA o asistencial)" htmlFor="recinto" ayuda={avisoRecinto || "Pone el punto y la dirección del recinto."}>
            <select
              id="recinto"
              className="ui-entrada"
              defaultValue=""
              onChange={(e) => {
                const r = puntos.find((x) => x.id === e.target.value);
                if (!r) return;
                setDireccion(`${r.codigo ? `${r.codigo} · ` : ""}${r.nombre} (${r.direccion})`);
                if (r.ubicacion) {
                  setPunto({ ...r.ubicacion });
                  setEnfoque({ ...r.ubicacion });
                  setAvisoRecinto("");
                } else {
                  setAvisoRecinto("Este recinto aún no está ubicado en el mapa: marca el punto a mano. Un supervisor puede ubicarlo en Georreferenciado.");
                }
              }}
            >
              <option value="" disabled>
                Elegir recinto…
              </option>
              {puntos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo ? `${r.codigo} · ` : ""}
                  {r.nombre}
                  {r.ubicacion ? "" : " (sin ubicar)"}
                </option>
              ))}
            </select>
          </Campo>
            </div>
          </details>
          <button type="submit" hidden />
        </div>
        <div className="nuevo__mapa">
          <div className={`nuevo__lienzo ${errores.punto ? "nuevo__lienzo--error" : ""}`}>
            <Mapa
              compacto
              moviles={moviles}
              marcador={punto}
              onMoverMarcador={setPunto}
              onClicMapa={setPunto}
              onCalle={(c) => {
                setCalle(c);
                if (c && !direccion.trim()) setDireccion(`${c} (completar número)`);
              }}
              enfocar={enfoque}
              etiquetas={{ barrios: true }}
              puntosInteres={puntos}
              capas={{ procedimientos: false, recorridos: false }}
            />
          </div>
          <p className={errores.punto ? "ui-campo__error" : "pequeno texto-2"}>
            {errores.punto
              ? errores.punto
              : punto
                ? `Punto: ${calle ? `cerca de ${calle} · ` : ""}${uv ? `${uv.nombre} · ${uv.barrio}` : "fuera de la comuna"} · ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)} · arrastra el marcador para corregir`
                : "Haz clic en el mapa para fijar el punto exacto."}
          </p>
          {historial && (
            <div className={`historial ${historial.n >= 5 ? "historial--alto" : ""}`}>
              <strong>{historial.n === 0 ? "Sin procedimientos cerca en los últimos 30 días" : `${historial.n} procedimientos a menos de ${historial.metros} m en los últimos ${historial.dias} días`}</strong>
              {historial.n > 0 && <span className="pequeno texto-2">Lo más frecuente: {historial.claves.map((c) => `${obtenerClave(c.numero)?.nombre.toLowerCase()} (${c.n})`).join(", ")}</span>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
