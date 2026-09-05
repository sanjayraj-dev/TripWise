import type { Destination } from "@/lib/tripwise/types";
import { formatDayShort, todayISO } from "@/lib/utils";

export function JourneyMap({ destinations }: { destinations: Destination[] }) {
  if (!destinations.length) {
    return (
      <div className="paper rounded-xl p-6 text-sm text-muted shadow-border">
        Add a destination and the route will draw itself here — city by city, in travel order.
      </div>
    );
  }

  const today = todayISO();
  const width = 720;
  const height = 168;
  const pad = 48;
  const step = destinations.length === 1 ? 0 : (width - pad * 2) / (destinations.length - 1);

  return (
    <div className="paper overflow-hidden rounded-xl p-4 shadow-border sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-[0.18em] text-muted uppercase">Journey map</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Route of destinations">
        <path
          d={`M ${pad} ${height / 2} H ${width - pad}`}
          fill="none"
          stroke="#C9B89A"
          strokeWidth="3"
          strokeDasharray="6 8"
        />
        {destinations.map((stop, i) => {
          const x = pad + step * i;
          const y = height / 2 + (i % 2 === 0 ? -8 : 8);
          const done = Boolean(stop.endDate && stop.endDate < today);
          const current = Boolean(
            stop.startDate && stop.endDate && stop.startDate <= today && today <= stop.endDate,
          );
          return (
            <g key={stop.id}>
              <circle
                cx={x}
                cy={y}
                r={current ? 11 : 8}
                fill={current ? "#C46B4A" : done ? "#6B8F71" : "#FBF6EC"}
                stroke="#2A2118"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y - 22}
                textAnchor="middle"
                fill="#2A2118"
                fontSize="13"
                fontFamily="Figtree, sans-serif"
                fontWeight={600}
              >
                {stop.city}
              </text>
              <text
                x={x}
                y={y + 28}
                textAnchor="middle"
                fill="#6F6256"
                fontSize="11"
                fontFamily="Figtree, sans-serif"
              >
                {formatDayShort(stop.startDate)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
