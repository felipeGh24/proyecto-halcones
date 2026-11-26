/**
 * Pantallas de la Central en un bloque aparte: el celular del patrullero no descarga el mapa ni los tableros.
 */
import workerMapa from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { configurarWorkerMapa } from "@plataforma/mapa";

configurarWorkerMapa(workerMapa);

export { Tablero } from "./Tablero";
export { ListaProcedimientos } from "./ListaProcedimientos";
export { Moviles } from "./Moviles";
export { Bitacora } from "./Bitacora";
export { Reportes } from "./Reportes";
export { Claves } from "./Claves";
export { Ajustes } from "./Ajustes";
export { TurnosCentral } from "./TurnosCentral";
