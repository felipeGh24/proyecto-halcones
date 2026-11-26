import { SEMAFOROS } from "@plataforma/datos";

/** Leyenda del mapa: el color siempre va con su texto. */
export function LeyendaMapa() {
  return (
    <div className="mapa-leyenda" aria-label="Leyenda del mapa">
      <strong>Procedimientos</strong>
      {(["rojo", "amarillo", "verde"] as const).map((s) => (
        <span key={s}>
          <i style={{ background: SEMAFOROS[s].color }} />
          {s === "rojo" ? "Crítica o alta" : s === "amarillo" ? "Media" : "Baja"}
        </span>
      ))}
      <strong>Móviles</strong>
      <span>
        <i className="anillo" style={{ borderColor: "#0F766E" }} />
        Disponible
      </span>
      <span>
        <i className="anillo grueso" style={{ borderColor: "#1D4ED8" }} />
        Asignado
      </span>
      <span>
        <i className="anillo" style={{ borderColor: "#98A2B3" }} />
        Fuera de servicio o sin señal
      </span>
    </div>
  );
}

/** Escala del mapa coroplético. */
export function EscalaCoropleta({ titulo, min, max }: { titulo: string; min: string; max: string }) {
  return (
    <div className="mapa-escala">
      <strong style={{ color: "var(--texto)" }}>{titulo}</strong>
      <span className="mapa-escala__barra" aria-hidden />
      <span className="mapa-escala__extremos">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </div>
  );
}
