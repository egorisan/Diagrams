import { useState } from 'react';
import { api } from '../api';

export default function Paywall({ open, onClose, reason }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleUpgrade = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/payments/create');
      window.location.href = data.confirmation_url;
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось создать платеж');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl shadow-pink-200/50 max-w-md w-full mx-4 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl text-center mb-3">⭐</div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Тариф Pro</h2>
        <p className="text-center text-slate-500 mb-6">
          {reason || 'Вы достигли лимита бесплатного тарифа.'}
        </p>

        <ul className="space-y-2 text-sm text-slate-600 mb-6">
          <li className="flex gap-2"><span className="text-pink-500">✓</span> Безлимитные проекты и диаграммы</li>
          <li className="flex gap-2"><span className="text-pink-500">✓</span> Безлимитные сохранения и экспорты</li>
          <li className="flex gap-2"><span className="text-pink-500">✓</span> Экспорт без водяного знака</li>
        </ul>

        {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={busy}
          className="w-full bg-pink-500 text-white py-3 rounded-xl hover:bg-pink-600 transition font-semibold shadow-lg shadow-pink-200 disabled:opacity-50"
        >
          {busy ? 'Переход к оплате...' : 'Купить Pro'}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600"
        >
          Не сейчас
        </button>
      </div>
    </div>
  );
}
