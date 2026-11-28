import { useEffect, useState } from "react";
import { LogoHalcones } from "./Logo";

const CLAVE = "plataforma.entrada.v1";

/** ¿Corresponde mostrar la entrada animada? Una vez por sesión del navegador y nunca con «reducir movimiento». */
export function debeMostrarEntrada(): boolean {
  try {
    if (sessionStorage.getItem(CLAVE)) return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  } catch {
    return false;
  }
}

/** Entrada de Halcones: el anillo se dibuja, el halcón entra en picada y aparece el nombre. Se puede saltar. */
export function EntradaAnimada({ onFin }: { onFin: () => void }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, "1");
    } catch {
      /* sin almacenamiento: igual se muestra una vez */
    }
    const t1 = window.setTimeout(() => setSaliendo(true), 2500);
    const t2 = window.setTimeout(onFin, 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onFin]);

  function saltar() {
    setSaliendo(true);
    window.setTimeout(onFin, 250);
  }

  return (
    <div className={`entrada${saliendo ? " entrada--sale" : ""}`} onClick={saltar} role="presentation">
      <div className="entrada__brillo" aria-hidden="true" />
      <div className="entrada__centro">
        <LogoHalcones tamano={180} className="entrada__logo" />
        <h1 className="entrada__nombre">HALCONES</h1>
        <p className="entrada__sub">Seguridad Pública · Municipalidad de Conchalí</p>
        <span className="entrada__demo">Modo demostración</span>
      </div>
      <button type="button" className="entrada__saltar" onClick={saltar}>
        Saltar
      </button>
    </div>
  );
}
