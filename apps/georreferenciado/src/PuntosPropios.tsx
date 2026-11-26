import { useRef, useState } from "react";
import { guardarPuntosInteres, leerCsvPuntos, PLANTILLA_CSV, TIPOS_PUNTO, type PuntoInteres } from "@plataforma/datos";
import { avisar, Boton } from "@plataforma/ui";

/**
 * Puntos propios del municipio (edificios municipales, sedes, centros de salud, etc.) cargados desde una planilla.
 * En la demo quedan en este navegador; con la base de datos se guardarán para todos.
 */
export function PuntosPropios({ puntos, onCambio, visibles, onVisibles }: { puntos: PuntoInteres[]; onCambio: (p: PuntoInteres[]) => void; visibles: boolean; onVisibles: (v: boolean) => void }) {
  const archivo = useRef<HTMLInputElement>(null);
  const [errores, setErrores] = useState<string[]>([]);

  async function cargar(f: File) {
    const { puntos: nuevos, errores: e } = leerCsvPuntos(await f.text());
    setErrores(e);
    if (nuevos.length) {
      onCambio(nuevos);
      guardarPuntosInteres(nuevos);
      avisar(`${nuevos.length} puntos cargados`);
    }
  }

  function plantilla() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + PLANTILLA_CSV], { type: "text/csv;charset=utf-8" }));
    a.download = "plantilla-puntos-de-interes.csv";
    a.click();
  }

  const porTipo = Object.entries(TIPOS_PUNTO)
    .map(([t, nombre]) => ({ nombre, n: puntos.filter((p) => p.tipo === t).length }))
    .filter((x) => x.n);

  return (
    <fieldset className="geo__capas">
      <legend>Puntos propios del municipio</legend>
      {puntos.length > 0 ? (
        <>
          <label className="interruptor">
            <input type="checkbox" checked={visibles} onChange={(e) => onVisibles(e.target.checked)} />
            <span>Mostrar {puntos.length} puntos cargados</span>
          </label>
          <p className="pequeno texto-3">{porTipo.map((x) => `${x.nombre}: ${x.n}`).join(" · ")}</p>
        </>
      ) : (
        <p className="pequeno texto-2">Carga una planilla con los edificios municipales y otros lugares (nombre, tipo, dirección, latitud y longitud).</p>
      )}
      <div className="geo__acciones">
        <Boton icono="descargar" onClick={() => archivo.current?.click()}>
          Cargar planilla CSV
        </Boton>
        <Boton variante="fantasma" onClick={plantilla}>
          Plantilla
        </Boton>
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
