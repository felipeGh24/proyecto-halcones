/** Orden de la flota como la nombra el municipio: Móvil 01 a 17, luego los Alpha y al final las RAM. */
const GRUPO: Record<string, number> = { movil: 0, alpha: 1, ram: 2 };

export function rangoMovil(nombre: string): [number, number] {
  const n = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const tipo = /^(movil|alpha|ram)/.exec(n)?.[1] ?? "zz";
  return [GRUPO[tipo] ?? 3, Number(/\d+/.exec(n)?.[0] ?? 999)];
}

export function compararMoviles(a: { nombre: string }, b: { nombre: string }): number {
  const [ga, na] = rangoMovil(a.nombre);
  const [gb, nb] = rangoMovil(b.nombre);
  return ga - gb || na - nb || a.nombre.localeCompare(b.nombre);
}
