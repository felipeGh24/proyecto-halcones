/**
 * Ilustraciones propias de la plataforma (SVG, sin archivos externos ni derechos de terceros).
 * Decorativas: van con aria-hidden; el texto que acompaña siempre dice lo importante.
 */

/** Emblema de la plataforma: halcón estilizado sobre escudo. */
export function EmblemaHalcon({ tamano = 32 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="emb-fondo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <path d="M24 3l17 6v13c0 10.5-7.2 19.4-17 22-9.8-2.6-17-11.5-17-22V9l17-6z" fill="url(#emb-fondo)" />
      <path d="M24 3l17 6v13c0 10.5-7.2 19.4-17 22" fill="none" stroke="#22D3EE" strokeWidth="1.6" opacity=".9" />
      {/* Halcón: alas abiertas y cabeza */}
      <path d="M10.5 20.5c4.2-.6 8.1.4 11 3.2l2.5 2.6 2.5-2.6c2.9-2.8 6.8-3.8 11-3.2-2.6 1.6-4.3 3.6-5.1 6.1-2.6-.7-5 .1-6.6 2l-1.8 2.2-1.8-2.2c-1.6-1.9-4-2.7-6.6-2-.8-2.5-2.5-4.5-5.1-6.1z" fill="#fff" />
      <path d="M24 14.2c1.9 0 3.3 1.3 3.3 3.1 0 1.3-.8 2.3-1.9 2.8l-1.4 3.6-1.4-3.6c-1.1-.5-1.9-1.5-1.9-2.8 0-1.8 1.4-3.1 3.3-3.1z" fill="#fff" />
      <path d="M26.6 16.6l2.6.9-2.4.7z" fill="#FBBF24" />
      <path d="M20.5 33.5h7l-3.5 4.5z" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** Ciudad de noche con red de comunicaciones, móvil y mapa: lado izquierdo de la pantalla de ingreso. */
export function IlustracionCentral({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 360" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="ic-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#0B1B3F" />
        </linearGradient>
        <linearGradient id="ic-edif" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#0F2A66" />
        </linearGradient>
        <radialGradient id="ic-brillo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#22D3EE" stopOpacity=".55" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="520" height="360" rx="24" fill="url(#ic-cielo)" />
      {/* Cuadrícula de mapa */}
      <g stroke="#3B82F6" strokeOpacity=".18" strokeWidth="1">
        {[40, 80, 120, 160, 200, 240].map((y) => (
          <path key={y} d={`M0 ${y}H520`} />
        ))}
        {[60, 130, 200, 270, 340, 410, 480].map((x) => (
          <path key={x} d={`M${x} 0V250`} />
        ))}
      </g>
      {/* Ondas de radio desde la Central */}
      <circle cx="380" cy="96" r="70" fill="url(#ic-brillo)" />
      {[18, 34, 50].map((r) => (
        <circle key={r} cx="380" cy="96" r={r} fill="none" stroke="#22D3EE" strokeOpacity={0.7 - r / 100} strokeWidth="2" />
      ))}
      <circle cx="380" cy="96" r="7" fill="#22D3EE" />
      {/* Ruta y pin del procedimiento */}
      <path d="M92 200c40-52 96-40 120-84s88-58 120-22" fill="none" stroke="#FBBF24" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" />
      <g transform="translate(80 150)">
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20.4 12 34 12 34s12-13.6 12-22.4C24 5.2 18.6 0 12 0z" fill="#F43F5E" />
        <circle cx="12" cy="11.5" r="4.5" fill="#fff" />
      </g>
      {/* Edificios */}
      <g>
        <rect x="20" y="230" width="70" height="130" fill="url(#ic-edif)" />
        <rect x="96" y="200" width="56" height="160" fill="#173A8A" />
        <rect x="158" y="248" width="80" height="112" fill="url(#ic-edif)" />
        <rect x="244" y="214" width="48" height="146" fill="#16367F" />
        <rect x="298" y="238" width="92" height="122" fill="url(#ic-edif)" />
        <rect x="396" y="190" width="58" height="170" fill="#173A8A" />
        <rect x="460" y="236" width="60" height="124" fill="url(#ic-edif)" />
        <g fill="#FDE68A" opacity=".85">
          {[
            [32, 246], [56, 246], [32, 270], [68, 294], [108, 216], [130, 240], [108, 264], [172, 262], [196, 262], [220, 286],
            [254, 230], [272, 254], [312, 254], [340, 254], [366, 278], [410, 206], [430, 230], [410, 254], [474, 252], [498, 276],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="10" height="12" rx="1.5" />
          ))}
        </g>
      </g>
      {/* Calle y móvil de seguridad municipal */}
      <rect x="0" y="318" width="520" height="42" fill="#0A1633" />
      <path d="M0 339H520" stroke="#FBBF24" strokeWidth="3" strokeDasharray="22 16" opacity=".6" />
      <g transform="translate(206 286)">
        <rect x="6" y="18" width="104" height="26" rx="8" fill="#F8FAFC" />
        <path d="M26 18l12-14h40l14 14z" fill="#E2E8F0" />
        <path d="M40 7h16v11H32zM60 7h16l10 11H60z" fill="#93C5FD" />
        <rect x="6" y="28" width="104" height="7" fill="#1D4ED8" />
        <rect x="46" y="0" width="24" height="6" rx="2" fill="#F43F5E" />
        <rect x="58" y="0" width="12" height="6" rx="2" fill="#3B82F6" />
        <circle cx="30" cy="46" r="9" fill="#0F172A" />
        <circle cx="30" cy="46" r="4" fill="#94A3B8" />
        <circle cx="88" cy="46" r="9" fill="#0F172A" />
        <circle cx="88" cy="46" r="4" fill="#94A3B8" />
        <path d="M110 26h8" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
      </g>
      <ellipse cx="58" cy="-6" rx="34" ry="12" fill="#F43F5E" opacity=".25" transform="translate(206 292)" />
    </svg>
  );
}

/** Móvil de seguridad con balizas: inicio de turno y estado «sin procedimiento» del patrullero. */
export function IlustracionPatrulla({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 140" aria-hidden="true">
      <defs>
        <linearGradient id="ip-suelo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#DBEAFE" stopOpacity="0" />
          <stop offset=".5" stopColor="#DBEAFE" />
          <stop offset="1" stopColor="#DBEAFE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="118" rx="110" ry="14" fill="url(#ip-suelo)" />
      <circle cx="98" cy="30" r="22" fill="#F43F5E" opacity=".14" />
      <circle cx="140" cy="30" r="22" fill="#3B82F6" opacity=".16" />
      <g transform="translate(40 34)">
        <rect x="0" y="40" width="160" height="38" rx="12" fill="#fff" stroke="#CBD5E1" />
        <path d="M30 40l20-28h62l22 28z" fill="#F1F5F9" stroke="#CBD5E1" />
        <path d="M52 16h24v24H38zM82 16h26l18 24H82z" fill="#93C5FD" />
        <rect x="0" y="54" width="160" height="10" fill="#1D4ED8" />
        <rect x="64" y="0" width="34" height="10" rx="3" fill="#F43F5E" />
        <rect x="80" y="0" width="18" height="10" rx="3" fill="#3B82F6" />
        <text x="80" y="62" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">SEGURIDAD MUNICIPAL</text>
        <circle cx="38" cy="80" r="14" fill="#0F172A" />
        <circle cx="38" cy="80" r="6" fill="#94A3B8" />
        <circle cx="122" cy="80" r="14" fill="#0F172A" />
        <circle cx="122" cy="80" r="6" fill="#94A3B8" />
        <rect x="150" y="44" width="10" height="6" rx="2" fill="#FDE68A" />
      </g>
    </svg>
  );
}

/** Radar tranquilo: cola vacía (todo despachado). */
export function IlustracionTodoEnOrden({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#ECFDF3" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="#A7F3D0" strokeWidth="2" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="#6EE7B7" strokeWidth="2" />
      <path d="M60 60L92 36" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="6" fill="#079455" />
      <path d="M48 62l8 8 18-20" fill="none" stroke="#079455" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Puesto de la Central de Operaciones (pantallas con mapa y cola, radio, audífonos) y, por la ventana,
 * un móvil de seguridad municipal patrullando de noche. Sin personas. Estilo plano y sobrio, colores institucionales.
 */
export function IlustracionCentralPatrulla({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 400" aria-hidden="true">
      {/* Sala */}
      <rect width="640" height="400" fill="#13254A" />
      <rect y="300" width="640" height="100" fill="#0D1B38" />
      {/* Ventana con la calle de noche */}
      <g>
        <rect x="372" y="34" width="240" height="176" rx="4" fill="#1B3466" stroke="#2B4A86" strokeWidth="6" />
        <rect x="378" y="40" width="228" height="164" fill="#0E1E40" />
        <g fill="#24427C">
          <rect x="384" y="96" width="34" height="80" />
          <rect x="422" y="78" width="28" height="98" />
          <rect x="454" y="108" width="40" height="68" />
          <rect x="498" y="88" width="30" height="88" />
          <rect x="532" y="112" width="34" height="64" />
          <rect x="570" y="98" width="30" height="78" />
        </g>
        <g fill="#F2D27A" opacity=".75">
          <rect x="390" y="106" width="6" height="7" /><rect x="404" y="124" width="6" height="7" /><rect x="430" y="92" width="6" height="7" />
          <rect x="462" y="120" width="6" height="7" /><rect x="478" y="136" width="6" height="7" /><rect x="506" y="100" width="6" height="7" />
          <rect x="540" y="124" width="6" height="7" /><rect x="578" y="110" width="6" height="7" /><rect x="586" y="140" width="6" height="7" />
        </g>
        <rect x="378" y="176" width="228" height="28" fill="#0A1630" />
        <path d="M378 191H606" stroke="#C9A94A" strokeWidth="2" strokeDasharray="12 10" opacity=".55" />
        {/* Móvil de seguridad municipal */}
        <g transform="translate(436 160)">
          <rect x="0" y="12" width="78" height="18" rx="5" fill="#F4F6FA" />
          <path d="M14 12l9-10h30l10 10z" fill="#DCE3EE" />
          <path d="M24 4h12v8H18zM40 4h12l7 8H40z" fill="#8FB4E8" />
          <rect x="0" y="20" width="78" height="5" fill="#1D4ED8" />
          <rect x="30" y="-3" width="18" height="5" rx="1.5" fill="#E0405A" />
          <rect x="39" y="-3" width="9" height="5" rx="1.5" fill="#3B82F6" />
          <circle cx="17" cy="31" r="6" fill="#0B1222" /><circle cx="61" cy="31" r="6" fill="#0B1222" />
          <path d="M78 18h18l-18 6z" fill="#F2D27A" opacity=".35" />
        </g>
        <path d="M466 150l-16-10M476 150l16-10" stroke="#E0405A" strokeWidth="2" opacity=".35" />
      </g>
      {/* Mesa */}
      <rect x="0" y="292" width="640" height="16" fill="#2B3F66" />
      <rect x="0" y="308" width="640" height="6" fill="#0A1430" />
      {/* Pantalla izquierda: mapa con puntos */}
      <g>
        <rect x="28" y="88" width="196" height="132" rx="6" fill="#0B1428" stroke="#3A4F7A" strokeWidth="4" />
        <rect x="34" y="94" width="184" height="120" fill="#E8EEF7" />
        <g stroke="#C5D0E0" strokeWidth="3" fill="none">
          <path d="M34 130H218M34 172H218M80 94V214M150 94V214" />
          <path d="M34 200L218 104" stroke="#F3D27A" strokeWidth="5" />
        </g>
        <circle cx="96" cy="140" r="6" fill="#B42318" /><circle cx="168" cy="118" r="6" fill="#DC6803" /><circle cx="130" cy="186" r="6" fill="#079455" />
        <circle cx="112" cy="160" r="5" fill="#fff" stroke="#1D4ED8" strokeWidth="3" /><circle cx="190" cy="168" r="5" fill="#fff" stroke="#1D4ED8" strokeWidth="3" />
        <rect x="116" y="220" width="20" height="58" fill="#33476E" /><rect x="92" y="276" width="68" height="10" rx="3" fill="#33476E" />
      </g>
      {/* Pantalla central: cola de procedimientos */}
      <g>
        <rect x="236" y="104" width="128" height="116" rx="6" fill="#0B1428" stroke="#3A4F7A" strokeWidth="4" />
        <rect x="242" y="110" width="116" height="104" fill="#F4F6FA" />
        <rect x="248" y="118" width="104" height="18" rx="3" fill="#fff" /><rect x="248" y="118" width="4" height="18" fill="#B42318" />
        <rect x="248" y="142" width="104" height="18" rx="3" fill="#fff" /><rect x="248" y="142" width="4" height="18" fill="#DC6803" />
        <rect x="248" y="166" width="104" height="18" rx="3" fill="#fff" /><rect x="248" y="166" width="4" height="18" fill="#079455" />
        <rect x="248" y="190" width="104" height="18" rx="3" fill="#fff" /><rect x="248" y="190" width="4" height="18" fill="#DC6803" />
        <g fill="#C5D0E0"><rect x="258" y="124" width="56" height="6" rx="2" /><rect x="258" y="148" width="44" height="6" rx="2" /><rect x="258" y="172" width="60" height="6" rx="2" /><rect x="258" y="196" width="38" height="6" rx="2" /></g>
        <rect x="290" y="220" width="20" height="58" fill="#33476E" /><rect x="266" y="276" width="68" height="10" rx="3" fill="#33476E" />
      </g>
      {/* Radio base con micrófono */}
      <g>
        <rect x="392" y="246" width="104" height="46" rx="5" fill="#26324D" />
        <rect x="402" y="256" width="44" height="16" rx="2" fill="#3FD08A" opacity=".85" />
        <circle cx="466" cy="264" r="9" fill="#3A4766" /><circle cx="484" cy="276" r="5" fill="#3A4766" />
        <g fill="#56627E"><rect x="402" y="278" width="8" height="5" rx="1" /><rect x="414" y="278" width="8" height="5" rx="1" /><rect x="426" y="278" width="8" height="5" rx="1" /></g>
        <path d="M496 268c22 0 22 18 40 18" fill="none" stroke="#1A2238" strokeWidth="3" />
        <rect x="532" y="276" width="16" height="22" rx="5" fill="#26324D" />
      </g>
      {/* Audífonos sobre la mesa */}
      <g fill="none" stroke="#3A4766" strokeWidth="6" strokeLinecap="round">
        <path d="M566 290c0-26 46-26 46 0" />
      </g>
      <rect x="558" y="282" width="14" height="14" rx="4" fill="#26324D" /><rect x="606" y="282" width="14" height="14" rx="4" fill="#26324D" />
      {/* Teclado y libreta de turno */}
      <rect x="132" y="294" width="150" height="10" rx="3" fill="#41557E" />
      <rect x="298" y="290" width="58" height="12" rx="2" fill="#E8EEF7" transform="rotate(-4 327 296)" />
      {/* Luz de la sala */}
      <path d="M0 0H640V30H0z" fill="#0F2044" />
    </svg>
  );
}
