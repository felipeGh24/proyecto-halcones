import { useEffect, useRef, useState } from "react";
import { buscarDirecciones, geocodificadorActivo, type SugerenciaDireccion } from "@plataforma/datos";
import { Icono } from "./Icono";

/**
 * Dirección con sugerencias de Conchalí.
 * Escribir «Independencia 3499» o «Independencia con La Palma» propone el punto; elegirlo lo marca en el mapa.
 * Si el buscador no responde (sin internet o servicio caído), el campo sigue funcionando como texto libre.
 */
export function EntradaDireccion({
  id,
  valor,
  onCambio,
  onElegir,
  error,
  placeholder = "Calle y número, o esquina (ej.: Independencia con La Palma)",
  grande,
}: {
  id: string;
  valor: string;
  onCambio: (t: string) => void;
  onElegir: (s: SugerenciaDireccion) => void;
  error?: boolean;
  placeholder?: string;
  grande?: boolean;
}) {
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
  const [estado, setEstado] = useState<"quieto" | "buscando" | "sin" | "error">("quieto");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const escrito = useRef(false);

  useEffect(() => {
    if (!escrito.current || !geocodificadorActivo() || valor.trim().length < 4) {
      setSugerencias([]);
      setEstado("quieto");
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setEstado("buscando");
      try {
        const r = await buscarDirecciones(valor, ctl.signal);
        setSugerencias(r);
        setActivo(0);
        setEstado(r.length ? "quieto" : "sin");
        setAbierto(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setEstado("error");
      }
    }, 650);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [valor]);

  function elegir(s: SugerenciaDireccion) {
    escrito.current = false;
    onCambio(s.texto);
    onElegir(s);
    setAbierto(false);
    setSugerencias([]);
    setEstado("quieto");
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
              elegir(sugerencias[activo]);
            }
          }}
        />
        {estado === "buscando" && <span className="ui-direccion__estado" aria-live="polite">Buscando…</span>}
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
                elegir(s);
              }}
            >
              <Icono nombre="pin" tamano={16} />
              <span>
                <strong>{s.texto}</strong>
                <span className="pequeno texto-3"> · {s.tipo === "esquina" ? "esquina" : s.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {estado === "sin" && abierto && <span className="ui-campo__ayuda">No encontré esa dirección en Conchalí: marca el punto en el mapa.</span>}
      {estado === "error" && <span className="ui-campo__ayuda">Buscador de direcciones no disponible: marca el punto en el mapa.</span>}
    </div>
  );
}
