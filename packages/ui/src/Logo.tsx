import { useId, type CSSProperties } from "react";

/**
 * Logo provisorio de Halcones: halcón peregrino en picada, con las garras hacia adelante.
 * Es un dibujo propio (SVG). Cuando llegue el logo definitivo se reemplaza solo este archivo.
 */
export function HalconCazando({ className, style }: { className?: string; style?: CSSProperties }) {
  const u = useId().replace(/:/g, "");
  return (
    <svg className={className} style={style} viewBox="30 0 200 230" aria-hidden="true">
      <defs><linearGradient id={`al${u}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#1e3a8a"/><stop offset="1" stopColor="#3b82f6"/></linearGradient>
      <linearGradient id={`al2${u}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#172554"/><stop offset="1" stopColor="#1e40af"/></linearGradient></defs>
      <path d="M126 116 C118 92 110 72 104 50 L66 26 L76 42 L56 36 L70 52 L50 50 L68 64 L50 68 L74 78 L60 86 L88 92 C100 100 110 110 118 122Z" fill={`url(#al2${u})`}/>
      <path d="M96 150 L44 190 L58 192 L48 204 L66 198 L62 212 L106 168Z" fill="#334155"/>
      <path d="M168 86 C182 96 184 120 170 140 C156 160 126 170 100 166 C90 156 94 140 108 128 C124 112 142 92 168 86Z" fill="#f8fafc"/>
      <path d="M168 86 C150 88 130 100 116 118 C104 132 94 146 100 166 C90 160 86 148 92 134 C104 108 132 88 168 86Z" fill="#475569"/>
      <path d="M134 134 l5 5 5-5 M148 124 l5 5 5-5 M120 146 l5 5 5-5 M140 150 l5 5 5-5" stroke="#94a3b8" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      <path d="M160 92 C158 76 166 62 180 58 C192 56 202 62 206 70 C214 72 220 78 222 86 C223 94 220 100 216 104 C216 97 213 93 208 92 L202 93 C198 98 190 100 182 100 C176 102 168 100 160 92Z" fill="#f8fafc"/>
      <path d="M160 92 C158 76 166 62 180 58 C192 56 202 62 206 70 L200 72 C192 68 184 70 180 76 C178 84 180 92 184 98 L180 108 C172 106 166 100 160 92Z" fill="#0f172a"/>
      <path d="M204 70 C214 72 220 78 222 86 C223 94 220 100 216 104 C216 97 213 93 208 92 L202 93 C202 86 202 76 204 70Z" fill="#334155"/>
      <path d="M200 72 L206 72 C207 77 207 82 204 85 L200 85Z" fill="#fbbf24"/>
      <circle cx="190" cy="78" r="6.4" fill="#fbbf24"/><circle cx="190" cy="78" r="4.2" fill="#0b1220"/><circle cx="191.4" cy="76.8" r="1.3" fill="#fff"/>
      <path d="M178 72 C186 66 198 66 206 70 L203 74 C196 71 188 71 181 75Z" fill="#0f172a"/>
      <path d="M156 116 C160 90 166 62 178 36 L150 4 L152 22 L134 8 L138 28 L118 18 L126 40 L106 34 L120 54 L102 54 L120 70 L106 76 L128 84 C134 96 140 108 144 120Z" fill={`url(#al${u})`}/>
      <path d="M178 36 L150 4 M166 30 L134 8 M160 44 L118 18 M154 60 L106 34 M150 74 L102 54" stroke="#93c5fd" strokeWidth="1.6" opacity=".55"/>
      <path d="M156 116 C160 90 166 62 178 36" stroke="#bfdbfe" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M150 150 C160 164 172 176 186 184" stroke="#fbbf24" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M134 156 C144 172 156 186 170 196" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M138 138 C150 140 160 152 160 164 C150 164 142 158 136 150Z" fill="#e2e8f0"/>
      <path d="M124 146 C136 150 146 162 146 172 C136 172 126 164 122 156Z" fill="#cbd5e1"/>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M186 184 L204 178 C212 176 214 184 210 190" stroke="#fbbf24" strokeWidth="6"/>
      <path d="M186 184 L200 194 C206 198 204 206 198 206" stroke="#fbbf24" strokeWidth="6"/>
      <path d="M186 184 L184 202 C184 208 178 210 174 206" stroke="#fbbf24" strokeWidth="6"/>
      <path d="M170 196 L188 194 C196 194 196 202 192 206" stroke="#f59e0b" strokeWidth="6"/>
      <path d="M170 196 L180 210 C184 216 180 222 174 220" stroke="#f59e0b" strokeWidth="6"/>
      <path d="M170 196 L164 212 C162 218 156 218 154 214" stroke="#f59e0b" strokeWidth="6"/>
      </g>
      <g fill="#0f172a">
      <path d="M210 190 l-1 8 -5 -5z"/><path d="M198 206 l-8 1 4 -6z"/><path d="M174 206 l-2 7 -4-6z"/>
      <path d="M192 206 l-1 8 -5 -5z"/><path d="M174 220 l-8 1 4 -6z"/><path d="M154 214 l-3 7 -3 -7z"/>
      </g>
    </svg>
  );
}

/** Insignia redonda con el halcón: ingreso, entrada animada y app. */
export function LogoHalcones({ tamano = 120, className }: { tamano?: number; className?: string }) {
  const u = useId().replace(/:/g, "");
  return (
    <span className={`logo-halcones ${className ?? ""}`} style={{ width: tamano, height: tamano }} role="img" aria-label="Logo Halcones">
      <svg className="logo-halcones__anillo" viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <linearGradient id={`e1${u}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id={`e2${u}`} cx=".55" cy=".4" r=".7">
            <stop offset="0" stopColor="#1d4ed8" />
            <stop offset="1" stopColor="#0b1b3f" />
          </radialGradient>
        </defs>
        <circle cx="120" cy="120" r="106" fill={`url(#e2${u})`} />
        <circle className="logo-halcones__trazo" cx="120" cy="120" r="111" fill="none" stroke={`url(#e1${u})`} strokeWidth="10" pathLength={100} />
      </svg>
      <HalconCazando className="logo-halcones__ave" />
    </span>
  );
}
