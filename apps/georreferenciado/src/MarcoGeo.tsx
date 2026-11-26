import type { ReactNode } from "react";
import { Marco } from "@plataforma/ui";

export function MarcoGeo({ titulo, subtitulo, acciones, children }: { titulo: string; subtitulo?: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <Marco
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      nav={[
        { a: "/mapa", texto: "Mapa en vivo", icono: "mapa" },
        { a: "/historico", texto: "Histórico y calor", icono: "capas" },
        { a: "/muro", texto: "Pantalla de muro", icono: "pantalla" },
      ]}
    >
      {children}
    </Marco>
  );
}
