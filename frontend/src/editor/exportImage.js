// Экспорт диаграммы: строим чистый SVG из content (узлы + связи + подписи),
// затем SVG скачивается напрямую или растрируется в PNG/JPG через canvas.
// html-to-image не используется — он теряет SVG-маркеры стрелок и фон подписей.
import { nodeBox, isUml, UML_STEREO, umlMetrics, edgeMarkerIds, markerDefsSvg, EDGE_COLOR } from './palette';

const WATERMARK = 'Создано в FastDia';
const FONT = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Перенос строк по ширине (как word-wrap в редакторе), ширина символа ≈ 0.56em
function wrapLines(text, maxWidth, fs) {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fs * 0.56)));
  const out = [];
  for (const para of String(text).split('\n')) {
    if (para.length <= maxChars) { out.push(para); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const cand = line ? `${line} ${word}` : word;
      if (cand.length <= maxChars) { line = cand; continue; }
      if (line) out.push(line);
      line = word;
      while (line.length > maxChars) { out.push(line.slice(0, maxChars)); line = line.slice(maxChars); }
    }
    out.push(line);
  }
  return out;
}

function shapeSvg(n, x, y, w, h) {
  const d = n.data || {};
  const fill = d.fill || '#fff';
  const stroke = d.stroke || '#1e293b';
  const sw = 2;
  const shape = d.shape || 'rect';
  const a = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"`;

  switch (shape) {
    case 'rounded':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" ${a}/>`;
    case 'ellipse':
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${a}/>`;
    case 'diamond':
      return `<polygon points="${x + w / 2},${y + 2} ${x + w - 2},${y + h / 2} ${x + w / 2},${y + h - 2} ${x + 2},${y + h / 2}" ${a}/>`;
    case 'cylinder': {
      const ry = Math.min(10, h / 6);
      // sweep-flag 0: дуга от левого края к правому проходит через низ — дно цилиндра
      return `<path d="M${x + 2},${y + ry} L${x + 2},${y + h - ry} A${w / 2 - 2},${ry} 0 0,0 ${x + w - 2},${y + h - ry} L${x + w - 2},${y + ry}" ${a}/>` +
        `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2 - 2}" ry="${ry}" ${a}/>`;
    }
    case 'actor': {
      const cx = x + w / 2;
      const r = Math.min(w, h) * 0.12;
      return `<g stroke="${stroke}" stroke-width="${sw}" fill="none">` +
        `<circle cx="${cx}" cy="${y + r + 2}" r="${r}" fill="${fill}"/>` +
        `<line x1="${cx}" y1="${y + r * 2 + 2}" x2="${cx}" y2="${y + h * 0.6}"/>` +
        `<line x1="${x + w * 0.1}" y1="${y + h * 0.35}" x2="${x + w * 0.9}" y2="${y + h * 0.35}"/>` +
        `<line x1="${cx}" y1="${y + h * 0.6}" x2="${x + w * 0.2}" y2="${y + h - 4}"/>` +
        `<line x1="${cx}" y1="${y + h * 0.6}" x2="${x + w * 0.8}" y2="${y + h - 4}"/>` +
        `</g>`;
    }
    case 'component':
      return `<rect x="${x + 8}" y="${y}" width="${w - 8}" height="${h}" ${a}/>` +
        `<rect x="${x}" y="${y + 8}" width="12" height="6" ${a}/>` +
        `<rect x="${x}" y="${y + 18}" width="12" height="6" ${a}/>`;
    case 'package':
      return `<rect x="${x}" y="${y}" width="56" height="12" rx="2" ${a}/>` +
        `<rect x="${x}" y="${y + 12}" width="${w}" height="${h - 12}" ${a}/>`;
    case 'container':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ${a} stroke-dasharray="6 5"/>`;
    case 'note':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${d.fill || '#fef9c3'}" stroke="${stroke}" stroke-width="1"/>`;
    default:
      if (isUml(shape)) return umlSvg(n, x, y, w, h);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${a}/>`;
  }
}

// UML-классификатор: заголовок (стереотип + имя), атрибуты, методы — те же метрики, что в CustomNode
function umlSvg(n, x, y, w, h) {
  const d = n.data || {};
  const shape = d.shape;
  const stroke = d.stroke || '#1e293b';
  const color = d.textColor || '#1e293b';
  const stereo = UML_STEREO[shape];
  const m = umlMetrics(d.fontSize || 14, !!stereo);
  const methods = String(d.methods || '').split('\n');
  const methodsH = Math.max(1, methods.length) * m.lineH + m.padY * 2;
  const sepY = y + h - methodsH;
  const attrs = String(d.attributes || '').split('\n');
  const italic = shape === 'umlabstract' ? ' font-style="italic"' : '';
  const cx = x + w / 2;
  const top = y + (m.headerH - (stereo ? 12 : 0) - m.nameLH) / 2;

  const lineText = (lines, startY) => lines
    .map((ln, i) => `<text x="${x + m.padX}" y="${startY + i * m.lineH + m.lineH * 0.72}" font-family="${MONO}" font-size="${m.sfs}" fill="${color}" xml:space="preserve">${esc(ln)}</text>`)
    .join('');

  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${d.fill || '#fff'}" stroke="${stroke}" stroke-width="2"/>` +
    `<line x1="${x}" y1="${y + m.headerH}" x2="${x + w}" y2="${y + m.headerH}" stroke="${stroke}" stroke-width="2"/>` +
    `<line x1="${x}" y1="${sepY}" x2="${x + w}" y2="${sepY}" stroke="${stroke}" stroke-width="1"/>` +
    (stereo ? `<text x="${cx}" y="${top + 9}" text-anchor="middle" font-family="${FONT}" font-size="9" fill="${color}" opacity="0.7">${stereo}</text>` : '') +
    `<text x="${cx}" y="${top + (stereo ? 12 : 0) + m.nameLH * 0.75}" text-anchor="middle" font-family="${FONT}" font-size="${m.fs}" font-weight="600"${italic} fill="${color}">${esc(d.label)}</text>` +
    lineText(attrs, y + m.headerH + m.padY) +
    lineText(methods, sepY + m.padY);
}

