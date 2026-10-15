import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import DiagramPreview from '../components/DiagramPreview';
import { TEMPLATES } from '../editor/templates';
import { useAuth } from '../store/auth';

// Мини-иллюстрация редактора из макета (статичная, без логики)
function EditorMock() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-pink-200/40 border border-slate-100 overflow-hidden text-[10px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <Logo size="sm" />
        <span className="text-slate-400">Блок-схема процесса ▾</span>
        <span className="flex-1" />
        <span className="px-2 py-1 bg-pink-500 text-white rounded-md">Сохранить</span>
      </div>
      <div className="grid grid-cols-[110px_1fr_110px]">
        <div className="border-r border-slate-100 p-2 space-y-1.5 text-slate-500">
          <p className="text-[9px] text-slate-400">Основные фигуры</p>
          <div className="grid grid-cols-3 gap-1">
            {['▭', '▢', '◯', '◇', '▱', '⬭'].map((s, i) => (
              <div key={i} className="border border-slate-200 rounded py-1 text-center">{s}</div>
            ))}
          </div>
          <p className="text-[9px] text-slate-400 pt-1">Линии и стрелки</p>
          <div className="space-y-1">
            <div className="border-t border-slate-300" />
            <div className="border-t border-dashed border-slate-300" />
            <div className="border-t border-slate-300" />
          </div>
        </div>
        <div className="relative h-56 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]">
          <div className="absolute left-1/2 -translate-x-1/2 top-2 px-3 py-1 bg-pink-200 text-pink-800 rounded-full">Начало</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-10 px-3 py-1.5 bg-sky-200 text-sky-800 rounded-md border border-sky-300">Ввести данные</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-[88px] w-16 h-16 rotate-45 bg-pink-100 border border-pink-300 flex items-center justify-center">
            <span className="-rotate-45 text-pink-700">ОК?</span>
          </div>
          <div className="absolute right-2 top-[100px] px-2 py-1.5 bg-pink-100 text-pink-700 rounded-md border border-pink-200">Ошибка</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-[168px] px-3 py-1.5 bg-sky-200 text-sky-800 rounded-md border border-sky-300">Сохранить</div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-1 px-3 py-1 bg-pink-200 text-pink-800 rounded-full">Конец</div>
        </div>
        <div className="border-l border-slate-100 p-2 text-slate-500 space-y-2">
          <p className="text-[9px] font-semibold text-slate-400">Свойства</p>
          {['Текст', 'Цвет заливки', 'Цвет контура', 'Шрифт'].map((l) => (
            <div key={l}>
              <p className="text-[8px] text-slate-400">{l}</p>
              <div className="h-4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Nav({ user }) {
  return (
    <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
      <Link to="/"><Logo /></Link>
      <nav className="hidden md:flex items-center gap-8 text-sm text-slate-500">
        <a href="#features" className="hover:text-slate-800">Возможности</a>
        <a href="#examples" className="hover:text-slate-800">Примеры</a>
        <a href="#pricing" className="hover:text-slate-800">Тарифы</a>
        <a href="#about" className="hover:text-slate-800">О нас</a>
      </nav>
      {user ? (
        <Link to="/dashboard" className="px-5 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-medium text-sm">
          Открыть проекты →
        </Link>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl bg-white/60">
            Войти
          </Link>
          <Link to="/register" className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-medium">
            Зарегистрироваться
          </Link>
        </div>
      )}
    </header>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen pastel-bg scroll-smooth">
      <Nav user={user} />

      <main className="max-w-6xl mx-auto px-6">
        <section className="grid md:grid-cols-2 gap-12 items-center py-14">
          <div>
            <span className="inline-block px-3 py-1 text-xs font-medium text-pink-600 bg-pink-100 rounded-full mb-5">
              Простые идеи — наглядные схемы
            </span>
            <h1 className="text-5xl font-extrabold text-slate-800 leading-tight mb-5">
              Создавайте<br />диаграммы <span className="text-pink-500">легко</span>
            </h1>
            <p className="text-slate-500 mb-8 max-w-md">
              24KT_Diagrams — удобный онлайн-редактор для создания блок-схем, UML-диаграмм,
              интеллект-карт и многого другого. Визуализируйте идеи, структурируйте
              процессы и работайте вместе.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-semibold shadow-lg shadow-pink-300/50 transition"
              >
                {user ? 'К моим проектам →' : 'Начать бесплатно →'}
              </Link>
              <Link to="/login" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-slate-300 font-medium">
                ▶ Посмотреть видео
              </Link>
            </div>
          </div>
          <EditorMock />
        </section>

        <section id="features" className="py-14 scroll-mt-6">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">
            Почему <span className="text-pink-500">24KT_Diagrams?</span>
          </h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Воплощайте идеи в схемах</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '✏️', bg: 'bg-pink-100', title: 'Разные типы диаграмм', text: 'Блок-схемы, UML, ER, C4, прецеденты и другие' },
              { icon: '🧩', bg: 'bg-sky-100', title: 'Гибкость и простота', text: 'Перетаскивайте элементы, соединяйте, настраивайте' },
              { icon: '☁️', bg: 'bg-purple-100', title: 'Экспорт и сохранение', text: 'Скачивайте в PNG, JPG, SVG и храните в облаке' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition">
                <span className={`inline-flex w-10 h-10 rounded-xl ${f.bg} items-center justify-center text-lg mb-3`}>{f.icon}</span>
                <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="examples" className="py-14 scroll-mt-6">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Примеры</h2>
          <p className="text-center text-slate-400 mb-10 text-sm">Начните с готового шаблона</p>
          <div className="grid md:grid-cols-4 gap-5">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition">
                <DiagramPreview content={t.build()} className="h-32" />
                <p className="px-4 py-3 text-sm font-medium text-slate-700">{t.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="py-14 scroll-mt-6">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">Тарифы</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-100 p-7 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg">Free</h3>
              <p className="text-3xl font-extrabold text-slate-800 my-3">0 ₽</p>
              <ul className="space-y-2 text-sm text-slate-500 mb-6">
                <li>✓ 1 проект, 1 диаграмма</li>
                <li>✓ 2 сохранения/экспорта в день</li>
                <li>✓ Все типы диаграмм</li>
                <li className="text-slate-300">✕ Водяной знак на экспорте</li>
              </ul>
              <Link to="/register" className="block text-center py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm">
                Начать бесплатно
              </Link>
            </div>
            <div className="bg-white rounded-2xl border-2 border-pink-300 p-7 shadow-lg shadow-pink-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">⭐ Pro</h3>
                <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-2 py-1 rounded-full">РАЗОВАЯ ОПЛАТА</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 my-3">99 ₽</p>
              <ul className="space-y-2 text-sm text-slate-500 mb-6">
                <li>✓ Безлимитные проекты и диаграммы</li>
                <li>✓ Безлимитные сохранения и экспорты</li>
                <li>✓ Без водяного знака</li>
                <li>✓ Все типы диаграмм</li>
              </ul>
              <Link to="/register" className="block text-center py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 font-semibold text-sm shadow-md shadow-pink-200">
                Купить Pro
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="py-14 scroll-mt-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">О нас</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              24KT_Diagrams — это простой и быстрый онлайн-редактор диаграмм.
              Мы верим, что визуализация идей не должна требовать сложных инструментов:
              откройте браузер, перетащите элементы на холст — и ваша схема готова.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
        24KT_Diagrams · Версия 1.0.0
      </footer>
    </div>
  );
}
