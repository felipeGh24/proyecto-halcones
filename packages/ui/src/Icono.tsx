/** Íconos de trazo propios (sin dependencias). 24×24, se pintan con currentColor. */
const TRAZOS = {
  escudo: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z",
  inicio: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
  lista: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  mapa: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  auto: "M5 16h14M5 16v2M19 16v2M3 13l2-6h14l2 6v3H3v-3zM7 13h.01M17 13h.01",
  personas: "M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 11a4 4 0 100-8 4 4 0 000 8zM22 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  reloj: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  grafico: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  documento: "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6M8 13h8M8 17h5",
  capas: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  ajustes: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  salir: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  mas: "M12 5v14M5 12h14",
  cerrar: "M18 6L6 18M6 6l12 12",
  buscar: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  pin: "M12 21s-7-6.2-7-12a7 7 0 1114 0c0 5.8-7 12-7 12zM12 11a2 2 0 100-4 2 2 0 000 4z",
  enviar: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  check: "M20 6L9 17l-5-5",
  alerta: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  ojo: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  ojoNo: "M17.9 17.9A10.1 10.1 0 0112 19c-7 0-11-7-11-7a19 19 0 015.1-5.9M9.9 4.2A9.6 9.6 0 0112 4c7 0 11 7 11 7a19 19 0 01-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 11-4.2-4.2",
  candado: "M5 11h14v10H5V11zM8 11V7a4 4 0 118 0v4",
  descargar: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  imprimir: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  telefono: "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z",
  navegar: "M3 11l19-9-9 19-2-8-8-2z",
  sirena: "M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M6 18v-6a6 6 0 0112 0v6M4 18h16v3H4z",
  flecha: "M5 12h14M13 6l6 6-6 6",
  atras: "M19 12H5M11 18l-6-6 6-6",
  pantalla: "M3 4h18v12H3zM8 20h8M12 16v4",
  filtro: "M22 3H2l8 9.5V19l4 2v-8.5L22 3z",
  camara: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 17a4 4 0 100-8 4 4 0 000 8z",
  video: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  actualizar: "M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5",
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 18, className, titulo }: { nombre: NombreIcono; tamano?: number; className?: string; titulo?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
    >
      {titulo && <title>{titulo}</title>}
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
