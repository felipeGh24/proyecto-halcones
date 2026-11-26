import { useSyncExternalStore } from "react";
import { obtenerClave } from "./claves";
import { generarDemo, folio, type DatosDemo } from "./demo/semilla";
import { esActivo, SIGUIENTE } from "./estados";
import { distanciaMetros, unidadVecinalDe } from "./geo";
import type { EstadoMovil, EstadoProcedimiento, Movil, Procedimiento, Punto, TurnoMovil, Usuario } from "./tipos";

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
  actualizadoEn: number;
}

export interface ClienteDatos {
  instantanea(): Instantanea;
  suscribir(fn: () => void): () => void;
  crearProcedimiento(datos: NuevoProcedimiento, por: Usuario): Procedimiento;
  despachar(procedimientoId: string, movilId: string, por: Usuario): void;
  cambiarEstado(
    procedimientoId: string,
    estado: EstadoProcedimiento,
    por: Usuario,
    extra?: { nota?: string; resultado?: string; ubicacion?: Punto },
  ): void;
  pedirApoyo(movilId: string, por: Usuario, ubicacion: Punto): Procedimiento;
  /** El patrullero abre su turno en un móvil: desde ese momento la Central puede despacharle. */
  iniciarTurno(movilId: string, turno: Omit<TurnoMovil, "usuarioId" | "iniciadoEn">, por: Usuario, posicion?: Punto): void;
  /** Cierra el turno del móvil; queda sin turno y no recibe despachos. */
  cerrarTurno(movilId: string, por: Usuario): void;
  /** Solo demo: avanza un paso de la operación simulada. */
  simularPaso(): void;
  /** Solo demo: vuelve a los datos de ejemplo iniciales. */
  reiniciar(): void;
  readonly modo: "demo" | "supabase";
}

const CLAVE_ALMACEN = "plataforma.demo.v4";
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
    const nuevo = { ...generarDemo(), actualizadoEn: Date.now() };
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
    return { procedimientos: this.datos.procedimientos, moviles: this.datos.moviles, actualizadoEn: this.datos.actualizadoEn };
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
      eventos: [{ estado: "recibido", en: ahora, porUsuarioId: por.id, porNombre: por.nombre }],
    };
    this.datos.procedimientos = [...this.datos.procedimientos, proc];
    this.confirmar();
    return proc;
  }

  despachar(procedimientoId: string, movilId: string, por: Usuario) {
    const proc = this.datos.procedimientos.find((p) => p.id === procedimientoId);
    const movil = this.datos.moviles.find((m) => m.id === movilId);
    if (!proc || !movil || !esActivo(proc.estado)) return;
    if (movil.estado !== "disponible" || !movil.turno) throw new Error(`${movil.nombre} no está disponible para despacho`);
    const ahora = new Date().toISOString();
    // Si estaba asignado a otro móvil, ese queda libre.
    if (proc.movilId && proc.movilId !== movilId) this.actualizarMovil(proc.movilId, { estado: "disponible", procedimientoId: null });
    this.actualizarProc(procedimientoId, (p) => ({
      ...p,
      estado: "asignado",
      movilId,
      eventos: [...p.eventos, { estado: "asignado", en: ahora, porUsuarioId: por.id, porNombre: por.nombre, nota: `Despachado a ${movil.nombre}` }],
    }));
    this.actualizarMovil(movilId, { estado: "asignado", procedimientoId });
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
      eventos: [...p.eventos, { estado, en: ahora, porUsuarioId: por.id, porNombre: por.nombre, nota: extra.nota, ubicacion: extra.ubicacion }],
    }));
    const estadoMovil: Partial<Record<EstadoProcedimiento, EstadoMovil>> = {
      en_desplazamiento: "asignado",
      en_el_lugar: "en_procedimiento",
      en_procedimiento: "en_procedimiento",
      finalizado: "disponible",
      cancelado: "disponible",
    };
    const nuevo = estadoMovil[estado];
    if (nuevo && proc.movilId) {
      this.actualizarMovil(proc.movilId, {
        estado: nuevo,
        procedimientoId: nuevo === "disponible" ? null : procedimientoId,
        ...(estado === "en_el_lugar" ? { posicion: extra.ubicacion ?? proc.ubicacion, ultimaSenal: ahora } : {}),
      });
    }
    this.confirmar();
  }

  pedirApoyo(movilId: string, por: Usuario, ubicacion: Punto): Procedimiento {
    const movil = this.datos.moviles.find((m) => m.id === movilId);
    return this.crearProcedimiento(
      { claveNumero: 57, descripcion: `Solicitud de apoyo desde ${movil?.nombre ?? "patrullero"}.`, direccion: "Ubicación del móvil que solicita apoyo", ubicacion },
      por,
    );
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
    this.confirmar();
  }

  cerrarTurno(movilId: string, por: Usuario) {
    const m = this.datos.moviles.find((x) => x.id === movilId);
    if (!m?.turno) return;
    if (m.turno.usuarioId !== por.id && !["administrador", "supervisor"].includes(por.rol)) throw new Error("Sin permiso para cerrar este turno");
    if (m.procedimientoId) throw new Error("El móvil tiene un procedimiento activo");
    this.actualizarMovil(movilId, { estado: "sin_turno", turno: null, procedimientoId: null });
    this.confirmar();
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

  reiniciar() {
    this.datos = { ...generarDemo(), actualizadoEn: Date.now() };
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
