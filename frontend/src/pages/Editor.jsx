import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  useViewport,
  ConnectionMode,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from '../api';
import { useAuth } from '../store/auth';
import Logo from '../components/Logo';
import Paywall from '../components/Paywall';
import ExportModal from '../components/ExportModal';
import CustomNode from '../editor/CustomNode';
import StylePanel from '../editor/StylePanel';
import { PALETTES, SHAPES, CONNECTION_HINTS, EDGE_STYLES } from '../editor/palette';
import { TEMPLATES } from '../editor/templates';
import { exportDiagram } from '../editor/exportImage';

const nodeTypes = { custom: CustomNode };
let nodeSeq = 1;
const newId = () => `n-${Date.now()}-${nodeSeq++}`;

function sanitizeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({
    id,
    type,
    position,
    data: {
      label: data.label,
      shape: data.shape,
      fill: data.fill,
      stroke: data.stroke,
      textColor: data.textColor,
      fontSize: data.fontSize,
    },
  }));
}

function edgeOptions(styleId) {
  const st = EDGE_STYLES.find((s) => s.id === styleId) || EDGE_STYLES[1];
  return {
    type: 'smoothstep',
    style: st.dash ? { strokeDasharray: st.dash } : undefined,
    markerEnd: st.marker
      ? { type: st.marker === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow }
      : undefined,
    markerStart: st.start ? `url(#mk-${st.start})` : undefined,
  };
}

