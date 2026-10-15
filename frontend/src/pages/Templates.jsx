import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import SideNav from '../components/SideNav';
import DiagramPreview from '../components/DiagramPreview';
import Paywall from '../components/Paywall';
import { TEMPLATES } from '../editor/templates';

const TYPE_NAMES = {
  class: 'Диаграмма классов', object: 'Диаграмма объектов', c4: 'C4-модель',
  usecase: 'Диаграмма прецедентов', er: 'ER-диаграмма', component: 'Диаграмма компонентов',
};

export default function Templates() {
  const [busy, setBusy] = useState('');
  const [paywall, setPaywall] = useState(false);
  const [replaceTpl, setReplaceTpl] = useState(null);
  const navigate = useNavigate();

  const useTemplate = async (t, replace = false) => {
    setBusy(t.name);
    try {
      const { data: project } = await api.post('/projects', { name: t.name, replace });
      const content = t.build();
      const { data: diagram } = await api.post(`/projects/${project.id}/diagrams`, {
        name: t.name,
        type: t.type,
        content,
      });
      navigate(`/editor/${diagram.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'PROJECT_LIMIT') {
        setReplaceTpl(t);
      } else if (detail === 'DIAGRAM_LIMIT' || detail === 'LIMIT_REACHED') {
        setPaywall(true);
      } else {
        alert(detail || 'Ошибка создания');
      }
    } finally {
      setBusy('');
    }
  };

  return (
    <SideNav>
      <div className="max-w-5xl mx-auto px-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Шаблоны</h1>
        <p className="text-sm text-slate-400 mb-6">Готовые схемы для быстрого старта</p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
              <DiagramPreview content={t.build()} className="h-40 border-b border-slate-50" />
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                <p className="text-[11px] text-slate-400 mb-3">{TYPE_NAMES[t.type] || t.type}</p>
                <button
                  onClick={() => useTemplate(t)}
                  disabled={busy === t.name}
                  className="w-full py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 text-sm font-medium shadow-sm shadow-pink-200 disabled:opacity-50"
                >
                  {busy === t.name ? 'Создание…' : 'Использовать шаблон'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {replaceTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Заменить проект?</h3>
            <p className="text-sm text-slate-500 mb-6">
              На тарифе Free доступен только 1 проект. Текущий проект будет безвозвратно удалён
              и заменён шаблоном «{replaceTpl.name}».
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { const t = replaceTpl; setReplaceTpl(null); useTemplate(t, true); }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium text-sm"
              >
                Удалить и создать
              </button>
              <button
                onClick={() => setReplaceTpl(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </SideNav>
  );
}