function labelSvg(n, x, y, w, h) {
  const d = n.data || {};
  const shape = d.shape || 'rect';
  if (isUml(shape)) return '';
  const label = String(d.label || '');
  if (!label.trim()) return '';
  const color = d.textColor || '#1e293b';
  const fs = d.fontSize || 14;
  const lh = fs * 1.25;
  // Внутренние отступы как в редакторе (px-3 / px-4)
  const inner = shape === 'diamond' ? w * 0.6 : shape === 'actor' ? 200 : w - (['cylinder', 'package', 'component'].includes(shape) ? 32 : 24);
  const lines = wrapLines(label, inner, fs);
  let tx = x + w / 2;
  let anchor = 'middle';
  let cy = y + h / 2 + (shape === 'cylinder' ? 8 : shape === 'package' ? 6 : 0);
  let ty = cy - ((lines.length - 1) * lh) / 2 + fs * 0.35;
  if (shape === 'actor') ty = y + h + 4 + fs;
  if (shape === 'container') { tx = x + 12; anchor = 'start'; ty = y + 8 + fs; }
  return lines
    .map((ln, i) => `<text x="${tx}" y="${ty + i * lh}" text-anchor="${anchor}" font-family="${FONT}" font-size="${fs}" fill="${color}" xml:space="preserve">${esc(ln)}</text>`)
    .join('');
}

const DIRS = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };

// Сторона ноды из id хэндла (`s-<side>-<nodeId>`), иначе — по взаимному расположению
function sideOf(handle, from, to) {
  const m = /^s-(top|right|bottom|left)-/.exec(handle || '');
  if (m) return m[1];
  const dx = to.cx - from.cx, dy = to.cy - from.cy;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
}

function anchor(b, side) {
  return {
    top: { x: b.cx, y: b.y },
    bottom: { x: b.cx, y: b.y + b.h },
    left: { x: b.x, y: b.cy },
    right: { x: b.x + b.w, y: b.cy },
  }[side];
}

