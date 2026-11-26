import { useSyncExternalStore } from "react";
import { obtenerClave } from "./claves";
import { datosVacios, generarDemo, folio, type DatosDemo } from "./demo/semilla";
import { esActivo, SIGUIENTE } from "./estados";
import { distanciaMetros, unidadVecinalDe } from "./geo";
import { accesoTotalActivo } from "./auth";
import { ESTADOS } from "./estados";
import { resumirTurnoCentral } from "./turno-central";
import type { Adjunto, CierreTurno, EstadoUnidad, UnidadAsignada, EstadoMovil, EstadoProcedimiento, Movil, Procedimiento, Punto, RegistroAccion, RegistroTurno, Reporte, TipoAccion, TipoReporte, Turno, TurnoCentral, TurnoMovil, TurnoPersonal, Usuario } from "./tipos";

/**
 * Cliente de datos de la plataforma.
 *
 * Las pantallas solo conocen esta interfaz. Hoy la implementa `ClienteDemo` (navegador, datos de ejemplo,
 * sincronizado entre pestañas del mismo sitio). Al conectar Supabase se agrega `ClienteSupabase` con la misma
 * interfaz (tablas + Realtime) y ninguna pantalla cambia.
 */
export interface NuevoProcedimiento {
  claveNumero: number;
  descripcion: string;
  direccion: string;
  ubicacion: Punto;
}

export interface Instantanea {
  procedimientos: Procedimiento[];
  moviles: Movil[];
  personal: TurnoPersonal[];
  historialTurnos: RegistroTurno[];
  reportes: Reporte[];
  auditoria: RegistroAccion[];
  turnosCentral: TurnoCentral[];
  actualizadoEn: number;
}

export interface CambiosProcedimiento {
  claveNumero?: number;
  direccion?: string;
  descripcion?: string;
  ubicacion?: Punto;
}

export interface InicioTurnoCentral {
  nombre: string;
  halcon: string;
  turno: Turno;
  novedadesRecepcion: string;
}

export interface NuevoReporte {
  tipo: TipoReporte;
  halcon: string;
  unidad: string;
  patrullero: string;
  direccion: string;
  ubicacion: Punto | null;
  procedimientoId: string | null;
  observaciones: string;
  adjuntos: Adjunto[];
}

export interface ClienteDatos {
  instantanea(): Instantanea;
  suscribir(fn: () => void): () => void;
  crearProcedimiento(datos: NuevoProcedimiento, por: Usuario): Procedimiento;
  /** Deja una unidad (móvil, punto fijo o a pie) a cargo del procedimiento. Si había otra a cargo, queda libre. */
  despachar(procedimientoId: string, unidadId: string, por: Usuario): void;
  /** Envía varias unidades: la primera queda a cargo si aún no hay una; el resto va de apoyo. */
  agregarUnidades(procedimientoId: string, unidadIds: string[], por: Usuario): void;
  /** Libera una unidad de apoyo (vuelve a estar disponible). */
  liberarUnidad(procedimientoId: string, unidadId: string, por: Usuario, nota?: string): void;
  /** La unidad de apoyo informa su avance: en camino, en el lugar, terminó. */
  actualizarUnidad(procedimientoId: string, unidadId: string, estado: EstadoUnidad, por: Usuario): void;
  /** El patrullero confirma que vio el aviso. */
  confirmarAviso(procedimientoId: string, unidadId: string, por: Usuario): void;
  cambiarEstado(
    procedimientoId: string,
    estado: EstadoProcedimiento,
    por: Usuario,
    extra?: { nota?: string; resultado?: string; ubicacion?: Punto },
  ): void;
  pedirApoyo(movilId: string, por: Usuario, ubicacion: Punto): Procedimiento;
  /** Corrige clave, dirección, descripción o punto. Queda registrado qué cambió y quién lo cambió. */
  editarProcedimiento(id: string, cambios: CambiosProcedimiento, por: Usuario, motivo?: string): void;
  /** Quien entra a la Central abre su turno (nombre, n.º de halcón, turno). */
  iniciarTurnoCentral(datos: InicioTurnoCentral, por: Usuario): TurnoCentral;
  /** Cierra el turno de Central: guarda el resumen de lo hecho y lo pendiente para el turno siguiente. */
  cerrarTurnoCentral(id: string, novedadesEntrega: string, por: Usuario): TurnoCentral;
  /** El patrullero abre su turno en un móvil: desde ese momento la Central puede despacharle. */
  iniciarTurno(movilId: string, turno: Omit<TurnoMovil, "usuarioId" | "iniciadoEn">, por: Usuario, posicion?: Punto): void;
  /** Cierra el turno del móvil (con kilometraje y novedades); queda sin turno y no recibe despachos. */
  cerrarTurno(movilId: string, por: Usuario, cierre?: CierreTurno): void;
  /** Turno de punto fijo o a pie (sin móvil). */
  iniciarTurnoPersonal(datos: Omit<TurnoPersonal, "id" | "usuarioId" | "iniciadoEn">, por: Usuario): TurnoPersonal;
  cerrarTurnoPersonal(id: string, por: Usuario, cierre?: CierreTurno): void;
  /** El patrullero envía un reporte a la Central. */
  enviarReporte(r: NuevoReporte, por: Usuario): Reporte;
  /** Añade texto, fotos o videos a un reporte ya enviado. */
  complementarReporte(id: string, texto: string, adjuntos: Adjunto[], por: Usuario): void;
  marcarReporteLeido(id: string, por?: Usuario): void;
  /** Solo demo: avanza un paso de la operación simulada. */
  simularPaso(): void;
  /** Solo demo: «vacio» deja la flota sin turnos ni procedimientos; «ejemplo» carga 90 días de datos ficticios. */
  reiniciar(modo?: "vacio" | "ejemplo", por?: Usuario): void;
  readonly modo: "demo" | "supabase";
}

