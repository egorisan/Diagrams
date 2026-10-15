import { useState } from 'react';

const DOCS = {
  terms: {
    title: 'Условия использования',
    body: [
      ['1. Общие положения', 'Сервис 24KT_Diagrams предоставляет инструменты для создания и хранения диаграмм. Регистрируясь, вы соглашаетесь с настоящими условиями.'],
      ['2. Аккаунт', 'Вы обязаны указывать достоверный адрес электронной почты и самостоятельно обеспечивать сохранность пароля. Действия, совершённые под вашей учётной записью, считаются совершёнными вами.'],
      ['3. Тарифы', 'Бесплатный тариф Free ограничен одним проектом и двумя сохранениями/экспортами в день. Тариф Pro предоставляется после оплаты и снимает указанные ограничения.'],
      ['4. Контент', 'Вы сохраняете все права на созданные вами диаграммы. Запрещается использовать сервис для противоправной деятельности.'],
      ['5. Ограничение ответственности', 'Сервис предоставляется «как есть». Администрация не гарантирует бесперебойную работу и не несёт ответственности за возможную потерю данных.'],
      ['6. Прекращение доступа', 'Администрация вправе заблокировать аккаунт при нарушении настоящих условий.'],
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    body: [
      ['1. Какие данные мы собираем', 'Адрес электронной почты, пароль (в виде хэша), содержимое созданных вами проектов и диаграмм, а также техническая информация об активности.'],
      ['2. Как используются данные', 'Email используется для входа и связи по вопросам сервиса. Содержимое диаграмм хранится для отображения и редактирования.'],
      ['3. Платежи', 'Оплата обрабатывается платёжной системой ЮKassa. Мы не храним данные банковских карт.'],
      ['4. Cookies', 'Используется HttpOnly-cookie с токеном обновления сессии — исключительно для работы авторизации.'],
      ['5. Передача третьим лицам', 'Мы не продаём и не передаём персональные данные третьим лицам, кроме случаев, предусмотренных законом.'],
      ['6. Удаление данных', 'При удалении аккаунта все связанные проекты и диаграммы удаляются безвозвратно.'],
    ],
  },
};

export default function LegalModal({ doc, onClose }) {
  const [tab, setTab] = useState(doc || 'terms');
  const d = DOCS[tab];
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          {Object.entries(DOCS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                tab === k ? 'bg-pink-500 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {v.title}
            </button>
          ))}
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{d.title}</h3>
          {d.body.map(([h, p]) => (
            <div key={h} className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">{h}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{p}</p>
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-6">
            Вопросы: corkage.caftans.0c@icloud.com
          </p>
        </div>
      </div>
    </div>
  );
}
