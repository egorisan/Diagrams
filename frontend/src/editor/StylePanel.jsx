// Панель «Свойства»: стилизация выделенного элемента (в моменте, без пресетов)
export default function StylePanel({ node, onChange, onDelete }) {
  if (!node) {
    return (
      <div className="w-60 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Свойства</h3>
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 mb-4" />
          <p className="text-sm font-medium text-slate-600">Элемент не выбран</p>
          <p className="text-xs text-slate-400 mt-1">
            Выберите элемент на диаграмме, чтобы увидеть и редактировать его свойства.
          </p>
          <div className="mt-6 w-full bg-pink-50 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-pink-600 mb-1">💡 Совет</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Используйте горячие клавиши:<br />
              Ctrl + Z — отменить<br />
              Ctrl + Shift + Z — вернуть<br />
              Delete — удалить
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = node;
  const set = (key, value) => onChange(node.id, { [key]: value });

  const ColorRow = ({ label, value, onPick }) => (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
        />
        <span className="text-xs text-slate-500 font-mono uppercase">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="w-60 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Свойства</h3>

      <div>
        <p className="text-xs text-slate-400 mb-1.5">Текст</p>
        <input
          type="text"
          value={data.label || ''}
          onChange={(e) => set('label', e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      <ColorRow label="Цвет заливки" value={data.fill || '#ffffff'} onPick={(v) => set('fill', v)} />
      <ColorRow label="Цвет контура" value={data.stroke || '#1e293b'} onPick={(v) => set('stroke', v)} />
      <ColorRow label="Цвет текста" value={data.textColor || '#1e293b'} onPick={(v) => set('textColor', v)} />

      <div>
        <p className="text-xs text-slate-400 mb-1.5">Размер шрифта</p>
        <select
          value={data.fontSize || 14}
          onChange={(e) => set('fontSize', Number(e.target.value))}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
        >
          {[10, 12, 14, 16, 18, 20, 24, 28].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onDelete(node.id)}
        className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl border border-pink-200 text-pink-600 text-sm font-medium hover:bg-pink-50 transition"
      >
        🗑 Удалить элемент
      </button>
    </div>
  );
}
