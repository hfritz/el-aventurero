"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LEVELS = [
  { id: 1,  name: "Machu Picchu",              region: "Peru",        x: 214, y: 336, color: "#4ade80" },
  { id: 2,  name: "Teotihuacán",               region: "Mexico",                    x: 154, y: 218, color: "#fbbf24" },
  { id: 3,  name: "Carnaval de Barranquilla",  region: "Colombia",                  x: 218, y: 278, color: "#f472b6" },
  { id: 4,  name: "Salto Ángel",               region: "Venezuela",                 x: 248, y: 295, color: "#38bdf8" },
  { id: 5,  name: "El Caribe",                 region: "Caribbean Coast",           x: 246, y: 272, color: "#f472b6" },
  { id: 6,  name: "El Atacama",                region: "Atacama Desert, Chile",     x: 208, y: 378, color: "#fb923c" },
  { id: 7,  name: "Buenos Aires",              region: "La Plata, Argentina",       x: 240, y: 424, color: "#a78bfa" },
  { id: 8,  name: "El Orinoco",                region: "Orinoco Delta, Venezuela",  x: 254, y: 280, color: "#2dd4bf" },
  { id: 10, name: "Río de Janeiro",            region: "Rio, Brazil",               x: 272, y: 378, color: "#facc15" },
];

function computeUnlocked(id: number, completed: number[]): boolean {
  if (id === 1) return true;
  if (id === 2) return completed.includes(1);
  if (id === 3) return completed.includes(2);
  if (id === 4) return completed.includes(1) && completed.includes(2) && completed.includes(3);
  return false;
}

// Stars deterministic
const STARS = Array.from({ length: 80 }, (_, i) => ({
  cx: ((i * 2654435761) >>> 0) % 800,
  cy: ((i * 1234567891) >>> 0) % 600,
  r:  (((i * 987654321) >>> 0) % 12) / 10 + 0.4,
  delay: (i * 0.13) % 3,
}));

// ── Americas geographic paths (Mercator, viewBox 0 0 320 520) ────────────────
// x = (lon + 170) / 140 * 320   y = (80 - lat) / 140 * 520

// North America — one closed path: Pacific coast south to Panama, then Caribbean/Gulf/Atlantic north, then across Canada
const NORTH_AMERICA = `
  M 12,60
  C 26,75 38,88 48,96
  C 62,102 78,100 90,100
  C 102,100 110,110 112,122
  C 114,136 112,150 112,166
  C 114,180 120,196 128,208
  C 132,218 134,226 134,232
  C 148,238 164,246 176,250
  C 184,252 190,258 192,264
  C 196,270 202,276 208,278
  C 212,280 214,277 213,271
  C 210,263 204,255 196,249
  C 188,243 184,235 184,227
  C 184,221 187,213 190,207
  C 194,203 202,201 210,199
  C 220,197 228,200 232,207
  C 234,213 233,219 233,219
  C 235,221 235,215 235,211
  C 237,203 241,193 243,181
  C 245,169 248,157 252,147
  C 256,139 264,131 270,123
  C 274,115 272,103 266,93
  C 258,81 246,73 234,63
  C 220,53 202,45 184,40
  C 170,36 152,34 134,36
  C 116,38 98,40 80,42
  C 62,44 44,50 28,56
  Z
`;

// Greenland
const GREENLAND = `
  M 272,16
  C 280,8 294,4 302,12
  C 310,20 308,36 298,46
  C 288,54 274,52 268,42
  C 262,30 266,24 272,16
  Z
`;

// Cuba island — positioned south of Florida tip (~y=220), in the Caribbean


// South America — one closed path: Colombia Pacific → Andes south → TDF → Atlantic north → Brazil bulge → Venezuela
const SOUTH_AMERICA = `
  M 204,284
  C 202,298 200,314 198,330
  C 196,346 192,360 188,374
  C 185,388 184,404 186,420
  C 188,434 192,448 196,462
  C 200,474 202,486 200,498
  C 198,510 192,518 186,520
  C 194,522 206,518 216,511
  C 226,503 234,490 240,476
  C 246,462 250,446 254,430
  C 260,416 268,402 276,390
  C 284,376 292,360 298,344
  C 304,328 305,312 300,300
  C 294,288 282,278 268,272
  C 254,266 238,264 224,266
  C 214,268 208,274 206,280
  Z
`;

// Route path between levels in order
const ROUTE_POINTS = LEVELS.map(l => `${l.x},${l.y}`).join(" ");

