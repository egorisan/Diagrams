import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import AuthLayout, { AuthInput } from '../components/AuthLayout';
import LegalModal from '../components/LegalModal';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [legal, setLegal] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Пароль должен быть не короче 6 символов');
    if (password !== confirm) return setError('Пароли не совпадают');
    if (!agree) return setError('Необходимо принять условия использования');
    setBusy(true);
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт, чтобы начать работать">
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Имя</label>
          <AuthInput
            type="text"
            icon="👤"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите ваше имя"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Электронная почта</label>
          <AuthInput
            type="email"
            icon="✉️"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.ru"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Пароль</label>
          <AuthInput
            type="password"
            icon="🔒"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Подтвердите пароль</label>
          <AuthInput
            type="password"
            icon="🔒"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Повторите пароль"
            required
          />
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-pink-500 cursor-pointer"
          />
          <span>
            Я соглашаюсь с{' '}
            <button type="button" onClick={() => setLegal('terms')} className="text-pink-500 hover:underline">
              Условиями использования
            </button>{' '}
            и{' '}
            <button type="button" onClick={() => setLegal('privacy')} className="text-pink-500 hover:underline">
              Политикой конфиденциальности
            </button>
          </span>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-pink-500 text-white py-3 rounded-xl hover:bg-pink-600 transition font-semibold shadow-lg shadow-pink-200 disabled:opacity-50"
        >
          {busy ? 'Создание...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="text-sm text-center text-slate-400 mt-6">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-pink-500 hover:underline font-medium">Войти</Link>
      </p>
      <LegalModal doc={legal} onClose={() => setLegal(null)} />
    </AuthLayout>
  );
}
