import { isUml } from './palette';

const field = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400';
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];

// Вынесен из StylePanel: иначе при каждом рендере пересоздаётся тип компонента,
// <input type="color"> перемонтируется и ползунок палитры «отваливается»
function ColorRow({ label, value, onPick }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onPick(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
        />
        <input
          key={value}
          defaultValue={value}
          onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && onPick(e.target.value.toLowerCase())}
          className="w-24 px-2 py-1 text-xs text-slate-500 font-mono uppercase border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-pink-400"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, mono, placeholder }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(8, Math.max(2, (value || '').split('\n').length))}
        placeholder={placeholder}
        className={`${field} resize-y ${mono ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );
}

// Панель «Свойства»: значения берутся из актуальной ноды, поэтому изменения
// на холсте (поворот мышью, ввод текста) сразу видны в панели и наоборот
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
            <p className="text-xs font-semibold text-pink-600 mb-1">💡 Горячие клавиши</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ctrl + Z — отменить<br />
              Ctrl + Y / Ctrl + Shift + Z — вернуть<br />
              Ctrl + C / Ctrl + V — копировать / вставить<br />
              Ctrl + S — сохранить<br />
              Ctrl + «+» / «−» — масштаб, Ctrl + 0 — вписать<br />
              Delete — удалить<br />
              Двойной клик — редактировать текст
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = node;
  const set = (key, value) => onChange(node.id, { [key]: value });
  const rot = data.rotation || 0;
  const setRot = (v) => set('rotation', ((Math.round(v) % 360) + 360) % 360);
  const uml = isUml(data.shape);

  return (
    <div className="w-60 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Свойства</h3>

      <TextArea label={uml ? 'Название' : 'Текст'} value={data.label} onChange={(v) => set('label', v)} />
      {uml && (
        <>
          <TextArea
            label={data.shape === 'umlenum' ? 'Значения' : 'Атрибуты'}
            value={data.attributes}
            onChange={(v) => set('attributes', v)}
            mono
            placeholder="- name: string"
          />
          {data.shape !== 'umlenum' && (
            <TextArea label="Методы" value={data.methods} onChange={(v) => set('methods', v)} mono placeholder="+ method(): void" />
          )}
        </>
      )}

      <ColorRow label="Цвет заливки" value={data.fill || '#ffffff'} onPick={(v) => set('fill', v)} />
      <ColorRow label="Цвет контура" value={data.stroke || '#1e293b'} onPick={(v) => set('stroke', v)} />
      <ColorRow label="Цвет текста" value={data.textColor || '#1e293b'} onPick={(v) => set('textColor', v)} />

      <div>
        <p className="text-xs text-slate-400 mb-1.5">Размер шрифта</p>
        <select value={data.fontSize || 14} onChange={(e) => set('fontSize', Number(e.target.value))} className={field}>
          {[...new Set([...FONT_SIZES, data.fontSize || 14])].sort((a, b) => a - b).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-1.5">Поворот, °</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRot(rot - 90)}
            title="Повернуть на 90° против часовой"
            className="w-9 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm hover:border-pink-300 transition"
          >⟲</button>
          <input
            type="number"
            min="0"
            max="359"
            value={rot}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setRot(v);
            }}
            className="flex-1 min-w-0 px-2 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm text-center outline-none focus:ring-2 focus:ring-pink-400"
          />
          <button
            onClick={() => setRot(rot + 90)}
            title="Повернуть на 90° по часовой"
            className="w-9 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm hover:border-pink-300 transition"
          >⟳</button>
        </div>
        <input
          type="range"
          min="0"
          max="359"
          value={rot}
          onChange={(e) => setRot(Number(e.target.value))}
          className="w-full mt-2 accent-pink-500"
        />
        <div className="grid grid-cols-4 gap-1 mt-1">
          {[0, 90, 180, 270].map((a) => (
            <button
              key={a}
              onClick={() => setRot(a)}
              className={`py-1 text-[11px] rounded-lg border transition ${rot === a ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-500 hover:border-pink-300'}`}
            >{a}°</button>
          ))}
        </div>
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
