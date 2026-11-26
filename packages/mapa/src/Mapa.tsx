import { useEffect, useRef, useState } from "react";
import {
  Map as MapaGL,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { agregarAvenidas, agregarLugares, calleEn, LUGARES, primeraCapaDeTexto, resolverEstilo, type TipoLugar } from "./base";
import { agregarCallesLocales, agregarSatelite, etiquetarCalles, modoCallesLocales } from "./callesLocales";
import {
  ESTADOS,
  ESTADOS_MOVIL,
  LIMITES_COMUNA,
  obtenerClave,
  semaforoDeClave,
  SEMAFOROS,
  UNIDADES_VECINALES,
  esActivo,
  BARRIOS,
  centroideUV,
  calleEnPunto,
  type PuntoFijo,
  type Movil,
  type PuntoInteres,
  type Procedimiento,
  type Punto,
} from "@plataforma/datos";

/**
 * Motor de mapas único de la plataforma (MapLibre GL).
 *
 * Mapa base con calles: ver base.ts (OpenFreeMap por defecto, configurable con VITE_MAPA_ESTILO_URL).
 * Si el mapa base no carga, se muestran solo las unidades vecinales sobre fondo claro y todo sigue funcionando.
 */

export function configurarWorkerMapa(url: string) {
  setWorkerUrl(url);
}

const TIPOS_PUNTO_LETRA: Record<PuntoInteres["tipo"], string> = { municipal: "M", salud: "S", bomberos: "B", policia: "C", metro: "M", educacion: "E", seguridad: "P", otro: "•" };

/** Zoom desde el cual se ocultan los nombres de barrio y aparecen los números de UV. */
const ZOOM_CERCA = 14.3;

export interface Capas {
  unidadesVecinales: boolean;
  procedimientos: boolean;
  moviles: boolean;
  calor: boolean;
  recorridos: boolean;
  avenidas: boolean;
  salud: boolean;
  bomberos: boolean;
  policia: boolean;
  municipal: boolean;
}

export const CAPAS_INICIALES: Capas = {
  unidadesVecinales: true,
  procedimientos: true,
  moviles: true,
  calor: false,
  recorridos: true,
  avenidas: false,
  salud: false,
  bomberos: false,
  policia: false,
  municipal: false,
};

export type Seleccion = { tipo: "procedimiento" | "movil"; id: string } | null;

/** Marca sobre el mapa (recomendación del motor de patrones, foco, etc.). */
export interface MarcaMapa {
  id: string;
  punto: Punto;
  texto: string;
  tipo: "punto_fijo" | "patrullaje" | "alza" | "respuesta" | "personal" | "reporte";
  titulo?: string;
}

/** Colores claros por barrio: ayudan a ubicarse sin competir con el semáforo de los procedimientos. */
export const COLORES_BARRIO: Record<string, string> = {
  "Barrio Central": "#FDE2E1",
  "Barrio Vivaceta-Barón": "#DCFCE7",
  "Barrio Balneario": "#E0F2FE",
  "Barrio El Cortijo": "#FEF9C3",
  "Barrio Vespucio Oriente": "#EDE9FE",
  "Barrio Sur": "#FFEDD5",
  "Barrio Juanita Aguirre": "#CCFBF1",
};

/** Escala secuencial azul (claro → oscuro) para valores 0–1. */
export function colorSecuencial(t: number) {
  const x = Math.max(0, Math.min(1, t));
  const m = (a: number, b: number) => Math.round(a + (b - a) * x);
  return `rgb(${m(239, 23)}, ${m(244, 37)}, ${m(255, 84)})`;
}

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
  /** Valor 0–1 por unidad vecinal: pinta cada UV con la escala secuencial (mapa coroplético). */
  coropleta?: Record<number, number> | null;
  /** Muestra los nombres de los 7 barrios y los números de UV. */
  etiquetas?: { barrios?: boolean; uvs?: boolean };
  marcas?: MarcaMapa[];
  onMarca?: (id: string) => void;
  /** Pinta cada barrio con su color claro (por defecto sí, salvo que haya mapa coroplético). */
  colorBarrios?: boolean;
  /** Puntos de interés propios del municipio (edificios municipales, sedes, etc.). */
  puntosInteres?: PuntoInteres[];
  /** Nombre de la calle más cercana al punto tocado. */
  onCalle?: (nombre: string | null) => void;
  /** Puntos fijos del municipio (personal apostado). */
  puntosFijos?: PuntoFijo[];
  /** Id del punto de interés o punto fijo destacado (por ejemplo, el GAMA elegido en los filtros). */
  resaltado?: string | null;
  /** Muestra el selector «Plano / Satélite» (por defecto sí, salvo en mapas compactos). */
  conSatelite?: boolean;
}

