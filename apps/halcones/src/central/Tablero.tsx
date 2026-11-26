import { useEffect, useMemo, useState } from "react";
import { analizarPatrones, duracion, esActivo, infoDeClave, obtenerCliente, puede, resumen, TIPOS_RECOMENDACION, useDatos } from "@plataforma/datos";
import { FiltrosMapa, Mapa, puntosVisibles, useFiltros, useLugares, type Seleccion } from "@plataforma/mapa";
import { useNavigate } from "react-router-dom";
import type { Punto } from "@plataforma/datos";
import { Boton, Indicador, useUsuario } from "@plataforma/ui";
import { Cola, ordenarCola } from "./Cola";
import { Detalle } from "./Detalle";
import { DetalleMovil } from "./DetalleMovil";
import { MarcoCentral } from "./MarcoCentral";
import { NuevoProcedimiento } from "./NuevoProcedimiento";

const DOCE_HORAS = 12 * 3600 * 1000;

export function Tablero() {
  const { procedimientos, moviles, personal, reportes } = useDatos();
  const usuario = useUsuario();
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [creando, setCreando] = useState(false);
  const [simular, setSimular] = useState(false);
  const { puntos, fijos } = useLugares();
  const [filtros, setFiltros] = useFiltros();
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [enfoqueLugar, setEnfoqueLugar] = useState<Punto | null>(null);
  const navegar = useNavigate();
  const puedeCrear = puede(usuario.rol, "crear_procedimiento");

  const activos = useMemo(() => ordenarCola(procedimientos.filter((p) => esActivo(p.estado))), [procedimientos, reportes]);
  const urgentesSinDespacho = activos.filter((p) => p.estado === "recibido" && infoDeClave(p.claveNumero).semaforo === "rojo").length;
  const disponibles = moviles.filter((m) => m.estado === "disponible").length;
  const enTurno = moviles.filter((m) => m.turno).length;
  const turno = useMemo(() => {
    const desde = Date.now() - DOCE_HORAS;
    return resumen(procedimientos.filter((p) => new Date(p.creadoEn).getTime() >= desde));
  }, [procedimientos, reportes]);

  // Atajo: N abre un procedimiento nuevo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const escribiendo = (e.target as HTMLElement).closest("input, textarea, select");
      if (!escribiendo && e.key.toLowerCase() === "n" && puedeCrear && !creando) {
        e.preventDefault();
        setCreando(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [puedeCrear, creando]);

  useEffect(() => {
    if (!simular) return;
    const t = setInterval(() => obtenerCliente().simularPaso(), 4000);
    return () => clearInterval(t);
  }, [simular]);

  const sugerencias = useMemo(() => analizarPatrones(procedimientos, Date.now(), 84, reportes).recomendaciones.filter((r) => r.tipo !== "respuesta").slice(0, 4), [procedimientos, reportes]);

  const procSel = seleccion?.tipo === "procedimiento" ? procedimientos.find((p) => p.id === seleccion.id) : undefined;
  const movilSel = seleccion?.tipo === "movil" ? moviles.find((m) => m.id === seleccion.id) : undefined;

  return (
    <MarcoCentral
      titulo="Central de Operaciones"
      subtitulo="Turno en curso"
      acciones={
        <>
          <Boton variante={simular ? "primario" : "fantasma"} icono="actualizar" onClick={() => setSimular((s) => !s)} title="Solo demo: mueve los móviles y avanza procedimientos">
            {simular ? "Simulación activa" : "Simular operación"}
          </Boton>
          {puedeCrear && (
            <Boton variante="primario" icono="mas" onClick={() => setCreando(true)} title="Atajo: tecla N">
              Nuevo procedimiento
            </Boton>
          )}
        </>
      }
    >
      <div className="tablero">
        <div className="tablero__indicadores ui-tarjeta">
          <Indicador etiqueta="Procedimientos activos" valor={activos.length} detalle={`${activos.filter((p) => p.estado === "recibido").length} sin despachar`} icono="lista" />
          <Indicador etiqueta="Rojos sin despachar" valor={urgentesSinDespacho} alerta={urgentesSinDespacho > 0} detalle={urgentesSinDespacho ? "Requieren despacho inmediato" : "Todo despachado"} icono="alerta" />
          <Indicador etiqueta="Móviles libres" valor={`${disponibles} / ${enTurno}`} detalle={`con patrullero en turno · ${personal.length} a pie o en punto fijo`} icono="auto" alerta={enTurno > 0 && disponibles === 0} />
          <Indicador etiqueta="Despacho (mediana, 12 h)" valor={duracion(turno.despachoMediana)} detalle="de recibido a asignado" icono="reloj" />
          <Indicador etiqueta="Respuesta (mediana, 12 h)" valor={duracion(turno.respuestaMediana)} detalle="de recibido a en el lugar" icono="navegar" />
        </div>

        <section className="tablero__cola ui-tarjeta" aria-label="Cola de procedimientos">
          <Cola procedimientos={activos} moviles={moviles} seleccionId={procSel?.id ?? null} onSeleccionar={(id) => setSeleccion({ tipo: "procedimiento", id })} />
        </section>

        <section className="tablero__mapa ui-tarjeta" aria-label="Mapa operativo">
          <Mapa
            procedimientos={procedimientos}
            moviles={moviles}
            seleccion={seleccion}
            onSeleccionar={setSeleccion}
            enfocar={enfoqueLugar ?? procSel?.ubicacion ?? movilSel?.posicion ?? null}
            etiquetas={{ barrios: true }}
            puntosInteres={puntosVisibles(puntos, filtros)}
            puntosFijos={filtros.fijos ? fijos : []}
            resaltado={resaltado}
            marcas={personal.map((p) => ({ id: p.id, punto: p.ubicacion, tipo: "personal" as const, texto: p.modalidad === "punto_fijo" ? "PF" : "A pie", titulo: `${p.patrullero} · ${p.lugar}` }))}
          />
          <FiltrosMapa
            puntos={puntos}
            fijos={fijos}
            filtros={filtros}
            onFiltros={setFiltros}
            resaltado={resaltado}
            onElegir={(id, p) => {
              setResaltado(id);
              setEnfoqueLugar(p ? { ...p } : null);
            }}
            onUbicar={(id) => navegar(`/central/lugares?ubicar=${encodeURIComponent(id)}`)}
          />
        </section>

        <section className="tablero__detalle ui-tarjeta" aria-label="Detalle">
          {procSel ? (
            <Detalle procedimiento={procSel} moviles={moviles} procedimientos={procedimientos} />
          ) : movilSel ? (
            <DetalleMovil movil={movilSel} procedimientos={procedimientos} onVerProcedimiento={(id) => setSeleccion({ tipo: "procedimiento", id })} />
          ) : (
            <div className="detalle-vacio">
              <h3>Selecciona un procedimiento</h3>
              <p className="texto-2 pequeno">Elige uno en la cola o en el mapa para ver su línea de tiempo y despacharlo al móvil más cercano.</p>
              {puedeCrear && (
                <p className="pequeno texto-3">
                  Atajo: tecla <kbd>N</kbd> para crear uno nuevo.
                </p>
              )}
              {sugerencias.length > 0 && (
                <div className="sugerencias">
                  <h3>Sugerencias para el turno</h3>
                  <p className="pequeno texto-3">Del motor de patrones, según las últimas 12 semanas.</p>
                  <ul>
                    {sugerencias.map((s) => (
                      <li key={s.id}>
                        <span className="pequeno texto-3">{TIPOS_RECOMENDACION[s.tipo].etiqueta}</span>
                        <strong>{s.titulo}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {creando && (
        <NuevoProcedimiento
          onCerrar={() => setCreando(false)}
          onCreado={(id) => {
            setCreando(false);
            setSeleccion({ tipo: "procedimiento", id });
          }}
        />
      )}
    </MarcoCentral>
  );
}