const CLAVE_ALMACEN = "plataforma.datos.v6";
const CANAL = "plataforma-demo";

class ClienteDemo implements ClienteDatos {
  readonly modo = "demo" as const;
  private datos: DatosDemo & { actualizadoEn: number };
  private oyentes = new Set<() => void>();
  private canal: BroadcastChannel | null = null;
  private snap: Instantanea;

  constructor() {
    this.datos = this.cargar();
    this.snap = this.armarSnap();
    if (typeof BroadcastChannel !== "undefined") {
      this.canal = new BroadcastChannel(CANAL);
      this.canal.onmessage = () => this.recargarDesdeAlmacen();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === CLAVE_ALMACEN) this.recargarDesdeAlmacen();
      });
    }
  }

  private cargar(): DatosDemo & { actualizadoEn: number } {
    try {
      const raw = localStorage.getItem(CLAVE_ALMACEN);
      if (raw) return JSON.parse(raw);
    } catch {
      /* datos dañados: se regeneran */
    }
    // Se parte vacío: solo la flota. Los datos de ejemplo se cargan a pedido (Ajustes de la demo).
    const nuevo = { ...datosVacios(), actualizadoEn: Date.now() };
    this.guardarEn(nuevo);
    return nuevo;
  }

  private guardarEn(d: DatosDemo & { actualizadoEn: number }) {
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(d));
    } catch {
      /* sin espacio: la demo sigue en memoria */
    }
  }

  private recargarDesdeAlmacen() {
    try {
      const raw = localStorage.getItem(CLAVE_ALMACEN);
      if (!raw) return;
      this.datos = JSON.parse(raw);
      this.snap = this.armarSnap();
      this.oyentes.forEach((fn) => fn());
    } catch {
      /* se ignora una escritura a medias */
    }
  }

  private armarSnap(): Instantanea {
    return {
      auditoria: this.datos.auditoria ?? [],
      turnosCentral: this.datos.turnosCentral ?? [],
      procedimientos: this.datos.procedimientos,
      moviles: this.datos.moviles,
      personal: this.datos.personal ?? [],
      historialTurnos: this.datos.historialTurnos ?? [],
      reportes: this.datos.reportes ?? [],
      actualizadoEn: this.datos.actualizadoEn,
    };
  }

  private confirmar() {
    this.datos.actualizadoEn = Date.now();
    this.guardarEn(this.datos);
    this.snap = this.armarSnap();
    this.oyentes.forEach((fn) => fn());
    this.canal?.postMessage("cambio");
  }

  instantanea = () => this.snap;

  suscribir = (fn: () => void) => {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  };

  /** Nombre de quien actúa: si tiene turno de Central abierto, el nombre y halcón con que lo abrió. */
  private nombreDe(por: Usuario): string {
    const t = (this.datos.turnosCentral ?? []).find((x) => x.usuarioId === por.id && !x.cerradoEn);
    if (t) return `${t.nombre}${t.halcon ? ` (H${t.halcon})` : ""}`;
    const m = this.datos.moviles.find((x) => x.turno?.usuarioId === por.id);
    if (m?.turno) return `${m.turno.patrullero}${m.turno.halcon ? ` (H${m.turno.halcon})` : ""}`;
    const pz = (this.datos.personal ?? []).find((x) => x.usuarioId === por.id);
    if (pz) return `${pz.patrullero}${pz.halcon ? ` (H${pz.halcon})` : ""}`;
    return por.nombre;
  }

  /** Registro de acciones: quién hizo qué y cuándo. Se guardan las últimas 5.000. */
  private anotar(por: Usuario, accion: TipoAccion, detalle: string, proc?: Pick<Procedimiento, "id" | "folio">) {
    const a: RegistroAccion = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      en: new Date().toISOString(),
      usuarioId: por.id,
      nombre: this.nombreDe(por),
      rol: por.rol,
      accion,
      detalle,
      ...(proc ? { procedimientoId: proc.id, folio: proc.folio } : {}),
    };
    this.datos.auditoria = [a, ...(this.datos.auditoria ?? [])].slice(0, 5000);
  }

  private actualizarProc(id: string, fn: (p: Procedimiento) => Procedimiento) {
    this.datos.procedimientos = this.datos.procedimientos.map((p) => (p.id === id ? fn(p) : p));
  }

  private actualizarMovil(id: string | null, cambios: Partial<Movil>) {
    if (!id) return;
    this.datos.moviles = this.datos.moviles.map((m) => (m.id === id ? { ...m, ...cambios } : m));
  }

  crearProcedimiento(d: NuevoProcedimiento, por: Usuario): Procedimiento {
    if (!obtenerClave(d.claveNumero)) throw new Error("Clave inexistente");
    const uv = unidadVecinalDe(d.ubicacion);
    const n = ++this.datos.secuencia;
    const ahora = new Date().toISOString();
    const proc: Procedimiento = {
      id: `PROC-${n}`,
      folio: folio(n),
      claveNumero: d.claveNumero,
      descripcion: d.descripcion.trim(),
      direccion: d.direccion.trim(),
      ubicacion: d.ubicacion,
      unidadVecinal: uv?.uv ?? null,
      barrio: uv?.barrio ?? null,
      estado: "recibido",
      movilId: null,
      creadoEn: ahora,
      eventos: [{ estado: "recibido", en: ahora, porUsuarioId: por.id, porNombre: this.nombreDe(por) }],
    };
    this.datos.procedimientos = [...this.datos.procedimientos, proc];
    this.anotar(por, "crear", `Clave ${d.claveNumero} ${obtenerClave(d.claveNumero)?.nombre ?? ""} en ${proc.direccion}`, proc);
    this.confirmar();
    return proc;
  }

  /** Datos de una unidad en turno (móvil o personal) y si puede recibir un despacho. */
  private unidad(id: string): { tipo: "movil" | "personal"; nombre: string; patrullero: string; libre: boolean } | null {
    const m = this.datos.moviles.find((x) => x.id === id);
    if (m) return { tipo: "movil", nombre: m.nombre, patrullero: m.turno?.patrullero ?? "", libre: m.estado === "disponible" && !!m.turno };
    const t = (this.datos.personal ?? []).find((x) => x.id === id);
    if (t) return { tipo: "personal", nombre: t.modalidad === "punto_fijo" ? `Punto fijo · ${t.lugar}` : `A pie · ${t.lugar}`, patrullero: t.patrullero, libre: !t.procedimientoId };
    return null;
  }

  private ocupar(id: string, procedimientoId: string | null, estadoMovil: EstadoMovil = "asignado") {
    if (this.datos.moviles.some((m) => m.id === id)) this.actualizarMovil(id, { estado: procedimientoId ? estadoMovil : "disponible", procedimientoId });
    else this.datos.personal = (this.datos.personal ?? []).map((t) => (t.id === id ? { ...t, procedimientoId } : t));
  }

  private unidadesDe(p: Procedimiento): UnidadAsignada[] {
    if (p.unidades) return p.unidades;
    // Procedimientos anteriores a esta versión: solo tenían el móvil a cargo.
    if (!p.movilId) return [];
    const m = this.datos.moviles.find((x) => x.id === p.movilId);
    const asig = p.eventos.find((e) => e.estado === "asignado")?.en ?? p.creadoEn;
    return [{ id: p.movilId, tipo: "movil", nombre: m?.nombre ?? p.movilId, patrullero: m?.turno?.patrullero ?? "", aCargo: true, estado: esActivo(p.estado) ? "asignado" : "liberado", asignadoEn: asig, actualizadoEn: asig }];
  }

  despachar(procedimientoId: string, unidadId: string, por: Usuario) {
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc || !esActivo(proc.estado)) return;
    const u = this.unidad(unidadId);
    if (!u) return;
    const unidades = this.unidadesDe(proc);
    const yaEsta = unidades.find((x) => x.id === unidadId && x.estado !== "liberado");
    if (!u.libre && !yaEsta) throw new Error(`${u.nombre} no está disponible para despacho`);
    const ahora = new Date().toISOString();
    const anterior = unidades.find((x) => x.aCargo && x.estado !== "liberado" && x.id !== unidadId);
    // Si la nueva unidad ya estaba de apoyo, la anterior pasa a apoyo (sigue en el lugar).
    // Si es una unidad nueva (reasignación), la anterior queda libre.
    const anteriorSigue = !!yaEsta;
    if (anterior && !anteriorSigue) this.ocupar(anterior.id, null);
    const nuevas: UnidadAsignada[] = [
      ...unidades
        .filter((x) => x.id !== unidadId)
        .map((x) => (x.id === anterior?.id && !anteriorSigue ? { ...x, aCargo: false, estado: "liberado" as const, actualizadoEn: ahora } : { ...x, aCargo: false })),
      { id: unidadId, tipo: u.tipo, nombre: u.nombre, patrullero: u.patrullero, aCargo: true, estado: yaEsta?.estado ?? "asignado", asignadoEn: yaEsta?.asignadoEn ?? ahora, actualizadoEn: ahora },
    ];
    this.actualizarProc(procedimientoId, (p) => ({
      ...p,
      estado: p.estado === "recibido" ? "asignado" : p.estado,
      movilId: u.tipo === "movil" ? unidadId : null,
      unidades: nuevas,
      eventos: [...p.eventos, { estado: p.estado === "recibido" ? "asignado" : p.estado, en: ahora, porUsuarioId: por.id, porNombre: this.nombreDe(por), nota: anterior ? `Queda a cargo ${u.nombre} (antes ${anterior.nombre})` : `Despachado a ${u.nombre}` }],
    }));
    this.ocupar(unidadId, procedimientoId);
    this.anotar(por, "despachar", anterior ? `Queda a cargo ${u.nombre} (antes ${anterior.nombre})` : `A ${u.nombre} (${u.patrullero})`, proc);
    this.confirmar();
  }

  agregarUnidades(procedimientoId: string, unidadIds: string[], por: Usuario) {
    const proc0 = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc0 || !esActivo(proc0.estado) || !unidadIds.length) return;
    const ids = [...new Set(unidadIds)];
    let pendientes = ids;
    if (!this.unidadesDe(proc0).some((x) => x.aCargo && x.estado !== "liberado")) {
      this.despachar(procedimientoId, ids[0], por);
      pendientes = ids.slice(1);
    }
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId)!;
    const ahora = new Date().toISOString();
    const unidades = this.unidadesDe(proc);
    const agregadas: UnidadAsignada[] = [];
    const rechazadas: string[] = [];
    for (const id of pendientes) {
      if (unidades.some((x) => x.id === id && x.estado !== "liberado")) continue;
      const u = this.unidad(id);
      if (!u || !u.libre) {
        rechazadas.push(u?.nombre ?? id);
        continue;
      }
      agregadas.push({ id, tipo: u.tipo, nombre: u.nombre, patrullero: u.patrullero, aCargo: false, estado: "asignado", asignadoEn: ahora, actualizadoEn: ahora });
      this.ocupar(id, procedimientoId);
    }
    if (agregadas.length) {
      this.actualizarProc(procedimientoId, (p) => ({
        ...p,
        unidades: [...unidades.filter((x) => !agregadas.some((a) => a.id === x.id)), ...agregadas],
        eventos: [...p.eventos, { estado: p.estado, en: ahora, porUsuarioId: por.id, porNombre: this.nombreDe(por), nota: `Apoyo: ${agregadas.map((a) => a.nombre).join(", ")}` }],
      }));
      this.anotar(por, "despachar", `Apoyo: ${agregadas.map((a) => `${a.nombre} (${a.patrullero})`).join(", ")}`, proc);
    }
    this.confirmar();
    if (rechazadas.length) throw new Error(`No disponibles: ${rechazadas.join(", ")}`);
  }

  liberarUnidad(procedimientoId: string, unidadId: string, por: Usuario, nota = "") {
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc) return;
    const unidades = this.unidadesDe(proc);
    const u = unidades.find((x) => x.id === unidadId && x.estado !== "liberado");
    if (!u) return;
    if (u.aCargo && esActivo(proc.estado)) throw new Error("Es la unidad a cargo: primero deja a cargo a otra unidad.");
    const ahora = new Date().toISOString();
    this.actualizarProc(procedimientoId, (p) => ({ ...p, unidades: unidades.map((x) => (x.id === unidadId ? { ...x, estado: "liberado" as const, actualizadoEn: ahora } : x)) }));
    this.ocupar(unidadId, null);
    this.anotar(por, "despachar", `Libera a ${u.nombre}${nota ? ` · ${nota}` : ""}`, proc);
    this.confirmar();
  }

  actualizarUnidad(procedimientoId: string, unidadId: string, estado: EstadoUnidad, por: Usuario) {
    if (estado === "liberado") return this.liberarUnidad(procedimientoId, unidadId, por, "terminó su apoyo");
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc) return;
    const ahora = new Date().toISOString();
    const unidades = this.unidadesDe(proc);
    this.actualizarProc(procedimientoId, (p) => ({ ...p, unidades: unidades.map((x) => (x.id === unidadId ? { ...x, estado, actualizadoEn: ahora, recibidoEn: x.recibidoEn ?? ahora } : x)) }));
    if (estado === "en_el_lugar") this.ocupar(unidadId, procedimientoId, "en_procedimiento");
    const u = unidades.find((x) => x.id === unidadId);
    this.anotar(por, "estado", `${u?.nombre ?? unidadId}: ${estado === "en_camino" ? "en camino" : "en el lugar"} (apoyo)`, proc);
    this.confirmar();
  }

  confirmarAviso(procedimientoId: string, unidadId: string, _por: Usuario) {
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc) return;
    const ahora = new Date().toISOString();
    this.actualizarProc(procedimientoId, (p) => ({ ...p, unidades: this.unidadesDe(p).map((x) => (x.id === unidadId && !x.recibidoEn ? { ...x, recibidoEn: ahora } : x)) }));
    this.confirmar();
  }

  cambiarEstado(procedimientoId: string, estado: EstadoProcedimiento, por: Usuario, extra: { nota?: string; resultado?: string; ubicacion?: Punto } = {}) {
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    if (!proc || !esActivo(proc.estado)) return;
    const ahora = new Date().toISOString();
    this.actualizarProc(procedimientoId, (p) => ({
      ...p,
      estado,
      resultado: extra.resultado ?? p.resultado,
      eventos: [...p.eventos, { estado, en: ahora, porUsuarioId: por.id, porNombre: this.nombreDe(por), nota: extra.nota, ubicacion: extra.ubicacion }],
    }));
    const estadoMovil: Partial<Record<EstadoProcedimiento, EstadoMovil>> = {
      en_desplazamiento: "asignado",
      en_el_lugar: "en_procedimiento",
      en_procedimiento: "en_procedimiento",
      finalizado: "disponible",
      cancelado: "disponible",
    };
    this.anotar(
      por,
      estado === "cancelado" ? "cancelar" : "estado",
      `${ESTADOS[proc.estado].etiqueta} → ${ESTADOS[estado].etiqueta}${extra.nota ? ` · ${extra.nota}` : ""}${extra.resultado ? ` · ${extra.resultado}` : ""}`,
      proc,
    );
    const nuevo = estadoMovil[estado];
    if (nuevo && proc.movilId) {
      this.actualizarMovil(proc.movilId, {
        estado: nuevo,
        procedimientoId: nuevo === "disponible" ? null : procedimientoId,
        ...(estado === "en_el_lugar" ? { posicion: extra.ubicacion ?? proc.ubicacion, ultimaSenal: ahora } : {}),
      });
    }
    // Unidades: la de cargo sigue al procedimiento; al terminar, todas quedan libres.
    const unidades = this.unidadesDe(proc);
    if (unidades.length) {
      const fin = estado === "finalizado" || estado === "cancelado";
      const deCargo: Partial<Record<EstadoProcedimiento, EstadoUnidad>> = { en_desplazamiento: "en_camino", en_el_lugar: "en_el_lugar", en_procedimiento: "en_el_lugar" };
      if (fin) for (const u of unidades) if (u.estado !== "liberado" && !(u.aCargo && u.tipo === "movil")) this.ocupar(u.id, null);
      if (!fin && unidades.some((u) => u.aCargo && u.tipo === "personal")) {
        const pc = unidades.find((u) => u.aCargo)!;
        this.ocupar(pc.id, procedimientoId);
      }
      this.actualizarProc(procedimientoId, (p) => ({
        ...p,
        unidades: unidades.map((u) =>
          fin && u.estado !== "liberado"
            ? { ...u, estado: "liberado" as const, actualizadoEn: ahora }
            : u.aCargo && deCargo[estado]
              ? { ...u, estado: deCargo[estado]!, actualizadoEn: ahora, recibidoEn: u.recibidoEn ?? ahora }
              : u,
        ),
      }));
    }
    this.confirmar();
  }

  pedirApoyo(movilId: string, por: Usuario, ubicacion: Punto): Procedimiento {
    const movil = this.datos.moviles.find((m) => m.id === movilId);
    this.anotar(por, "apoyo", `Solicitud de apoyo desde ${movil?.nombre ?? por.nombre}`);
    return this.crearProcedimiento(
      { claveNumero: 57, descripcion: `Solicitud de apoyo desde ${movil?.nombre ?? por.nombre}.`, direccion: movil ? "Ubicación del móvil que solicita apoyo" : "Ubicación del patrullero que solicita apoyo", ubicacion },
      por,
    );
  }

  editarProcedimiento(id: string, cambios: CambiosProcedimiento, por: Usuario, motivo = "") {
    const p = this.datos.procedimientos.find((x) => x.id === id);
    if (!p) return;
    if (cambios.claveNumero != null && !obtenerClave(cambios.claveNumero)) throw new Error("Clave inexistente");
    const partes: string[] = [];
    if (cambios.claveNumero != null && cambios.claveNumero !== p.claveNumero) partes.push(`clave ${p.claveNumero} → ${cambios.claveNumero}`);
    if (cambios.direccion != null && cambios.direccion.trim() !== p.direccion) partes.push(`dirección «${p.direccion}» → «${cambios.direccion.trim()}»`);
    if (cambios.descripcion != null && cambios.descripcion.trim() !== p.descripcion) partes.push("descripción");
    const movido = cambios.ubicacion && (cambios.ubicacion.lat !== p.ubicacion.lat || cambios.ubicacion.lng !== p.ubicacion.lng);
    if (movido) partes.push(`punto (${Math.round(distanciaMetros(p.ubicacion, cambios.ubicacion!))} m)`);
    if (!partes.length) return;
    const uv = movido ? unidadVecinalDe(cambios.ubicacion!) : null;
    this.actualizarProc(id, (x) => ({
      ...x,
      claveNumero: cambios.claveNumero ?? x.claveNumero,
      direccion: cambios.direccion?.trim() ?? x.direccion,
      descripcion: cambios.descripcion?.trim() ?? x.descripcion,
      ...(movido ? { ubicacion: cambios.ubicacion!, unidadVecinal: uv?.uv ?? null, barrio: uv?.barrio ?? null } : {}),
    }));
    this.anotar(por, "editar", `${partes.join("; ")}${motivo.trim() ? ` · motivo: ${motivo.trim()}` : ""}`, p);
    this.confirmar();
  }

  iniciarTurnoCentral(d: InicioTurnoCentral, por: Usuario): TurnoCentral {
    if ((this.datos.turnosCentral ?? []).some((t) => t.usuarioId === por.id && !t.cerradoEn)) throw new Error("Ya tienes un turno de Central abierto");
    if (d.nombre.trim().length < 3) throw new Error("Escribe tu nombre");
    const t: TurnoCentral = {
      id: `tc-${Date.now()}`,
      usuarioId: por.id,
      nombre: d.nombre.trim(),
      halcon: d.halcon.trim(),
      rol: por.rol,
      turno: d.turno,
      iniciadoEn: new Date().toISOString(),
      cerradoEn: null,
      novedadesRecepcion: d.novedadesRecepcion.trim(),
      novedadesEntrega: "",
      resumen: null,
    };
    this.datos.turnosCentral = [t, ...(this.datos.turnosCentral ?? [])].slice(0, 1000);
    this.anotar({ ...por, nombre: t.nombre }, "turno_central", `Inicia turno de Central${t.halcon ? ` · Halcón ${t.halcon}` : ""}`);
    this.confirmar();
    return t;
  }

  cerrarTurnoCentral(id: string, novedadesEntrega: string, por: Usuario): TurnoCentral {
    const t = (this.datos.turnosCentral ?? []).find((x) => x.id === id);
    if (!t || t.cerradoEn) throw new Error("El turno ya está cerrado");
    if (t.usuarioId !== por.id && !accesoTotalActivo() && !["administrador", "supervisor"].includes(por.rol)) throw new Error("Sin permiso para cerrar este turno");
    this.anotar({ ...por, nombre: t.nombre }, "turno_central", `Cierra turno de Central${t.halcon ? ` · Halcón ${t.halcon}` : ""}`);
    const hasta = new Date().toISOString();
    this.datos.turnosCentral = this.datos.turnosCentral.map((x) => (x.id === id ? { ...x, cerradoEn: hasta } : x));
    const resumen = resumirTurnoCentral(this.armarSnap(), t.iniciadoEn, hasta);
    const cerrado: TurnoCentral = { ...t, cerradoEn: hasta, novedadesEntrega: novedadesEntrega.trim(), resumen };
    this.datos.turnosCentral = this.datos.turnosCentral.map((x) => (x.id === id ? cerrado : x));
    this.confirmar();
    return cerrado;
  }

  iniciarTurno(movilId: string, turno: Omit<TurnoMovil, "usuarioId" | "iniciadoEn">, por: Usuario, posicion?: Punto) {
    const m = this.datos.moviles.find((x) => x.id === movilId);
    if (!m || m.turno || m.estado === "fuera_de_servicio") throw new Error("El móvil no está disponible para iniciar turno");
    const ahora = new Date().toISOString();
    this.actualizarMovil(movilId, {
      estado: "disponible",
      turno: { ...turno, usuarioId: por.id, iniciadoEn: ahora },
      ultimaSenal: ahora,
      ...(posicion ? { posicion } : {}),
    });
    this.anotar(por, "turno_movil", `Inicia turno en ${m.nombre} · ${turno.patrullero}${turno.halcon ? ` · Halcón ${turno.halcon}` : ""} · km ${turno.kmInicial ?? "—"}`);
    this.confirmar();
  }

  cerrarTurno(movilId: string, por: Usuario, cierre: CierreTurno = {}) {
    const m = this.datos.moviles.find((x) => x.id === movilId);
    if (!m?.turno) return;
    if (m.turno.usuarioId !== por.id && !accesoTotalActivo() && !["administrador", "supervisor"].includes(por.rol)) throw new Error("Sin permiso para cerrar este turno");
    if (m.procedimientoId) throw new Error("El móvil tiene un procedimiento activo");
    if (cierre.kmFinal != null && m.turno.kmInicial != null && cierre.kmFinal < m.turno.kmInicial) {
      throw new Error(`El kilometraje final no puede ser menor que el inicial (${m.turno.kmInicial}).`);
    }
    this.registrar({
      usuarioId: m.turno.usuarioId,
      patrullero: m.turno.patrullero,
      acompanante: m.turno.acompanante,
      modalidad: "movil",
      unidad: m.nombre,
      iniciadoEn: m.turno.iniciadoEn,
      kmInicial: m.turno.kmInicial,
      ...cierre,
    });
    this.actualizarMovil(movilId, { estado: "sin_turno", turno: null, procedimientoId: null });
    this.anotar(por, "turno_movil", `Cierra turno de ${m.nombre}${cierre.kmFinal != null ? ` · km ${cierre.kmFinal}` : ""}${cierre.novedadesChecklist?.length ? ` · novedades: ${cierre.novedadesChecklist.join(", ")}` : ""}`);
    this.confirmar();
  }

  iniciarTurnoPersonal(datos: Omit<TurnoPersonal, "id" | "usuarioId" | "iniciadoEn">, por: Usuario): TurnoPersonal {
    if ((this.datos.personal ?? []).some((p) => p.usuarioId === por.id) || this.datos.moviles.some((m) => m.turno?.usuarioId === por.id)) {
      throw new Error("Ya tienes un turno abierto");
    }
    const t: TurnoPersonal = { ...datos, id: `pers-${Date.now()}`, usuarioId: por.id, iniciadoEn: new Date().toISOString() };
    this.datos.personal = [...(this.datos.personal ?? []), t];
    this.anotar(por, "turno_personal", `Inicia ${t.modalidad === "punto_fijo" ? "punto fijo" : "patrullaje a pie"} · ${t.lugar}`);
    this.confirmar();
    return t;
  }

  cerrarTurnoPersonal(id: string, por: Usuario, cierre: CierreTurno = {}) {
    const t = (this.datos.personal ?? []).find((p) => p.id === id);
    if (!t) return;
    if (t.procedimientoId) throw new Error("Tienes un procedimiento activo: termínalo o pide a la Central que te libere");
    if (t.usuarioId !== por.id && !accesoTotalActivo() && !["administrador", "supervisor"].includes(por.rol)) throw new Error("Sin permiso para cerrar este turno");
    this.anotar(por, "turno_personal", `Cierra turno · ${t.lugar}`);
    this.registrar({ usuarioId: t.usuarioId, patrullero: t.patrullero, acompanante: t.acompanante, modalidad: t.modalidad, unidad: t.lugar, iniciadoEn: t.iniciadoEn, kmInicial: null, ...cierre });
    this.datos.personal = (this.datos.personal ?? []).filter((p) => p.id !== id);
    this.confirmar();
  }

  private registrar(r: Omit<RegistroTurno, "id" | "cerradoEn" | "kmFinal" | "combustibleFinal" | "novedadesChecklist" | "observaciones"> & CierreTurno) {
    const registro: RegistroTurno = {
      id: `turno-${Date.now()}`,
      cerradoEn: new Date().toISOString(),
      kmFinal: r.kmFinal ?? null,
      combustibleFinal: r.combustibleFinal ?? null,
      novedadesChecklist: r.novedadesChecklist ?? [],
      observaciones: r.observaciones?.trim() ?? "",
      usuarioId: r.usuarioId,
      patrullero: r.patrullero,
      acompanante: r.acompanante,
      modalidad: r.modalidad,
      unidad: r.unidad,
      iniciadoEn: r.iniciadoEn,
      kmInicial: r.kmInicial,
    };
    this.datos.historialTurnos = [registro, ...(this.datos.historialTurnos ?? [])].slice(0, 500);
  }

  simularPaso() {
    const operador = { id: "sim", nombre: "Simulación", correo: "", rol: "operador" as const };
    const ahora = new Date().toISOString();
    // 1) Los móviles en camino se acercan a su destino; los disponibles se mueven un poco.
    this.datos.moviles = this.datos.moviles.map((m) => {
      if (m.estado === "fuera_de_servicio" || m.estado === "sin_turno") return m;
      const proc = m.procedimientoId ? this.datos.procedimientos.find((p) => p.id === m.procedimientoId) : null;
      if (proc && m.estado === "asignado") {
        const f = 0.35;
        return { ...m, ultimaSenal: ahora, posicion: { lat: m.posicion.lat + (proc.ubicacion.lat - m.posicion.lat) * f, lng: m.posicion.lng + (proc.ubicacion.lng - m.posicion.lng) * f } };
      }
      if (m.estado === "disponible") {
        const d = 0.0006;
        const p = { lat: m.posicion.lat + (Math.random() - 0.5) * d, lng: m.posicion.lng + (Math.random() - 0.5) * d };
        return { ...m, ultimaSenal: ahora, posicion: unidadVecinalDe(p) ? p : m.posicion };
      }
      return { ...m, ultimaSenal: ahora };
    });
    this.confirmar();
    // 2) Un procedimiento activo avanza un estado. Solo los móviles simulados: los turnos abiertos por una persona
    //    en la app del patrullero los avanza esa persona.
    const simulados = new Set(this.datos.moviles.filter((m) => m.turno?.usuarioId.startsWith("u-demo-")).map((m) => m.id));
    const candidatos = this.datos.procedimientos.filter((p) => p.movilId && simulados.has(p.movilId) && SIGUIENTE[p.estado]);
    if (candidatos.length && Math.random() < 0.6) {
      const p = candidatos[Math.floor(Math.random() * candidatos.length)];
      const sig = SIGUIENTE[p.estado]!;
      const movil = this.datos.moviles.find((m) => m.id === p.movilId);
      const llego = !movil || distanciaMetros(movil.posicion, p.ubicacion) < 150;
      if (sig !== "en_el_lugar" || llego) this.cambiarEstado(p.id, sig, operador, sig === "finalizado" ? { resultado: "Situación normalizada en el lugar." } : {});
    }
  }

  reiniciar(modo: "vacio" | "ejemplo" = "ejemplo", por?: Usuario) {
    // Los turnos de Central abiertos se conservan para no sacar a nadie de su turno.
    const abiertos = (this.datos.turnosCentral ?? []).filter((t) => !t.cerradoEn);
    this.datos = { ...(modo === "vacio" ? datosVacios() : generarDemo()), actualizadoEn: Date.now() };
    this.datos.turnosCentral = abiertos;
    if (por) this.anotar(por, "datos_demo", modo === "vacio" ? "Vació todos los datos de la demo" : "Cargó los datos de ejemplo");
    this.confirmar();
  }

  enviarReporte(r: NuevoReporte, por: Usuario): Reporte {
    const n = (this.datos.secuenciaReportes ?? 0) + 1;
    this.datos.secuenciaReportes = n;
    const uv = r.ubicacion ? unidadVecinalDe(r.ubicacion) : null;
    const reporte: Reporte = {
      ...r,
      id: `REP-${n}-${Date.now()}`,
      folio: `R-${String(n).padStart(5, "0")}`,
      creadoEn: new Date().toISOString(),
      usuarioId: por.id,
      direccion: r.direccion.trim(),
      observaciones: r.observaciones.trim(),
      unidadVecinal: uv?.uv ?? null,
      barrio: uv?.barrio ?? null,
      complementos: [],
      leidoPorCentral: false,
    };
    this.datos.reportes = [reporte, ...(this.datos.reportes ?? [])];
    this.anotar(por, "reporte", `${reporte.folio} · ${r.tipo === "patrullaje_preventivo" ? "Patrullaje preventivo" : r.tipo === "punto_estatico" ? "Punto estático" : "Procedimiento"} · ${reporte.direccion}`);
    this.confirmar();
    return reporte;
  }

  complementarReporte(id: string, texto: string, adjuntos: Adjunto[], por: Usuario) {
    const r = (this.datos.reportes ?? []).find((x) => x.id === id);
    if (!r) return;
    if (r.usuarioId !== por.id) throw new Error("Solo quien envió el reporte puede añadirle información");
    this.datos.reportes = this.datos.reportes.map((x) =>
      x.id === id ? { ...x, leidoPorCentral: false, complementos: [...x.complementos, { en: new Date().toISOString(), texto: texto.trim(), adjuntos }] } : x,
    );
    this.confirmar();
  }

  marcarReporteLeido(id: string, por?: Usuario) {
    const r = (this.datos.reportes ?? []).find((x) => x.id === id);
    if (por && r && !r.leidoPorCentral) this.anotar(por, "reporte_leido", r.folio);
    this.datos.reportes = (this.datos.reportes ?? []).map((x) => (x.id === id ? { ...x, leidoPorCentral: true } : x));
    this.confirmar();
  }
}

