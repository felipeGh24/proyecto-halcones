import type { ReactNode } from "react";
import { accesoTotalActivo, esActivo, puede, turnoCentralAbierto, TURNOS, useDatos } from "@plataforma/datos";
import { Marco, useUsuario } from "@plataforma/ui";
import { BarraTurnoCentral, PuertaCentral } from "./TurnoCentral";

/**
 * Marco común de la Central con la navegación y los contadores en vivo.
 * Antes de operar se exige abrir el turno de Central (PuertaCentral).
 */
export function MarcoCentral({ titulo, subtitulo, acciones, children }: { titulo: string; subtitulo?: string; acciones?: ReactNode; children: ReactNode }) {
  const { procedimientos, moviles, reportes, turnosCentral } = useDatos();
  const usuario = useUsuario();
  const turno = turnoCentralAbierto(turnosCentral, usuario.id);
  const sinLeer = reportes.filter((r) => !r.leidoPorCentral).length;
  const activos = procedimientos.filter((p) => esActivo(p.estado)).length;
  const disponibles = moviles.filter((m) => m.estado === "disponible").length;
  return (
    <PuertaCentral>
    <Marco
      titulo={titulo}
      subtitulo={subtitulo}
      persona={turno ? { nombre: turno.nombre, detalle: `Halcón ${turno.halcon} · Turno ${TURNOS[turno.turno].etiqueta}` } : undefined}
      acciones={
        <>
          {acciones}
          <BarraTurnoCentral />
        </>
      }
      nav={[
        { a: "/central", texto: "Tablero", icono: "inicio", fin: true },
        { a: "/central/procedimientos", texto: "Procedimientos", icono: "lista", cuenta: activos },
        { a: "/central/moviles", texto: "Móviles", icono: "auto", cuenta: disponibles },
        { a: "/central/reportes", texto: "Reportes de terreno", icono: "documento", cuenta: sinLeer || undefined },
        { a: "/central/bitacora", texto: "Bitácora del turno", icono: "reloj" },
        { a: "/central/turnos", texto: "Turnos de la Central", icono: "personas" },
        { a: "/central/claves", texto: "Claves (81)", icono: "filtro" },
        ...(puede(usuario.rol, "configurar") ? [{ a: "/central/ajustes", texto: "Ajustes de la demo", icono: "ajustes" as const }] : []),
        // En la demo cualquiera puede probar la app del patrullero desde la Central.
        ...(accesoTotalActivo() || usuario.rol === "administrador" ? [{ a: "/patrulla", texto: "App del patrullero", icono: "telefono" as const }] : []),
      ]}
    >
      {children}
    </Marco>
    </PuertaCentral>
  );
}
