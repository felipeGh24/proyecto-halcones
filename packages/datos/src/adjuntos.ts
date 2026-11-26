import type { Adjunto } from "./tipos";

/**
 * Fotos y videos.
 * Demo: se guardan en el navegador (IndexedDB), así que solo se ven en el equipo donde se cargaron.
 * Producción: se suben al almacenamiento privado de Supabase con enlaces que caducan; la interfaz no cambia.
 */
const BASE = "plataforma-adjuntos";
const ALMACEN = "archivos";
export const MAX_BYTES = 80 * 1024 * 1024;

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

export async function guardarArchivo(f: File): Promise<Adjunto> {
  const tipo = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "imagen" : null;
  if (!tipo) throw new Error(`«${f.name}» no es una foto ni un video.`);
  if (f.size > MAX_BYTES) throw new Error(`«${f.name}» pesa más de ${MAX_BYTES / 1024 / 1024} MB.`);
  const id = `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await abrir();
  await new Promise<void>((ok, mal) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(f, id);
    tx.oncomplete = () => ok();
    tx.onerror = () => mal(tx.error);
  });
  return { id, nombre: f.name, tipo, bytes: f.size };
}

const urls = new Map<string, string>();

/** URL para mostrar el adjunto, o null si no está en este equipo. */
export async function urlDeAdjunto(id: string): Promise<string | null> {
  if (urls.has(id)) return urls.get(id)!;
  try {
    const db = await abrir();
    const blob = await new Promise<Blob | undefined>((ok, mal) => {
      const r = db.transaction(ALMACEN).objectStore(ALMACEN).get(id);
      r.onsuccess = () => ok(r.result as Blob | undefined);
      r.onerror = () => mal(r.error);
    });
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urls.set(id, u);
    return u;
  } catch {
    return null;
  }
}

export const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