let cliente: ClienteDatos | null = null;

export function obtenerCliente(): ClienteDatos {
  if (!cliente) cliente = new ClienteDemo();
  return cliente;
}

/** Hook de React: devuelve los datos y se vuelve a pintar cuando cambian (en esta u otra pestaña). */
export function useDatos(): Instantanea {
  const c = obtenerCliente();
  return useSyncExternalStore(c.suscribir, c.instantanea, c.instantanea);
}

/** Móviles con turno abierto, para el despacho: primero los libres por cercanía, luego los ocupados. */
export function movilesEnTurno(moviles: Movil[], punto: Punto) {
  return moviles
    .filter((m) => m.turno && m.estado !== "fuera_de_servicio" && m.estado !== "sin_turno")
    .map((m) => ({ movil: m, metros: distanciaMetros(m.posicion, punto), libre: m.estado === "disponible" }))
    .sort((a, b) => Number(b.libre) - Number(a.libre) || a.metros - b.metros);
}

/** Móviles disponibles (con turno y sin procedimiento) ordenados por cercanía a un punto. */
export function movilesCercanos(moviles: Movil[], punto: Punto, limite = 5) {
  return moviles
    .filter((m) => m.estado === "disponible" && m.turno)
    .map((m) => ({ movil: m, metros: distanciaMetros(m.posicion, punto) }))
    .sort((a, b) => a.metros - b.metros)
    .slice(0, limite);
}

