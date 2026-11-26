import { useRef, useState } from "react";
import { GRUPOS_PUNTO, guardarPuntosPropios, leerCsvPuntos, PLANTILLA_CSV, puntosACsv, type GrupoPunto, type PuntoInteres } from "@plataforma/datos";
import { avisar, Boton, Insignia } from "@plataforma/ui";

function descargar(nombre: string, contenido: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  a.download = nombre;
  a.click();
}

/**
 * Recintos municipales (GAMA), recintos asistenciales de noche y otros puntos.
 * Los que aún no tienen ubicación se fijan con «Ubicar»: un clic en el mapa, en la esquina correcta.
 */
export function PuntosPropios({
  puntos,
  visibles,
  onVisibles,
  puedeEditar,
  ubicandoId,
  onUbicar,
  onIr,
  onRecargar,
}: {
  puntos: PuntoInteres[];
  visibles: boolean;
  onVisibles: (v: boolean) => void;
  puedeEditar: boolean;
  ubicandoId: string | null;
  onUbicar: (p: PuntoInteres | null) => void;
  onIr: (p: PuntoInteres) => void;
  onRecargar: () => void;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const faltan = puntos.filter((p) => !p.ubicacion).length;

  async function cargar(f: File) {
    const { puntos: nuevos, errores: e } = leerCsvPuntos(await f.text());
    setErrores(e);
    if (nuevos.length) {
      guardarPuntosPropios(nuevos);
      onRecargar();
      avisar(`${nuevos.length} puntos cargados`);
    }
  }

  return (
    <fieldset className="geo__capas recintos">
      <legend>Recintos y puntos del municipio</legend>
      <label className="interruptor">
        <input type="checkbox" checked={visibles} onChange={(e) => onVisibles(e.target.checked)} />
        <span>Mostrar en el mapa</span>
      </label>
      {faltan > 0 && <p className="pequeno recintos__aviso">{faltan} sin ubicar todavía{puedeEditar ? ": usa «Ubicar» y haz clic en la esquina correcta del mapa." : ". Un administrador o supervisor debe ubicarlos."}</p>}
      {(Object.keys(GRUPOS_PUNTO) as GrupoPunto[]).map((g) => {
        const lista = puntos.filter((p) => p.grupo === g);
        if (!lista.length) return null;
        return (
          <div key={g} className="recintos__grupo">
            <span className="pequeno texto-3">{GRUPOS_PUNTO[g]}</span>
            <ul>
              {lista.map((p) => (
                <li key={p.id} className={ubicandoId === p.id ? "activo" : ""}>
                  <span className={`mapa-poi mapa-poi--${p.tipo}`} aria-hidden>
                    {p.corto ?? "•"}
                  </span>
                  <span className="recintos__texto">
                    <strong>{p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre}</strong>
                    <span className="pequeno texto-3">{p.direccion}</span>
                  </span>
                  {p.ubicacion ? (
                    <span className="recintos__acciones">
                      <button type="button" className="enlace" onClick={() => onIr(p)}>
                        Ver
                      </button>
                      {puedeEditar && (
                        <button type="button" className="enlace" onClick={() => onUbicar(p)}>
                          Mover
                        </button>
                      )}
                    </span>
                  ) : puedeEditar ? (
                    <Boton variante={ubicandoId === p.id ? "primario" : "secundario"} onClick={() => onUbicar(ubicandoId === p.id ? null : p)}>
                      {ubicandoId === p.id ? "Haz clic en el mapa" : "Ubicar"}
                    </Boton>
                  ) : (
                    <Insignia>Sin ubicar</Insignia>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="geo__acciones">
        {puedeEditar && (
          <Boton icono="descargar" onClick={() => archivo.current?.click()}>
            Cargar planilla
          </Boton>
        )}
        <Boton variante="fantasma" onClick={() => descargar("puntos-de-interes.csv", puntosACsv(puntos))}>
          Exportar
        </Boton>
        {puedeEditar && (
          <Boton variante="fantasma" onClick={() => descargar("plantilla-puntos-de-interes.csv", "﻿" + PLANTILLA_CSV)}>
            Plantilla
          </Boton>
        )}
      </div>
      <input ref={archivo} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && void cargar(e.target.files[0])} />
      {errores.length > 0 && (
        <ul className="pequeno geo__errores">
          {errores.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
          {errores.length > 5 && <li>… y {errores.length - 5} más</li>}
        </ul>
      )}
    </fieldset>
  );
}
