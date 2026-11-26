import type { Rol, Sesion, Sistema, Usuario } from "./tipos";

/**
 * Autenticación.
 * MODO DEMOSTRACIÓN: cuentas ficticias con una contraseña pública, solo para mostrar el producto.
 * No es autenticación real. Al conectar Supabase Auth, `iniciarSesion` valida contra el servidor,
 * el rol viene de la tabla `usuarios` y los permisos se aplican también en la base (RLS).
 */

export const ROLES: Record<Rol, { etiqueta: string; descripcion: string }> = {
  administrador: { etiqueta: "Administrador", descripcion: "Usuarios, catálogos, flota y auditoría" },
  jefatura: { etiqueta: "Jefatura / Dirección", descripcion: "Visión completa e informes" },
  supervisor: { etiqueta: "Supervisor de turno", descripcion: "Coordina el turno, reasigna y cierra" },
  operador: { etiqueta: "Operador de Central", descripcion: "Crea y despacha procedimientos" },
  patrullero: { etiqueta: "Patrullero", descripcion: "Atiende sus procedimientos desde el celular" },
  analista: { etiqueta: "Analista", descripcion: "Indicadores e informes sin datos personales" },
};

export const ACCESO: Record<Sistema, Rol[]> = {
  halcones: ["administrador", "jefatura", "supervisor", "operador", "patrullero"],
  georreferenciado: ["administrador", "jefatura", "supervisor", "operador", "analista"],
  analisis: ["administrador", "jefatura", "supervisor", "analista"],
};

export type Accion =
  | "crear_procedimiento"
  | "despachar"
  | "cancelar_procedimiento"
  | "cambiar_estado"
  | "exportar"
  | "configurar"
  | "ver_datos_personales";

const PERMISOS: Record<Rol, Accion[]> = {
  administrador: ["crear_procedimiento", "despachar", "cancelar_procedimiento", "cambiar_estado", "exportar", "configurar", "ver_datos_personales"],
  jefatura: ["exportar", "ver_datos_personales"],
  supervisor: ["crear_procedimiento", "despachar", "cancelar_procedimiento", "cambiar_estado", "exportar", "ver_datos_personales"],
  operador: ["crear_procedimiento", "despachar", "cambiar_estado", "ver_datos_personales"],
  patrullero: ["cambiar_estado"],
  analista: ["exportar"],
};

/**
 * Acceso total de la demostración: mientras la plataforma está a prueba, cualquier cuenta entra a los tres
 * sistemas, a todas las pantallas y puede hacer todas las acciones, para probarlo todo sin cambiar de usuario.
 * El rol solo decide a qué pantalla se llega primero. Al conectar la base real se desactiva y mandan
 * ACCESO y PERMISOS (y la RLS de la base, que es la que de verdad protege los datos).
 */
let accesoTotal = true;
export const accesoTotalActivo = () => accesoTotal;
/** Solo para pruebas y para el modo producción. */
export function configurarAccesoTotal(activo: boolean) {
  accesoTotal = activo;
}

export function puede(rol: Rol, accion: Accion): boolean {
  return accesoTotal || PERMISOS[rol].includes(accion);
}

export function tieneAcceso(rol: Rol, sistema: Sistema): boolean {
  return accesoTotal || ACCESO[sistema].includes(rol);
}

/** ¿Puede este rol abrir una pantalla restringida a ciertos roles? */
export function permiteRoles(rol: Rol, roles?: readonly Rol[]): boolean {
  return accesoTotal || !roles || roles.includes(rol);
}

export const SISTEMAS: Record<Sistema, { nombre: string; descripcion: string; puertoDev: number }> = {
  halcones: { nombre: "Halcones", descripcion: "Central de Operaciones y patrulleros", puertoDev: 5173 },
  georreferenciado: { nombre: "Georreferenciado", descripcion: "Mapa en vivo de la comuna", puertoDev: 5174 },
  analisis: { nombre: "Análisis de eventos", descripcion: "Indicadores e informes para jefatura", puertoDev: 5175 },
};

/* ---------------- Modo demostración ---------------- */

export const CONTRASENA_DEMO = "demo2026";

export const USUARIOS_DEMO: Usuario[] = [
  { id: "u-admin", nombre: "Admin Demo", correo: "admin@demo.cl", rol: "administrador" },
  { id: "u-jefa", nombre: "Jefatura Demo", correo: "jefatura@demo.cl", rol: "jefatura" },
  { id: "u-super", nombre: "Supervisor Demo", correo: "supervisor@demo.cl", rol: "supervisor" },
  { id: "u-oper", nombre: "Operador Demo", correo: "operador@demo.cl", rol: "operador" },
  { id: "u-patr", nombre: "Patrullero Demo", correo: "patrullero@demo.cl", rol: "patrullero", movilId: "MOVIL-03" },
  { id: "u-anal", nombre: "Analista Demo", correo: "analista@demo.cl", rol: "analista" },
];

const CLAVE_SESION = "plataforma.sesion.v1";
const INACTIVIDAD_MS = 30 * 60 * 1000;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
const CLAVE_INTENTOS = "plataforma.intentos.v1";

interface SesionGuardada extends Sesion {
  ultimaActividad: number;
}

function leer<T>(clave: string): T | null {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento lleno o bloqueado: la sesión dura solo en memoria */
  }
}

export type ResultadoIngreso =
  | { ok: true; sesion: Sesion }
  | { ok: false; error: string; bloqueadoHasta?: number };

export async function iniciarSesion(correo: string, contrasena: string, sistema: Sistema): Promise<ResultadoIngreso> {
  const intentos = leer<{ n: number; hasta?: number }>(CLAVE_INTENTOS) ?? { n: 0 };
  if (intentos.hasta && intentos.hasta > Date.now()) {
    return { ok: false, error: "Demasiados intentos fallidos. Espera unos minutos.", bloqueadoHasta: intentos.hasta };
  }
  // Pequeña espera para que el formulario muestre su estado de carga, como lo hará con el servidor.
  await new Promise((r) => setTimeout(r, 350));

  const usuario = USUARIOS_DEMO.find((u) => u.correo === correo.trim().toLowerCase());
  if (!usuario || contrasena !== CONTRASENA_DEMO) {
    const n = intentos.n + 1;
    escribir(CLAVE_INTENTOS, n >= MAX_INTENTOS ? { n: 0, hasta: Date.now() + BLOQUEO_MS } : { n });
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }
  if (!tieneAcceso(usuario.rol, sistema)) {
    return { ok: false, error: `Tu rol (${ROLES[usuario.rol].etiqueta}) no tiene acceso a ${SISTEMAS[sistema].nombre}.` };
  }
  localStorage.removeItem(CLAVE_INTENTOS);
  const sesion: SesionGuardada = { usuario, iniciadaEn: new Date().toISOString(), modo: "demo", ultimaActividad: Date.now() };
  escribir(CLAVE_SESION, sesion);
  return { ok: true, sesion };
}

export function sesionActual(): Sesion | null {
  const s = leer<SesionGuardada>(CLAVE_SESION);
  if (!s) return null;
  if (Date.now() - s.ultimaActividad > INACTIVIDAD_MS) {
    cerrarSesion();
    return null;
  }
  return s;
}

export function registrarActividad() {
  const s = leer<SesionGuardada>(CLAVE_SESION);
  if (s) escribir(CLAVE_SESION, { ...s, ultimaActividad: Date.now() });
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* nada que limpiar */
  }
}
