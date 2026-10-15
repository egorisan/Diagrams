import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import Paywall from './Paywall';
import { useAuth } from '../store/auth';

const ITEMS = [
  { to: '/dashboard', icon: '⌂', label: 'Мои проекты' },
  { to: '/templates', icon: '▦', label: 'Шаблоны' },
];

const BOTTOM = [
  { to: '/profile', icon: '👤', label: 'Профиль' },
  { to: '/settings', icon: '⚙️', label: 'Настройки' },
  { to: '/help', icon: '❓', label: 'Помощь' },
];

export default function SideNav({ children, headerSlot }) {
  const { user, logout } = useAuth();
  const [paywall, setPaywall] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const inAdmin = location.pathname.startsWith('/admin');

  const navItems = inAdmin
    ? [
        { to: '/admin', icon: '👥', label: 'Пользователи' },
        { to: '/admin?view=stats', icon: '📊', label: 'Статистика' },
      ]
    : isAdmin
      ? [...ITEMS, { to: '/admin', icon: '🛡', label: 'Админ-панель' }]
      : ITEMS;

  const isActive = (to) => location.pathname + location.search === to;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavLink = ({ item }) => (
    <Link
      to={item.to}
      state={item.state}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
        isActive(item.to)
          ? 'bg-pink-50 text-pink-600 font-medium'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className="w-5 text-center">{item.icon}</span>
      {item.label}
    </Link>
  );

  return (
    <div className="h-screen flex pastel-bg">
      <aside className="w-52 bg-white/70 backdrop-blur border-r border-slate-200/60 flex flex-col shrink-0">
        <div className="p-4"><Link to="/dashboard"><Logo size="sm" /></Link></div>

        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase">
          {inAdmin ? 'Админ-панель' : 'Меню'}
        </p>
        <nav className="px-2 space-y-0.5">
          {navItems.map((item) => <NavLink key={item.label} item={item} />)}
        </nav>

        {!inAdmin && (
          <>
            <div className="mx-4 my-4 border-t border-slate-100" />
            <nav className="px-2 space-y-0.5">
              {BOTTOM.map((item) => <NavLink key={item.label} item={item} />)}
            </nav>
          </>
        )}

        <div className="flex-1" />
        <div className="p-4 space-y-2">
          {inAdmin && (
            <Link to="/dashboard" className="block text-xs text-slate-400 hover:text-slate-600">← На сайт</Link>
          )}
          <div className="text-[11px] text-slate-300">24KT_Diagrams · Версия 1.0.0</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 px-6 shrink-0">
          {headerSlot}
          <div className="flex-1" />
          {user?.is_pro ? (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">⭐ PRO</span>
          ) : user && (
            <button
              onClick={() => setPaywall(true)}
              className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
            >
              ⭐ Free → Pro
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-sm">
              {(user?.email?.[0] || '?').toUpperCase()}
            </span>
            <div className="text-xs leading-tight hidden sm:block">
              <p className="font-medium text-slate-700">{user?.email}</p>
              <p className="text-slate-400">{user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-700 ml-1">Выйти</button>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  );
}
