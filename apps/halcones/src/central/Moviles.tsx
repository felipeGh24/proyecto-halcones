import { ESTADOS, ESTADOS_MOVIL, hace, hora, obtenerClave, obtenerCliente, puede, useDatos, type EstadoMovil, type Movil } from "@plataforma/datos";
import { avisar, Boton, Insignia, useUsuario } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

const GRUPOS: { titulo: string; estados: EstadoMovil[]; ayuda: string }[] = [
  { titulo: "Libres", estados: ["disponible"], ayuda: "Con patrullero en turno y sin procedimiento: se les puede despachar." },
  { titulo: "Ocupados", estados: ["asignado", "en_procedimiento"], ayuda: "Atendiendo un procedimiento." },
  { titulo: "Sin turno", estados: ["sin_turno"], ayuda: "Ningún patrullero ha iniciado turno en ellos desde la app." },
  { titulo: "Fuera de servicio", estados: ["fuera_de_servicio"], ayuda: "En taller o dados de baja temporalmente." },
];

export function Moviles() {
  const { moviles, procedimientos, personal } = useDatos();
  const usuario = useUsuario();
  const enTurno = moviles.filter((m) => m.turno).length;

  function cerrar(m: Movil) {
    try {
      obtenerCliente().cerrarTurno(m.id, usuario);
      avisar(`Turno de ${m.nombre} cerrado`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo cerrar el turno");
    }
  }

  function cerrarPersonal(id: string, nombre: string) {
    try {
      obtenerCliente().cerrarTurnoPersonal(id, usuario, { observaciones: "Cerrado por la Central" });
      avisar(`Turno de ${nombre} cerrado`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo cerrar el turno");
    }
  }

  return (
    <MarcoCentral titulo="Móviles y patrulleros" subtitulo={`${enTurno} de ${moviles.length} móviles con patrullero en turno · ${personal.length} en punto fijo o a pie`}>
      <div className="pagina">
        <div className="resumen-flota">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="ui-tarjeta resumen-flota__item">
              <span className="pequeno texto-2">{g.titulo}</span>
              <strong className="num">{moviles.filter((m) => g.estados.includes(m.estado)).length}</strong>
            </div>
          ))}
        </div>
        {personal.length > 0 && (
          <section className="grupo-moviles">
            <header>
              <h2>Punto fijo y a pie</h2>
              <span className="pequeno texto-3">Personal en terreno sin móvil.</span>
            </header>
            <div className="grilla-moviles">
              {personal.map((p) => (
                <article key={p.id} className="ui-tarjeta tarjeta-movil">
                  <header>
                    <h3>{p.modalidad === "punto_fijo" ? "Punto fijo" : "A pie"}</h3>
                    <Insignia tono="ok" punto>
                      En servicio
                    </Insignia>
                  </header>
                  <p>
                    <strong>{p.patrullero}</strong>
                    {p.acompanante && <span className="texto-2"> y {p.acompanante}</span>}
                  </p>
                  <p className="pequeno texto-3">
                    {p.lugar} · desde {hora(p.iniciadoEn)}
                  </p>
                  {puede(usuario.rol, "cancelar_procedimiento") && (
                    <Boton variante="fantasma" onClick={() => cerrarPersonal(p.id, p.patrullero)}>
                      Cerrar turno
                    </Boton>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {GRUPOS.map((g) => {
          const lista = moviles.filter((m) => g.estados.includes(m.estado)).sort((a, b) => a.nombre.localeCompare(b.nombre));
          if (!lista.length) return null;
          return (
            <section key={g.titulo} className="grupo-moviles">
              <header>
                <h2>{g.titulo}</h2>
                <span className="pequeno texto-3">{g.ayuda}</span>
              </header>
              <div className="grilla-moviles">
                {lista.map((m) => {
                  const proc = procedimientos.find((p) => p.id === m.procedimientoId);
                  const tono = ESTADOS_MOVIL[m.estado].tono;
                  return (
                    <article key={m.id} className="ui-tarjeta tarjeta-movil">
                      <header>
                        <h3>{m.nombre}</h3>
                        <Insignia tono={tono === "neutro" ? "neutro" : tono} punto>
                          {ESTADOS_MOVIL[m.estado].etiqueta}
                        </Insignia>
                      </header>
                      {m.turno ? (
                        <>
                          <p>
                            <strong>{m.turno.patrullero}</strong>
                            {m.turno.acompanante && <span className="texto-2"> y {m.turno.acompanante}</span>}
                          </p>
                          <p className="pequeno texto-3">
                            Turno desde {hora(m.turno.iniciadoEn)} · señal {hace(m.ultimaSenal)}
                            {m.turno.observaciones.length > 0 && ` · checklist: ${m.turno.observaciones.join(", ")}`}
                          </p>
                        </>
                      ) : (
                        <p className="pequeno texto-3">{m.tipo} · sin patrullero</p>
                      )}
                      {proc && (
                        <p className="pequeno">
                          {ESTADOS[proc.estado].etiqueta}: {proc.claveNumero} · {obtenerClave(proc.claveNumero)?.nombre} — {proc.folio}
                        </p>
                      )}
                      {m.turno && !proc && puede(usuario.rol, "cancelar_procedimiento") && (
                        <Boton variante="fantasma" onClick={() => cerrar(m)}>
                          Cerrar turno
                        </Boton>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </MarcoCentral>
  );
}
