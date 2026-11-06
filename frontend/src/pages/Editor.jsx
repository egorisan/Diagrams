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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from '../api';
import { useAuth } from '../store/auth';
import Logo from '../components/Logo';
import ExportModal from '../components/ExportModal';
import CustomNode from '../editor/CustomNode';
import StylePanel from '../editor/StylePanel';
import {
  PALETTES, SHAPES, CONNECTION_HINTS, EDGE_STYLES, EDGE_COLOR, UML_DEFAULTS,
  edgeMarkerIds, markerDefsSvg,
} from '../editor/palette';
import { TEMPLATES } from '../editor/templates';
import { exportDiagram } from '../editor/exportImage';

const nodeTypes = { custom: CustomNode };
let nodeSeq = 1;
const newId = (p = 'n') => `${p}-${Date.now()}-${nodeSeq++}`;
const AUTOSAVE_DELAY = 2500;

function sanitizeNodes(nodes) {
  return nodes.map(({ id, type, position, data, width, height }) => ({
    id,
    type,
    position,
    ...(width != null && height != null ? { width, height } : {}),
    data: {
      label: data.label,
      shape: data.shape,
      fill: data.fill,
      stroke: data.stroke,
      textColor: data.textColor,
      fontSize: data.fontSize,
      rotation: data.rotation || 0,
      ...(data.attributes != null ? { attributes: data.attributes } : {}),
      ...(data.methods != null ? { methods: data.methods } : {}),
    },
  }));
}

function sanitizeEdges(edges) {
  return edges.map(({ id, source, target, sourceHandle, targetHandle, type, style, markerStart, markerEnd, label, data }) => ({
    id, source, target, sourceHandle, targetHandle, type, style, markerStart, markerEnd, label, data,
  }));
}

function edgeOptions(styleId) {
  const st = EDGE_STYLES.find((s) => s.id === styleId) || EDGE_STYLES[1];
  return {
    type: 'smoothstep',
    style: { stroke: EDGE_COLOR, strokeWidth: 1.6, ...(st.dash ? { strokeDasharray: st.dash } : {}) },
    // Строковый маркер React Flow превращает в url('#<id>') — передаём id наших <marker>
    markerEnd: st.end ? `mk-${st.end}` : undefined,
    markerStart: st.start ? `mk-${st.start}` : undefined,
    data: { styleId: st.id },
  };
}

// Приведение связей из старых сохранений к актуальным маркерам/стилю
function normalizeEdges(edges) {
  return (edges || []).map((e) => {
    const { start, end } = edgeMarkerIds(e);
    return {
      ...e,
      markerStart: start ? `mk-${start}` : undefined,
      markerEnd: end ? `mk-${end}` : undefined,
      style: { stroke: EDGE_COLOR, strokeWidth: 1.6, ...e.style },
    };
  });
}

// Маркеры связей (стрелки, треугольники, ромбы) — общие с экспортом
function EdgeMarkerDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs dangerouslySetInnerHTML={{ __html: markerDefsSvg('mk-') }} />
    </svg>
  );
}

