import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store/auth';
import SideNav from '../components/SideNav';
import { DonutChart, LineChart, BarChart } from '../components/Charts';

const TYPE_NAMES = {
  class: 'Классы', object: 'Объекты', c4: 'C4',
  usecase: 'Прецеденты', er: 'ER-диаграммы', component: 'Компоненты',
};

function UsersView({ users, meId, onBan, onPro, onDelete }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => users.filter((u) => u.email.toLowerCase().includes(q.toLowerCase())),
    [users, q]
  );

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Пользователи</h1>
          <p className="text-sm text-slate-400">Управление пользователями системы</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по email…"
          className="w-64 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50/60 text-left text-slate-400 text-xs">
            <tr>
              <th className="px-5 py-3.5">Пользователь</th>
              <th className="px-5 py-3.5">Роль</th>
              <th className="px-5 py-3.5">Тариф</th>
              <th className="px-5 py-3.5">Статус</th>
              <th className="px-5 py-3.5">Активность</th>
              <th className="px-5 py-3.5">Регистрация</th>
              <th className="px-5 py-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/50 whitespace-nowrap">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">
                      {u.email[0].toUpperCase()}
                    </span>
                    <span className="text-slate-700">{u.email}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="px-2.5 py-1 text-xs bg-slate-100 text-slate-500 rounded-full">
                    {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.is_pro ? (
                    <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">PRO</span>
                  ) : (
                    <span className="text-xs text-slate-400">Free</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {u.is_banned ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Заблокирован
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Активен
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">
                  {u.last_active_at ? new Date(u.last_active_at).toLocaleString('ru-RU') : '—'}
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">
                  {new Date(u.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-5 py-3">
                  {u.id !== meId && (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPro(u.id)}
                        title={u.is_pro ? 'Забрать Pro' : 'Выдать Pro'}
                        className={`w-8 h-8 rounded-lg text-sm transition ${
                          u.is_pro
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                        }`}
                      >★</button>
                      <button
                        onClick={() => onBan(u.id)}
                        title={u.is_banned ? 'Разблокировать' : 'Заблокировать'}
                        className={`w-8 h-8 rounded-lg text-sm transition ${
                          u.is_banned
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-400 hover:bg-red-100'
                        }`}
                      >
                        {u.is_banned ? '✓' : '⊘'}
                      </button>
                      <button
                        onClick={() => onDelete(u.id, u.email)}
                        title="Удалить пользователя"
                        className="w-8 h-8 rounded-lg text-sm bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition"
                      >🗑</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Никого не найдено</p>
        )}
      </div>
    </>
  );
}

function StatsView({ stats }) {
  if (!stats) return <p className="text-slate-400">Загрузка…</p>;
  const byType = Object.fromEntries(
    Object.entries(stats.diagrams_by_type).map(([k, v]) => [TYPE_NAMES[k] || k, v])
  );
  // подписи дат для графиков: последние 14 дней, индекс 13 — сегодня (как на бэке)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  });

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Статистика</h1>
        <p className="text-sm text-slate-400">Общая информация о системе</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['👤', 'bg-sky-100', 'Всего пользователей', stats.total_users],
          ['⭐', 'bg-amber-100', 'Тариф Pro', stats.pro_users],
          ['📄', 'bg-pink-100', 'Создано диаграмм', stats.total_diagrams],
          ['💰', 'bg-purple-100', 'Выручка, ₽', stats.total_revenue],
        ].map(([icon, bg, label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Активны сегодня', stats.active_today],
          ['Сохранений сегодня', stats.saves_today],
          ['Экспортов сегодня', stats.exports_today],
          ['Заблокировано', stats.banned_users],
        ].map(([label, value]) => (
          <div key={label} className="bg-white/60 rounded-2xl border border-slate-100 px-5 py-4">
            <p className="text-lg font-bold text-slate-700">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Диаграммы по типам</h3>
          <DonutChart data={byType} centerLabel="диаграмм" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Активность пользователей</h3>
          <LineChart data={stats.activity_14d} labels={days} label="Сохранения диаграмм, последние 14 дней" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Регистрации пользователей</h3>
          <BarChart data={stats.registrations_14d} labels={days} label="Новые аккаунты, последние 14 дней" />
        </div>
      </div>
    </>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') === 'stats' ? 'stats' : 'users';
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data: u } = await api.get('/admin/users');
      setUsers(u);
      const { data: s } = await api.get('/admin/stats');
      setStats(s);
    } catch (err) {
      setError(err.response?.data?.detail || 'Нет доступа');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleBan = async (id) => {
    try {
      await api.post(`/admin/users/${id}/ban`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  const togglePro = async (id) => {
    try {
      await api.post(`/admin/users/${id}/pro`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  const deleteUser = async (id, email) => {
    if (!window.confirm(`Удалить пользователя ${email}? Его проекты и диаграммы будут удалены безвозвратно.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  if (error) {
    return (
      <SideNav>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </SideNav>
    );
  }

  return (
    <SideNav>
      <div className="max-w-5xl mx-auto px-8 pb-12">
        {view === 'stats' ? (
          <StatsView stats={stats} />
        ) : (
          <UsersView users={users} meId={user?.id} onBan={toggleBan} onPro={togglePro} onDelete={deleteUser} />
        )}
      </div>
    </SideNav>
  );
}
