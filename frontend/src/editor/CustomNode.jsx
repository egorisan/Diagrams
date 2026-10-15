import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

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

function ShapeBox({ data, selected, children, className = '', style = {} }) {
  return (
    <div
      className={`relative flex items-center justify-center text-center whitespace-pre-wrap px-3 py-2 ${className} ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
      style={{
        background: data.fill,
        borderColor: data.stroke,
        color: data.textColor,
        fontSize: data.fontSize || 14,
        minWidth: 110,
        minHeight: 48,
        ...style,
      }}
    >
      {children ?? data.label}
    </div>
  );
}

export default memo(function CustomNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const [draft, setDraft] = useState(data.label);
  const editing = !!data.editing;

  const commit = () => {
    window.dispatchEvent(new CustomEvent('editor:snapshot'));
    updateNodeData(id, { label: draft, editing: false });
  };

  const body = (shapeEl) => (
    <>
      <Handles id={id} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') updateNodeData(id, { editing: false });
          }}
          className="nodrag w-28 px-2 py-1 border border-blue-400 rounded outline-none text-sm text-center"
          style={{ color: '#1e293b' }}
        />
      ) : (
        shapeEl
      )}
    </>
  );

  const shape = data.shape || 'rect';
  const common = { background: data.fill, color: data.textColor, fontSize: data.fontSize || 14 };

  switch (shape) {
    case 'rounded':
      return body(
        <ShapeBox data={data} selected={selected} className="rounded-2xl border-2" style={{ borderColor: data.stroke }}>
          {data.label}
        </ShapeBox>
      );
    case 'diamond':
      return body(
        <div className={`relative flex items-center justify-center ${selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : ''}`}>
          <svg width="150" height="90" viewBox="0 0 150 90">
            <polygon points="75,4 146,45 75,86 4,45" fill={data.fill} stroke={data.stroke} strokeWidth="2" />
          </svg>
          <span className="absolute text-center px-4" style={{ color: common.color, fontSize: common.fontSize }}>
            {data.label}
          </span>
        </div>
      );
    case 'ellipse':
      return body(
        <ShapeBox data={data} selected={selected} className="rounded-[50%] border-2" style={{ borderColor: data.stroke, minWidth: 130, minHeight: 60 }}>
          {data.label}
        </ShapeBox>
      );
    case 'cylinder':
      return body(
        <div className={`relative ${selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : ''}`}>
          <svg width="120" height="80" viewBox="0 0 120 80">
            <ellipse cx="60" cy="12" rx="55" ry="10" fill={data.fill} stroke={data.stroke} strokeWidth="2" />
            <path d="M5,12 L5,66 A55,10 0 0,0 115,66 L115,12" fill={data.fill} stroke={data.stroke} strokeWidth="2" />
            <ellipse cx="60" cy="66" rx="55" ry="10" fill="none" stroke={data.stroke} strokeWidth="2" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center pt-3 px-2 text-center" style={{ color: common.color, fontSize: common.fontSize }}>
            {data.label}
          </span>
        </div>
      );
    case 'actor':
      return body(
        <div className={`relative flex flex-col items-center ${selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : ''}`}>
          <svg width="50" height="80" viewBox="0 0 50 80">
            <circle cx="25" cy="10" r="8" fill={data.fill} stroke={data.stroke} strokeWidth="2" />
            <line x1="25" y1="18" x2="25" y2="48" stroke={data.stroke} strokeWidth="2" />
            <line x1="5" y1="28" x2="45" y2="28" stroke={data.stroke} strokeWidth="2" />
            <line x1="25" y1="48" x2="10" y2="72" stroke={data.stroke} strokeWidth="2" />
            <line x1="25" y1="48" x2="40" y2="72" stroke={data.stroke} strokeWidth="2" />
          </svg>
          <span className="mt-1 text-center" style={{ color: common.color, fontSize: common.fontSize }}>
            {data.label}
          </span>
        </div>
      );
    case 'component':
      return body(
        <div className={`relative ${selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : ''}`}>
          <div
            className="relative flex items-center justify-center px-6 py-3 border-2 ml-2"
            style={{ background: data.fill, borderColor: data.stroke, color: common.color, fontSize: common.fontSize, minWidth: 120, minHeight: 50 }}
          >
            <span className="absolute -left-2 top-2 flex flex-col gap-1">
              <span className="block w-3 h-1.5 border-2" style={{ borderColor: data.stroke, background: data.fill }} />
              <span className="block w-3 h-1.5 border-2" style={{ borderColor: data.stroke, background: data.fill }} />
            </span>
            {data.label}
          </div>
        </div>
      );
    case 'package':
      return body(
        <div className={`relative pt-3 ${selected ? 'drop-shadow-[0_0_4px_#3b82f6]' : ''}`}>
          <div
            className="absolute top-0 left-0 w-14 h-3 border-2 border-b-0 rounded-t"
            style={{ background: data.fill, borderColor: data.stroke }}
          />
          <div
            className="flex items-center justify-center px-4 py-3 border-2"
            style={{ background: data.fill, borderColor: data.stroke, color: common.color, fontSize: common.fontSize, minWidth: 110, minHeight: 46 }}
          >
            {data.label}
          </div>
        </div>
      );
    case 'container':
      return body(
        <ShapeBox
          data={data}
          selected={selected}
          className="border-2 border-dashed rounded-lg"
          style={{ borderColor: data.stroke, minWidth: 220, minHeight: 140, alignItems: 'flex-start' }}
        >
          {data.label}
        </ShapeBox>
      );
    case 'umlclass':
    case 'umlinterface':
    case 'umlabstract':
    case 'umlenum': {
      const STEREO = {
        umlinterface: '«interface»',
        umlabstract: '«abstract»',
        umlenum: '«enumeration»',
      };
      const stereo = STEREO[shape];
      const italic = shape === 'umlabstract';
      return body(
        <div
          className={`border-2 rounded-sm ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
          style={{ background: data.fill, borderColor: data.stroke, minWidth: 150 }}
        >
          <div className="border-b-2 px-3 py-1.5 text-center" style={{ borderColor: data.stroke }}>
            {stereo && (
              <div className="text-[9px] leading-tight" style={{ color: data.textColor, opacity: 0.7 }}>
                {stereo}
              </div>
            )}
            <div
              className={`font-semibold leading-tight ${italic ? 'italic' : ''}`}
              style={{ color: data.textColor, fontSize: data.fontSize || 14 }}
            >
              {data.label}
            </div>
          </div>
          <div className="px-3 py-1.5 space-y-1.5">
            <div className="h-1 rounded-sm" style={{ background: data.stroke, opacity: 0.18 }} />
            <div className="h-1 rounded-sm w-4/5" style={{ background: data.stroke, opacity: 0.18 }} />
          </div>
          <div className="border-t px-3 py-1.5" style={{ borderColor: data.stroke }}>
            <div className="h-1 rounded-sm w-3/5" style={{ background: data.stroke, opacity: 0.18 }} />
          </div>
        </div>
      );
    }
    case 'note':
      return body(
        <ShapeBox
          data={data}
          selected={selected}
          className="border border-b-0"
          style={{ borderColor: data.stroke, background: data.fill || '#fef9c3', minWidth: 100, minHeight: 44 }}
        >
          {data.label}
        </ShapeBox>
      );
    default:
      return body(
        <ShapeBox data={data} selected={selected} className="rounded-md border-2" style={{ borderColor: data.stroke }}>
          {data.label}
        </ShapeBox>
      );
  }
});
