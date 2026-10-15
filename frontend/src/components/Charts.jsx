// Минималистичные SVG-графики под стиль макета
const COLORS = ['#ec4899', '#a855f7', '#f472b6', '#fbbf24', '#60a5fa', '#34d399'];

export function DonutChart({ data, size = 140, centerLabel }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const r = 55, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  if (!entries.length) {
    return <p className="text-xs text-slate-300 py-8 text-center">Данных пока нет</p>;
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox="0 0 140 140" className="shrink-0">
        {entries.map(([k, v], i) => {
          const frac = v / total;
          const dash = `${frac * circumference} ${circumference}`;
          const el = (
            <circle
              key={k}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += frac * circumference;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-800" fontSize="20" fontWeight="bold">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" fontSize="9">
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs flex-1 min-w-[140px] max-h-[140px] overflow-y-auto pr-1">
        {entries.map(([k, v], i) => (
          <li key={k} className="flex items-center gap-2" title={`${k}: ${v}`}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-slate-600">{k}</span>
            <span className="text-slate-400 ml-auto pl-2 whitespace-nowrap">{v} · {Math.round((v / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChart({ data, height = 140, label, labels = [] }) {
  const W = 340, H = height;
  const max = Math.max(...data, 1);
  const padX = 14, padTop = 18, padBottom = 14;
  const step = (W - padX * 2) / Math.max(data.length - 1, 1);
  const y = (v) => H - padBottom - (v / max) * (H - padTop - padBottom);
  const pts = data.map((v, i) => [padX + i * step, y(v)]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const total = data.reduce((s, v) => s + v, 0);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#fdf2f8" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={`${path} L${pts[pts.length - 1][0]},${H - padBottom} L${pts[0][0]},${H - padBottom} Z`} fill="url(#lg)" />
        <path d={path} fill="none" stroke="#ec4899" strokeWidth="2" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke="#ec4899" strokeWidth="1.5" />
            {/* невидимая зона наведения для тултипа */}
            <circle cx={p[0]} cy={p[1]} r="10" fill="transparent">
              <title>{labels[i] ? `${labels[i]}: ` : ''}{data[i]}</title>
            </circle>
            <text x={p[0]} y={p[1] - 6} textAnchor="middle" fontSize="8" className="fill-slate-400">
              {data[i] > 0 ? data[i] : ''}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-xs font-semibold text-slate-600">Σ {total}</p>
      </div>
    </div>
  );
}

export function BarChart({ data, height = 140, label, labels = [] }) {
  const W = 340, H = height;
  const max = Math.max(...data, 1);
  const padX = 10, padTop = 18, padBottom = 14;
  const bw = (W - padX * 2) / data.length - 4;
  const total = data.reduce((s, v) => s + v, 0);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {data.map((v, i) => {
          const h = (v / max) * (H - padTop - padBottom);
          const x = padX + i * (bw + 4);
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - padBottom - h}
                width={bw}
                height={Math.max(h, 2)}
                rx="3"
                fill="#93c5fd"
                className="hover:fill-blue-400 transition"
              >
                <title>{labels[i] ? `${labels[i]}: ` : ''}{v}</title>
              </rect>
              {v > 0 && (
                <text x={x + bw / 2} y={H - padBottom - h - 4} textAnchor="middle" fontSize="8" className="fill-slate-400">
                  {v}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between items-center mt-1">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-xs font-semibold text-slate-600">Σ {total}</p>
      </div>
    </div>
  );
}
