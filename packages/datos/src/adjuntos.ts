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

/** Lado mayor de las fotos guardadas: suficiente para leer patentes y ver daños, sin gastar datos móviles. */
export const LADO_MAXIMO_FOTO = 1920;

/**
 * Reduce una foto del celular (4–8 MB) a ~300–600 KB en JPEG.
 * Si el navegador no puede (formato raro, sin canvas), se guarda la original.
 */
export async function comprimirFoto(f: File, lado = LADO_MAXIMO_FOTO, calidad = 0.82): Promise<Blob> {
  if (!f.type.startsWith("image/") || f.type === "image/gif" || f.size < 400 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k);
    const h = Math.round(bmp.height * k);
    const lienzo = document.createElement("canvas");
    lienzo.width = w;
    lienzo.height = h;
    lienzo.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    return blob && blob.size < f.size ? blob : f;
  } catch {
    return f;
  }
}

export async function guardarArchivo(original: File): Promise<Adjunto> {
  const tipo = original.type.startsWith("video/") ? "video" : original.type.startsWith("image/") ? "imagen" : null;
  if (!tipo) throw new Error(`«${original.name}» no es una foto ni un video.`);
  if (original.size > MAX_BYTES) throw new Error(`«${original.name}» pesa más de ${MAX_BYTES / 1024 / 1024} MB. Graba un video más corto.`);
  const f = tipo === "imagen" ? await comprimirFoto(original) : original;
  const id = `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await abrir();
  await new Promise<void>((ok, mal) => {
    const tx = db.transaction(ALMACEN, "readwrite");
    tx.objectStore(ALMACEN).put(f, id);
    tx.oncomplete = () => ok();
    tx.onerror = () => mal(tx.error);
  });
  return { id, nombre: original.name, tipo, bytes: f.size };
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