// Кастомные маркеры UML: ромб агрегации (пустой) и композиции (закрашенный)
function EdgeMarkerDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <marker id="mk-diamond" markerWidth="16" markerHeight="10" refX="14" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <polygon points="14,5 7,0 0,5 7,10" fill="#fff" stroke="#64748b" strokeWidth="1.5" />
        </marker>
        <marker id="mk-diamond-fill" markerWidth="16" markerHeight="10" refX="14" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <polygon points="14,5 7,0 0,5 7,10" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700"
      >
        {title}
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Sidebar({ palette, activeShape, setActiveShape, edgeStyle, onEdgeStyle, onTemplate }) {
  const onDragStart = (e, shape) => {
    e.dataTransfer.setData('application/reactflow-shape', shape);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-56 bg-white/80 backdrop-blur border-r border-slate-200/60 flex flex-col shrink-0 overflow-y-auto">
      <Section title="Элементы диаграммы">
        <div className="grid grid-cols-2 gap-2">
          {palette.map((shape) => (
            <button
              key={shape}
              draggable
              onDragStart={(e) => onDragStart(e, shape)}
              onClick={() => setActiveShape(shape)}
              onDoubleClick={() => {
                setActiveShape(shape);
                window.dispatchEvent(new CustomEvent('editor:add-center', { detail: shape }));
              }}
              title={`${SHAPES[shape]?.hint || ''} — перетащите или двойной клик`}
              className={`px-2 py-2 text-xs rounded-lg border text-center transition cursor-grab ${
                activeShape === shape
                  ? 'border-pink-400 bg-pink-50 text-pink-600 font-medium'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {SHAPES[shape]?.label || shape}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Перетащите на холст или двойной клик — элемент появится по центру.
        </p>
      </Section>

      <Section title="Связи">
        <div className="space-y-1">
          {EDGE_STYLES.map((st) => (
            <button
              key={st.id}
              onClick={() => onEdgeStyle(st.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition ${
                edgeStyle === st.id ? 'bg-pink-50 text-pink-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg width="36" height="10" className="shrink-0">
                {st.start && (
                  <polygon
                    points="0,5 4,1 8,5 4,9"
                    fill={st.start === 'diamond-fill' ? 'currentColor' : '#fff'}
                    stroke="currentColor" strokeWidth="1"
                  />
                )}
                <line
                  x1={st.start ? 8 : 0} y1="5" x2="30" y2="5"
                  stroke="currentColor" strokeWidth="1.5"
                  strokeDasharray={st.dash || undefined}
                />
                {st.marker && <polygon points="30,1 36,5 30,9" fill="currentColor" />}
              </svg>
              {st.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Новые связи используют выбранный стиль. Если выделена связь — стиль применится к ней.
        </p>
      </Section>

      <Section title="Шаблоны">
        <div className="space-y-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => onTemplate(t)}
              className="w-full text-left px-3 py-2 text-xs rounded-lg border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition text-slate-600"
            >
              {t.name}
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}

function ZoomLabel() {
  const { zoom } = useViewport();
  return <span className="text-xs text-slate-500 w-11 text-center">{Math.round(zoom * 100)}%</span>;
}

function EditorInner() {
  const { id } = useParams();
  const { user } = useAuth();
  const { screenToFlowPosition, setViewport, getViewport, zoomIn, zoomOut } = useReactFlow();

  const [diagram, setDiagram] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeShape, setActiveShape] = useState('rect');
  const [edgeStyle, setEdgeStyle] = useState('directed');
  const [selected, setSelected] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const history = useRef({ past: [], future: [] });
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const takeSnapshot = useCallback(() => {
    history.current.past.push({
      nodes: sanitizeNodes(nodesRef.current),
      edges: edgesRef.current,
    });
    if (history.current.past.length > 100) history.current.past.shift();
    history.current.future = [];
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push({ nodes: sanitizeNodes(nodesRef.current), edges: edgesRef.current });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, []);

  const redo = useCallback(() => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push({ nodes: sanitizeNodes(nodesRef.current), edges: edgesRef.current });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, []);

  // Загрузка диаграммы
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/diagrams/${id}`);
        setDiagram(data);
        const content = data.content || {};
        setNodes(content.nodes || []);
        setEdges(content.edges || []);
        if (content.viewport) setViewport(content.viewport);
      } catch (err) {
        setLoadError(err.response?.data?.detail || 'Не удалось загрузить диаграмму');
      }
    })();
  }, [id, setViewport]);

  // События от кастомной ноды (коммит подписи) и сайдбара (двойной клик → центр)
  useEffect(() => {
    const onSnapshot = () => takeSnapshot();
    const onAddCenter = (e) => addNodeAt(e.detail, null);
    window.addEventListener('editor:snapshot', onSnapshot);
    window.addEventListener('editor:add-center', onAddCenter);
    return () => {
      window.removeEventListener('editor:snapshot', onSnapshot);
      window.removeEventListener('editor:add-center', onAddCenter);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Горячие клавиши: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Ctrl+S
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, user]);

  const palette = useMemo(
    () => PALETTES[diagram?.type] || PALETTES.custom,
    [diagram]
  );

  const addNodeAt = useCallback((shape, position) => {
    takeSnapshot();
    const pos = position || { x: 200 + Math.random() * 100, y: 150 + Math.random() * 80 };
    setNodes((ns) => [
      ...ns,
      {
        id: newId(),
        type: 'custom',
        position: pos,
        data: {
          label: SHAPES[shape]?.label || 'Блок',
          shape,
          fill: '#ffffff',
          stroke: '#1e293b',
          textColor: '#1e293b',
          fontSize: 14,
        },
      },
    ]);
  }, [takeSnapshot]);

  const onNodesChange = useCallback((changes) => {
    // Снимок перед удалением нод
    if (changes.some((c) => c.type === 'remove')) takeSnapshot();
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, [takeSnapshot]);

  const onEdgesChange = useCallback((changes) => {
    if (changes.some((c) => c.type === 'remove')) takeSnapshot();
    setEdges((es) => applyEdgeChanges(changes, es));
  }, [takeSnapshot]);

  const showHint = (msg) => {
    setHint(msg);
    setTimeout(() => setHint(''), 4500);
  };

  const onConnect = useCallback((conn) => {
    // Легкие визуальные подсказки по правилам типа диаграммы
    const hints = CONNECTION_HINTS[diagram?.type] || [];
    const src = nodesRef.current.find((n) => n.id === conn.source);
    const tgt = nodesRef.current.find((n) => n.id === conn.target);
    for (const rule of hints) {
      if (rule.from === src?.data?.shape && rule.to === tgt?.data?.shape) {
        showHint(`Подсказка: ${rule.message}`);
      }
    }
    takeSnapshot();
    setEdges((es) => addEdge({ ...conn, ...edgeOptions(edgeStyle) }, es));
  }, [diagram, takeSnapshot, edgeStyle]);

  const onEdgeStyle = (styleId) => {
    setEdgeStyle(styleId);
    // Если выделены связи — применить стиль к ним
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedEdges.length) {
      takeSnapshot();
      const opts = edgeOptions(styleId);
      setEdges((es) =>
        es.map((e) =>
          e.selected ? { ...e, type: opts.type, style: { ...e.style, ...opts.style }, markerEnd: opts.markerEnd, markerStart: opts.markerStart } : e
        )
      );
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const shape = e.dataTransfer.getData('application/reactflow-shape');
    if (!shape) return;
    addNodeAt(shape, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [addNodeAt, screenToFlowPosition]);

  const onCanvasDoubleClick = useCallback((e) => {
    if (e.target.closest('.react-flow__node')) return;
    addNodeAt(activeShape, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [activeShape, addNodeAt, screenToFlowPosition]);

  const onNodeDoubleClick = useCallback((_, node) => {
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, editing: true } } : n)));
  }, []);

  const applyTemplate = (t) => {
    takeSnapshot();
    const built = t.build();
    setNodes(built.nodes);
    setEdges(built.edges);
    if (built.viewport) setViewport(built.viewport);
  };

  const onStyleChange = useCallback((nodeId, patch) => {
    takeSnapshot();
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [takeSnapshot]);

  const onDeleteNode = useCallback((nodeId) => {
    takeSnapshot();
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelected(null);
  }, [takeSnapshot]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelected(sel[0] || null);
  }, []);

  const handleLimitError = (err) => {
    const detail = err.response?.data?.detail;
    if (detail === 'LIMIT_REACHED' || err.response?.status === 403) {
      setPaywallReason('На тарифе Free доступно 2 сохранения/экспорта в день.');
      setPaywall(true);
      return true;
    }
    return false;
  };

  const save = async () => {
    if (!diagram) return;
    setSaving(true);
    try {
      await api.put(`/diagrams/${id}`, {
        content: {
          nodes: sanitizeNodes(nodesRef.current),
          edges: edgesRef.current,
          viewport: getViewport(),
        },
      });
      showHint('Сохранено');
    } catch (err) {
      if (!handleLimitError(err)) showHint(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const doExport = async (fileName, format) => {
    setExportOpen(false);
    // Сохранить в облако
    await save();
    // Учет экспорта + лимит
    try {
      await api.post(`/diagrams/${id}/export`);
    } catch (err) {
      if (handleLimitError(err)) return;
    }
    try {
      await exportDiagram(format, nodesRef.current, edgesRef.current, !!user?.is_pro, fileName);
    } catch (err) {
      showHint('Ошибка экспорта: ' + err.message);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center pastel-bg">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <Link to="/dashboard" className="text-pink-500 hover:underline">← Назад к проектам</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col pastel-bg">
      <header className="h-14 bg-white/80 backdrop-blur border-b border-slate-200/60 flex items-center gap-3 px-4 shrink-0">
        <Link to="/" className="shrink-0"><Logo size="sm" /></Link>
        <Link to="/dashboard" className="text-slate-400 hover:text-slate-700 text-sm">←</Link>
        <div className="leading-tight min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{diagram?.name || 'Загрузка...'}</p>
          <p className="text-[11px] text-slate-400">{diagram?.type || ''}</p>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 text-slate-500">
          <button onClick={undo} title="Отменить (Ctrl+Z)" className="w-8 h-8 rounded-lg hover:bg-slate-100 text-sm">↶</button>
          <button onClick={redo} title="Вернуть (Ctrl+Shift+Z)" className="w-8 h-8 rounded-lg hover:bg-slate-100 text-sm">↷</button>
        </div>
        <div className="flex items-center gap-1 text-slate-500 border-l border-slate-200 pl-2 ml-1">
          <button onClick={() => zoomOut()} className="w-8 h-8 rounded-lg hover:bg-slate-100">−</button>
          <ZoomLabel />
          <button onClick={() => zoomIn()} className="w-8 h-8 rounded-lg hover:bg-slate-100">＋</button>
        </div>

        <button
          onClick={() => setExportOpen(true)}
          disabled={saving}
          className="px-4 py-2 ml-2 text-sm font-semibold bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-50 shadow-md shadow-pink-200"
        >
          {saving ? 'Сохранение...' : '⤓ Сохранить'}
        </button>

        <span className="w-8 h-8 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs ml-1">
          {(user?.email?.[0] || '?').toUpperCase()}
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar
          palette={palette}
          activeShape={activeShape}
          setActiveShape={setActiveShape}
          edgeStyle={edgeStyle}
          onEdgeStyle={onEdgeStyle}
          onTemplate={applyTemplate}
        />

        <div
          className="flex-1 relative"
          onDoubleClick={onCanvasDoubleClick}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={takeSnapshot}
            onNodeDoubleClick={onNodeDoubleClick}
            onSelectionChange={onSelectionChange}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={edgeOptions(edgeStyle)}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <EdgeMarkerDefs />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#cbd5e1" />
            <Controls position="bottom-left" />
            <MiniMap pannable zoomable position="bottom-right" className="!bg-white/90 !rounded-xl !shadow" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-500">Здесь будет ваша диаграмма</p>
                <p className="text-sm text-slate-400 mt-1">Перетащите элементы из панели слева<br />и начните создавать диаграмму</p>
              </div>
            </div>
          )}

          {hint && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-lg">
              {hint}
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur border-l border-slate-200/60 shrink-0 overflow-y-auto">
          <StylePanel node={selected} onChange={onStyleChange} onDelete={onDeleteNode} />
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultName={diagram?.name}
        onSave={doExport}
        busy={saving}
      />
      <Paywall open={paywall} onClose={() => setPaywall(false)} reason={paywallReason} />
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
