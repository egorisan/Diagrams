import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store/auth';
import SideNav from '../components/SideNav';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, diagrams: 0 });

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
          </div>

          <Row label="Email">{user?.email}</Row>
          <Row label="Регистрация">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
          </Row>
          <Row label="Проектов">{stats.projects}</Row>
          <Row label="Диаграмм">{stats.diagrams}</Row>
        </div>
      </div>
    </SideNav>
  );
}
