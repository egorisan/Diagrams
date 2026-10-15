import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store/auth';
import Paywall from '../components/Paywall';
import SideNav from '../components/SideNav';
import DiagramPreview from '../components/DiagramPreview';

const DIAGRAM_TYPES = [
  { value: 'class', label: 'Диаграмма классов' },
  { value: 'object', label: 'Диаграмма объектов' },
  { value: 'c4', label: 'C4-модель' },
  { value: 'usecase', label: 'Диаграмма прецедентов' },
  { value: 'er', label: 'ER-диаграмма' },
  { value: 'component', label: 'Диаграмма компонентов' },
];

const SORTS = {
  updated: (a, b) => new Date(b.project.updated_at || b.updated_at) - new Date(a.project.updated_at || a.updated_at),
  name: (a, b) => a.name.localeCompare(b.name),
  created: (a, b) => new Date(b.created_at) - new Date(a.created_at),
};

function CardMenu({ onOpen, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >⋮</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden">
            <button onClick={onOpen} className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-pink-50">Открыть</button>
            <button onClick={onDelete} className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Удалить</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { refreshUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('updated');
  const [listView, setListView] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('class');
  const [error, setError] = useState('');
  const [paywall, setPaywall] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const load = async () => {
    const { data } = await api.get('/projects');
    setProjects(data);
  };

  useEffect(() => {
    load();
    refreshUser(); // подтянуть is_pro после возврата с оплаты
    if (location.state?.paywall) setPaywall(true);
    if (location.state?.create) setCreateOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Плоская структура: каждая диаграмма = карточка
  const items = useMemo(() => {
    const all = projects.flatMap((p) => p.diagrams.map((d) => ({ ...d, project: p })));
    const q = search.trim().toLowerCase();
    return all
      .filter((d) => (tab === 'fav' ? d.is_favorite : true))
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.project.name.toLowerCase().includes(q))
      .sort(SORTS[sort]);
  }, [projects, search, tab, sort]);

  const createProject = async (replace = false) => {
    setError('');
    const name = newName.trim() || 'Новая диаграмма';
    try {
      const { data: project } = await api.post('/projects', { name, replace });
      const { data: diagram } = await api.post(`/projects/${project.id}/diagrams`, {
        name,
        type: newType,
      });
      setCreateOpen(false);
      navigate(`/editor/${diagram.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'PROJECT_LIMIT') {
        setConfirmReplace(true);
      } else if (detail === 'DIAGRAM_LIMIT' || detail === 'LIMIT_REACHED') {
        setPaywall(true);
      } else {
        setError(detail || 'Ошибка создания');
      }
    }
  };

  const deleteProject = async (id) => {
    await api.delete(`/projects/${id}`);
    load();
  };

  const toggleFav = async (id) => {
    const { data } = await api.post(`/diagrams/${id}/favorite`);
    setProjects((ps) =>
      ps.map((p) => ({ ...p, diagrams: p.diagrams.map((d) => (d.id === id ? data : d)) }))
    );
  };

  const tabs = [
    ['all', 'Все проекты'],
    ['mine', 'Мои'],
    ['fav', 'Избранное'],
  ];

  return (
    <SideNav
      headerSlot={
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск проектов…"
          className="w-full max-w-sm px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-pink-400"
        />
      }
    >
      <div className="max-w-6xl mx-auto px-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Мои проекты</h1>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-5 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-semibold text-sm shadow-md shadow-pink-200"
          >
            ＋ Создать диаграмму
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {tabs.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${
                  tab === k ? 'bg-pink-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-500 outline-none"
          >
            <option value="updated">По дате изменения</option>
            <option value="created">По дате создания</option>
            <option value="name">По названию</option>
          </select>
          <div className="flex-1" />
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setListView(false)}
              className={`w-8 h-7 rounded-lg text-xs ${!listView ? 'bg-pink-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Сетка"
            >▦</button>
            <button
              onClick={() => setListView(true)}
              className={`w-8 h-7 rounded-lg text-xs ${listView ? 'bg-pink-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Список"
            >☰</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📐</p>
            <p>{search || tab === 'fav' ? 'Ничего не найдено' : 'Проектов пока нет. Создайте первый.'}</p>
          </div>
        ) : listView ? (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
            {items.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60">
                <Link to={`/editor/${d.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <DiagramPreview content={d.content} className="w-16 h-11 rounded-lg border border-slate-100 overflow-hidden shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {DIAGRAM_TYPES.find((t) => t.value === d.type)?.label || d.type} ·{' '}
                      {new Date(d.project.updated_at || d.updated_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </Link>
                <button onClick={() => toggleFav(d.id)} className={`text-lg ${d.is_favorite ? 'text-pink-500' : 'text-slate-300 hover:text-pink-400'}`}>★</button>
                <CardMenu onOpen={() => navigate(`/editor/${d.id}`)} onDelete={() => deleteProject(d.project.id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((d) => (
              <div key={d.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                <Link to={`/editor/${d.id}`} className="block rounded-t-2xl overflow-hidden">
                  <DiagramPreview content={d.content} className="h-36 border-b border-slate-50" />
                </Link>
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {DIAGRAM_TYPES.find((t) => t.value === d.type)?.label || d.type}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFav(d.id)}
                    className={`text-lg transition ${d.is_favorite ? 'text-pink-500' : 'text-slate-200 hover:text-pink-400'}`}
                    title="В избранное"
                  >★</button>
                  <CardMenu onOpen={() => navigate(`/editor/${d.id}`)} onDelete={() => deleteProject(d.project.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Новая диаграмма</h3>
            <p className="text-xs text-slate-400 mb-5">Укажите название и тип</p>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Название</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createProject(false)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400 mb-4"
              placeholder="Интернет-магазин"
            />
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Тип диаграммы</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-pink-400 mb-6"
            >
              {DIAGRAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm">Отмена</button>
              <button onClick={() => createProject(false)} className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-semibold text-sm shadow-md shadow-pink-200">Создать</button>
            </div>
          </div>
        </div>
      )}

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Заменить проект?</h3>
            <p className="text-sm text-slate-500 mb-6">
              На тарифе Free доступен только 1 проект. Текущий проект и его диаграмма будут
              безвозвратно удалены.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmReplace(false); createProject(true); }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium text-sm"
              >
                Удалить и создать
              </button>
              <button
                onClick={() => setConfirmReplace(false)}
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
