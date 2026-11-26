import type { Clave } from "./tipos";

/**
 * Catálogo de las 81 claves de procedimiento, con la prioridad heredada del sistema anterior.
 * Fuente: «Anexo: catálogo de claves» del plan maestro. El semáforo se deriva de la prioridad (ver semaforo.ts).
 */
export const CLAVES: readonly Clave[] = [
  { numero: 1, nombre: "Abigeato", prioridad: "media" },
  { numero: 2, nombre: "Accidente", prioridad: "alta" },
  { numero: 3, nombre: "Acuartelamiento", prioridad: "media" },
  { numero: 4, nombre: "Adopte medidas de seguridad", prioridad: "media" },
  { numero: 5, nombre: "Agresión", prioridad: "alta" },
  { numero: 6, nombre: "Alarma", prioridad: "alta" },
  { numero: 7, nombre: "Autentifíquese", prioridad: "baja" },
  { numero: 8, nombre: "Aplique plan de cierre ciudad", prioridad: "critica" },
  { numero: 9, nombre: "Aplique procedimiento", prioridad: "media" },
  { numero: 10, nombre: "Armamento", prioridad: "critica" },
  { numero: 11, nombre: "Alimentación", prioridad: "baja" },
  { numero: 12, nombre: "Allanamiento", prioridad: "alta" },
  { numero: 13, nombre: "Asalto mano armada", prioridad: "critica" },
  { numero: 14, nombre: "Patrullero es atacado", prioridad: "critica" },
  { numero: 15, nombre: "Comerciante ambulante", prioridad: "media" },
  { numero: 16, nombre: "Comunicaciones interferidas", prioridad: "media" },
  { numero: 17, nombre: "Comunicaciones restringidas", prioridad: "media" },
  { numero: 18, nombre: "Control a", prioridad: "media" },
  { numero: 19, nombre: "Cuartel de seguridad atacado", prioridad: "critica" },
  { numero: 20, nombre: "Cuartel de seguridad", prioridad: "media" },
  { numero: 21, nombre: "Daños", prioridad: "alta" },
  { numero: 22, nombre: "Detenidos", prioridad: "alta" },
  { numero: 23, nombre: "Desorden", prioridad: "alta" },
  { numero: 24, nombre: "Desplazamiento de tropas", prioridad: "media" },
  { numero: 25, nombre: "Disparos", prioridad: "critica" },
  { numero: 26, nombre: "Drogas", prioridad: "alta" },
  { numero: 27, nombre: "Ebrios", prioridad: "media" },
  { numero: 28, nombre: "Edificios de", prioridad: "media" },
  { numero: 29, nombre: "Entrevista", prioridad: "baja" },
  { numero: 30, nombre: "En dirección", prioridad: "baja" },
  { numero: 31, nombre: "Escolta", prioridad: "media" },
  { numero: 32, nombre: "Explosivos", prioridad: "critica" },
  { numero: 33, nombre: "Extremistas", prioridad: "alta" },
  { numero: 34, nombre: "Facilidades", prioridad: "baja" },
  { numero: 35, nombre: "Fiscalice", prioridad: "media" },
  { numero: 36, nombre: "Grupo o individuo armado", prioridad: "critica" },
  { numero: 37, nombre: "Grupo o individuo sospechoso", prioridad: "alta" },
  { numero: 38, nombre: "Huelga", prioridad: "alta" },
  { numero: 39, nombre: "Hurto", prioridad: "media" },
  { numero: 40, nombre: "Homicidio", prioridad: "critica" },
  { numero: 41, nombre: "Incendio", prioridad: "critica" },
  { numero: 42, nombre: "Intercepte vehículo", prioridad: "alta" },
  { numero: 43, nombre: "Jefe de", prioridad: "baja" },
  { numero: 44, nombre: "Lesionado", prioridad: "alta" },
  { numero: 45, nombre: "Llame por teléfono", prioridad: "baja" },
  { numero: 46, nombre: "Manténgase en el lugar", prioridad: "baja" },
  { numero: 47, nombre: "Muerto", prioridad: "critica" },
  { numero: 48, nombre: "Novedades solicito", prioridad: "baja" },
  { numero: 49, nombre: "No hay novedad", prioridad: "baja" },
  { numero: 50, nombre: "Normalice los servicios", prioridad: "baja" },
  { numero: 51, nombre: "Obstáculo vía pública", prioridad: "media" },
  { numero: 52, nombre: "Ocupación de", prioridad: "media" },
  { numero: 53, nombre: "Operativo de", prioridad: "media" },
  { numero: 54, nombre: "Paro", prioridad: "alta" },
  { numero: 55, nombre: "Patrulle e informe", prioridad: "media" },
  { numero: 56, nombre: "Pase a canal", prioridad: "baja" },
  { numero: 57, nombre: "Preste cooperación", prioridad: "media" },
  { numero: 58, nombre: "Proceda con personal de carabineros", prioridad: "alta" },
  { numero: 59, nombre: "Procedimiento que involucra autoridades", prioridad: "alta" },
  { numero: 60, nombre: "Protesta", prioridad: "alta" },
  { numero: 61, nombre: "Rapto", prioridad: "critica" },
  { numero: 62, nombre: "Recójase a cuartel", prioridad: "baja" },
  { numero: 63, nombre: "Reclamo", prioridad: "media" },
  { numero: 64, nombre: "Retirarse del lugar", prioridad: "baja" },
  { numero: 65, nombre: "Resultado", prioridad: "baja" },
  { numero: 66, nombre: "Riña", prioridad: "alta" },
  { numero: 67, nombre: "Robo", prioridad: "alta" },
  { numero: 68, nombre: "Saqueo", prioridad: "critica" },
  { numero: 69, nombre: "Secuestro", prioridad: "critica" },
  { numero: 70, nombre: "Sin efecto", prioridad: "baja" },
  { numero: 71, nombre: "Solicita antecedentes", prioridad: "media" },
  { numero: 72, nombre: "Solucionado en el lugar", prioridad: "baja" },
  { numero: 73, nombre: "Solicita autorización carro", prioridad: "media" },
  { numero: 74, nombre: "Suicidio", prioridad: "critica" },
  { numero: 75, nombre: "Trasládese a", prioridad: "media" },
  { numero: 76, nombre: "Ubicación y dirección", prioridad: "media" },
  { numero: 77, nombre: "Uniformado sospechoso", prioridad: "alta" },
  { numero: 78, nombre: "Usurpación de identidad", prioridad: "alta" },
  { numero: 79, nombre: "Vigilancia especial", prioridad: "media" },
  { numero: 80, nombre: "Violación", prioridad: "critica" },
  { numero: 81, nombre: "Vehículo abandonado", prioridad: "media" },
];

const PORNUMERO = new Map(CLAVES.map((c) => [c.numero, c]));

export function obtenerClave(numero: number): Clave | undefined {
  return PORNUMERO.get(numero);
}

/** Busca por número exacto o por texto (sin distinguir tildes ni mayúsculas). */
export function buscarClaves(texto: string, limite = 8): Clave[] {
  const q = normalizar(texto.trim());
  if (!q) return CLAVES.slice(0, limite);
  const num = Number(q);
  const resultado = CLAVES.filter((c) =>
    Number.isInteger(num) && /^\d+$/.test(q) ? String(c.numero).startsWith(q) : normalizar(c.nombre).includes(q),
  );
  return resultado.slice(0, limite);
}

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
