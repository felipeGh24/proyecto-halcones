import { useEffect, useRef, useState } from "react";
import {
  Map as MapaGL,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ESTADOS,
  ESTADOS_MOVIL,
  LIMITES_COMUNA,
  obtenerClave,
  semaforoDeClave,
  SEMAFOROS,
  UNIDADES_VECINALES,
  esActivo,
  type Movil,
  type Procedimiento,
  type Punto,
} from "@plataforma/datos";

/**
 * Motor de mapas único de la plataforma (MapLibre GL).
 *
 * Mapa base: si existe VITE_MAPA_ESTILO_URL (proveedor contratado, clave restringida por dominio) se usa ese estilo.
 * Sin proveedor, el mapa muestra solo los límites de las unidades vecinales sobre fondo claro: sirve para la demo
 * y no depende de servidores gratuitos de terceros.
 */

export function configurarWorkerMapa(url: string) {
  setWorkerUrl(url);
}

const ESTILO_URL: string = (import.meta.env?.VITE_MAPA_ESTILO_URL as string | undefined)?.trim() ?? "";
export const TIENE_MAPA_BASE = ESTILO_URL.length > 0;

const ESTILO_DEMO: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "fondo", type: "background", paint: { "background-color": "#F4F6FA" } }],
};

export interface Capas {
  unidadesVecinales: boolean;
  procedimientos: boolean;
  moviles: boolean;
  calor: boolean;
  recorridos: boolean;
}

export const CAPAS_INICIALES: Capas = { unidadesVecinales: true, procedimientos: true, moviles: true, calor: false, recorridos: true };

export type Seleccion = { tipo: "procedimiento" | "movil"; id: string } | null;

interface PropsMapa {
  procedimientos?: Procedimiento[];
  /** Procedimientos para el mapa de calor (normalmente el histórico filtrado). */
  calor?: Procedimiento[];
  moviles?: Movil[];
  capas?: Partial<Capas>;
  seleccion?: Seleccion;
  onSeleccionar?: (s: Seleccion) => void;
  onClicMapa?: (p: Punto) => void;
  /** Marcador arrastrable para fijar una ubicación exacta. */
  marcador?: Punto | null;
  onMoverMarcador?: (p: Punto) => void;
  /** Centrar y acercar a este punto cuando cambie. */
  enfocar?: Punto | null;
  className?: string;
  compacto?: boolean;
}

function fcProcedimientos(procs: Procedimiento[], seleccionId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: procs.map((p) => ({
      type: "Feature" as const,
      id: Number(p.id.replace(/\D/g, "")),
      properties: {
        id: p.id,
        color: SEMAFOROS[semaforoDeClave(p.claveNumero)].color,
        critica: obtenerClave(p.claveNumero)?.prioridad === "critica" ? 1 : 0,
        sel: p.id === seleccionId ? 1 : 0,
        titulo: `${p.folio} · ${p.claveNumero} ${obtenerClave(p.claveNumero)?.nombre ?? ""}`,
        estado: ESTADOS[p.estado].etiqueta,
      },
      geometry: { type: "Point" as const, coordinates: [p.ubicacion.lng, p.ubicacion.lat] },
    })),
  };
}

const COLOR_MOVIL: Record<Movil["estado"], string> = {
  sin_turno: "#98A2B3",
  disponible: "#0F766E",
  asignado: "#1D4ED8",
  en_procedimiento: "#1D4ED8",
  fuera_de_servicio: "#98A2B3",
};

function fcMoviles(moviles: Movil[], seleccionId: string | null) {
  const ahora = Date.now();
  return {
    type: "FeatureCollection" as const,
    // Los móviles sin turno están en el cuartel: no se dibujan.
    features: moviles.filter((m) => m.estado !== "sin_turno").map((m) => {
      const sinSenal = ahora - new Date(m.ultimaSenal).getTime() > 2 * 60000;
      return {
        type: "Feature" as const,
        properties: {
          id: m.id,
          color: sinSenal ? "#98A2B3" : COLOR_MOVIL[m.estado],
          sel: m.id === seleccionId ? 1 : 0,
          titulo: `${m.nombre}${m.turno ? ` (${m.turno.patrullero})` : ""} · ${ESTADOS_MOVIL[m.estado].etiqueta}${sinSenal ? " · sin señal reciente" : ""}`,
          ocupado: m.estado === "asignado" || m.estado === "en_procedimiento" ? 1 : 0,
        },
        geometry: { type: "Point" as const, coordinates: [m.posicion.lng, m.posicion.lat] },
      };
    }),
  };
}

