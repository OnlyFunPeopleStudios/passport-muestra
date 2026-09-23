import React from 'react';

export const FLAGS: Record<string, { name: string; render: () => React.ReactNode }> = {
  ar: {
    name: 'Argentina',
    render: () => (
      <svg viewBox="0 0 800 500" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="800" height="166.6" fill="#74ACDF" />
        <rect y="166.6" width="800" height="166.6" fill="#FFFFFF" />
        <rect y="333.3" width="800" height="166.6" fill="#74ACDF" />
        <circle cx="400" cy="250" r="32" fill="#F6B40E" />
        <circle cx="400" cy="250" r="36" fill="none" stroke="#85340A" strokeWidth="2" />
      </svg>
    ),
  },
  br: {
    name: 'Brasil',
    render: () => (
      <svg viewBox="0 0 1000 700" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="1000" height="700" fill="#009C3B" />
        <polygon points="500,85 915,350 500,615 85,350" fill="#FFDF00" />
        <circle cx="500" cy="350" r="175" fill="#002776" />
        <path d="M 330,370 A 180,180 0 0,1 670,335" stroke="#FFFFFF" strokeWidth="20" fill="none" />
      </svg>
    ),
  },
  pt: {
    name: 'Portugal',
    render: () => (
      <svg viewBox="0 0 600 400" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="240" height="400" fill="#046A38" />
        <rect x="240" width="360" height="400" fill="#DA291C" />
        <circle cx="240" cy="200" r="60" fill="#FFE900" stroke="#000000" strokeWidth="4" />
        <rect x="215" y="175" width="50" height="50" rx="6" fill="#FFFFFF" stroke="#DA291C" strokeWidth="5" />
      </svg>
    ),
  },
  eg: {
    name: 'Egipto',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="200" fill="#CE1126" />
        <rect y="200" width="900" height="200" fill="#FFFFFF" />
        <rect y="400" width="900" height="200" fill="#000000" />
        <circle cx="450" cy="300" r="35" fill="#C09300" />
      </svg>
    ),
  },
  mx: {
    name: 'México',
    render: () => (
      <svg viewBox="0 0 700 400" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="233.3" height="400" fill="#006847" />
        <rect x="233.3" width="233.3" height="400" fill="#FFFFFF" />
        <rect x="466.6" width="233.3" height="400" fill="#CE1126" />
        <circle cx="350" cy="200" r="40" fill="#755627" />
        <path d="M 320 220 Q 350 240 380 220" stroke="#006847" strokeWidth="6" fill="none" />
      </svg>
    ),
  },
  es: {
    name: 'España',
    render: () => (
      <svg viewBox="0 0 750 500" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="750" height="125" fill="#AA151B" />
        <rect y="125" width="750" height="250" fill="#F1BF00" />
        <rect y="375" width="750" height="125" fill="#AA151B" />
        <rect x="180" y="200" width="60" height="80" rx="10" fill="#AA151B" />
        <rect x="190" y="210" width="40" height="60" fill="#F1BF00" />
      </svg>
    ),
  },
  it: {
    name: 'Italia',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="300" height="600" fill="#009246" />
        <rect x="300" width="300" height="600" fill="#FFFFFF" />
        <rect x="600" width="300" height="600" fill="#CE2B37" />
      </svg>
    ),
  },
  jp: {
    name: 'Japón',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="600" fill="#FFFFFF" />
        <circle cx="450" cy="300" r="180" fill="#BC002D" />
      </svg>
    ),
  },
  co: {
    name: 'Colombia',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="300" fill="#FCD116" />
        <rect y="300" width="900" height="150" fill="#003893" />
        <rect y="450" width="900" height="150" fill="#CE1126" />
      </svg>
    ),
  },
  us: {
    name: 'Estados Unidos',
    render: () => (
      <svg viewBox="0 0 760 400" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="760" height="400" fill="#B22234" />
        <path d="M0,30.7 H760 M0,92.3 H760 M0,153.8 H760 M0,215.3 H760 M0,276.9 H760 M0,338.4 H760" stroke="#FFFFFF" strokeWidth="30.7" />
        <rect width="304" height="215.3" fill="#3C3B6E" />
        <circle cx="76" cy="54" r="8" fill="#FFFFFF" />
        <circle cx="152" cy="54" r="8" fill="#FFFFFF" />
        <circle cx="228" cy="54" r="8" fill="#FFFFFF" />
        <circle cx="114" cy="108" r="8" fill="#FFFFFF" />
        <circle cx="190" cy="108" r="8" fill="#FFFFFF" />
        <circle cx="76" cy="162" r="8" fill="#FFFFFF" />
        <circle cx="152" cy="162" r="8" fill="#FFFFFF" />
        <circle cx="228" cy="162" r="8" fill="#FFFFFF" />
      </svg>
    ),
  },
  gb: {
    name: 'Reino Unido',
    render: () => (
      <svg viewBox="0 0 600 300" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="600" height="300" fill="#012169" />
        <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFFFFF" strokeWidth="60" />
        <path d="M0,0 L600,300 M600,0 L0,300" stroke="#C8102E" strokeWidth="20" />
        <path d="M300,0 V300 M0,150 H600" stroke="#FFFFFF" strokeWidth="100" />
        <path d="M300,0 V300 M0,150 H600" stroke="#C8102E" strokeWidth="60" />
      </svg>
    ),
  },
  cn: {
    name: 'China',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="600" fill="#EE1C25" />
        <polygon points="150,75 168,131 228,131 179,166 198,222 150,187 102,222 121,166 72,131 132,131" fill="#FFFF00" />
        <circle cx="300" cy="60" r="15" fill="#FFFF00" />
        <circle cx="360" cy="120" r="15" fill="#FFFF00" />
        <circle cx="360" cy="210" r="15" fill="#FFFF00" />
        <circle cx="300" cy="270" r="15" fill="#FFFF00" />
      </svg>
    ),
  },
  ma: {
    name: 'Marruecos',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="600" fill="#C1272D" />
        <polygon points="450,180 497,325 374,235 526,235 403,325" fill="none" stroke="#006233" strokeWidth="22" strokeLinejoin="round" />
      </svg>
    ),
  },
  fr: {
    name: 'Francia',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="300" height="600" fill="#002654" />
        <rect x="300" width="300" height="600" fill="#FFFFFF" />
        <rect x="600" width="300" height="600" fill="#ED2939" />
      </svg>
    ),
  },
  de: {
    name: 'Alemania',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="200" fill="#000000" />
        <rect y="200" width="900" height="200" fill="#DD0000" />
        <rect y="400" width="900" height="200" fill="#FFCC00" />
      </svg>
    ),
  },
  ca: {
    name: 'Canadá',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="225" height="600" fill="#FF0000" />
        <rect x="225" width="450" height="600" fill="#FFFFFF" />
        <rect x="675" width="225" height="600" fill="#FF0000" />
        <polygon points="450,150 480,260 550,230 520,300 580,330 490,370 470,440 450,400 430,440 410,370 320,330 380,300 350,230 420,260" fill="#FF0000" />
      </svg>
    ),
  },
  cl: {
    name: 'Chile',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="300" fill="#FFFFFF" />
        <rect y="300" width="900" height="300" fill="#D52B1E" />
        <rect width="300" height="300" fill="#0039A6" />
        <polygon points="150,70 170,130 230,130 180,170 200,230 150,190 100,230 120,170 70,130 130,130" fill="#FFFFFF" />
      </svg>
    ),
  },
  uy: {
    name: 'Uruguay',
    render: () => (
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover" preserveAspectRatio="none">
        <rect width="900" height="600" fill="#FFFFFF" />
        <rect y="66.6" width="900" height="66.6" fill="#0038A8" />
        <rect y="200" width="900" height="66.6" fill="#0038A8" />
        <rect y="333.3" width="900" height="66.6" fill="#0038A8" />
        <rect y="466.6" width="900" height="66.6" fill="#0038A8" />
        <rect width="250" height="266.6" fill="#FFFFFF" />
        <circle cx="125" cy="133.3" r="45" fill="#FCD116" stroke="#85340A" strokeWidth="2" />
      </svg>
    ),
  },
};

export function FlagIcon({ flag, className = "w-6 h-6" }: { flag: string; className?: string }) {
  const f = FLAGS[flag.toLowerCase()];
  if (!f) {
    return (
      <div className={`flex items-center justify-center bg-slate-700 text-[10px] font-bold text-white uppercase rounded ${className}`}>
        {flag.slice(0, 2)}
      </div>
    );
  }
  return (
    <div className={`overflow-hidden rounded shadow-sm inline-block ${className}`}>
      {f.render()}
    </div>
  );
}

export function FlagBackground({ flag }: { flag: string }) {
  const f = FLAGS[flag.toLowerCase()];
  if (!f) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center text-white/30 text-4xl font-black font-mono">
        {flag.toUpperCase()}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {f.render()}
    </div>
  );
}
