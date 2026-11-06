import { memo, useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position, useReactFlow, useStore } from '@xyflow/react';
import { defaultSize, isUml, UML_STEREO, umlMetrics } from './palette';

const SIDES = [
  { pos: Position.Top, style: { top: -5 } },
  { pos: Position.Right, style: { right: -5 } },
  { pos: Position.Bottom, style: { bottom: -5 } },
  { pos: Position.Left, style: { left: -5 } },
];

// Только source-хэндлы + ConnectionMode.Loose: соединение можно начать и
// завершить на любой стороне, а направление стрелки всегда совпадает с
// направлением протягивания (источник → точка отпускания).
function Handles({ id }) {
  return SIDES.map(({ pos, style }) => (
    <Handle
      key={pos}
      id={`s-${pos}-${id}`}
      type="source"
      position={pos}
      style={style}
      className="custom-handle"
    />
  ));
}

const FIELD_TITLES = { label: 'Название', attributes: 'Атрибуты', methods: 'Методы' };

// Многострочный редактор поверх ноды: Enter — новая строка,
// Ctrl/⌘+Enter или клик мимо — сохранить, Esc — отмена
function InlineEditor({ value, field, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.focus(); el.select(); }
  }, []);
  return (
    <div className="nodrag nowheel absolute inset-0 z-20 min-w-[140px] min-h-[64px] flex flex-col bg-white border-2 border-blue-400 rounded shadow-lg">
      <span className="px-2 pt-1 text-[10px] text-blue-500 select-none">
        {FIELD_TITLES[field]} · Ctrl+Enter — готово
      </span>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommit(draft);
          if (e.key === 'Escape') onCancel();
        }}
        className="flex-1 w-full px-2 pb-1 text-sm text-slate-800 resize-none outline-none bg-transparent"
        rows={Math.max(2, draft.split('\n').length)}
      />
    </div>
  );
}

const textStyle = (data) => ({ color: data.textColor, fontSize: data.fontSize || 14, lineHeight: 1.25 });

function UmlBox({ data, shape, sized, onEditField }) {
  const stereo = UML_STEREO[shape];
  const m = umlMetrics(data.fontSize || 14, !!stereo);
  const section = (field, grow) => (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); onEditField(field); }}
      title={`Двойной клик — редактировать: ${FIELD_TITLES[field].toLowerCase()}`}
      className={`text-left whitespace-pre font-mono overflow-hidden ${grow ? 'flex-1' : ''}`}
      style={{
        color: data.textColor,
        fontSize: m.sfs,
        lineHeight: `${m.lineH}px`,
        padding: `${m.padY}px ${m.padX}px`,
        minHeight: m.lineH + m.padY * 2,
      }}
    >
      {data[field] || ''}
    </div>
  );
  return (
    <div
      className="flex flex-col border-2 rounded-sm"
      style={{
        background: data.fill,
        borderColor: data.stroke,
        ...(sized ? { width: '100%', height: '100%' } : { minWidth: defaultSize(shape).w }),
      }}
    >
      <div
        className="border-b-2 text-center flex flex-col justify-center"
        style={{ borderColor: data.stroke, height: m.headerH, paddingLeft: m.padX, paddingRight: m.padX }}
      >
        {stereo && (
          <div style={{ color: data.textColor, opacity: 0.7, fontSize: 9, lineHeight: '12px' }}>{stereo}</div>
        )}
        <div
          className={`font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${shape === 'umlabstract' ? 'italic' : ''}`}
          style={{ color: data.textColor, fontSize: m.fs, lineHeight: `${m.nameLH}px` }}
        >
          {data.label}
        </div>
      </div>
      {section('attributes', true)}
      <div className="border-t" style={{ borderColor: data.stroke }} />
      {section('methods', false)}
    </div>
  );
}

