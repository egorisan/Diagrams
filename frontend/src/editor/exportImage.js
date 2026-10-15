// Экспорт диаграммы: строим чистый SVG из content (узлы + связи + подписи),
// затем SVG скачивается напрямую или растрируется в PNG/JPG через canvas.
// html-to-image не используется — он теряет SVG-маркеры стрелок и фон подписей.

const WATERMARK = 'Создано в 24KT_Diagrams';

const SIZES = {
  container: { w: 220, h: 140 },
  actor: { w: 50, h: 80 },
  cylinder: { w: 120, h: 80 },
  diamond: { w: 150, h: 90 },
  umlclass: { w: 150, h: 80 },
  umlinterface: { w: 150, h: 80 },
  umlabstract: { w: 150, h: 80 },
  umlenum: { w: 150, h: 80 },
};
const DEFAULT = { w: 110, h: 50 };
const nodeSize = (n) => SIZES[n.data?.shape] || DEFAULT;

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shapeSvg(n, x, y, w, h) {
  const d = n.data || {};
  const fill = d.fill || '#fff';
  const stroke = d.stroke || '#1e293b';
  const sw = 2;
  const shape = d.shape || 'rect';

  switch (shape) {
    case 'rounded':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'ellipse':
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'diamond':
      return `<polygon points="${x + w / 2},${y + 2} ${x + w - 2},${y + h / 2} ${x + w / 2},${y + h - 2} ${x + 2},${y + h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'cylinder': {
      const ry = 10;
      return `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2 - sw}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<path d="M${x + sw},${y + ry} L${x + sw},${y + h - ry} A${w / 2 - sw},${ry} 0 0,0 ${x + w - sw},${y + h - ry} L${x + w - sw},${y + ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<ellipse cx="${x + w / 2}" cy="${y + h - ry}" rx="${w / 2 - sw}" ry="${ry}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    case 'actor': {
      const cx = x + w / 2;
      return `<g stroke="${stroke}" stroke-width="${sw}" fill="none">` +
        `<circle cx="${cx}" cy="${y + 10}" r="9" fill="${fill}"/>` +
        `<line x1="${cx}" y1="${y + 19}" x2="${cx}" y2="${y + 50}"/>` +
        `<line x1="${x + 4}" y1="${y + 30}" x2="${x + w - 4}" y2="${y + 30}"/>` +
        `<line x1="${cx}" y1="${y + 50}" x2="${x + 10}" y2="${y + h - 6}"/>` +
        `<line x1="${cx}" y1="${y + 50}" x2="${x + w - 10}" y2="${y + h - 6}"/>` +
        `</g>`;
    }
    case 'component':
      return `<rect x="${x + 10}" y="${y}" width="${w - 10}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<rect x="${x}" y="${y + 8}" width="12" height="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<rect x="${x}" y="${y + 22}" width="12" height="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'package':
      return `<rect x="${x}" y="${y}" width="52" height="12" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<rect x="${x}" y="${y + 12}" width="${w}" height="${h - 12}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'container':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="6 5"/>`;
    case 'umlclass':
    case 'umlinterface':
    case 'umlabstract':
    case 'umlenum':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<line x1="${x}" y1="${y + 34}" x2="${x + w}" y2="${y + 34}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `<line x1="${x}" y1="${y + h - 24}" x2="${x + w}" y2="${y + h - 24}" stroke="${stroke}" stroke-width="1"/>`;
    case 'note':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || '#fef9c3'}" stroke="${stroke}" stroke-width="1.5"/>`;
    default:
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
}

function labelSvg(n, x, y, w, h, shape) {
  const d = n.data || {};
  const label = (d.label || '').trim();
  if (!label) return '';
  const color = d.textColor || '#1e293b';
  const fs = d.fontSize || 14;
  const lines = label.split('\n');
  // Актор: подпись под фигурой; контейнер: сверху слева
  let tx = x + w / 2;
  let anchor = 'middle';
  let ty = y + h / 2 - ((lines.length - 1) * (fs * 1.2)) / 2 + fs * 0.35;
  if (shape === 'actor') ty = y + h + fs + 4;
  if (shape === 'container') { tx = x + 14; anchor = 'start'; ty = y + fs + 10; }

  // UML-классы: стереотип + имя в верхней секции (h=34)
  if (shape && shape.startsWith('uml')) {
    const STEREO = { umlinterface: '«interface»', umlabstract: '«abstract»', umlenum: '«enumeration»' };
    const stereo = STEREO[shape];
    const italic = shape === 'umlabstract' ? ' font-style="italic"' : '';
    const nameY = y + (stereo ? 24 : 21);
    return (
      (stereo ? `<text x="${tx}" y="${y + 12}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="${color}" opacity="0.7">${stereo}</text>` : '') +
      `<text x="${tx}" y="${nameY}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${fs}" font-weight="600"${italic} fill="${color}">${esc(lines[0])}</text>`
    );
  }

  return lines
    .map((ln, i) => `<text x="${tx}" y="${ty + i * fs * 1.2}" text-anchor="${anchor}" font-family="system-ui,-apple-system,sans-serif" font-size="${fs}" fill="${color}">${esc(ln)}</text>`)
    .join('');
}

