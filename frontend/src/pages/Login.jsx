import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import AuthLayout, { AuthInput } from '../components/AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = 'Введите электронную почту';
    else if (!EMAIL_RE.test(email)) errs.email = 'Некорректный формат почты';
    if (!password) errs.password = 'Введите пароль';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ошибка входа';
      // Неверные учётные данные — подсвечиваем оба поля
      setErrors({ email: true, password: typeof msg === 'string' ? msg : 'Ошибка входа' });
    } finally {
      setBusy(false);
    }
  };

  const clear = (k) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  return (
    <AuthLayout title="Вход" subtitle="Добро пожаловать обратно!">
      <form onSubmit={handleLogin} noValidate className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Электронная почта</label>
          <AuthInput
            type="email"
            icon="✉️"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clear('email'); }}
            placeholder="Введите вашу почту"
            error={errors.email}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Пароль</label>
          <AuthInput
            type={showPw ? 'text' : 'password'}
            icon="🔒"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clear('password'); }}
            placeholder="Введите пароль"
            error={errors.password}
          >
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              {showPw ? '🙈' : '👁'}
            </button>
          </AuthInput>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-pink-500"
            />
            Запомнить меня
          </label>
          <span className="text-pink-500 cursor-default">Забыли пароль?</span>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-pink-500 text-white py-3 rounded-xl hover:bg-pink-600 transition font-semibold shadow-lg shadow-pink-200 disabled:opacity-50"
        >
          {busy ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p className="text-sm text-center text-slate-400 mt-6">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-pink-500 hover:underline font-medium">Зарегистрироваться</Link>
      </p>
    </AuthLayout>
  );
}
