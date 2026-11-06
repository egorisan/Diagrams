// Палитра элементов по типам диаграмм.
// shape — как рисуется нода (см. CustomNode.jsx)
export const SHAPES = {
  umlclass: { label: 'Класс', hint: 'UML-класс' },
  umlinterface: { label: 'Интерфейс', hint: '«interface»' },
  umlabstract: { label: 'Абстр. класс', hint: '«abstract»' },
  umlenum: { label: 'Перечисление', hint: '«enumeration»' },
  rect: { label: 'Блок', hint: 'Прямоугольник' },
  rounded: { label: 'Скругленный', hint: 'Процесс/состояние' },
  diamond: { label: 'Ромб', hint: 'Решение/связь' },
  ellipse: { label: 'Эллипс', hint: 'Прецедент/атрибут' },
  cylinder: { label: 'Цилиндр', hint: 'База данных' },
  actor: { label: 'Актор', hint: 'Человечек' },
  component: { label: 'Компонент', hint: 'UML-компонент' },
  package: { label: 'Пакет', hint: 'Папка/пакет' },
  container: { label: 'Контейнер', hint: 'Граница системы' },
  note: { label: 'Заметка', hint: 'Комментарий' },
};

export const PALETTES = {
  class: ['umlclass', 'umlinterface', 'umlabstract', 'umlenum', 'package', 'cylinder', 'note'],
  object: ['rect', 'umlclass', 'rounded', 'package', 'cylinder'],
  c4: ['actor', 'rect', 'rounded', 'cylinder', 'container'],
  usecase: ['actor', 'ellipse', 'cylinder', 'container'],
  er: ['rect', 'diamond', 'ellipse', 'cylinder'],
  component: ['component', 'rect', 'container', 'cylinder', 'package'],
  custom: Object.keys(SHAPES),
};

// Размеры фигур по умолчанию (до ручного изменения размера).
// Используются редактором, экспортом и превью — держать в синхроне.
export const SHAPE_SIZES = {
  container: { w: 220, h: 140 },
  actor: { w: 50, h: 80 },
  cylinder: { w: 120, h: 80 },
  diamond: { w: 150, h: 90 },
  umlclass: { w: 170, h: 110 },
  umlinterface: { w: 170, h: 110 },
  umlabstract: { w: 170, h: 110 },
  umlenum: { w: 170, h: 110 },
};
export const DEFAULT_SIZE = { w: 110, h: 50 };
export const defaultSize = (shape) => SHAPE_SIZES[shape] || DEFAULT_SIZE;

// Фактический размер ноды: ручной (width/height) → измеренный React Flow → по умолчанию
export function nodeBox(n) {
  const d = defaultSize(n.data?.shape);
  return {
    w: n.width ?? n.measured?.width ?? d.w,
    h: n.height ?? n.measured?.height ?? d.h,
  };
}

export const isUml = (shape) => typeof shape === 'string' && shape.startsWith('uml');
export const UML_STEREO = { umlinterface: '«interface»', umlabstract: '«abstract»', umlenum: '«enumeration»' };

// Начальное содержимое секций UML-классификаторов
export const UML_DEFAULTS = {
  umlclass: { attributes: '- id: int\n- name: string', methods: '+ getName(): string' },
  umlabstract: { attributes: '# id: int', methods: '+ process(): void' },
  umlinterface: { attributes: '', methods: '+ execute(): void' },
  umlenum: { attributes: 'VALUE_A\nVALUE_B', methods: '' },
};

// Метрики UML-блока (одинаковые в редакторе и экспорте)
export function umlMetrics(fontSize = 14, hasStereo = false) {
  const fs = fontSize;
  const sfs = Math.max(10, Math.round(fs * 0.85));
  const nameLH = Math.round(fs * 1.3);
  const lineH = Math.round(sfs * 1.4);
  const headerH = 12 + (hasStereo ? 12 : 0) + nameLH;
  return { fs, sfs, nameLH, lineH, headerH, padY: 5, padX: 10 };
}

// Маркеры связей (id <marker> в SVG). end — у цели, start — у источника.
//   arrow       — открытая стрелка (зависимость)
//   arrow-fill  — закрашенная стрелка (направленная связь / поток)
//   triangle    — пустой треугольник (наследование, реализация)
//   diamond     — пустой ромб (агрегация), diamond-fill — закрашенный (композиция)
export const EDGE_STYLES = [
  { id: 'assoc', label: 'Ассоциация', dash: null, end: null, start: null },
  { id: 'directed', label: 'Направленная', dash: null, end: 'arrow-fill', start: null },
  { id: 'dependency', label: 'Зависимость', dash: '6 4', end: 'arrow', start: null },
  { id: 'inherit', label: 'Наследование', dash: null, end: 'triangle', start: null },
  { id: 'realize', label: 'Реализация', dash: '6 4', end: 'triangle', start: null },
  { id: 'aggregate', label: 'Агрегация', dash: null, end: null, start: 'diamond' },
  { id: 'compose', label: 'Композиция', dash: null, end: null, start: 'diamond-fill' },
];

export const EDGE_COLOR = '#475569';

// Приводит маркеры связи (в т.ч. из старых сохранений) к id наших маркеров
export function edgeMarkerIds(e) {
  const norm = (m) => {
    if (!m) return null;
    if (typeof m === 'object') return m.type === 'arrow' ? 'arrow' : 'arrow-fill';
    const id = String(m).replace(/^url\(['"]?#/, '').replace(/['"]?\)$/, '').replace(/^mk-/, '');
    return id || null;
  };
  return { start: norm(e.markerStart), end: norm(e.markerEnd) };
}

// SVG-определения маркеров; prefix — префикс id ('mk-' в редакторе)
export function markerDefsSvg(prefix = 'mk-', color = EDGE_COLOR) {
  return (
    `<marker id="${prefix}arrow" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<path d="M1,1 L11,6 L1,11" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></marker>` +
    `<marker id="${prefix}arrow-fill" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<path d="M0,1 L11,6 L0,11 z" fill="${color}"/></marker>` +
    `<marker id="${prefix}triangle" viewBox="0 0 16 14" markerWidth="16" markerHeight="14" refX="15" refY="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<path d="M1,1 L15,7 L1,13 z" fill="#ffffff" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></marker>` +
    `<marker id="${prefix}diamond" viewBox="0 0 18 10" markerWidth="18" markerHeight="10" refX="17" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<path d="M1,5 L9,1 L17,5 L9,9 z" fill="#ffffff" stroke="${color}" stroke-width="1.5"/></marker>` +
    `<marker id="${prefix}diamond-fill" viewBox="0 0 18 10" markerWidth="18" markerHeight="10" refX="17" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">` +
    `<path d="M1,5 L9,1 L17,5 L9,9 z" fill="${color}" stroke="${color}" stroke-width="1.5"/></marker>`
  );
}

// Легкие подсказки при соединении (без жесткой блокировки)
// rules[type] = [{ from, to, message }]
export const CONNECTION_HINTS = {
  er: [
    { from: 'diamond', to: 'diamond', message: 'Связи (ромбы) обычно соединяют сущности, а не друг друга' },
    { from: 'ellipse', to: 'ellipse', message: 'Атрибуты обычно присоединяются к сущности или связи' },
    { from: 'cylinder', to: 'cylinder', message: 'Таблицы связываются через внешние ключи' },
  ],
  c4: [
    { from: 'actor', to: 'cylinder', message: 'Актор обычно взаимодействует с системой, а не напрямую с БД' },
  ],
  usecase: [
    { from: 'actor', to: 'actor', message: 'Между акторами связи встречаются редко (только наследование)' },
  ],
};
