export default function ArenaBackground() {
  return (
    <svg
      viewBox="0 0 960 640"
      className="arena-bg-svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arenaFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b3fa0" />
          <stop offset="100%" stopColor="#4a2470" />
        </linearGradient>
        <pattern id="arenaGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>

      <rect x="10" y="10" width="940" height="620" rx="60" fill="#241238" stroke="#150a22" strokeWidth="10" />
      <rect x="50" y="50" width="860" height="540" rx="40" fill="url(#arenaFloor)" />
      <rect x="50" y="50" width="860" height="540" rx="40" fill="url(#arenaGrid)" />

      <path d="M 50 50 L 250 50 A 200 200 0 0 0 50 250 Z" fill="#2c1b57" opacity="0.7" />
      <path d="M 910 50 L 710 50 A 200 200 0 0 1 910 250 Z" fill="#2c1b57" opacity="0.7" />
      <path d="M 50 590 L 250 590 A 200 200 0 0 1 50 390 Z" fill="#2c1b57" opacity="0.7" />
      <path d="M 910 590 L 710 590 A 200 200 0 0 0 910 390 Z" fill="#2c1b57" opacity="0.7" />

      <rect x="130" y="295" width="290" height="50" fill="#7c4fb0" stroke="#3a1f5c" strokeWidth="4" />
      <rect x="540" y="295" width="290" height="50" fill="#7c4fb0" stroke="#3a1f5c" strokeWidth="4" />
      <rect x="90" y="275" width="70" height="90" fill="#8a5cc2" stroke="#3a1f5c" strokeWidth="4" />
      <rect x="800" y="275" width="70" height="90" fill="#8a5cc2" stroke="#3a1f5c" strokeWidth="4" />

      <circle cx="480" cy="320" r="150" fill="#4a2470" stroke="#8a5cc2" strokeWidth="6" />
      <circle cx="480" cy="320" r="110" fill="#5b2f8c" stroke="#8a5cc2" strokeWidth="3" />
      <circle cx="480" cy="320" r="60" fill="none" stroke="#c9a6f0" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />

      {[110, 300, 660, 850].map((x) => (
        <g key={x} transform={`translate(${x}, 8)`}>
          <rect x="-16" y="0" width="32" height="46" fill="#a83279" />
          <path d="M -16 46 L 0 34 L 16 46 Z" fill="#a83279" />
        </g>
      ))}
    </svg>
  );
}