// Ортогональный маршрут как у smoothstep: выход из стороны → излом → вход в сторону
function edgeRoute(sb, tb, sSide, tSide) {
  const off = 20;
  const a = anchor(sb, sSide), b = anchor(tb, tSide);
  const [sdx, sdy] = DIRS[sSide], [tdx, tdy] = DIRS[tSide];
  const p1 = { x: a.x + sdx * off, y: a.y + sdy * off };
  const p2 = { x: b.x + tdx * off, y: b.y + tdy * off };
  const sH = sdx !== 0, tH = tdx !== 0;
  let mid;
  if (sH && tH) { const mx = (p1.x + p2.x) / 2; mid = [{ x: mx, y: p1.y }, { x: mx, y: p2.y }]; }
  else if (!sH && !tH) { const my = (p1.y + p2.y) / 2; mid = [{ x: p1.x, y: my }, { x: p2.x, y: my }]; }
  else if (sH) mid = [{ x: p2.x, y: p1.y }];
  else mid = [{ x: p1.x, y: p2.y }];
  const pts = [a, p1, ...mid, p2, b];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return { d, labelAt: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

export function buildDiagramSvg(nodes, edges, { watermark = false } = {}) {
  const boxes = new Map();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const { w, h } = nodeBox(n);
    const x = n.position.x, y = n.position.y;
    boxes.set(n.id, { x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    // Повёрнутые фигуры учитываем по описанной окружности, чтобы не обрезать
    const r = n.data?.rotation ? Math.hypot(w, h) / 2 : 0;
    minX = Math.min(minX, r ? x + w / 2 - r : x);
    minY = Math.min(minY, r ? y + h / 2 - r : y);
    maxX = Math.max(maxX, r ? x + w / 2 + r : x + w);
    maxY = Math.max(maxY, (r ? y + h / 2 + r : y + h) + (n.data?.shape === 'actor' ? 30 : 0));
  }
  // Отступ от краёв: 48px — оптимальный баланс: достаточно воздуха, чтобы
  // не обрезать маркеры/подписи, но не размывать внимание пустым полем
  const pad = 48;
  const W = Math.ceil(Math.max(200, maxX - minX + pad * 2));
  const H = Math.ceil(Math.max(150, maxY - minY + pad * 2));
  const ox = pad - minX, oy = pad - minY;

  const shift = (b) => ({ ...b, x: b.x + ox, y: b.y + oy, cx: b.cx + ox, cy: b.cy + oy });

  const edgeParts = [];
  const labelParts = [];
  edges.forEach((e) => {
    const sbRaw = boxes.get(e.source), tbRaw = boxes.get(e.target);
    if (!sbRaw || !tbRaw) return;
    const sb = shift(sbRaw), tb = shift(tbRaw);
    const { d, labelAt } = edgeRoute(sb, tb, sideOf(e.sourceHandle, sb, tb), sideOf(e.targetHandle, tb, sb));
    const { start, end } = edgeMarkerIds(e);
    const color = e.style?.stroke || EDGE_COLOR;
    const dash = e.style?.strokeDasharray ? ` stroke-dasharray="${e.style.strokeDasharray}"` : '';
    edgeParts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${e.style?.strokeWidth || 1.6}" stroke-linejoin="round"${dash}` +
      (end ? ` marker-end="url(#x-${end})"` : '') + (start ? ` marker-start="url(#x-${start})"` : '') + '/>'
    );
    if (e.label) {
      const text = esc(e.label);
      const tw = String(e.label).length * 7 + 12;
      labelParts.push(
        `<rect x="${labelAt.x - tw / 2}" y="${labelAt.y - 10}" width="${tw}" height="20" rx="4" fill="#ffffff" fill-opacity="0.95"/>`,
        `<text x="${labelAt.x}" y="${labelAt.y + 4}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${color}">${text}</text>`
      );
    }
  });

  const nodeParts = nodes.map((n) => {
    const b = shift(boxes.get(n.id));
    const inner = shapeSvg(n, b.x, b.y, b.w, b.h) + labelSvg(n, b.x, b.y, b.w, b.h);
    const rot = n.data?.rotation || 0;
    return rot ? `<g transform="rotate(${rot} ${b.cx} ${b.cy})">${inner}</g>` : inner;
  });

  let wm = '';
  if (watermark) {
    const rows = [];
    for (let y = -H; y < H * 2; y += 140) {
      rows.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="38" fill="#0f172a" fill-opacity="0.13">${WATERMARK}</text>`);
    }
    wm = `<g transform="rotate(-30 ${W / 2} ${H / 2})">${rows.join('')}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${markerDefsSvg('x-')}` +
    `<pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="#cbd5e1"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
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
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(svgUrl);
  return canvas.toDataURL(type === 'jpg' ? 'image/jpeg' : 'image/png', 0.85);
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
