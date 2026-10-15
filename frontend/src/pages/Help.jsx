import { useState } from 'react';
import SideNav from '../components/SideNav';

const FAQ = [
  {
    q: 'Как добавить элемент на диаграмму?',
    a: 'Перетащите фигуру из панели «Элементы диаграммы» слева на холст или сделайте двойной клик по ней — элемент появится по центру холста.',
  },
  {
    q: 'Как соединить элементы стрелкой?',
    a: 'Наведите курсор на элемент — по краям появятся точки соединения. Потяните от одной точки к точке другого элемента. Тип связи выбирается в секции «Связи» левой панели.',
  },
  {
    q: 'Какие горячие клавиши доступны?',
    a: 'Ctrl+Z — отменить, Ctrl+Shift+Z или Ctrl+Y — вернуть, Ctrl+S — сохранить, Delete/Backspace — удалить выделенное.',
  },
  {
    q: 'Как изменить подпись элемента?',
    a: 'Двойной клик по элементу откроет редактирование текста. Также текст меняется в панели «Свойства» справа.',
  },
  {
    q: 'В какие форматы можно экспортировать схему?',
    a: 'PNG, JPG и SVG. Кнопка «Сохранить» в редакторе открывает выбор формата и имени файла.',
  },
  {
    q: 'Что входит в тариф Free?',
    a: '1 проект с 1 диаграммой, 2 сохранения или экспорта в день, полупрозрачный водяной знак на экспортированных файлах.',
  },
  {
    q: 'Что даёт тариф Pro?',
    a: 'Безлимитные проекты и диаграммы, сохранения и экспорты без ограничений, отсутствие водяного знака. Оплата разовая через ЮKassa.',
  },
];

export default function Help() {
  const [open, setOpen] = useState(0);

  return (
    <SideNav>
      <div className="max-w-2xl mx-auto px-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Помощь</h1>
        <p className="text-sm text-slate-400 mb-6">Частые вопросы о редакторе и тарифах</p>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-medium text-slate-700">{item.q}</span>
                <span className={`text-slate-300 transition-transform ${open === i ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {open === i && (
                <p className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 bg-pink-50 rounded-2xl border border-pink-100 p-6">
          <h3 className="text-sm font-semibold text-pink-700 mb-1">Нужна помощь?</h3>
          <p className="text-sm text-slate-500">
            Напишите нам на <span className="text-pink-600 font-medium">corkage.caftans.0c@icloud.com</span> —
            ответим в течение рабочего дня.
          </p>
        </div>
      </div>
    </SideNav>
  );
}