export default memo(function CustomNode({ id, data, selected }) {
  const { updateNodeData, getNode, flowToScreenPosition } = useReactFlow();
  // Явный размер есть только после ручного ресайза (node.width/height); props width/height —
  // это измеренный размер, по нему ориентироваться нельзя (иначе фигура «схлопнется»)
  const width = useStore((s) => s.nodeLookup.get(id)?.width);
  const height = useStore((s) => s.nodeLookup.get(id)?.height);
  const editing = data.editing === true ? 'label' : data.editing || null;
  const shape = data.shape || 'rect';
  const sized = width != null && height != null;
  const def = defaultSize(shape);
  const W = sized ? width : def.w;
  const H = sized ? height : def.h;

  const snapshot = () => window.dispatchEvent(new CustomEvent('editor:snapshot'));
  const commit = (value) => {
    if (value !== (data[editing] || '')) snapshot();
    updateNodeData(id, { [editing]: value, editing: false });
  };

  // Свободный поворот: тянем за ручку над нодой, угол 0–360° (Shift — шаг 15°)
  const startRotate = (e) => {
    e.stopPropagation();
    e.preventDefault();
    snapshot();
    const onMove = (ev) => {
      const n = getNode(id);
      if (!n) return;
      const w = n.measured?.width ?? W;
      const h = n.measured?.height ?? H;
      const c = flowToScreenPosition({ x: n.position.x + w / 2, y: n.position.y + h / 2 });
      let deg = Math.atan2(ev.clientY - c.y, ev.clientX - c.x) * (180 / Math.PI) + 90;
      deg = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
      updateNodeData(id, { rotation: ((deg % 360) + 360) % 360 });
    };
    const onUp = () => window.removeEventListener('pointermove', onMove);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const rot = data.rotation || 0;
  const glow = selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : '';
  const ring = selected ? 'ring-2 ring-blue-500 ring-offset-1' : '';
  // Блочные фигуры: растягиваются на размер ноды, иначе — минимальный размер с автоподстройкой под текст
  const boxSize = sized ? { width: '100%', height: '100%' } : { minWidth: def.w, minHeight: def.h };
  const label = <span className="whitespace-pre-wrap break-words" style={textStyle(data)}>{data.label}</span>;

  const box = (className, style = {}, contentClass = 'items-center justify-center text-center') => (
    <div
      className={`flex px-3 py-2 ${contentClass} ${className} ${ring}`}
      style={{ background: data.fill, borderColor: data.stroke, ...boxSize, ...style }}
    >
      {label}
    </div>
  );

  // SVG-фигуры: всегда явный размер (по умолчанию или после ресайза)
  const svgShape = (svg, labelClass = 'items-center justify-center') => (
    <div className={`relative ${glow}`} style={{ width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible">{svg}</svg>
      <div className={`absolute inset-0 flex text-center px-4 ${labelClass}`}>{label}</div>
    </div>
  );

  let shapeEl;
  switch (shape) {
    case 'rounded':
      shapeEl = box('rounded-2xl border-2');
      break;
    case 'ellipse':
      shapeEl = box('rounded-[50%] border-2');
      break;
    case 'diamond':
      shapeEl = svgShape(
        <polygon points={`${W / 2},2 ${W - 2},${H / 2} ${W / 2},${H - 2} 2,${H / 2}`} fill={data.fill} stroke={data.stroke} strokeWidth="2" />
      );
      break;
    case 'cylinder': {
      const ry = Math.min(10, H / 6);
      shapeEl = svgShape(
        <>
          <path d={`M2,${ry} L2,${H - ry} A${W / 2 - 2},${ry} 0 0,0 ${W - 2},${H - ry} L${W - 2},${ry}`} fill={data.fill} stroke={data.stroke} strokeWidth="2" />
          <ellipse cx={W / 2} cy={ry} rx={W / 2 - 2} ry={ry} fill={data.fill} stroke={data.stroke} strokeWidth="2" />
        </>,
        'items-center justify-center pt-4'
      );
      break;
    }
    case 'actor': {
      const cx = W / 2;
      const headR = Math.min(W, H) * 0.12;
      shapeEl = (
        <div className={`relative flex flex-col items-center ${glow}`} style={{ width: W }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
            <g stroke={data.stroke} strokeWidth="2" fill="none">
              <circle cx={cx} cy={headR + 2} r={headR} fill={data.fill} />
              <line x1={cx} y1={headR * 2 + 2} x2={cx} y2={H * 0.6} />
              <line x1={W * 0.1} y1={H * 0.35} x2={W * 0.9} y2={H * 0.35} />
              <line x1={cx} y1={H * 0.6} x2={W * 0.2} y2={H - 4} />
              <line x1={cx} y1={H * 0.6} x2={W * 0.8} y2={H - 4} />
            </g>
          </svg>
          <div className="absolute top-full mt-1 text-center w-max max-w-[200px]">{label}</div>
        </div>
      );
      break;
    }
    case 'component':
      shapeEl = (
        <div className={`relative pl-2 ${glow}`} style={boxSize}>
          <div className="relative flex items-center justify-center text-center px-6 py-3 border-2 w-full h-full" style={{ background: data.fill, borderColor: data.stroke }}>
            <span className="absolute -left-2 top-2 flex flex-col gap-1">
              <span className="block w-3 h-1.5 border-2" style={{ borderColor: data.stroke, background: data.fill }} />
              <span className="block w-3 h-1.5 border-2" style={{ borderColor: data.stroke, background: data.fill }} />
            </span>
            {label}
          </div>
        </div>
      );
      break;
    case 'package':
      shapeEl = (
        <div className={`relative pt-3 flex flex-col ${glow}`} style={boxSize}>
          <div className="absolute top-0 left-0 w-14 h-3 border-2 border-b-0 rounded-t" style={{ background: data.fill, borderColor: data.stroke }} />
          <div className="flex-1 flex items-center justify-center text-center px-4 py-3 border-2" style={{ background: data.fill, borderColor: data.stroke }}>
            {label}
          </div>
        </div>
      );
      break;
    case 'container':
      shapeEl = box('border-2 border-dashed rounded-lg', {}, 'items-start justify-start text-left');
      break;
    case 'note':
      shapeEl = box('border', { background: data.fill || '#fef9c3' });
      break;
    default:
      if (isUml(shape)) {
        shapeEl = (
          <div className={`${ring} ${sized ? 'w-full h-full' : ''}`}>
            <UmlBox data={data} shape={shape} sized={sized} onEditField={(f) => updateNodeData(id, { editing: f })} />
          </div>
        );
      } else {
        shapeEl = box('rounded-md border-2');
      }
  }

  return (
    <div className={`group relative ${sized ? 'w-full h-full' : ''}`}>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={40}
        minHeight={30}
        color="#ec4899"
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        onResizeStart={snapshot}
      />
      <Handles id={id} />
      {!editing && (
        <>
          <div className={`absolute -top-7 left-1/2 w-px h-3.5 border-l border-dashed border-pink-400 pointer-events-none transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
          <div
            className={`nodrag absolute -top-10 left-1/2 -translate-x-1/2 z-10 w-5 h-5 rounded-full bg-pink-500 border-2 border-white shadow-md cursor-grab flex items-center justify-center text-white select-none transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            title="Потяните мышью, чтобы повернуть (Shift — шаг 15°)"
            onPointerDown={startRotate}
          >
            <span className="text-[10px] leading-none">⟳</span>
          </div>
        </>
      )}
      <div
        className={sized ? 'w-full h-full' : ''}
        style={rot ? { transform: `rotate(${rot}deg)`, transformOrigin: 'center center' } : undefined}
      >
        {shapeEl}
      </div>
      {editing && (
        <InlineEditor
          key={editing}
          field={editing}
          value={data[editing]}
          onCommit={commit}
          onCancel={() => updateNodeData(id, { editing: false })}
        />
      )}
    </div>
  );
});