function fcRecorridos(procs: Procedimiento[], moviles: Movil[]) {
  return {
    type: "FeatureCollection" as const,
    features: procs
      .filter((p) => p.movilId && (p.estado === "asignado" || p.estado === "en_desplazamiento"))
      .flatMap((p) => {
        const m = moviles.find((x) => x.id === p.movilId);
        return m
          ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[m.posicion.lng, m.posicion.lat], [p.ubicacion.lng, p.ubicacion.lat]] } }]
          : [];
      }),
  };
}

function fcCalor(procs: Procedimiento[]) {
  return {
    type: "FeatureCollection" as const,
    features: procs.map((p) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [p.ubicacion.lng, p.ubicacion.lat] } })),
  };
}

export function Mapa({
  procedimientos = [],
  calor = [],
  moviles = [],
  capas: capasParciales,
  seleccion = null,
  onSeleccionar,
  onClicMapa,
  marcador,
  onMoverMarcador,
  enfocar,
  className,
  compacto,
}: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const pin = useRef<Marker | null>(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState("");
  const capas = { ...CAPAS_INICIALES, ...capasParciales };

  // Callbacks siempre actuales sin recrear el mapa.
  const cb = useRef({ onSeleccionar, onClicMapa, onMoverMarcador });
  cb.current = { onSeleccionar, onClicMapa, onMoverMarcador };

  useEffect(() => {
    if (!contenedor.current) return;
    let m: MapaGL;
    try {
      m = new MapaGL({
        container: contenedor.current,
        style: ESTILO_URL || ESTILO_DEMO,
        bounds: [
          [LIMITES_COMUNA.minLng, LIMITES_COMUNA.minLat],
          [LIMITES_COMUNA.maxLng, LIMITES_COMUNA.maxLat],
        ],
        fitBoundsOptions: { padding: compacto ? 16 : 40 },
        attributionControl: TIENE_MAPA_BASE ? {} : false,
        dragRotate: false,
      });
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo iniciar el mapa");
      return;
    }
    mapa.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "mapa-popup" });

    m.on("load", () => {
      m.addSource("uv", { type: "geojson", data: UNIDADES_VECINALES as unknown as Parameters<GeoJSONSource["setData"]>[0] });
      m.addLayer({ id: "uv-relleno", type: "fill", source: "uv", paint: { "fill-color": "#FFFFFF", "fill-opacity": TIENE_MAPA_BASE ? 0.05 : 1 } });
      m.addLayer({ id: "uv-borde", type: "line", source: "uv", paint: { "line-color": "#98A2B3", "line-width": 1 } });

      m.addSource("calor", { type: "geojson", data: fcCalor([]) });
      m.addLayer({
        id: "calor",
        type: "heatmap",
        source: "calor",
        layout: { visibility: "none" },
        paint: {
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 12, 14, 16, 34],
          "heatmap-intensity": 0.7,
          "heatmap-opacity": 0.75,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(29,78,216,0)", 0.2, "#c7d7fe", 0.45, "#84adff", 0.7, "#2970ff", 1, "#1d2b6b"],
        },
      });

      m.addSource("recorridos", { type: "geojson", data: fcRecorridos([], []) });
      m.addLayer({ id: "recorridos", type: "line", source: "recorridos", paint: { "line-color": "#1D4ED8", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.8 } });

      m.addSource("procedimientos", { type: "geojson", data: fcProcedimientos([], null) });
      m.addLayer({
        id: "proc-halo",
        type: "circle",
        source: "procedimientos",
        filter: ["any", ["==", ["get", "sel"], 1], ["==", ["get", "critica"], 1]],
        paint: { "circle-radius": ["case", ["==", ["get", "sel"], 1], 17, 14], "circle-color": ["get", "color"], "circle-opacity": 0.18 },
      });
      m.addLayer({
        id: "procedimientos",
        type: "circle",
        source: "procedimientos",
        paint: {
          "circle-radius": ["case", ["==", ["get", "critica"], 1], 9, 7],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": ["case", ["==", ["get", "sel"], 1], 3, 2],
        },
      });

      m.addSource("moviles", { type: "geojson", data: fcMoviles([], null) });
      m.addLayer({
        id: "moviles",
        type: "circle",
        source: "moviles",
        paint: {
          "circle-radius": ["case", ["==", ["get", "sel"], 1], 9, 6],
          "circle-color": "#FFFFFF",
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": ["case", ["==", ["get", "ocupado"], 1], 4, 3],
        },
      });

      for (const capa of ["procedimientos", "moviles"] as const) {
        m.on("mouseenter", capa, (e: MapLayerMouseEvent) => {
          m.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (f) popup.setLngLat(e.lngLat).setText(String(f.properties.titulo)).addTo(m);
        });
        m.on("mouseleave", capa, () => {
          m.getCanvas().style.cursor = "";
          popup.remove();
        });
        m.on("click", capa, (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (f) cb.current.onSeleccionar?.({ tipo: capa === "procedimientos" ? "procedimiento" : "movil", id: String(f.properties.id) });
          e.originalEvent.stopPropagation();
        });
      }
      m.on("click", (e) => {
        const tocados = m.queryRenderedFeatures(e.point, { layers: ["procedimientos", "moviles"] });
        if (tocados.length) return;
        cb.current.onClicMapa?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        if (!cb.current.onClicMapa) cb.current.onSeleccionar?.(null);
      });
      setListo(true);
    });
    m.on("error", (e) => console.warn("[mapa]", e.error?.message));

    const obs = new ResizeObserver(() => m.resize());
    obs.observe(contenedor.current);
    return () => {
      obs.disconnect();
      popup.remove();
      m.remove();
      mapa.current = null;
      setListo(false);
    };
    // El mapa se crea una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selProc = seleccion?.tipo === "procedimiento" ? seleccion.id : null;
  const selMovil = seleccion?.tipo === "movil" ? seleccion.id : null;

  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    (m.getSource("procedimientos") as GeoJSONSource).setData(fcProcedimientos(procedimientos.filter((p) => esActivo(p.estado) || p.id === selProc), selProc));
    (m.getSource("moviles") as GeoJSONSource).setData(fcMoviles(moviles, selMovil));
    (m.getSource("recorridos") as GeoJSONSource).setData(fcRecorridos(procedimientos, moviles));
    (m.getSource("calor") as GeoJSONSource).setData(fcCalor(calor));
  }, [listo, procedimientos, moviles, calor, selProc, selMovil]);

  const vis = (b: boolean) => (b ? "visible" : "none");
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    m.setLayoutProperty("uv-borde", "visibility", vis(capas.unidadesVecinales));
    m.setLayoutProperty("procedimientos", "visibility", vis(capas.procedimientos));
    m.setLayoutProperty("proc-halo", "visibility", vis(capas.procedimientos));
    m.setLayoutProperty("moviles", "visibility", vis(capas.moviles));
    m.setLayoutProperty("calor", "visibility", vis(capas.calor));
    m.setLayoutProperty("recorridos", "visibility", vis(capas.recorridos));
  }, [listo, capas.unidadesVecinales, capas.procedimientos, capas.moviles, capas.calor, capas.recorridos]);

  // Marcador arrastrable para la ubicación exacta.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    if (!marcador) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    if (!pin.current) {
      pin.current = new Marker({ draggable: true, color: "#1D4ED8" }).setLngLat([marcador.lng, marcador.lat]).addTo(m);
      pin.current.on("dragend", () => {
        const ll = pin.current!.getLngLat();
        cb.current.onMoverMarcador?.({ lat: ll.lat, lng: ll.lng });
      });
    } else {
      pin.current.setLngLat([marcador.lng, marcador.lat]);
    }
  }, [listo, marcador]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !enfocar) return;
    m.easeTo({ center: [enfocar.lng, enfocar.lat], zoom: Math.max(m.getZoom(), 14.5), duration: 500 });
  }, [listo, enfocar]);

  return (
    <div className={`mapa ${className ?? ""}`}>
      <div ref={contenedor} className="mapa__lienzo" />
      {fallo && <div className="mapa__aviso">No se pudo mostrar el mapa en este equipo ({fallo}).</div>}
      {!TIENE_MAPA_BASE && !fallo && !compacto && <div className="mapa__base">Sin mapa base: se muestran los límites de las unidades vecinales (demo)</div>}
    </div>
  );
}
