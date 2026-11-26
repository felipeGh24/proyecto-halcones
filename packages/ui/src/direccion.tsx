import { useEffect, useRef, useState } from "react";
import { buscarDirecciones, type SugerenciaDireccion } from "@plataforma/datos";
import { Icono } from "./Icono";

/**
 * Dirección con sugerencias de Conchalí.
 * Escribir «Independencia 3499» o «Independencia con La Palma» propone el punto; elegirlo lo marca en el mapa.
 * Usa el callejero propio de Conchalí (funciona sin internet); con internet completa con OpenStreetMap.
 * Entiende esquinas escritas de muchas formas («con», «esquina», «y», «/», «&», «c/»), abreviaturas y errores de tipeo.
 */
export function EntradaDireccion({
  id,
  valor,
  onCambio,
  onElegir,
  error,
  placeholder = "Calle y número, o esquina (ej.: Independencia con La Palma)",
  grande,
  buscador = buscarDirecciones,
  marca,
}: {
  id: string;
  valor: string;
  onCambio: (t: string) => void;
  onElegir: (s: SugerenciaDireccion) => void;
  error?: boolean;
  placeholder?: string;
  grande?: boolean;
  /** Otro buscador (por ejemplo, Google Maps para crear procedimientos). */
  buscador?: (texto: string, signal?: AbortSignal) => Promise<SugerenciaDireccion[]>;
  /** Texto pequeño que indica de dónde salen las sugerencias («Google Maps»). */
  marca?: string;
}) {
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
  const [estado, setEstado] = useState<"quieto" | "buscando" | "sin" | "error">("quieto");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const escrito = useRef(false);

  useEffect(() => {
    if (!escrito.current || valor.trim().length < 3) {
      setSugerencias([]);
      setEstado("quieto");
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setEstado("buscando");
      try {
        const r = await buscador(valor, ctl.signal);
        setSugerencias(r);
        setActivo(0);
        setEstado(r.length ? "quieto" : "sin");
        setAbierto(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setEstado("error");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [valor]);

  async function elegir(s: SugerenciaDireccion) {
    escrito.current = false;
    onCambio(s.texto);
    setAbierto(false);
    setSugerencias([]);
    if (!s.resolver) {
      setEstado("quieto");
      return onElegir(s);
    }
    setEstado("buscando");
    try {
      onElegir({ ...s, punto: await s.resolver() });
      setEstado("quieto");
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="ui-direccion">
      <div className="ui-direccion__control">
        <input
          id={id}
          className={`ui-entrada ${grande ? "ui-entrada--grande" : ""} ${error ? "ui-entrada--error" : ""}`}
          role="combobox"
          aria-expanded={abierto && sugerencias.length > 0}
          aria-controls={`${id}-sugerencias`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => {
            escrito.current = true;
            onCambio(e.target.value);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (!sugerencias.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActivo((a) => Math.min(a + 1, sugerencias.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && abierto) {
              e.preventDefault();
              void elegir(sugerencias[activo]);
            }
          }}
        />
        {estado === "buscando" ? (
          <span className="ui-direccion__estado" aria-live="polite">Buscando…</span>
        ) : (
          marca && <span className="ui-direccion__estado ui-direccion__marca">{marca}</span>
        )}
      </div>
      {abierto && sugerencias.length > 0 && (
        <ul id={`${id}-sugerencias`} role="listbox" className="ui-direccion__lista">
          {sugerencias.map((s, i) => (
            <li
              key={`${s.texto}-${i}`}
              role="option"
              aria-selected={i === activo}
              className={i === activo ? "activo" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                void elegir(s);
              }}
            >
              <Icono nombre="pin" tamano={16} />
              <span>
                <strong>{s.texto}</strong>
                <span className="pequeno texto-3"> · {s.detalle}</span>
                {s.aproximado && <span className="ui-direccion__aprox">confirma el punto</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {estado === "sin" && abierto && <span className="ui-campo__ayuda">No encontré esa dirección en Conchalí. Prueba con la esquina (ej.: «Dorsal con Guanaco») o marca el punto en el mapa.</span>}
      {estado === "error" && <span className="ui-campo__ayuda">El buscador no respondió: marca el punto en el mapa.</span>}
    </div>
  );
}
