import { useEffect, useRef, useState, type FormEvent } from "react";
import { buscarEsquina, centroideUV, direccionDe, partirEsquina, ubicarPunto, historialCercano, leerPuntosInteres, obtenerClave, movilesCercanos, obtenerCliente, puede, UNIDADES_VECINALES, unidadVecinalDe, useDatos, type Punto } from "@plataforma/datos";
import { Mapa } from "@plataforma/mapa";
import { avisar, Boton, Campo, EntradaDireccion, Modal, useUsuario } from "@plataforma/ui";
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
  // La dirección la escribe el operador; si la propuso el sistema, se puede reemplazar al mover el punto.
  const direccionPropuesta = useRef(true);
  const origenPunto = useRef<"mapa" | "direccion">("mapa");

  useEffect(() => {
    if (!punto || origenPunto.current !== "mapa") return;
    const ctl = new AbortController();
    direccionDe(punto, ctl.signal).then((d) => {
      if (d && (direccionPropuesta.current || !direccion.trim())) {
        setDireccion(d);
        direccionPropuesta.current = true;
      }
    });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punto]);

  function marcarEnMapa(p: Punto) {
    origenPunto.current = "mapa";
    setPunto(p);
  }
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
      subtitulo="Clave, dirección y descripción. El punto, la unidad vecinal y el móvil los completa el sistema."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante={puedeDespachar ? "secundario" : "primario"} onClick={() => crear(false)}>
            {puedeDespachar ? "Crear sin despachar" : "Crear"}
          </Boton>
          {puedeDespachar && (
            <Boton variante="primario" icono="enviar" onClick={() => crear(true)} disabled={!destino} title={destino ? "" : punto ? "No hay móviles libres con patrullero en turno" : "Elige la dirección sugerida o marca el punto en el mapa"}>
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
          <Campo etiqueta="Dirección" htmlFor="direccion" error={errores.direccion} ayuda="Escribe calle y número o una esquina y elige la sugerencia: el punto se marca solo. También puedes hacer clic en el mapa.">
            <EntradaDireccion
              id="direccion"
              grande
              valor={direccion}
              error={!!errores.direccion}
              onCambio={(t) => {
                direccionPropuesta.current = false;
                setDireccion(t);
              }}
              onElegir={(s) => {
                origenPunto.current = "direccion";
                direccionPropuesta.current = false;
                setPunto(s.punto);
                setEnfoque({ ...s.punto });
                setErrores((e) => ({ ...e, punto: "", direccion: "" }));
              }}
            />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="descripcion" ayuda="Qué pasa, en pocas palabras. Evita datos personales que no sean necesarios.">
            <textarea id="descripcion" className="ui-entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
          </Campo>
          {puedeDespachar && (
            <section className="asignacion" aria-label="Asignación del móvil">
              <span className="ui-campo__etiqueta">Móvil asignado automáticamente</span>
              {!punto ? (
                <span className="ui-campo__ayuda">Elige una dirección sugerida o marca el punto en el mapa: el sistema asigna el móvil libre con patrullero en turno más cercano.</span>
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
                  origenPunto.current = "direccion";
                  setPunto({ ...r.ubicacion });
                  setEnfoque({ ...r.ubicacion });
                  setAvisoRecinto("");
                } else {
                  // Intenta ubicarlo por su esquina y lo deja guardado para la próxima vez.
                  setAvisoRecinto("Buscando la esquina del recinto…");
                  const esq = partirEsquina(r.direccion);
                  void (esq ? buscarEsquina(esq[0], esq[1]) : Promise.resolve(null))
                    .catch(() => null)
                    .then((s) => {
                      if (s) {
                        ubicarPunto(r.id, s.punto);
                        r.ubicacion = s.punto;
                        origenPunto.current = "direccion";
                        setPunto({ ...s.punto });
                        setEnfoque({ ...s.punto });
                        setAvisoRecinto("Ubicado por su esquina. Revisa el punto y arrástralo si hace falta.");
                      } else setAvisoRecinto("No encontré la esquina: marca el punto a mano. Un supervisor puede ubicarlo en Georreferenciado.");
                    });
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
              onMoverMarcador={marcarEnMapa}
              onClicMapa={marcarEnMapa}
              onCalle={(c) => {
                setCalle(c);
                if (c && (!direccion.trim() || direccionPropuesta.current)) {
                  setDireccion(`${c} (completar número)`);
                  direccionPropuesta.current = true;
                }
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
