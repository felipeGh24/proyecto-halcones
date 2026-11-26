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
