import { useState } from "react";
import { CLAVES, infoDeClave, normalizar, type Semaforo as TipoSemaforo } from "@plataforma/datos";
import { Segmentos, Semaforo } from "@plataforma/ui";
import { MarcoCentral } from "./MarcoCentral";

/** Catálogo completo de las 81 claves con su semáforo y tiempo de respuesta esperado. */
export function Claves() {
  const [semaforo, setSemaforo] = useState<TipoSemaforo | "todos">("todos");
  const [texto, setTexto] = useState("");
  const q = normalizar(texto.trim());
  const lista = CLAVES.filter((c) => (semaforo === "todos" || infoDeClave(c.numero).semaforo === semaforo) && (!q || normalizar(`${c.numero} ${c.nombre}`).includes(q)));
  const cuenta = (s: TipoSemaforo) => CLAVES.filter((c) => infoDeClave(c.numero).semaforo === s).length;

  return (
    <MarcoCentral titulo="Claves" subtitulo={`${CLAVES.length} claves de procedimiento`}>
      <div className="pagina">
        <div className="barra-filtros">
          <Segmentos<TipoSemaforo | "todos">
            etiqueta="Semáforo"
            valor={semaforo}
            onCambio={setSemaforo}
            opciones={[
              { valor: "todos", texto: `Todas ${CLAVES.length}` },
              { valor: "rojo", texto: `Rojo ${cuenta("rojo")}` },
              { valor: "amarillo", texto: `Amarillo ${cuenta("amarillo")}` },
              { valor: "verde", texto: `Verde ${cuenta("verde")}` },
            ]}
          />
          <input className="ui-entrada" style={{ maxWidth: 320 }} type="search" placeholder="Buscar número o nombre" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar clave" />
        </div>
        <div className="ui-tarjeta tabla-contenedor">
          <table className="ui-tabla">
            <thead>
              <tr>
                <th className="derecha">N.º</th>
                <th>Nombre</th>
                <th>Semáforo</th>
                <th>Respuesta esperada</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.numero}>
                  <td className="derecha num">
                    <strong>{c.numero}</strong>
                  </td>
                  <td>{c.nombre}</td>
                  <td>
                    <Semaforo claveNumero={c.numero} />
                  </td>
                  <td className="texto-2">{infoDeClave(c.numero).respuesta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MarcoCentral>
  );
}
