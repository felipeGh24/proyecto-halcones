import { useState } from "react";
import { avisar, Boton } from "./componentes";

/** Texto con el formato oficial, listo para copiar o compartir (por ejemplo, al grupo de WhatsApp). */
export function TextoParaCompartir({ texto, titulo }: { texto: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const puedeCompartir = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <section className="texto-compartir" aria-label={titulo}>
      <div className="texto-compartir__cabeza">
        <strong>{titulo}</strong>
        <span className="pequeno texto-3">Mismo formato que usa el equipo</span>
      </div>
      <pre className="texto-compartir__texto">{texto}</pre>
      <div className="texto-compartir__acciones">
        <Boton
          icono={copiado ? "check" : "documento"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
              avisar("Texto copiado: pégalo en el grupo");
            } catch {
              avisar("No se pudo copiar: mantén presionado el texto para seleccionarlo");
            }
          }}
        >
          {copiado ? "Copiado" : "Copiar texto"}
        </Boton>
        {puedeCompartir && (
          <Boton
            variante="primario"
            icono="enviar"
            onClick={() => {
              navigator.share({ text: texto }).catch(() => undefined);
            }}
          >
            Compartir
          </Boton>
        )}
      </div>
    </section>
  );
}
