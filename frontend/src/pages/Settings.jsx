import { useAuth } from '../store/auth';
import SideNav from '../components/SideNav';

export default function Settings() {
  const { user } = useAuth();

  return (
    <SideNav>
      <div className="max-w-2xl mx-auto px-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Настройки</h1>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Аккаунт</h2>
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Email</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Смена пароля</p>
              <p className="text-xs text-slate-400">Появится в следующих версиях</p>
            </div>
            <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-sm cursor-not-allowed">
              Сменить
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">О приложении</h2>
          <div className="space-y-2 text-sm text-slate-500">
            <p>FastDia — онлайн-редактор диаграмм</p>
            <p className="text-xs text-slate-400">Версия 1.0.0 · MVP</p>
          </div>
        </div>
      </div>
    </SideNav>
  );
}
