import { Link } from "react-router-dom";
import { esActivo, infoDeClave, useDatos } from "@plataforma/datos";
import { LeyendaMapa, Mapa } from "@plataforma/mapa";
import { Icono, Reloj } from "@plataforma/ui";

/** Pantalla de muro para el monitor grande de la Central: solo el mapa y las cifras clave, sin menús. */
export function Muro() {
  const { procedimientos, moviles } = useDatos();
  const activos = procedimientos.filter((p) => esActivo(p.estado));
  const rojos = activos.filter((p) => infoDeClave(p.claveNumero).semaforo === "rojo").length;
  const sinDespachar = activos.filter((p) => p.estado === "recibido").length;
  return (
    <div className="muro">
      <Mapa procedimientos={procedimientos} moviles={moviles} />
      <div className="muro__cifras ui-tarjeta">
        <div>
          <span>Activos</span>
          <strong className="num">{activos.length}</strong>
        </div>
        <div className={rojos ? "alerta" : ""}>
          <span>En rojo</span>
          <strong className="num">{rojos}</strong>
        </div>
        <div className={sinDespachar ? "alerta" : ""}>
          <span>Sin despachar</span>
          <strong className="num">{sinDespachar}</strong>
        </div>
        <div>
          <span>Móviles libres</span>
          <strong className="num">{moviles.filter((m) => m.estado === "disponible").length}</strong>
        </div>
        <Reloj />
      </div>
      <div className="muro__leyenda ui-tarjeta">
        <LeyendaMapa />
      </div>
      <Link to="/mapa" className="ui-boton ui-boton--secundario muro__salir">
        <Icono nombre="atras" /> Salir del muro
      </Link>
    </div>
  );
}