export default function LandingPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('el-aventurero-completed') || '[]');
      setCompleted(Array.isArray(saved) ? saved : []);
    } catch {}
  }, []);

  const levels = LEVELS.map(l => ({ ...l, unlocked: computeUnlocked(l.id, completed) }));

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse at 40% 50%, #0a1628 0%, #030814 60%, #000005 100%)" }}>

      {/* Stars */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white"
            style={{ animation: `star-twinkle ${1.5 + s.delay}s ease-in-out ${s.delay}s infinite` }} />
        ))}
      </svg>

      {/* Decorative Aztec/Inca geometric border lines */}
      <svg className="absolute inset-0 pointer-events-none opacity-10" width="100%" height="100%" viewBox="0 0 800 600">
        <rect x="24" y="24" width="752" height="552" rx="4" fill="none" stroke="#D4A853" strokeWidth="1"/>
        <rect x="32" y="32" width="736" height="536" rx="2" fill="none" stroke="#D4A853" strokeWidth="0.5"/>
        {/* Corner ornaments */}
        {[[40,40],[760,40],[40,560],[760,560]].map(([cx,cy],i) => (
          <g key={i}>
            <rect x={cx-8} y={cy-8} width="16" height="16" fill="none" stroke="#D4A853" strokeWidth="1"/>
            <rect x={cx-4} y={cy-4} width="8" height="8" fill="#D4A853" opacity="0.5"/>
          </g>
        ))}
      </svg>

      {/* Main layout: stacked on portrait, side-by-side on sm+ */}
      <div className="relative z-10 flex flex-col sm:flex-row h-full items-center sm:items-stretch justify-center gap-6 sm:gap-0 px-4 sm:px-6 md:px-8 py-10 sm:py-0 overflow-y-auto sm:overflow-hidden">

        {/* Americas Map — portrait: 44vh; landscape/desktop: fills ~88vh capped at 680px */}
        <div className="flex-shrink-0 map-glow h-[44vh] sm:h-[88vh] max-h-[680px]"
          style={{ aspectRatio: '320 / 520', width: 'auto' }}>
          <svg viewBox="0 0 320 520" width="100%" height="100%" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="mapFill" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#0a1a30" stopOpacity="0.95"/>
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Gradient for ocean glow */}
              <radialGradient id="oceanGlow" cx="40%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#0a3060" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#000" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Ocean glow behind continents */}
            <ellipse cx="160" cy="300" rx="200" ry="280" fill="url(#oceanGlow)"/>

            {/* North America (includes Mexico + Central America down to Panama) */}
            <path d={NORTH_AMERICA} fill="url(#mapFill)" stroke="#D4A853" strokeWidth="1.2" strokeLinejoin="round"/>
            
            {/* South America (includes Brazil bulge) */}
            <path d={SOUTH_AMERICA} fill="url(#mapFill)" stroke="#D4A853" strokeWidth="1.2" strokeLinejoin="round"/>

            {/* Route connecting levels */}
            <polyline
              points={ROUTE_POINTS}
              fill="none" stroke="#D4A853" strokeWidth="0.8"
              strokeDasharray="3 4" opacity="0.4"
              style={{ animation: "draw-path 3s ease-out forwards" }}
            />

            {/* Level markers */}
            {levels.map((level) => (
              <g key={level.id}
                style={{ cursor: level.unlocked ? "pointer" : "default" }}
                onClick={() => level.unlocked && router.push(`/game?level=${level.id}`)}>

                {/* Pulse ring (unlocked only) */}
                {level.unlocked && (
                  <circle cx={level.x} cy={level.y} r="10"
                    fill="none" stroke={level.color} strokeWidth="1.5" opacity="0.6"
                    className="marker-ring"
                    style={{ transformOrigin: `${level.x}px ${level.y}px` }}/>
                )}

                {/* Outer circle */}
                <circle cx={level.x} cy={level.y} r="7"
                  fill={level.unlocked ? level.color : "#1a2a3a"}
                  stroke={level.unlocked ? level.color : "#3a4a5a"}
                  strokeWidth="1.5"
                  opacity={level.unlocked ? 1 : 0.5}
                  className={level.unlocked ? "marker-pulse" : undefined}
                  style={level.unlocked ? { transformOrigin: `${level.x}px ${level.y}px` } : undefined}
                />

                {/* Level number */}
                <text x={level.x} y={level.y + 4} textAnchor="middle"
                  fill={level.unlocked ? "#000" : "#4a5a6a"}
                  fontSize="6" fontWeight="bold">
                  {level.id}
                </text>

              </g>
            ))}
          </svg>
        </div>

        {/* Right side: Title + Info */}
        <div className="flex flex-col gap-2 sm:gap-3 lg:gap-6 w-full sm:max-w-xs md:max-w-sm lg:max-w-md sm:ml-4 md:ml-8 lg:ml-12 sm:justify-center sm:py-4 md:py-6 lg:py-10">

          {/* Title — font scales with viewport height so it never overflows on landscape mobile */}
          <div className="float-title">
            <div className="text-[9px] lg:text-xs tracking-[0.45em] uppercase mb-1 lg:mb-2"
              style={{ color: "#D4A853", fontWeight: 600 }}>
              ✦ A Latin American Adventure ✦
            </div>
            <div className="font-black tracking-widest leading-none font-mono"
              style={{ fontSize: 'clamp(22px, 5.5vh, 56px)', textShadow: "0 0 40px #fff8, 0 0 80px #fff3", color: "#fff" }}>
              EL AVENTURERO
            </div>
            <div className="mt-1 lg:mt-3 text-[11px] lg:text-sm" style={{ color: "#a0b4c8", lineHeight: 1.6 }}>
              Jump, run, and groove through 10 iconic Latin American landscapes — each with its own rhythm, culture, and challenge.
            </div>
          </div>

          {/* Level previews */}
          <div className="flex flex-col gap-1 lg:gap-2">
            {levels.filter(l => l.id <= 4).map(level => (
              level.unlocked ? (
                <div key={level.id}
                  onClick={() => router.push(`/game?level=${level.id}`)}
                  className="flex items-center gap-2 lg:gap-3 rounded-xl px-3 lg:px-4 cursor-pointer transition-all"
                  style={{ background: `${level.color}15`, border: `1px solid ${level.color}44`,
                    boxShadow: `0 0 20px ${level.color}22`,
                    paddingTop: 'clamp(6px, 1.2vh, 16px)',
                    paddingBottom: 'clamp(6px, 1.2vh, 16px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${level.color}25`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${level.color}15`)}>
                  <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full flex items-center justify-center font-black text-sm"
                    style={{ background: level.color, color: "#000" }}>
                    {level.id}
                  </div>
                  <div>
                    <div className="font-bold text-xs lg:text-sm" style={{ color: level.color }}>{level.name}</div>
                    <div className="text-[10px] lg:text-xs" style={{ color: "#6080a0" }}>{level.region}</div>
                  </div>
                  <div className="ml-auto text-xs font-bold hidden sm:block" style={{ color: level.color }}>PLAY →</div>
                </div>
              ) : (
                <div key={level.id}
                  className="flex items-center gap-2 lg:gap-3 rounded-xl px-3 lg:px-4 opacity-40"
                  style={{ background: "#0d1a2a", border: "1px solid #1a2a3a",
                    paddingTop: 'clamp(6px, 1.2vh, 16px)',
                    paddingBottom: 'clamp(6px, 1.2vh, 16px)' }}>
                  <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-sm"
                    style={{ background: "#1a2a3a", color: "#4a6a8a" }}>
                    🔒
                  </div>
                  <div>
                    <div className="font-bold text-xs lg:text-sm" style={{ color: "#4a6a8a" }}>{level.name}</div>
                    <div className="text-[10px] lg:text-xs" style={{ color: "#3a5a7a" }}>{level.region}</div>
                  </div>
                </div>
              )
            ))}
            <div className="flex items-center gap-2 lg:gap-3 rounded-xl px-3 lg:px-4"
              style={{ background: "#0d1a2a", border: "1px solid #1a2a3a",
                paddingTop: 'clamp(6px, 1.2vh, 16px)',
                paddingBottom: 'clamp(6px, 1.2vh, 16px)' }}>
              <div className="text-sm lg:text-lg">🔒</div>
              <div className="text-[10px] lg:text-xs" style={{ color: "#4a6a8a" }}>
                6 more regions coming soon
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => router.push("/game?level=1")}
            className="font-black tracking-widest rounded-2xl text-sm lg:text-lg transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #D4A853, #f59e0b, #D4A853)",
              backgroundSize: "200% 100%",
              color: "#0a0a0a",
              boxShadow: "0 0 30px #D4A85366, 0 0 60px #D4A85333",
              letterSpacing: "0.2em",
              paddingTop: 'clamp(8px, 1.5vh, 20px)',
              paddingBottom: 'clamp(8px, 1.5vh, 20px)' }}>
            START ▶
          </button>

          <div className="hidden sm:block text-center text-xs" style={{ color: "#4a6a8a" }}>
            Arrow keys or WASD to move · Space to jump
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-3 left-4 text-left text-xs z-20" style={{ color: "#4a6a8a" }}>
        Built by{" "}
        <a href="https://helmutfritz.fyi" target="_blank" rel="noopener noreferrer"
          className="transition-colors" style={{ color: "#6a9abf" }}>
          Helmut Fritz
        </a>
        {" "}using AI tools · 2026
      </div>
    </div>
  );
}
