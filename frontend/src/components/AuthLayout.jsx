import { Link } from 'react-router-dom';
import Logo from './Logo';

const input =
  'w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition text-sm';

export function AuthInput({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input className={input} {...props} />
    </div>
  );
}

// Сплит-экран авторизации: слева промо, справа белая карточка с формой
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen pastel-bg">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-500">
          <a href="/#features" className="hover:text-slate-800">Возможности</a>
          <a href="/#examples" className="hover:text-slate-800">Примеры</a>
          <a href="/#pricing" className="hover:text-slate-800">Тарифы</a>
          <a href="/#about" className="hover:text-slate-800">О нас</a>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="px-4 py-2 text-slate-600 hover:text-slate-900">Войти</Link>
          <Link to="/register" className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-medium">
            Зарегистрироваться
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center pt-10 pb-16">
        <div>
          <span className="inline-block px-3 py-1 text-xs font-medium text-pink-600 bg-pink-100 rounded-full mb-5">
            Твои идеи в наглядных схемах
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 leading-tight mb-4">
            Ваши идеи<br />в <span className="text-gradient">наглядных</span><br />диаграммах
          </h1>
          <p className="text-slate-500 mb-8 max-w-sm">
            24KT_Diagrams — удобный онлайн-редактор для создания блок-схем, UML-диаграмм,
            mind map и многого другого.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center">⚡</span>
              <span className="text-sm"><b className="text-slate-700">Просто</b><br /><span className="text-slate-400">Интуитивный интерфейс</span></span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-500 flex items-center justify-center">👥</span>
              <span className="text-sm"><b className="text-slate-700">Удобно</b><br /><span className="text-slate-400">Работайте с любого устройства</span></span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 p-8 max-w-md w-full justify-self-center">
          <div className="flex justify-center mb-4"><Logo size="sm" /></div>
          <h2 className="text-2xl font-bold text-center text-slate-800">{title}</h2>
          <p className="text-sm text-slate-400 text-center mb-7">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