/** Turno de Central abierto de un usuario (o null si debe iniciarlo). */
export function turnoCentralAbierto(turnos: TurnoCentral[], usuarioId: string): TurnoCentral | null {
  return turnos.find((t) => t.usuarioId === usuarioId && !t.cerradoEn) ?? null;
}

/** El último turno de Central cerrado: es lo que recibe quien entra. */
export function ultimoTurnoCentralCerrado(turnos: TurnoCentral[]): TurnoCentral | null {
  return turnos.filter((t) => t.cerradoEn).sort((a, b) => (a.cerradoEn! < b.cerradoEn! ? 1 : -1))[0] ?? null;
}

export interface UnidadEnTurno {
  id: string;
  tipo: "movil" | "personal";
  nombre: string;
  patrullero: string;
  detalle: string;
  metros: number;
  libre: boolean;
  procedimientoId: string | null;
}

/** Todas las unidades en turno (móviles y personal a pie o en punto fijo), libres primero y por cercanía. */
export function unidadesEnTurno(moviles: Movil[], personal: TurnoPersonal[], punto: Punto): UnidadEnTurno[] {
  const ms: UnidadEnTurno[] = moviles
    .filter((m) => m.turno && m.estado !== "fuera_de_servicio" && m.estado !== "sin_turno")
    .map((m) => ({
      id: m.id,
      tipo: "movil",
      nombre: m.nombre,
      patrullero: `${m.turno!.patrullero}${m.turno!.acompanante ? ` y ${m.turno!.acompanante}` : ""}`,
      detalle: m.turno!.halcon ? `Halcón ${m.turno!.halcon}` : "Móvil",
      metros: distanciaMetros(m.posicion, punto),
      libre: m.estado === "disponible",
      procedimientoId: m.procedimientoId,
    }));
  const ps: UnidadEnTurno[] = personal.map((t) => ({
    id: t.id,
    tipo: "personal",
    nombre: t.modalidad === "punto_fijo" ? `Punto fijo · ${t.lugar}` : `A pie · ${t.lugar}`,
    patrullero: `${t.patrullero}${t.acompanante ? ` y ${t.acompanante}` : ""}`,
    detalle: t.halcon ? `Halcón ${t.halcon}` : t.modalidad === "punto_fijo" ? "Punto fijo" : "A pie",
    metros: distanciaMetros(t.ubicacion, punto),
    libre: !t.procedimientoId,
    procedimientoId: t.procedimientoId ?? null,
  }));
  return [...ms, ...ps].sort((a, b) => Number(b.libre) - Number(a.libre) || a.metros - b.metros);
}

/** Unidades activas del procedimiento (a cargo primero). */
export function unidadesActivas(p: Procedimiento): UnidadAsignada[] {
  const us = p.unidades ?? (p.movilId ? [{ id: p.movilId, tipo: "movil" as const, nombre: p.movilId, patrullero: "", aCargo: true, estado: "asignado" as const, asignadoEn: p.creadoEn, actualizadoEn: p.creadoEn }] : []);
  return us.filter((u) => u.estado !== "liberado").sort((a, b) => Number(b.aCargo) - Number(a.aCargo));
}

/** Procedimiento activo al que está enviada una unidad (a cargo o de apoyo). */
export function procedimientoDeUnidad(procedimientos: Procedimiento[], unidadId: string): { procedimiento: Procedimiento; unidad: UnidadAsignada } | null {
  for (const p of procedimientos) {
    if (!esActivo(p.estado)) continue;
    const u = unidadesActivas(p).find((x) => x.id === unidadId);
    if (u) return { procedimiento: p, unidad: u };
  }
  return null;
}
