import { CONOS_ESPERADOS, EQUIPAMIENTO, ESTADO_MOVIL, type ChecklistMovil } from "@plataforma/datos";
import { Campo, Segmentos } from "@plataforma/ui";
export { TextoParaCompartir } from "@plataforma/ui";

/**
 * Checklist del móvil con el formato oficial del municipio: estado del móvil, urea, equipamiento,
 * otros accesorios y novedades. Viene marcado «todo bien»: el patrullero solo toca lo que está distinto.
 */
export function FormularioChecklist({ valor, onCambio }: { valor: ChecklistMovil; onCambio: (c: ChecklistMovil) => void }) {
  const cambiar = (parcial: Partial<ChecklistMovil>) => onCambio({ ...valor, ...parcial });
  return (
    <>
      <fieldset className="checklist">
        <legend>Estado del móvil</legend>
        {ESTADO_MOVIL.map((i) => (
          <div key={i.id} className="checklist__item checklist__item--apilado">
            <span>{i.nombre}</span>
            <Segmentos etiqueta={i.nombre} valor={valor.estado[i.id] ?? i.opciones[0]} onCambio={(v) => cambiar({ estado: { ...valor.estado, [i.id]: v } })} opciones={i.opciones.map((o) => ({ valor: o, texto: o }))} />
          </div>
        ))}
        <Campo etiqueta="Capacidad de urea (%)" htmlFor="urea" ayuda="Déjalo vacío si el móvil no usa urea.">
          <input
            id="urea"
            className="ui-entrada"
            inputMode="numeric"
            placeholder="Ej.: 79"
            value={valor.urea ?? ""}
            onChange={(e) => {
              const n = e.target.value.replace(/\D/g, "").slice(0, 3);
              cambiar({ urea: n === "" ? null : Math.min(100, Number(n)) });
            }}
          />
        </Campo>
      </fieldset>

      <fieldset className="checklist">
        <legend>Equipamiento</legend>
        {EQUIPAMIENTO.map((i) => (
          <Contador key={i.id} nombre={i.nombre} valor={valor.equipamiento[i.id] ?? 0} esperado={i.esperado} onCambio={(n) => cambiar({ equipamiento: { ...valor.equipamiento, [i.id]: n } })} />
        ))}
      </fieldset>

      <fieldset className="checklist">
        <legend>Otros accesorios</legend>
        <Contador nombre="Conos" valor={valor.conos} esperado={CONOS_ESPERADOS} onCambio={(n) => cambiar({ conos: n })} />
        <div className="checklist__item checklist__item--apilado">
          <span>Aseo interior</span>
          <Segmentos etiqueta="Aseo interior" valor={valor.aseoInterior} onCambio={(v) => cambiar({ aseoInterior: v })} opciones={[{ valor: "Con aseo", texto: "Con aseo" }, { valor: "Sin aseo", texto: "Sin aseo" }]} />
        </div>
      </fieldset>

      <Campo etiqueta="Novedades" htmlFor="novedades-movil" ayuda="Lo que el próximo turno o mantención debe saber del móvil.">
        <textarea id="novedades-movil" className="ui-entrada" value={valor.novedades} maxLength={500} onChange={(e) => cambiar({ novedades: e.target.value })} />
      </Campo>
    </>
  );
}

function Contador({ nombre, valor, esperado, onCambio }: { nombre: string; valor: number; esperado: number; onCambio: (n: number) => void }) {
  const falta = valor < esperado;
  return (
    <div className={`contador ${falta ? "contador--falta" : ""}`}>
      <span className="contador__nombre">
        {nombre}
        {falta && <span className="contador__aviso"> · faltan {esperado - valor}</span>}
      </span>
      <button type="button" className="contador__boton" aria-label={`Quitar uno: ${nombre}`} disabled={valor <= 0} onClick={() => onCambio(valor - 1)}>
        −
      </button>
      <output className="contador__valor" aria-live="polite" aria-label={`${nombre}: ${valor}`}>
        {valor}
      </output>
      <button type="button" className="contador__boton" aria-label={`Agregar uno: ${nombre}`} disabled={valor >= 20} onClick={() => onCambio(valor + 1)}>
        +
      </button>
    </div>
  );
}

