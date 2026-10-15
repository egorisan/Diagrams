// Статичное мини-превью диаграммы из сохраненного content (узлы + связи)
const DEFAULT_SIZES = { w: 110, h: 50 };
const BIG = { container: { w: 220, h: 140 }, actor: { w: 50, h: 80 }, cylinder: { w: 120, h: 80 }, diamond: { w: 150, h: 90 }, umlclass: { w: 150, h: 80 }, umlinterface: { w: 150, h: 80 }, umlabstract: { w: 150, h: 80 }, umlenum: { w: 150, h: 80 } };

function nodeSize(n) {
  const s = n.data?.shape;
  return BIG[s] || DEFAULT_SIZES;
}

function ShapeThumb({ n }) {
  const { w, h } = nodeSize(n);
  const shape = n.data?.shape || 'rect';
  const fill = n.data?.fill || '#fff';
  const stroke = n.data?.stroke || '#94a3b8';
  const common = { fill, stroke, strokeWidth: 2 };

  switch (shape) {
    case 'rounded': return <rect width={w} height={h} rx="14" {...common} />;
    case 'ellipse': return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...common} />;
    case 'diamond': return <polygon points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`} {...common} />;
    case 'cylinder':
      return (
        <g {...common}>
          <ellipse cx={w / 2} cy="10" rx={w / 2 - 2} ry="9" />
          <path d={`M2,10 L2,${h - 10} A${w / 2 - 2},9 0 0,0 ${w - 2},${h - 10} L${w - 2},10`} />
        </g>
      );
    case 'actor':
      return (
        <g stroke={stroke} strokeWidth="2" fill="none">
          <circle cx={w / 2} cy="9" r="8" fill={fill} />
          <line x1={w / 2} y1="17" x2={w / 2} y2="45" />
          <line x1="5" y1="26" x2={w - 5} y2="26" />
          <line x1={w / 2} y1="45" x2="12" y2={h - 6} />
          <line x1={w / 2} y1="45" x2={w - 12} y2={h - 6} />
        </g>
      );
    case 'component':
      return (
        <g>
          <rect x="8" width={w - 8} height={h} {...common} />
          <rect x="0" y="8" width="10" height="7" {...common} />
          <rect x="0" y="19" width="10" height="7" {...common} />
        </g>
      );
    case 'package':
      return (
        <g {...common}>
          <rect width={w * 0.4} height="10" />
          <rect y="10" width={w} height={h - 10} />
        </g>
      );
    case 'umlclass': case 'umlinterface': case 'umlabstract': case 'umlenum':
      return (
        <g>
          <rect width={w} height={h} rx="2" {...common} />
          <line x1="0" y1="30" x2={w} y2="30" stroke={stroke} strokeWidth="2" />
          <line x1="0" y1={h - 20} x2={w} y2={h - 20} stroke={stroke} strokeWidth="1" />
        </g>
      );
    case 'container': return <rect width={w} height={h} rx="8" strokeDasharray="5 4" {...common} />;
    case 'note': return <rect width={w} height={h} {...common} />;
    default: return <rect width={w} height={h} rx="5" {...common} />;
  }
}

export default function DiagramPreview({ content, className = '' }) {
  const nodes = content?.nodes || [];
  const edges = content?.edges || [];

  if (!nodes.length) {
    return (
      <div className={`flex items-center justify-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] ${className}`}>
        <span className="text-[10px] text-slate-300">Пустая диаграмма</span>
      </div>
    );
  }

  const sized = nodes.map((n) => ({ ...n, _s: nodeSize(n) }));
  const minX = Math.min(...sized.map((n) => n.position.x));
  const minY = Math.min(...sized.map((n) => n.position.y));
  const maxX = Math.max(...sized.map((n) => n.position.x + n._s.w));
  const maxY = Math.max(...sized.map((n) => n.position.y + n._s.h));
  const pad = 16;
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = maxX - minX + pad * 2, vbH = maxY - minY + pad * 2;

  const center = (id) => {
    const n = sized.find((x) => x.id === id);
    return n ? { x: n.position.x + n._s.w / 2, y: n.position.y + n._s.h / 2 } : null;
  };

  return (
    <div className={`bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] ${className}`}>
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {edges.map((e) => {
          const a = center(e.source), b = center(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={e.id}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#94a3b8" strokeWidth="2.5"
              strokeDasharray={e.style?.strokeDasharray}
            />
          );
        })}
        {sized.map((n) => (
          <g key={n.id} transform={`translate(${n.position.x},${n.position.y})`}>
            <ShapeThumb n={n} />
          </g>
        ))}
      </svg>
    </div>
  );
}