function EdgeIcon({ st }) {
  return (
    <svg width="40" height="12" viewBox="0 0 40 12" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      {st.start === 'diamond' && <path d="M1,6 L6,2 L11,6 L6,10 z" fill="#fff" />}
      {st.start === 'diamond-fill' && <path d="M1,6 L6,2 L11,6 L6,10 z" fill="currentColor" />}
      <line x1={st.start ? 11 : 1} y1="6" x2={st.end === 'triangle' ? 30 : 37} y2="6" strokeDasharray={st.dash ? '4 3' : undefined} />
      {st.end === 'arrow' && <path d="M31,2 L38,6 L31,10" />}
      {st.end === 'arrow-fill' && <path d="M30,2 L38,6 L30,10 z" fill="currentColor" />}
      {st.end === 'triangle' && <path d="M30,1.5 L38.5,6 L30,10.5 z" fill="#fff" />}
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
              <EdgeIcon st={st} />
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
  const { screenToFlowPosition, setViewport, getViewport, zoomIn, zoomOut, fitView } = useReactFlow();

  const [diagram, setDiagram] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeShape, setActiveShape] = useState('rect');
  const [edgeStyle, setEdgeStyle] = useState('directed');
  const [selectedId, setSelectedId] = useState(null);
  const MAX_ELEMENTS = 80;
  const [exportOpen, setExportOpen] = useState(false);
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  // saved | dirty | saving | error
  const [saveState, setSaveState] = useState('saved');
  const [loadError, setLoadError] = useState('');
  const [showMap, setShowMap] = useState(true);

  const history = useRef({ past: [], future: [] });
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const clipboard = useRef(null);
  const pasteCount = useRef(0);
  const lastSaved = useRef(null);
  const loaded = useRef(false);
  const lastStyleSnap = useRef({ key: null, t: 0 });
  const hintTimer = useRef(null);

  // Свойства показываются по актуальной ноде, а не по снимку на момент выделения
  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

  const serialize = () => JSON.stringify({ n: sanitizeNodes(nodesRef.current), e: sanitizeEdges(edgesRef.current) });

  const takeSnapshot = useCallback(() => {
    history.current.past.push({
      nodes: sanitizeNodes(nodesRef.current),
      edges: sanitizeEdges(edgesRef.current),
    });
    if (history.current.past.length > 100) history.current.past.shift();
    history.current.future = [];
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push({ nodes: sanitizeNodes(nodesRef.current), edges: sanitizeEdges(edgesRef.current) });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, []);

  const redo = useCallback(() => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push({ nodes: sanitizeNodes(nodesRef.current), edges: sanitizeEdges(edgesRef.current) });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, []);

  const showHint = useCallback((msg) => {
    setHint(msg);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(''), 3500);
  }, []);

  // Загрузка диаграммы
  useEffect(() => {
    loaded.current = false;
    (async () => {
      try {
        const { data } = await api.get(`/diagrams/${id}`);
        setDiagram(data);
        const content = data.content || {};
        const ns = content.nodes || [];
        const es = normalizeEdges(content.edges);
        setNodes(ns);
        setEdges(es);
        if (content.viewport) setViewport(content.viewport);
        lastSaved.current = JSON.stringify({ n: sanitizeNodes(ns), e: sanitizeEdges(es) });
        loaded.current = true;
      } catch (err) {
        setLoadError(err.response?.data?.detail || 'Не удалось загрузить диаграмму');
      }
    })();
  }, [id, setViewport]);

  // Сохранение в облако. autosave=true — фоновое (не учитывается в статистике сохранений)
  const save = useCallback(async ({ autosave = false } = {}) => {
    if (!loaded.current) return false;
    const snapshot = serialize();
    if (!autosave) setSaving(true);
    setSaveState('saving');
    try {
      await api.put(`/diagrams/${id}${autosave ? '?autosave=true' : ''}`, {
        content: {
          nodes: sanitizeNodes(nodesRef.current),
          edges: sanitizeEdges(edgesRef.current),
          viewport: getViewport(),
        },
      });
      lastSaved.current = snapshot;
      setSaveState(serialize() === snapshot ? 'saved' : 'dirty');
      if (!autosave) showHint('Диаграмма сохранена');
      return true;
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSaveState('error');
      showHint(detail === 'ELEMENT_LIMIT' ? `Максимум ${MAX_ELEMENTS} элементов на диаграмме` : (typeof detail === 'string' ? detail : 'Ошибка сохранения'));
      return false;
    } finally {
      if (!autosave) setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, getViewport, showHint]);

  // Автосохранение: через AUTOSAVE_DELAY после последнего изменения содержимого
  useEffect(() => {
    if (!loaded.current) return;
    if (nodes.some((n) => n.data?.editing)) return;
    if (serialize() === lastSaved.current) return;
    setSaveState('dirty');
    const t = setTimeout(() => save({ autosave: true }), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, save]);

  // Несохранённые изменения при уходе со страницы
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (loaded.current && serialize() !== lastSaved.current) {
        save({ autosave: true });
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (loaded.current && serialize() !== lastSaved.current) save({ autosave: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const addNodeAt = useCallback((shape, position) => {
    if (nodesRef.current.length >= MAX_ELEMENTS) {
      showHint(`Максимум ${MAX_ELEMENTS} элементов на диаграмме`);
      return;
    }
    takeSnapshot();
    const pos = position || screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
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
          rotation: 0,
          ...UML_DEFAULTS[shape],
        },
      },
    ]);
  }, [takeSnapshot, showHint, screenToFlowPosition]);

  // Копирование / вставка выделенных элементов (со связями между ними)
  const copySelection = useCallback(() => {
    const sel = nodesRef.current.filter((n) => n.selected);
    if (!sel.length) return;
    const ids = new Set(sel.map((n) => n.id));
    clipboard.current = {
      nodes: sanitizeNodes(sel),
      edges: sanitizeEdges(edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target))),
    };
    pasteCount.current = 0;
    showHint(`Скопировано: ${sel.length}`);
  }, [showHint]);

  const paste = useCallback(() => {
    const clip = clipboard.current;
    if (!clip) return;
    if (nodesRef.current.length + clip.nodes.length > MAX_ELEMENTS) {
      showHint(`Максимум ${MAX_ELEMENTS} элементов на диаграмме`);
      return;
    }
    takeSnapshot();
    pasteCount.current += 1;
    const off = 30 * pasteCount.current;
    const map = {};
    const newNodes = clip.nodes.map((n) => {
      map[n.id] = newId();
      return { ...n, id: map[n.id], position: { x: n.position.x + off, y: n.position.y + off }, selected: true, data: { ...n.data } };
    });
    const remapHandle = (h, oldId, nid) => (h ? h.replace(oldId, nid) : h);
    const newEdges = clip.edges.map((e) => ({
      ...e,
      id: newId('e'),
      source: map[e.source],
      target: map[e.target],
      sourceHandle: remapHandle(e.sourceHandle, e.source, map[e.source]),
      targetHandle: remapHandle(e.targetHandle, e.target, map[e.target]),
    }));
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((es) => [...es.map((e) => ({ ...e, selected: false })), ...newEdges]);
  }, [takeSnapshot, showHint]);

  // Горячие клавиши. Используем e.code (физическая клавиша), чтобы сочетания
  // работали и в русской раскладке (Ctrl+Я = Ctrl+Z и т.д.)
  const keyActions = useRef({});
  keyActions.current = { undo, redo, save, copySelection, paste, zoomIn, zoomOut, fitView };
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const a = keyActions.current;
      const code = e.code;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;

      // Масштаб холста вместо масштаба страницы браузера
      if (code === 'Equal' || code === 'NumpadAdd' || e.key === '+' || e.key === '=') {
        e.preventDefault(); a.zoomIn({ duration: 150 }); return;
      }
      if (code === 'Minus' || code === 'NumpadSubtract' || e.key === '-') {
        e.preventDefault(); a.zoomOut({ duration: 150 }); return;
      }
      if (code === 'Digit0' || code === 'Numpad0') {
        e.preventDefault(); a.fitView({ duration: 200, padding: 0.2 }); return;
      }
      if (code === 'KeyS') { e.preventDefault(); a.save(); return; }
      if (inField) return;
      if (code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); }
      else if (code === 'KeyY') { e.preventDefault(); a.redo(); }
      else if (code === 'KeyC') { e.preventDefault(); a.copySelection(); }
      else if (code === 'KeyV') { e.preventDefault(); a.paste(); }
    };
    // Ctrl + колесо вне холста тоже не должно масштабировать страницу
    const onWheel = (e) => { if (e.ctrlKey) e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  // События от кастомной ноды (снимок истории) и сайдбара (двойной клик → центр)
  useEffect(() => {
    const onSnapshot = () => takeSnapshot();
    const onAddCenter = (e) => addNodeAt(e.detail, null);
    window.addEventListener('editor:snapshot', onSnapshot);
    window.addEventListener('editor:add-center', onAddCenter);
    return () => {
      window.removeEventListener('editor:snapshot', onSnapshot);
      window.removeEventListener('editor:add-center', onAddCenter);
    };
  }, [takeSnapshot, addNodeAt]);

  const palette = useMemo(
    () => PALETTES[diagram?.type] || PALETTES.custom,
    [diagram]
  );

  const onNodesChange = useCallback((changes) => {
    // Снимок перед удалением нод
    if (changes.some((c) => c.type === 'remove')) takeSnapshot();
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, [takeSnapshot]);

  const onEdgesChange = useCallback((changes) => {
    if (changes.some((c) => c.type === 'remove')) takeSnapshot();
    setEdges((es) => applyEdgeChanges(changes, es));
  }, [takeSnapshot]);

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
  }, [diagram, takeSnapshot, edgeStyle, showHint]);

  const onEdgeStyle = (styleId) => {
    setEdgeStyle(styleId);
    // Если выделены связи — применить стиль к ним
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedEdges.length) {
      takeSnapshot();
      const opts = edgeOptions(styleId);
      setEdges((es) =>
        es.map((e) => (e.selected ? { ...e, ...opts, style: opts.style } : e))
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
    if (e.target.closest('.react-flow__node, .react-flow__edge, .react-flow__controls, .react-flow__minimap')) return;
    addNodeAt(activeShape, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [activeShape, addNodeAt, screenToFlowPosition]);

  const onNodeDoubleClick = useCallback((_, node) => {
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, editing: 'label' } } : n)));
  }, []);

  const applyTemplate = (t) => {
    const built = t.build();
    if (built.nodes.length > MAX_ELEMENTS) {
      showHint(`Шаблон не помещается: максимум ${MAX_ELEMENTS} элементов`);
      return;
    }
    takeSnapshot();
    setNodes(built.nodes);
    setEdges(normalizeEdges(built.edges));
    if (built.viewport) setViewport(built.viewport);
  };

  const onStyleChange = useCallback((nodeId, patch) => {
    // Один снимок истории на серию изменений одного свойства (ползунок цвета/поворота)
    const key = `${nodeId}:${Object.keys(patch).join(',')}`;
    const now = Date.now();
    if (lastStyleSnap.current.key !== key || now - lastStyleSnap.current.t > 800) takeSnapshot();
    lastStyleSnap.current = { key, t: now };
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [takeSnapshot]);

  const onDeleteNode = useCallback((nodeId) => {
    takeSnapshot();
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedId(null);
  }, [takeSnapshot]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedId(sel.length === 1 ? sel[0].id : null);
  }, []);

  // Экспорт в файл (отдельно от сохранения в облако)
  const doExport = async (fileName, format) => {
    setExportOpen(false);
    try {
      await api.post(`/diagrams/${id}/export`);
    } catch { /* учет не критичен */ }
    try {
      await exportDiagram(format, nodesRef.current, edgesRef.current, true, fileName);
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

  const SAVE_STATUS = {
    saved: { text: 'Все изменения сохранены', cls: 'text-emerald-600' },
    dirty: { text: 'Есть несохранённые изменения', cls: 'text-amber-600' },
    saving: { text: 'Сохранение…', cls: 'text-slate-400' },
    error: { text: 'Ошибка сохранения', cls: 'text-red-500' },
  }[saveState];

  return (
    <div className="h-screen flex flex-col pastel-bg">
      <header className="h-14 bg-white/80 backdrop-blur border-b border-slate-200/60 flex items-center gap-3 px-4 shrink-0">
        <Link to="/" className="shrink-0" title="На главную"><Logo size="sm" /></Link>
        <Link to="/dashboard" className="text-slate-400 hover:text-slate-700 text-sm" title="К проектам">←</Link>
        <div className="leading-tight min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{diagram?.name || 'Загрузка...'}</p>
          <p className={`text-[11px] ${SAVE_STATUS.cls}`}>{SAVE_STATUS.text}</p>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 text-slate-500">
          <button onClick={undo} title="Отменить (Ctrl+Z)" className="w-8 h-8 rounded-lg hover:bg-slate-100 text-sm">↶</button>
          <button onClick={redo} title="Вернуть (Ctrl+Y)" className="w-8 h-8 rounded-lg hover:bg-slate-100 text-sm">↷</button>
        </div>
        <div className="flex items-center gap-1 text-slate-500 border-l border-slate-200 pl-2 ml-1">
          <button onClick={() => zoomOut({ duration: 150 })} title="Уменьшить (Ctrl + −)" className="w-8 h-8 rounded-lg hover:bg-slate-100">−</button>
          <ZoomLabel />
          <button onClick={() => zoomIn({ duration: 150 })} title="Увеличить (Ctrl + +)" className="w-8 h-8 rounded-lg hover:bg-slate-100">＋</button>
          <button
            onClick={() => setShowMap(!showMap)}
            title={showMap ? 'Скрыть мини-карту' : 'Показать мини-карту'}
            className={`w-8 h-8 rounded-lg hover:bg-slate-100 ${showMap ? 'text-pink-500' : 'text-slate-400'}`}
          >▣</button>
        </div>

        <button
          onClick={() => save()}
          disabled={saving}
          title="Сохранить в «Мои проекты» (Ctrl+S)"
          className="px-4 py-2 ml-2 text-sm font-semibold bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-50 shadow-md shadow-pink-200"
        >
          {saving ? 'Сохранение...' : '💾 Сохранить'}
        </button>
        <button
          onClick={() => setExportOpen(true)}
          title="Скачать как PNG / JPG / SVG"
          className="px-4 py-2 text-sm font-semibold border border-pink-200 text-pink-600 bg-white rounded-xl hover:bg-pink-50"
        >
          ⤓ Экспорт
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
            connectionLineStyle={{ stroke: EDGE_COLOR, strokeWidth: 1.6 }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            zoomOnDoubleClick={false}
            minZoom={0.1}
            maxZoom={4}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <EdgeMarkerDefs />
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#cbd5e1" />
            <Controls position="bottom-left" showInteractive={false} />
            {showMap && <MiniMap pannable zoomable position="bottom-right" className="!bg-white/90 !rounded-xl !shadow" />}
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
        busy={false}
      />
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
