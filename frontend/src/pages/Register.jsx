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
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = 'Введите электронную почту';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Некорректный формат почты';
    if (password.length < 6) errs.password = 'Пароль должен быть не короче 6 символов';
    else if (!/\p{L}/u.test(password) || !/\d/.test(password)) errs.password = 'Пароль должен содержать буквы и цифры';
    if (!confirm) errs.confirm = 'Повторите пароль';
    else if (password !== confirm) errs.confirm = 'Пароли не совпадают';
    if (!agree) errs.agree = 'Необходимо принять условия использования';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail;
      const text = typeof msg === 'string' ? msg : 'Ошибка регистрации';
      setErrors(/Email/i.test(text) ? { email: text } : { password: text });
    } finally {
      setBusy(false);
    }
  };

  const clear = (k) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  return (
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт, чтобы начать работать">
      <form onSubmit={handleRegister} noValidate className="space-y-4">
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
            onChange={(e) => { setEmail(e.target.value); clear('email'); }}
            placeholder="example@mail.ru"
            error={errors.email}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Пароль</label>
          <AuthInput
            type="password"
            icon="🔒"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clear('password'); }}
            placeholder="Минимум 6 символов, буквы и цифры"
            error={errors.password}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Подтвердите пароль</label>
          <AuthInput
            type="password"
            icon="🔒"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }}
            placeholder="Повторите пароль"
            error={errors.confirm}
          />
        </div>

        <div>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => { setAgree(e.target.checked); clear('agree'); }}
            className={`w-4 h-4 mt-0.5 accent-pink-500 cursor-pointer ${errors.agree ? 'outline-2 outline-[#EF4444] outline-offset-1' : ''}`}
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
        {errors.agree && <p className="text-sm text-[#EF4444] mt-1">{errors.agree}</p>}
        </div>

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