/** Las etiquetas de barrio y UV son solo texto: no deben ser botones para el teclado ni para lectores de pantalla. */
function etiquetaDecorativa(marker: Marker) {
  const el = marker.getElement();
  el.removeAttribute("role");
  el.removeAttribute("aria-label");
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  return marker;
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
        // Segunda señal además del color: rojo grande, amarillo mediano, verde chico.
        tamano: { rojo: 9, amarillo: 7, verde: 5.5 }[semaforoDeClave(p.claveNumero)],
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
  coropleta = null,
  etiquetas,
  marcas = [],
  onMarca,
  colorBarrios = true,
  puntosInteres = [],
  onCalle,
  puntosFijos = [],
  resaltado = null,
  conSatelite,
}: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const pin = useRef<Marker | null>(null);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState("");
  const [conBase, setConBase] = useState(false);
  const [cerca, setCerca] = useState(false);
  const [fondo, setFondo] = useState<"plano" | "satelite">("plano");
  const [sinSatelite, setSinSatelite] = useState(false);
  const fondoRef = useRef(fondo);
  fondoRef.current = fondo;
  const capas = { ...CAPAS_INICIALES, ...capasParciales };

  // Callbacks siempre actuales sin recrear el mapa.
  const cb = useRef({ onSeleccionar, onClicMapa, onMoverMarcador, onMarca, onCalle });
  cb.current = { onSeleccionar, onClicMapa, onMoverMarcador, onMarca, onCalle };
  const puntosHtml = useRef<Marker[]>([]);
  const marcadoresHtml = useRef<Marker[]>([]);
  const etiquetasHtml = useRef<Marker[]>([]);

  useEffect(() => {
    if (!contenedor.current) return;
    let cancelado = false;
    let m: MapaGL | null = null;
    let obs: ResizeObserver | null = null;
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "mapa-popup" });
    void resolverEstilo().then((estilo) => {
    if (cancelado || !contenedor.current) return;
    const base = typeof estilo === "string";
    try {
      m = new MapaGL({
        container: contenedor.current,
        style: estilo,
        bounds: [
          [LIMITES_COMUNA.minLng, LIMITES_COMUNA.minLat],
          [LIMITES_COMUNA.maxLng, LIMITES_COMUNA.maxLat],
        ],
        fitBoundsOptions: { padding: compacto ? 16 : 40 },
        attributionControl: { compact: true, customAttribution: "Calles © colaboradores de OpenStreetMap" },
        maxBounds: [
          [LIMITES_COMUNA.minLng - 0.06, LIMITES_COMUNA.minLat - 0.05],
          [LIMITES_COMUNA.maxLng + 0.06, LIMITES_COMUNA.maxLat + 0.05],
        ],
        dragRotate: false,
      });
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo iniciar el mapa");
      return;
    }
    const mm = m as MapaGL;
    mapa.current = mm;
    setConBase(base);
    mm.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    const actualizarCerca = () => setCerca(mm.getZoom() >= ZOOM_CERCA);
    mm.on("zoomend", actualizarCerca);

    mm.on("load", () => {
      const m = mm;
      const antesDeTextos = base ? primeraCapaDeTexto(m) : undefined;
      if (base) agregarAvenidas(m, antesDeTextos);
      m.addSource("uv", { type: "geojson", data: UNIDADES_VECINALES as unknown as Parameters<GeoJSONSource["setData"]>[0] });
      // Con calles, las UV van semitransparentes y debajo de los nombres de calles para no estorbar la lectura.
      m.addLayer({ id: "uv-relleno", type: "fill", source: "uv", paint: { "fill-color": "#FFFFFF", "fill-opacity": base ? 0.05 : 1 } }, antesDeTextos);
      m.addLayer({ id: "uv-borde", type: "line", source: "uv", paint: { "line-color": base ? "#667085" : "#98A2B3", "line-width": base ? 1.2 : 1, "line-opacity": base ? 0.7 : 1 } }, antesDeTextos);
      // Fotos satelitales debajo de todo lo nuestro; calles propias cuando no hay mapa base (o sobre el satélite).
      agregarSatelite(m, "uv-relleno");
      agregarCallesLocales(m, base ? "oculto" : "plano");
      if (base) agregarLugares(m);

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
          "circle-radius": ["case", ["==", ["get", "critica"], 1], 10, ["get", "tamano"]],
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
        cb.current.onCalle?.((base && fondoRef.current === "plano" ? calleEn(m, e.point.x, e.point.y) : null) ?? calleEnPunto({ lat: e.lngLat.lat, lng: e.lngLat.lng })?.nombre ?? null);
        cb.current.onClicMapa?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        if (!cb.current.onClicMapa) cb.current.onSeleccionar?.(null);
      });
      actualizarCerca();
      setListo(true);
    });
    mm.on("error", (e) => {
      if ((e as unknown as { sourceId?: string }).sourceId === "satelite") setSinSatelite(true);
      else console.warn("[mapa]", e.error?.message);
    });
    const quitarEtiquetas = etiquetarCalles(mm, () => fondoRef.current === "satelite");
    mm.once("remove", quitarEtiquetas);
    obs = new ResizeObserver(() => mm.resize());
    obs.observe(contenedor.current);
    });
    return () => {
      cancelado = true;
      obs?.disconnect();
      popup.remove();
      (m as MapaGL | null)?.remove();
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

  // Mapa coroplético: cada UV con el color de su valor.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    if (!coropleta) {
      if (colorBarrios) {
        const expr: unknown[] = ["match", ["get", "barrio"]];
        for (const [b, c] of Object.entries(COLORES_BARRIO)) expr.push(b, c);
        expr.push("#FFFFFF");
        m.setPaintProperty("uv-relleno", "fill-color", expr as never);
        m.setPaintProperty("uv-relleno", "fill-opacity", fondo === "satelite" ? 0 : conBase ? 0.28 : 0.5);
      } else {
        m.setPaintProperty("uv-relleno", "fill-color", "#FFFFFF");
        m.setPaintProperty("uv-relleno", "fill-opacity", fondo === "satelite" ? 0 : conBase ? 0.05 : 0.3);
      }
      return;
    }
    const expr: unknown[] = ["match", ["get", "uv"]];
    for (const [uv, v] of Object.entries(coropleta)) expr.push(Number(uv), colorSecuencial(v));
    expr.push("#FFFFFF");
    m.setPaintProperty("uv-relleno", "fill-color", expr as never);
    m.setPaintProperty("uv-relleno", "fill-opacity", conBase ? 0.55 : 1);
  }, [listo, coropleta, colorBarrios, conBase, fondo]);

  // Plano o satélite: con satélite se ven las fotos, las calles propias encima en blanco y sus nombres.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo || !m.getLayer("satelite")) return;
    m.setLayoutProperty("satelite", "visibility", fondo === "satelite" ? "visible" : "none");
    modoCallesLocales(m, fondo === "satelite" ? "satelite" : conBase ? "oculto" : "plano");
    m.setPaintProperty("uv-borde", "line-color", fondo === "satelite" ? "#FFFFFF" : conBase ? "#667085" : "#98A2B3");
    m.fire("moveend");
  }, [listo, fondo, conBase]);

  // Nombres de barrios y números de UV (marcadores HTML: no dependen de fuentes del proveedor de mapas).
  const conBarrios = !!etiquetas?.barrios;
  const conUVs = !!etiquetas?.uvs;
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    etiquetasHtml.current.forEach((x) => x.remove());
    etiquetasHtml.current = [];
    if (conUVs || conBarrios) {
      for (const f of UNIDADES_VECINALES.features) {
        const c = centroideUV(f.properties.uv);
        if (!c) continue;
        const el = document.createElement("span");
        el.className = "mapa-etiqueta-uv";
        el.textContent = String(f.properties.uv);
        etiquetasHtml.current.push(etiquetaDecorativa(new Marker({ element: el })).setLngLat([c.lng, c.lat]).addTo(m));
      }
    }
    if (conBarrios) {
      for (const b of BARRIOS) {
        const cs = UNIDADES_VECINALES.features.filter((f) => f.properties.barrio === b).map((f) => centroideUV(f.properties.uv)!).filter(Boolean);
        const c = { lat: cs.reduce((s, x) => s + x.lat, 0) / cs.length, lng: cs.reduce((s, x) => s + x.lng, 0) / cs.length };
        const el = document.createElement("span");
        el.className = "mapa-etiqueta-barrio";
        el.textContent = b.replace(/^Barrio /, "");
        etiquetasHtml.current.push(etiquetaDecorativa(new Marker({ element: el })).setLngLat([c.lng, c.lat]).addTo(m));
      }
    }
  }, [listo, conBarrios, conUVs]);

  // Marcas del motor de patrones.
  const firmaMarcas = marcas.map((x) => `${x.id}:${x.punto.lat}:${x.punto.lng}`).join("|");
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    marcadoresHtml.current.forEach((x) => x.remove());
    marcadoresHtml.current = marcas.map((x) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `mapa-marca mapa-marca--${x.tipo}`;
      el.textContent = x.texto;
      el.title = x.titulo ?? x.texto;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        cb.current.onMarca?.(x.id);
      });
      return new Marker({ element: el }).setLngLat([x.punto.lng, x.punto.lat]).addTo(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, firmaMarcas]);

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
    if (m.getLayer("avenidas")) m.setLayoutProperty("avenidas", "visibility", vis(capas.avenidas));
    for (const t of Object.keys(LUGARES) as TipoLugar[]) {
      if (!m.getLayer(`lugar-${t}`)) continue;
      m.setLayoutProperty(`lugar-${t}`, "visibility", vis(capas[t]));
      m.setLayoutProperty(`lugar-${t}-texto`, "visibility", vis(capas[t]));
    }
  }, [listo, capas.unidadesVecinales, capas.procedimientos, capas.moviles, capas.calor, capas.recorridos, capas.avenidas, capas.salud, capas.bomberos, capas.policia, capas.municipal]);

  // Puntos de interés del municipio (recintos GAMA, asistenciales, otros) que ya tienen ubicación.
  // Una estación de metro que además es punto fijo se muestra una sola vez (como punto fijo).
  const conUbicacion = puntosInteres.filter(
    (p) => p.ubicacion && !(p.tipo === "metro" && puntosFijos.some((f) => f.activo && f.ubicacion && Math.abs(f.ubicacion.lat - p.ubicacion!.lat) < 0.0005 && Math.abs(f.ubicacion.lng - p.ubicacion!.lng) < 0.0005)),
  );
  const firmaPuntos = conUbicacion.map((p) => `${p.id}:${p.ubicacion!.lat}:${p.ubicacion!.lng}`).join("|");
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    puntosHtml.current.forEach((x) => x.remove());
    puntosHtml.current = conUbicacion.map((p) => {
      const el = document.createElement("span");
      el.className = `mapa-poi mapa-poi--${p.tipo} ${p.estimado ? "mapa-poi--estimado" : ""} ${p.id === resaltado ? "mapa-poi--resaltado" : ""}`;
      el.textContent = p.corto ?? TIPOS_PUNTO_LETRA[p.tipo];
      const titulo = `${p.codigo ? `${p.codigo} · ` : ""}${p.nombre}${p.direccion ? ` · ${p.direccion}` : ""}${p.horario ? ` · ${p.horario}` : ""}${p.estimado ? " · ubicación calculada, confírmala" : ""}`;
      el.title = titulo;
      const mk = new Marker({ element: el }).setLngLat([p.ubicacion!.lng, p.ubicacion!.lat]).addTo(m);
      mk.getElement().setAttribute("aria-label", titulo);
      if (p.id === resaltado) mk.setPopup(new Popup({ closeButton: false, offset: 16, className: "mapa-popup" }).setText(titulo)).togglePopup();
      return mk;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, firmaPuntos, resaltado]);

  // Puntos fijos: pin con «PF» y el nombre.
  const firmaFijos = puntosFijos.filter((p) => p.ubicacion).map((p) => `${p.id}:${p.ubicacion!.lat}:${p.ubicacion!.lng}:${p.nombre}`).join("|");
  const fijosHtml = useRef<Marker[]>([]);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo) return;
    fijosHtml.current.forEach((x) => x.remove());
    fijosHtml.current = puntosFijos
      .filter((p) => p.ubicacion && p.activo)
      .map((p) => {
        const el = document.createElement("span");
        el.className = `mapa-pf ${p.id === resaltado ? "mapa-pf--resaltado" : ""}`;
        el.innerHTML = `<b>PF</b><span></span>`;
        (el.lastChild as HTMLElement).textContent = p.nombre;
        el.title = `Punto fijo · ${p.nombre}${p.direccion ? ` · ${p.direccion}` : ""}`;
        const mk = new Marker({ element: el, anchor: "left" }).setLngLat([p.ubicacion!.lng, p.ubicacion!.lat]).addTo(m);
        mk.getElement().setAttribute("aria-label", el.title);
        return mk;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, firmaFijos, resaltado]);

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
    <div className={`mapa ${cerca ? "mapa--cerca" : ""} ${etiquetas?.uvs ? "mapa--uv-siempre" : ""} ${className ?? ""}`}>
      <div ref={contenedor} className="mapa__lienzo" />
      {fallo && <div className="mapa__aviso">No se pudo mostrar el mapa en este equipo ({fallo}).</div>}
      {listo && !fallo && (conSatelite ?? !compacto) && (
        <div className="mapa__fondo" role="group" aria-label="Fondo del mapa">
          <button type="button" aria-pressed={fondo === "plano"} onClick={() => setFondo("plano")}>
            Plano
          </button>
          <button type="button" aria-pressed={fondo === "satelite"} onClick={() => { setSinSatelite(false); setFondo("satelite"); }}>
            Satélite
          </button>
        </div>
      )}
      {fondo === "satelite" && sinSatelite && (
        <div className="mapa__base" role="status">
          Las fotos satelitales necesitan internet y aquí no cargaron; las calles siguen visibles.
        </div>
      )}
    </div>
  );
}
