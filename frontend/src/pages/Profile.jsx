import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store/auth';
import SideNav from '../components/SideNav';
import Paywall from '../components/Paywall';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, diagrams: 0 });
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    api.get('/projects').then(({ data }) => {
      setStats({
        projects: data.length,
        diagrams: data.reduce((s, p) => s + p.diagrams.length, 0),
      });
    }).catch(() => {});
  }, []);

  const Row = ({ label, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{children}</span>
    </div>
  );

  return (
    <SideNav>
      <div className="max-w-2xl mx-auto px-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Профиль</h1>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-4 mb-6">
            <span className="w-16 h-16 rounded-2xl bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-2xl">
              {(user?.email?.[0] || '?').toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-800">{user?.email}</p>
            </div>
            <div className="flex-1" />
            {user?.is_pro ? (
              <span className="px-3 py-1.5 text-sm font-bold bg-amber-100 text-amber-700 rounded-xl">⭐ PRO</span>
            ) : (
              <button
                onClick={() => setPaywall(true)}
                className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 text-sm font-semibold shadow-md shadow-pink-200"
              >
                Купить Pro
              </button>
            )}
          </div>

          <Row label="Email">{user?.email}</Row>
          <Row label="Тариф">{user?.is_pro ? 'Pro' : 'Free'}</Row>
          <Row label="Регистрация">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
          </Row>
          <Row label="Проектов">{stats.projects}</Row>
          <Row label="Диаграмм">{stats.diagrams}</Row>
        </div>

        {!user?.is_pro && (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-2">⭐ Тариф Pro</h3>
            <p className="text-sm text-slate-500 mb-4">
              Безлимитные проекты и диаграммы, сохранения без ограничений, экспорт без водяного знака.
            </p>
            <button
              onClick={() => setPaywall(true)}
              className="px-5 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 text-sm font-semibold shadow-md shadow-pink-200"
            >
              Перейти на Pro
            </button>
          </div>
        )}
      </div>

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </SideNav>
  );
}
