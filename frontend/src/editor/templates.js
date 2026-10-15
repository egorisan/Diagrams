// Предзаполненные шаблоны диаграмм
const n = (id, x, y, shape, label, extra = {}) => ({
  id,
  type: 'custom',
  position: { x, y },
  data: { label, shape, fill: '#ffffff', stroke: '#1e293b', textColor: '#1e293b', fontSize: 14, ...extra },
});

const e = (id, source, target, extra = {}) => ({
  id,
  source,
  target,
  type: 'smoothstep',
  ...extra,
});

export const TEMPLATES = [
  {
    name: 'Базовая ER',
    type: 'er',
    build: () => ({
      nodes: [
        n('t1', 80, 120, 'rect', 'Пользователь'),
        n('t2', 420, 120, 'rect', 'Заказ'),
        n('t3', 420, 320, 'rect', 'Товар'),
        n('d1', 250, 130, 'diamond', 'оформляет', { fill: '#fef3c7' }),
        n('d2', 250, 330, 'diamond', 'содержит', { fill: '#fef3c7' }),
        n('a1', 60, 300, 'ellipse', 'email'),
        n('a2', 600, 200, 'ellipse', 'сумма'),
      ],
      edges: [
        e('e1', 't1', 'd1'),
        e('e2', 'd1', 't2'),
        e('e3', 't2', 'd2'),
        e('e4', 'd2', 't3'),
        e('e5', 'a1', 't1'),
        e('e6', 'a2', 't2'),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  },
  {
    name: 'Простая C4',
    type: 'c4',
    build: () => ({
      nodes: [
        n('u1', 100, 180, 'actor', 'Пользователь'),
        n('s1', 320, 60, 'container', 'Система', { fill: '#eff6ff' }),
        n('web', 350, 100, 'rect', 'Web App'),
        n('api', 350, 220, 'rect', 'API Service'),
        n('db', 580, 220, 'cylinder', 'PostgreSQL', { fill: '#f0fdf4' }),
      ],
      edges: [
        e('e1', 'u1', 'web', { label: 'HTTPS' }),
        e('e2', 'web', 'api', { label: 'REST' }),
        e('e3', 'api', 'db', { label: 'SQL' }),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  },
  {
    name: 'Диаграмма прецедентов',
    type: 'usecase',
    build: () => ({
      nodes: [
        n('a1', 80, 140, 'actor', 'Клиент'),
        n('sys', 260, 40, 'container', 'Интернет-магазин', { fill: '#f8fafc' }),
        n('uc1', 320, 100, 'ellipse', 'Оформить заказ'),
        n('uc2', 320, 220, 'ellipse', 'Оплатить'),
        n('uc3', 520, 220, 'ellipse', 'Выбрать способ оплаты', { fill: '#fef9c3' }),
      ],
      edges: [
        e('e1', 'a1', 'uc1'),
        e('e2', 'a1', 'uc2'),
        e('e3', 'uc2', 'uc3', { label: '«include»', style: { strokeDasharray: '5 5' } }),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  },
  {
    name: 'Диаграмма классов',
    type: 'class',
    build: () => ({
      nodes: [
        n('c1', 120, 80, 'rect', 'User\n+id: UUID\n+email: str'),
        n('c2', 120, 320, 'rect', 'Admin'),
        n('c3', 460, 200, 'rect', 'Project\n+name: str\n+created_at'),
      ],
      edges: [
        e('e1', 'c2', 'c1', { label: 'наследует' }),
        e('e2', 'c1', 'c3', { label: '1 — *' }),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  },
];
