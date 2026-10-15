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
  class: ['umlclass', 'umlinterface', 'umlabstract', 'umlenum', 'package', 'note'],
  object: ['rect', 'umlclass', 'rounded', 'package'],
  c4: ['actor', 'rect', 'rounded', 'cylinder', 'container'],
  usecase: ['actor', 'ellipse', 'container'],
  er: ['rect', 'diamond', 'ellipse', 'cylinder'],
  component: ['component', 'rect', 'container', 'cylinder', 'package'],
  custom: Object.keys(SHAPES),
};

// Стили связей (секция «Связи» в сайдбаре)
// marker — маркер в конце (arrowclosed/arrow), start — маркер в начале (diamond/diamond-fill)
export const EDGE_STYLES = [
  { id: 'assoc', label: 'Ассоциация', dash: null, marker: null },
  { id: 'directed', label: 'Направленная', dash: null, marker: 'arrowclosed' },
  { id: 'dependency', label: 'Зависимость', dash: '6 4', marker: 'arrow' },
  { id: 'inherit', label: 'Наследование', dash: null, marker: 'arrowclosed' },
  { id: 'realize', label: 'Реализация', dash: '6 4', marker: 'arrowclosed' },
  { id: 'aggregate', label: 'Агрегация', dash: null, marker: 'arrowclosed', start: 'diamond' },
  { id: 'compose', label: 'Композиция', dash: null, marker: 'arrowclosed', start: 'diamond-fill' },
];

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
