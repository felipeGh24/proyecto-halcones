import { useEffect, useState } from "react";
import { CAJA_COMPLETA, TRAZO_ALA, TRAZO_AVE, TRAZO_TEXTO } from "./Logo";

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

/**
 * Entrada de Halcones: el ala acero barre de izquierda a derecha, el halcón aparece con el mismo barrido,
 * brilla el ojo y sube la palabra HALCONES. Se puede saltar con un toque.
 */
export function EntradaAnimada({ onFin }: { onFin: () => void }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, "1");
    } catch {
      /* sin almacenamiento: igual se muestra */
    }
    const t1 = window.setTimeout(() => setSaliendo(true), 2700);
    const t2 = window.setTimeout(onFin, 3200);
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
        <div className="entrada__logo" role="img" aria-label="Halcones">
          <svg className="entrada__capa entrada__capa--ala" viewBox={CAJA_COMPLETA} aria-hidden="true">
            <path d={TRAZO_ALA} fill="#6b7785" fillRule="evenodd" />
          </svg>
          <svg className="entrada__capa entrada__capa--ave" viewBox={CAJA_COMPLETA} aria-hidden="true">
            <path d={TRAZO_AVE} fill="#161b22" fillRule="evenodd" />
            <circle className="entrada__ojo" cx="895" cy="452" r="30" fill="#ffffff" />
          </svg>
          <svg className="entrada__capa entrada__capa--texto" viewBox={CAJA_COMPLETA} aria-hidden="true">
            <path d={TRAZO_TEXTO} fill="#161b22" fillRule="evenodd" />
          </svg>
        </div>
      </div>
      <button type="button" className="entrada__saltar" onClick={saltar}>
        Saltar
      </button>
    </div>
  );
}
