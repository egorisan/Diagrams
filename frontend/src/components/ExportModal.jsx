import { useEffect, useState } from 'react';

const FORMATS = [
  { id: 'png', label: 'PNG', desc: 'Изображение высокого качества', icon: '🖼' },
  { id: 'svg', label: 'SVG', desc: 'Векторный формат (масштабируемый)', icon: '✒️' },
  { id: 'jpg', label: 'JPG', desc: 'Компактный размер файла', icon: '📷' },
];

// Модалка «Сохранить диаграмму»: имя файла + выбор формата.
// По ТЗ экспорта в PDF нет — только PNG/JPG/SVG.
export default function ExportModal({ open, onClose, defaultName, onSave, busy }) {
  const [name, setName] = useState(defaultName || 'diagram');
  const [format, setFormat] = useState('png');

  useEffect(() => {
    if (open) {
      setName(defaultName || 'diagram');
      setFormat('png');
    }
  }, [open, defaultName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center text-lg">💾</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Сохранить диаграмму</h2>
              <p className="text-xs text-slate-400">Выберите формат файла и укажите название</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
        </div>

        <div className="mt-5">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-500">Название файла</label>
            <span className="text-[10px] text-slate-300">{name.length}/100</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">Формат файла</label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`relative rounded-xl border-2 p-3 text-left transition ${
                  format === f.id
                    ? 'border-pink-400 bg-pink-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span
                  className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 ${
                    format === f.id ? 'border-pink-500 bg-pink-500' : 'border-slate-300 bg-white'
                  }`}
                >
                  {format === f.id && <span className="absolute inset-1 rounded-full bg-white" />}
                </span>
                <span className="text-xl">{f.icon}</span>
                <p className="text-sm font-semibold text-slate-700 mt-1.5">{f.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">Сохранить в</label>
          <div className="flex gap-3">
            <select
              disabled
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 outline-none"
            >
              <option>📁 Мои проекты</option>
            </select>
            <button
              disabled
              title="Папки появятся в следующих версиях"
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            >
            Новая папка
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-7">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(name.trim() || 'diagram', format)}
            disabled={busy}
            className="px-6 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-semibold text-sm shadow-md shadow-pink-200 disabled:opacity-50"
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
