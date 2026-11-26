import type { ReactNode } from "react";
import { esActivo, useDatos } from "@plataforma/datos";
import { Marco } from "@plataforma/ui";

/** Marco común de la Central con la navegación y los contadores en vivo. */
export function MarcoCentral({ titulo, subtitulo, acciones, children }: { titulo: string; subtitulo?: string; acciones?: ReactNode; children: ReactNode }) {
  const { procedimientos, moviles } = useDatos();
  const activos = procedimientos.filter((p) => esActivo(p.estado)).length;
  const disponibles = moviles.filter((m) => m.estado === "disponible").length;
  return (
    <Marco
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      nav={[
        { a: "/central", texto: "Tablero", icono: "inicio", fin: true },
        { a: "/central/procedimientos", texto: "Procedimientos", icono: "lista", cuenta: activos },
        { a: "/central/moviles", texto: "Móviles", icono: "auto", cuenta: disponibles },
        { a: "/central/bitacora", texto: "Bitácora del turno", icono: "reloj" },
      ]}
    >
      {children}
    </Marco>
  );
}
