import { useMemo, useState } from "react";
import { ESTADOS, fechaHora, hora, obtenerClave, TIPOS_REPORTE, useDatos, type Reporte } from "@plataforma/datos";
import { Boton, Insignia, Vacio, VistaAdjuntos, useUsuario } from "@plataforma/ui";
import { ComplementarReporte } from "./NuevoReporte";
import type { TurnoActual } from "./turnoActual";

/** Mis reportes: enviar uno nuevo o añadir información a uno ya enviado. */
export function PestanaReportes({ turno, onNuevo }: { turno: TurnoActual; onNuevo: () => void }) {
  const usuario = useUsuario();
  const { reportes } = useDatos();
  const mios = reportes.filter((r) => r.usuarioId === usuario.id);
  const [abierto, setAbierto] = useState<string | null>(mios[0]?.id ?? null);
  const [complementar, setComplementar] = useState<Reporte | null>(null);
  const deEsteTurno = mios.filter((r) => r.creadoEn >= turno.iniciadoEn).length;

  return (
    <div className="pestana">
      <div className="pestana__cabeza">
        <div>
          <h1>Mis reportes</h1>
          <p className="pequeno texto-3">
            {deEsteTurno} en este turno · {mios.length} en total
          </p>
        </div>
        <Boton variante="primario" icono="mas" onClick={onNuevo}>
          Nuevo
        </Boton>
      </div>
      {mios.length === 0 ? (
        <Vacio icono="documento" titulo="Aún no envías reportes">
          Usa «Nuevo» para reportar un patrullaje preventivo, un procedimiento o un punto estático, con fotos y videos.
        </Vacio>
      ) : (
        <ul className="lista-patrulla">
          {mios.map((r) => (
            <li key={r.id} className="tarjeta-reporte">
              <button type="button" className="tarjeta-reporte__cabeza" aria-expanded={abierto === r.id} onClick={() => setAbierto(abierto === r.id ? null : r.id)}>
                <span>
                  <strong>{TIPOS_REPORTE[r.tipo]}</strong>
                  <span className="pequeno texto-3"> · {r.folio}</span>
                </span>
                <span className="pequeno texto-3 num">{fechaHora(r.creadoEn)}</span>
                <span className="pequeno texto-2">{r.direccion}</span>
                <span className="detalle__fila">
                  <Insignia tono={r.leidoPorCentral ? "ok" : "neutro"}>{r.leidoPorCentral ? "Leído por la Central" : "Enviado"}</Insignia>
                  {r.complementos.length > 0 && <Insignia>+{r.complementos.length} añadidos</Insignia>}
                </span>
              </button>
              {abierto === r.id && (
                <div className="tarjeta-reporte__cuerpo">
                  <p className="pequeno texto-3">
                    {r.barrio ?? "Sin barrio"} · {r.unidadVecinal ? `UV ${String(r.unidadVecinal).padStart(2, "0")}` : "sin UV"}
                  </p>
                  {r.observaciones && <p>{r.observaciones}</p>}
                  {r.adjuntos.length > 0 && <VistaAdjuntos adjuntos={r.adjuntos} />}
                  {r.complementos.map((c, i) => (
                    <div key={i} className="reporte__complemento">
                      <p className="pequeno texto-3">Añadido a las {hora(c.en)}</p>
                      {c.texto && <p>{c.texto}</p>}
                      {c.adjuntos.length > 0 && <VistaAdjuntos adjuntos={c.adjuntos} />}
                    </div>
                  ))}
                  <Boton icono="mas" onClick={() => setComplementar(r)}>
                    Añadir a este reporte
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {complementar && <ComplementarReporte reporteId={complementar.id} folio={complementar.folio} onCerrar={() => setComplementar(null)} />}
    </div>
  );
}

interface Entrada {
  en: string;
  titulo: string;
  detalle: string;
  tipo: "turno" | "procedimiento" | "reporte";
}

/** Bitácora del patrullero: lo que pasó en su turno y los procedimientos en los que ha estado. */
export function PestanaBitacora({ turno }: { turno: TurnoActual }) {
  const usuario = useUsuario();
  const { procedimientos, reportes, historialTurnos } = useDatos();

  const enLosQueEstuve = useMemo(
    () =>
      procedimientos
        .filter((p) => p.eventos.some((e) => e.porUsuarioId === usuario.id) || (turno.movil && p.movilId === turno.movil.id && p.creadoEn >= turno.iniciadoEn))
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
    [procedimientos, usuario.id, turno],
  );

  const entradas = useMemo(() => {
    const e: Entrada[] = [{ en: turno.iniciadoEn, titulo: "Inicio de turno", detalle: turno.unidad, tipo: "turno" }];
    for (const p of enLosQueEstuve) {
      for (const ev of p.eventos) {
        if (ev.en < turno.iniciadoEn) continue;
        if (ev.porUsuarioId !== usuario.id && ev.estado !== "asignado") continue;
        e.push({ en: ev.en, titulo: `${ESTADOS[ev.estado].etiqueta} · ${p.folio}`, detalle: `${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre} — ${p.direccion}`, tipo: "procedimiento" });
      }
    }
    for (const r of reportes.filter((x) => x.usuarioId === usuario.id && x.creadoEn >= turno.iniciadoEn)) {
      e.push({ en: r.creadoEn, titulo: `Reporte ${r.folio} · ${TIPOS_REPORTE[r.tipo]}`, detalle: r.direccion, tipo: "reporte" });
    }
    return e.sort((a, b) => b.en.localeCompare(a.en));
  }, [enLosQueEstuve, reportes, usuario.id, turno]);

  const anteriores = historialTurnos.filter((t) => t.usuarioId === usuario.id).slice(0, 10);

  return (
    <div className="pestana">
      <h1>Bitácora</h1>
      <section>
        <h2 className="pestana__sub">Este turno · {turno.unidad}</h2>
        <ol className="bitacora-patrulla">
          {entradas.map((e, i) => (
            <li key={i} className={`bitacora-patrulla__item bitacora-patrulla__item--${e.tipo}`}>
              <span className="num texto-3">{hora(e.en)}</span>
              <div>
                <strong>{e.titulo}</strong>
                <div className="pequeno texto-2">{e.detalle}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="pestana__sub">Procedimientos en los que he estado</h2>
        {enLosQueEstuve.length === 0 ? (
          <p className="pequeno texto-2">Todavía ninguno.</p>
        ) : (
          <ul className="lista-patrulla">
            {enLosQueEstuve.slice(0, 30).map((p) => (
              <li key={p.id} className="fila-proc">
                <strong>
                  {p.claveNumero} · {obtenerClave(p.claveNumero)?.nombre}
                </strong>
                <span className="pequeno texto-3 num">
                  {p.folio} · {fechaHora(p.creadoEn)} · {ESTADOS[p.estado].etiqueta}
                </span>
                <span className="pequeno texto-2">{p.direccion}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {anteriores.length > 0 && (
        <section>
          <h2 className="pestana__sub">Turnos anteriores</h2>
          <ul className="lista-patrulla">
            {anteriores.map((t) => (
              <li key={t.id} className="fila-proc">
                <strong>{t.unidad}</strong>
                <span className="pequeno texto-3 num">
                  {fechaHora(t.iniciadoEn)} – {hora(t.cerradoEn)}
                  {t.kmFinal != null && t.kmInicial != null ? ` · ${t.kmFinal - t.kmInicial} km` : ""}
                </span>
                {(t.novedadesChecklist.length > 0 || t.observaciones) && <span className="pequeno texto-2">{[...t.novedadesChecklist, t.observaciones].filter(Boolean).join(" · ")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Datos del turno y acciones: cambiar de móvil o modalidad (cierra la bitácora actual) o cerrar turno. */
export function PestanaTurno({ turno, onCambiar, onCerrar }: { turno: TurnoActual; onCambiar: () => void; onCerrar: () => void }) {
  const t = turno.movil?.turno;
  return (
    <div className="pestana">
      <h1>Mi turno</h1>
      <dl className="datos-turno">
        <div>
          <dt>Unidad</dt>
          <dd>{turno.unidad}</dd>
        </div>
        <div>
          <dt>N.º de halcón</dt>
          <dd>{turno.halcon || "—"}</dd>
        </div>
        <div>
          <dt>Patrulleros</dt>
          <dd>
            {turno.patrullero}
            {turno.acompanante ? ` y ${turno.acompanante}` : ""}
          </dd>
        </div>
        <div>
          <dt>Desde</dt>
          <dd className="num">{fechaHora(turno.iniciadoEn)}</dd>
        </div>
        {t && (
          <>
            <div>
              <dt>Kilometraje inicial</dt>
              <dd className="num">{t.kmInicial?.toLocaleString("es-CL") ?? "—"}</dd>
            </div>
            <div>
              <dt>Combustible inicial</dt>
              <dd>{t.combustible}</dd>
            </div>
          </>
        )}
      </dl>
      {t && (
        <section>
          <h2 className="pestana__sub">Checklist de salida</h2>
          {t.observaciones.length === 0 ? (
            <p className="pequeno texto-2">Todo OK.</p>
          ) : (
            <ul className="lista-patrulla">
              {(t.checklistDetalle ?? t.observaciones.map((item) => ({ item, descripcion: "", adjuntos: [] }))).map((c) => (
                <li key={c.item} className="fila-proc">
                  <strong>{c.item}</strong>
                  {c.descripcion && <span className="pequeno texto-2">{c.descripcion}</span>}
                  {c.adjuntos.length > 0 && <VistaAdjuntos adjuntos={c.adjuntos} />}
                </li>
              ))}
            </ul>
          )}
          {(t.adjuntosGenerales?.length ?? 0) > 0 && <VistaAdjuntos adjuntos={t.adjuntosGenerales!} />}
        </section>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        <Boton grande bloque icono="actualizar" onClick={onCambiar}>
          Cambiar de móvil o modalidad
        </Boton>
        <p className="pequeno texto-3">Cierra esta bitácora (con kilometraje si vas en móvil) y abre una nueva en otro móvil, en punto fijo o a pie.</p>
        <Boton variante="fantasma" grande bloque icono="salir" onClick={onCerrar}>
          Cerrar turno y salir
        </Boton>
      </div>
    </div>
  );
}