// Путь связи: ломаный smoothstep-подобный (прямая → скругленный угол → прямая)
function edgePath(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} L${mx},${a.y} L${mx},${b.y} L${b.x},${b.y}`;
}

export function buildDiagramSvg(nodes, edges, { watermark = false } = {}) {
  const sized = nodes.map((n) => ({ ...n, _s: nodeSize(n) }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of sized) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n._s.w);
    maxY = Math.max(maxY, n.position.y + n._s.h + 30); // запас под подписи актора
  }
  const pad = 40;
  const W = Math.max(400, maxX - minX + pad * 2);
  const H = Math.max(300, maxY - minY + pad * 2);
  const ox = pad - minX, oy = pad - minY;

  const center = (id) => {
    const n = sized.find((x) => x.id === id);
    if (!n) return null;
    // Приближенная точка на границе: центр ноды
    return { x: n.position.x + ox + n._s.w / 2, y: n.position.y + oy + n._s.h / 2 };
  };

  const edgeParts = [];
  const labelParts = [];
  edges.forEach((e) => {
    const a = center(e.source), b = center(e.target);
    if (!a || !b) return;
    const dash = e.style?.strokeDasharray ? ` stroke-dasharray="${e.style.strokeDasharray}"` : '';
    const marker = e.markerEnd ? ` marker-end="url(#arrow)"` : '';
    let markerStart = '';
    if (typeof e.markerStart === 'string' && e.markerStart.includes('diamond-fill')) {
      markerStart = ' marker-start="url(#diamond-fill)"';
    } else if (typeof e.markerStart === 'string' && e.markerStart.includes('diamond')) {
      markerStart = ' marker-start="url(#diamond)"';
    }
    edgeParts.push(`<path d="${edgePath(a, b)}" fill="none" stroke="#475569" stroke-width="2"${dash}${marker}${markerStart}/>`);
    if (e.label) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const text = esc(e.label);
      const tw = text.length * 7 + 10;
      labelParts.push(
        `<rect x="${mx - tw / 2}" y="${my - 11}" width="${tw}" height="20" rx="4" fill="#ffffff" fill-opacity="0.9"/>`,
        `<text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#475569">${text}</text>`
      );
    }
  });

  const nodeParts = sized.map((n) => {
    const x = n.position.x + ox, y = n.position.y + oy;
    const { w, h } = n._s;
    return shapeSvg(n, x, y, w, h) + labelSvg(n, x, y, w, h, n.data?.shape);
  });

  let wm = '';
  if (watermark) {
    const rows = [];
    for (let y = -H; y < H * 2; y += 140) {
      rows.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="38" fill="#0f172a" fill-opacity="0.13">${WATERMARK}</text>`);
    }
    wm = `<g transform="rotate(-30 ${W / 2} ${H / 2})">${rows.join('')}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">` +
    `<path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker>` +
    `<marker id="diamond" markerWidth="16" markerHeight="10" refX="14" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<polygon points="14,5 7,0 0,5 7,10" fill="#fff" stroke="#475569" stroke-width="1.5"/></marker>` +
    `<marker id="diamond-fill" markerWidth="16" markerHeight="10" refX="14" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<polygon points="14,5 7,0 0,5 7,10" fill="#475569"/></marker></defs>` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    `<defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="#cbd5e1"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#dots)"/>` +
    edgeParts.join('') + nodeParts.join('') + labelParts.join('') + wm +
    `</svg>`;
}

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}

async function rasterize(svgText, type) {
  const svgUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = svgUrl;
  });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if (type === 'jpg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, img.width, img.height);
  }
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(svgUrl);
  return canvas.toDataURL(type === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
}

export async function exportDiagram(format, nodes, edges, isPro, fileName = 'diagram') {
  const svg = buildDiagramSvg(nodes, edges, { watermark: !isPro });

  if (format === 'svg') {
    download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `${fileName}.svg`);
    return;
  }
  if (format === 'png' || format === 'jpg') {
    download(await rasterize(svg, format), `${fileName}.${format}`);
    return;
  }
  throw new Error('Неизвестный формат');
}
