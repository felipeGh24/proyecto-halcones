import { useId, useState } from "react";
import { buscarClaves, infoDeClave, obtenerClave } from "@plataforma/datos";
import { Semaforo } from "@plataforma/ui";

/** Buscador de claves por número o nombre, con teclado (↑ ↓ Enter) y semáforo visible. */
export function BuscadorClave({ valor, onElegir, error }: { valor: number | null; onElegir: (n: number | null) => void; error?: string }) {
  const id = useId();
  const elegida = valor != null ? obtenerClave(valor) : undefined;
  const [texto, setTexto] = useState(elegida ? `${elegida.numero} · ${elegida.nombre}` : "");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  // Sin texto se listan las 81 claves en orden; al escribir se filtra por número o nombre.
  const opciones = buscarClaves(elegida && texto === `${elegida.numero} · ${elegida.nombre}` ? "" : texto, 81);

  function elegir(n: number) {
    const c = obtenerClave(n)!;
    onElegir(n);
    setTexto(`${c.numero} · ${c.nombre}`);
    setAbierto(false);
  }

  return (
    <div className="buscador-clave">
      <label className="ui-campo__etiqueta" htmlFor={id}>
        Clave
      </label>
      <div className="buscador-clave__control">
        <input
          id={id}
          className={`ui-entrada ${error ? "ui-entrada--error" : ""}`}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Escribe número o nombre (ej.: 67 o robo) o elige de la lista"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            setActivo(0);
            onElegir(null);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
              setActivo((a) => Math.min(a + 1, opciones.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && abierto && opciones[activo]) {
              e.preventDefault();
              elegir(opciones[activo].numero);
            }
          }}
        />
        {elegida && (
          <span className="buscador-clave__semaforo">
            <Semaforo claveNumero={elegida.numero} />
          </span>
        )}
      </div>
      {abierto && opciones.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="buscador-clave__lista">
          {opciones.map((c, i) => (
            <li
              key={c.numero}
              role="option"
              aria-selected={i === activo}
              className={i === activo ? "activa" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(c.numero);
              }}
              onMouseEnter={() => setActivo(i)}
            >
              <span className="num buscador-clave__num">{c.numero}</span>
              <span>{c.nombre}</span>
              <span style={{ marginLeft: "auto" }}>
                <Semaforo claveNumero={c.numero} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <span className="ui-campo__error">{error}</span>
      ) : elegida ? (
        <span className="ui-campo__ayuda">Respuesta esperada: {infoDeClave(elegida.numero).respuesta}</span>
      ) : null}
    </div>
  );
}
