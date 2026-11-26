import { ESTADOS, fechaHora, infoDeClave, numero, obtenerClave, puede, tiemposDe, TURNOS, turnoDe, type Procedimiento } from "@plataforma/datos";
import { Boton, Tarjeta, useUsuario } from "@plataforma/ui";
import { BarraFiltros, useFiltros } from "./filtros";
import { MarcoAnalisis } from "./MarcoAnalisis";

const min = (v: number | null) => (v == null ? "" : v.toFixed(1).replace(".", ","));

/** CSV con separador «;» y BOM: Excel en español lo abre directo con tildes y decimales con coma. */
function exportarCsv(procs: Procedimiento[], conDatosPersonales: boolean) {
  const cab = ["Folio", "Fecha recepción", "Clave", "Nombre clave", "Prioridad", "Semáforo", "Turno", "UV", "Barrio", "Estado", "Min. despacho", "Min. llegada", "Min. respuesta", "Dentro de meta"];
  if (conDatosPersonales) cab.push("Dirección");
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const filas = procs.map((p) => {
    const t = tiemposDe(p);
    const info = infoDeClave(p.claveNumero);
    const fila = [
      p.folio,
      fechaHora(p.creadoEn),
      String(p.claveNumero),
      obtenerClave(p.claveNumero)?.nombre ?? "",
      info.etiqueta,
      info.semaforo,
      TURNOS[turnoDe(p.creadoEn)].etiqueta,
      p.unidadVecinal ? String(p.unidadVecinal) : "",
      p.barrio ?? "",
      ESTADOS[p.estado].etiqueta,
      min(t.despacho),
      min(t.llegada),
      min(t.respuesta),
      t.dentroDeMeta == null ? "" : t.dentroDeMeta ? "Sí" : "No",
    ];
    if (conDatosPersonales) fila.push(p.direccion);
    return fila.map(esc).join(";");
  });
  const blob = new Blob(["﻿" + [cab.join(";"), ...filas].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `procedimientos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Informes() {
  const usuario = useUsuario();
  const { actual, estado } = useFiltros();
  const puedeExportar = puede(usuario.rol, "exportar");
  const conDatos = puede(usuario.rol, "ver_datos_personales");

  return (
    <MarcoAnalisis titulo="Informes" subtitulo="Exportar los datos filtrados o imprimir el panel">
      <div className="analisis">
        <BarraFiltros />
        <div className="informes">
          <Tarjeta titulo="Datos para Excel" subtitulo={`${numero(actual.length)} procedimientos de los últimos ${estado.periodo} días, con sus tiempos por etapa.`}>
            <p className="pequeno texto-2" style={{ marginBottom: 12 }}>
              {conDatos ? "Incluye la dirección. Trátalo como información reservada." : "Sin datos personales ni direcciones: solo unidad vecinal y barrio."}
            </p>
            <Boton variante="primario" icono="descargar" disabled={!puedeExportar || actual.length === 0} onClick={() => exportarCsv(actual, conDatos)}>
              Descargar planilla (CSV para Excel)
            </Boton>
          </Tarjeta>
          <Tarjeta titulo="Informe para imprimir o PDF" subtitulo="Abre el panel de jefatura y usa «Imprimir» del navegador; elige «Guardar como PDF».">
            <Boton icono="imprimir" onClick={() => window.print()}>
              Imprimir esta página
            </Boton>
            <p className="pequeno texto-3" style={{ marginTop: 12 }}>
              El informe mensual en PDF con formato para el concejo se generará en el servidor al conectar la base de datos, y cada descarga quedará en la auditoría.
            </p>
          </Tarjeta>
          <Tarjeta titulo="Power BI u otras herramientas" subtitulo="Opcional, para equipos que ya trabajan con Power BI">
            <p className="pequeno texto-2">
              Al conectar la base, se entrega la vista <code>v_tiempos_procedimiento</code> con un usuario de solo lectura y sin datos personales. Tiene las mismas fórmulas que este panel.
            </p>
          </Tarjeta>
        </div>
      </div>
    </MarcoAnalisis>
  );
}
