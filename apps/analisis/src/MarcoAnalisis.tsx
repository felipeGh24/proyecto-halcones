import type { ReactNode } from "react";
import { Marco } from "@plataforma/ui";

export function MarcoAnalisis({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <Marco
      titulo={titulo}
      subtitulo={subtitulo}
      nav={[
        { a: "/panel", texto: "Panel de jefatura", icono: "grafico" },
        { a: "/patrones", texto: "Patrones e inteligencia", icono: "capas" },
        { a: "/informes", texto: "Informes", icono: "documento" },
      ]}
    >
      {children}
    </Marco>
  );
}
